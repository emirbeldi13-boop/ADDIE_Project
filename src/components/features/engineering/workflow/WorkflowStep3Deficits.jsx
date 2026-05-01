import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Compass, TrendingDown, Map, LayoutGrid, BarChart2, 
  Sparkles, Zap, Users, ShieldCheck, Settings, Sliders, ChevronDown, ChevronUp, Eye, EyeOff,
  Target, Activity
} from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { EffortImpactMatrix } from '../EffortImpactMatrix';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, Cell, ReferenceArea,
  BarChart, Bar
} from 'recharts';
import { CausalDiagnosticPanel } from '../CausalDiagnosticPanel';
import { summarizeReliabilityABC } from '../../../../utils/causalEngine';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const HEAT_COLORS = [
  { max: 2.0, bg: 'bg-rose-500', text: 'text-white', label: 'Critique' },
  { max: 2.5, bg: 'bg-orange-400', text: 'text-white', label: 'Significatif' },
  { max: 3.0, bg: 'bg-amber-300', text: 'text-slate-800', label: 'Modéré' },
  { max: 3.5, bg: 'bg-lime-200', text: 'text-slate-700', label: 'Vigilance' },
  { max: 5.0, bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Satisfaisant' },
];

function getHeatStyle(score) {
  const level = HEAT_COLORS.find(l => score < l.max) || HEAT_COLORS[HEAT_COLORS.length - 1];
  return level;
}

/**
 * ÉTAPE 3 — Où sont les déficits réels ?
 */
export function WorkflowStep3Deficits({ 
  store, 
  participants, 
  advancedStats, 
  selectedRCs, 
  setSelectedRCs,
  selectedCircos, 
  setSelectedCircos,
  robustness, 
  workflowData, 
  updateWorkflowData, 
  stepValidation, 
  onValidate, 
  onInvalidate 
}) {
  const isLocked = stepValidation?.validated;
  const [checks, setChecks] = useState({ heatmap: false, deficits: false, specificites: false, classement: false, arbre: false, racine: false, ordre: false });
  const [chartMode, setChartMode] = useState('matrix'); // 'matrix' | 'radar' | 'bar'
  const [showTargets, setShowTargets] = useState(false);

  const RC_FAMILIES = [
    { label: 'Pédagogie', icon: Target, color: 'blue', ids: ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6'] },
    { label: 'Évaluation', icon: Activity, color: 'rose', ids: ['RC7', 'RC8'] },
    { label: 'Inclusion', icon: Users, color: 'amber', ids: ['RC9'] },
    { label: 'Innovation', icon: Compass, color: 'purple', ids: ['RC10', 'RC11', 'RC12'] },
  ];

  const rcIds = Object.keys(store.competences || {});
  const circos = [...new Set(store.enseignants.map(e => e['Circonscription']))].filter(Boolean);

  // ═══ Outil 3.1 — Heatmap RC × Circo ═══
  const heatmapData = useMemo(() => {
    const grid = {};
    circos.forEach(c => {
      grid[c] = {};
      const teachers = participants.filter(p => p['Circonscription'] === c);
      rcIds.forEach(rcId => {
        const scores = teachers.map(p => p.realityScores?.[rcId] ?? 3);
        grid[c][rcId] = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
      });
    });
    // Global
    grid['GLOBAL'] = {};
    rcIds.forEach(rcId => {
      const scores = participants.map(p => p.realityScores?.[rcId] ?? 3);
      grid['GLOBAL'][rcId] = scores.length > 0 ? +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 0;
    });
    return grid;
  }, [participants, rcIds, circos]);

  // ═══ Outil 3.2 — Radar data ═══
  const radarData = useMemo(() => {
    return rcIds.map(rcId => {
      const row = { name: store.competences[rcId]?.split(' — ')[0] || rcId, id: rcId, Cible: store.referential?.[rcId]?.targetScore || 4.0 };
      circos.forEach(c => {
        row[c] = heatmapData[c]?.[rcId] || 0;
      });
      row['Global'] = heatmapData['GLOBAL']?.[rcId] || 0;
      return row;
    });
  }, [rcIds, circos, heatmapData, store.competences, store.referential]);

  // ═══ Outil 3.3 — Classement des déficits ═══
  const deficitRanking = useMemo(() => {
    return rcIds.map(rcId => {
      const score = heatmapData['GLOBAL']?.[rcId] || 0;
      const target = store.referential?.[rcId]?.targetScore || 4.0;
      const deficit = +(target - score).toFixed(1);
      const concerned = participants.filter(p => (p.realityScores?.[rcId] ?? 3) < target).length;
      const pctConcerned = participants.length > 0 ? Math.round((concerned / participants.length) * 100) : 0;
      
      // Triangulation: count sources confirming the deficit
      let triangSources = 0;
      const autoposConcerned = participants.filter(p => (p.scores?.[rcId] || p.avgAutoposScore || 3) < target).length;
      if (autoposConcerned > participants.length * 0.3) triangSources++;
      const obsConcerned = participants.filter(p => p.hasVisit && (p.realityScores?.[rcId] ?? 3) < target).length;
      if (obsConcerned > 0) triangSources++;
      // Transfer and docs MEN: heuristic
      if (deficit > 2.0) triangSources++; // Severity signal
      if (pctConcerned > 70) triangSources++; // Mass signal

      return {
        id: rcId,
        label: store.competences[rcId] || rcId,
        score: score,
        deficit,
        pctConcerned,
        triangulation: Math.min(4, triangSources),
      };
    })
    .filter(d => d.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit);
  }, [rcIds, heatmapData, participants, store.competences, store.referential]);

  // ═══ Outil 3.4 — Causal Diagnostics Setup ═══
  const reliabilitySummary = useMemo(
    () => (participants?.length ? summarizeReliabilityABC(participants) : null),
    [participants]
  );

  const handleDiagnosticsMetaChange = React.useCallback((meta) => {
    // Basic guard: don't update if signature is identical to what we already have
    if (workflowData.step3?.causalDiagnostics?._orderSignature === meta._orderSignature) return;
    updateWorkflowData(3, { causalDiagnostics: meta });
  }, [updateWorkflowData, workflowData.step3?.causalDiagnostics]);

  // ═══ Outil 3.5 — Eisenhower Scatter Data ═══
  const impactThreshold = store.riskThresholds?.high || 70;
  const urgencyThreshold = store.riskThresholds?.urgency || 2.5;

  const allUrgencyData = useMemo(() => {
    if (!advancedStats?.circosData) return [];
    return Object.entries(advancedStats.circosData).flatMap(([circo, data]) => 
      (data.urgencyData || []).filter(d => selectedRCs.includes(d.id))
    ).map(d => ({ ...d, z: d.impact, circo: d.circo || circo }));
  }, [advancedStats, selectedRCs]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const isMulti = payload.length > 1;
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[200px] backdrop-blur-md pointer-events-none">
          <div className="flex flex-col gap-1 mb-3 border-b border-white/10 pb-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isMulti ? 'Analyse Comparative' : (data.circo || 'Territoire')}</p>
             <p className="text-xs font-black uppercase leading-tight">{data.name || data.subject || data.id}</p>
          </div>
          <div className="space-y-2">
            {payload.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center gap-6">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{item.name}</span>
                 </div>
                 <span className="text-xs font-black mono-label" style={{ color: item.color || item.fill }}>{typeof item.value === 'number' ? item.value.toFixed(1) : item.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const triangLabels = ['✓', '✓✓', '✓✓✓', '✓✓✓✓'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header */}
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl">
          <BarChart3 size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">3. Déficits Réels</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            Sur quelles compétences mon groupe est-il déficitaire ?
          </p>
        </div>
      </div>

      {/* ═══ OUTIL 3.1 — Heatmap ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Heatmap des Déficits</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 px-2 font-black text-slate-400 uppercase text-[8px] w-20"></th>
                {rcIds.map(rc => (
                  <th key={rc} className="text-center py-2 px-1 font-black text-slate-600 uppercase text-[8px] min-w-[44px]">{rc}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...circos, 'GLOBAL'].map(row => (
                <tr key={row} className={row === 'GLOBAL' ? 'border-t-2 border-slate-300 font-black' : ''}>
                  <td className="py-1.5 px-2 font-black text-slate-700 text-[10px] uppercase">{row === 'GLOBAL' ? 'GLOBAL' : row.slice(0, 6)}</td>
                  {rcIds.map(rc => {
                    const val = heatmapData[row]?.[rc] || 0;
                    const heat = getHeatStyle(val);
                    return (
                      <td key={rc} className="py-1 px-0.5 text-center">
                        <div className={`${heat.bg} ${heat.text} rounded-lg py-1.5 px-1 text-[10px] font-black transition-all hover:scale-110 cursor-default`}>
                          {val.toFixed(1)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 pt-2">
          {HEAT_COLORS.map(h => (
            <div key={h.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${h.bg}`} />
              <span className="text-[8px] font-bold text-slate-400 uppercase">{h.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ OUTIL 3.2, 3.3, 3.5 — Vue Analytique Combinée ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        {/* Top Header & View Switcher */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="px-5 py-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Diagnostic Actif</span>
            </div>
          </div>
          <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm gap-1">
            {[
              { id: 'matrix', label: 'Eisenhower', icon: LayoutGrid },
              { id: 'radar', label: 'Radar Diagnostic', icon: Compass },
              { id: 'bar', label: 'Ranking Urgence', icon: BarChart2 },
            ].map(mode => (
              <button 
                key={mode.id} 
                onClick={() => setChartMode(mode.id)} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMode === mode.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <mode.icon size={12} /> {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
          {/* Main Chart Area */}
          <div className="lg:col-span-8 p-8 border-r border-slate-100">
            <div className="h-[500px] w-full" style={{ minHeight: '500px' }}>
              {chartMode === 'matrix' ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <ReferenceArea ifOverflow="hidden" x1={0} x2={impactThreshold} y1={urgencyThreshold} y2={5} fill="#fff7ed" fillOpacity={0.3} label={{ value: 'ZONE TACTIQUE', position: 'insideTopLeft', fill: '#d97706', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                    <ReferenceArea ifOverflow="hidden" x1={impactThreshold} x2={100} y1={urgencyThreshold} y2={5} fill="#fff1f2" fillOpacity={0.4} label={{ value: 'URGENCE CRITIQUE', position: 'insideTopRight', fill: '#e11d48', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                    <ReferenceArea ifOverflow="hidden" x1={0} x2={impactThreshold} y1={0} y2={urgencyThreshold} fill="#f0fdf4" fillOpacity={0.3} label={{ value: 'ZONE DE CONFORT', position: 'insideBottomLeft', fill: '#059669', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                    <ReferenceArea ifOverflow="hidden" x1={impactThreshold} x2={100} y1={0} y2={urgencyThreshold} fill="#eef2ff" fillOpacity={0.3} label={{ value: 'ZONE STRATÉGIQUE', position: 'insideBottomRight', fill: '#4f46e5', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                    <XAxis type="number" dataKey="impact" domain={[0, 100]} stroke="#cbd5e1" fontSize={10} tickFormatter={(v) => `${v}%`} label={{ value: 'INTENSITÉ %', position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <YAxis type="number" dataKey="urgency" domain={[0, 5]} stroke="#cbd5e1" fontSize={10} label={{ value: 'URGENCE (GAP)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <ZAxis type="number" dataKey="z" range={[100, 1500]} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} isAnimationActive={false} />
                    <Scatter name="RC Data" data={allUrgencyData} isAnimationActive={true} animationDuration={400} animationEasing="ease-out">
                      {allUrgencyData.map((entry, index) => (
                        <Cell key={`bubble-${entry.id}-${entry.circo || 'global'}`} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.6} stroke={selectedRCs.includes(entry.id) ? '#1e293b' : '#fff'} strokeWidth={selectedRCs.includes(entry.id) ? 2 : 1} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : chartMode === 'radar' ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 8 }} />
                    <Radar name="Cible" dataKey="Cible" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                    <Radar name="Global" dataKey="Global" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.15} dot={{ r: 3, fill: '#f43f5e' }} />
                    {circos.map((c, i) => (
                      <Radar key={c} name={c} dataKey={c} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={1.5} fill="none" strokeDasharray="3 3" />
                    ))}
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col h-full">
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <BarChart data={deficitRanking.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                      <XAxis type="number" domain={[0, 5]} fontSize={10} stroke="#94a3b8" />
                      <YAxis type="category" dataKey="id" fontSize={9} fontWeight={700} width={40} />
                      <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {deficitRanking.slice(0, 10).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Expandable Targets Area */}
            <div className={`mt-8 border-t border-slate-100 pt-6 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={() => setShowTargets(!showTargets)}
                className="flex items-center justify-between w-full p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${showTargets ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 shadow-sm'}`}>
                    <ShieldCheck size={18} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">Ajustement des Cibles de Maîtrise</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Référentiel des compétences ciblées</p>
                  </div>
                </div>
                {showTargets ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
              </button>

              {showTargets && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                  {Object.keys(store.competences).filter(cid => selectedRCs.includes(cid)).map(cid => (
                    <div key={cid} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 group hover:border-indigo-100 transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{cid}</span>
                          <span className="text-[10px] font-bold text-slate-900 uppercase tracking-tight line-clamp-1">{store.competences[cid]}</span>
                        </div>
                        <span className="font-mono text-[10px] font-black text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shadow-sm">
                          {store.referential?.[cid]?.targetScore || 4.0}
                        </span>
                      </div>
                      <input 
                        type="range" min="0" max="5" step="0.5" 
                        value={store.referential?.[cid]?.targetScore || 4.0} 
                        onChange={(e) => store.updateReferentialItem(cid, { targetScore: parseFloat(e.target.value) })} 
                        className="w-full accent-indigo-500 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer mt-1" 
                      />
                    </div>
                  ))}
                  {Object.keys(store.competences).filter(cid => selectedRCs.includes(cid)).length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Aucune compétence sélectionnée</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Integrated Controls Sidebar */}
          <div className="lg:col-span-4 bg-slate-50/50 p-8 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg"><Sliders size={16} /></div>
              <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Console Pilotage</h3>
            </div>

            {/* Focus Circo */}
            <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Map size={12} /> Circonscriptions
                </h4>
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg transition-all ${store.strategicMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300 border border-slate-200'}`}>
                    <Sparkles size={12} />
                  </div>
                  <button 
                    onClick={() => store.updateStrategicMode(!store.strategicMode)} 
                    className={`relative w-8 h-4 rounded-full transition-all duration-300 flex-shrink-0 ${store.strategicMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300 ${store.strategicMode ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['National', ...Object.keys(store.crefocs)].map((c) => {
                  const isSelected = selectedCircos.includes(c);
                  return (
                    <button 
                      key={c} 
                      onClick={() => { 
                        if (c === 'National') setSelectedCircos(['National']); 
                        else { 
                          const filtered = selectedCircos.filter(item => item !== 'National'); 
                          const next = isSelected ? filtered.filter(item => item !== c) : [...filtered, c]; 
                          setSelectedCircos(next.length === 0 ? ['National'] : next); 
                        } 
                      }} 
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 hover:bg-slate-100 border-slate-200'}`}
                    >
                      {c === 'National' ? 'Global' : c}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Focus RC */}
            <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Target size={12} /> Compétences
                </h4>
                <button 
                  onClick={() => setSelectedRCs(Object.keys(store.competences))} 
                  className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors"
                >
                  Reset
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {RC_FAMILIES.map((fam, i) => {
                    const isActive = JSON.stringify(selectedRCs.sort()) === JSON.stringify(fam.ids.sort());
                    const Icon = fam.icon;
                    return (
                      <button 
                        key={i} 
                        onClick={() => setSelectedRCs(fam.ids)} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all border whitespace-nowrap ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                      >
                        <Icon size={12} className={isActive ? 'text-white' : `text-${fam.color}-500`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{fam.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.keys(store.competences).map(cid => {
                    const isSelected = selectedRCs.includes(cid);
                    return (
                      <button 
                        key={cid} 
                        onClick={() => { if (isSelected) setSelectedRCs(selectedRCs.filter(id => id !== cid)); else setSelectedRCs([...selectedRCs, cid]); }} 
                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black transition-all border ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                      >
                        {cid}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-200" />

            {/* Thresholds */}
            <div className={`space-y-5 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-rose-500" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sensibilité</span>
                  </div>
                  <span className="font-mono text-sm font-black text-rose-600">{urgencyThreshold.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.1" max="4.0" step="0.1" 
                  value={urgencyThreshold} 
                  onChange={(e) => store.updateRiskThresholds({ urgency: parseFloat(e.target.value) })} 
                  className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer accent-rose-600 rounded-full" 
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Masse</span>
                  </div>
                  <span className="font-mono text-sm font-black text-indigo-600">{impactThreshold}%</span>
                </div>
                <input 
                  type="range" min="10" max="95" step="5" 
                  value={impactThreshold} 
                  onChange={(e) => store.updateRiskThresholds({ high: parseInt(e.target.value) })} 
                  className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer accent-indigo-600 rounded-full" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ OUTIL 3.4 — Causal Diagnostics ═══ */}
      <CausalDiagnosticPanel 
        store={store} 
        participants={participants} 
        selectedRCs={selectedRCs} 
        onDiagnosticsMetaChange={handleDiagnosticsMetaChange} 
        robustness={robustness} 
        reliabilitySummary={reliabilitySummary} 
        isWorkflowMode={true}
        hideResults={true} 
      />

      {/* ═══ OUTIL 3.5 — Matrice Urgence × Impact (Déplacée de l'étape 4) ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
             <Zap size={20} className="text-amber-500" /> Matrice Urgence × Impact
           </h3>
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Synthèse Territoriale</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { q: 'critical', label: 'Priorité Absolue', subtitle: 'Urgence élevée + Impact large', bg: 'bg-rose-50', border: 'border-rose-200', accent: 'text-rose-600' },
            { q: 'urgent', label: 'Urgent', subtitle: 'Urgence élevée + Impact ciblé', bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-600' },
            { q: 'impactful', label: 'Fort impact', subtitle: 'Urgence modérée + Impact large', bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'text-indigo-600' },
            { q: 'monitor', label: 'Surveillance', subtitle: 'Déficit mineur', bg: 'bg-slate-50', border: 'border-slate-100', accent: 'text-slate-500' },
          ].map(quad => {
            const items = allUrgencyData.filter(d => {
               const isUrgent = d.urgency >= urgencyThreshold;
               const isImpactful = d.impact >= impactThreshold;
               if (quad.q === 'critical') return isUrgent && isImpactful;
               if (quad.q === 'urgent') return isUrgent && !isImpactful;
               if (quad.q === 'impactful') return !isUrgent && isImpactful;
               return !isUrgent && !isImpactful;
            });
            return (
              <div key={quad.q} className={`p-5 rounded-3xl border transition-all hover:shadow-md ${quad.bg} ${quad.border} space-y-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${quad.accent}`}>{quad.label}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{quad.subtitle}</p>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 bg-white/50 px-2 py-0.5 rounded-lg">{items.length}</span>
                </div>
                <div className="space-y-1">
                  {items.length > 0 ? items.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-white/80 rounded-xl px-3 py-2 border border-white shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-[10px]">{d.id}</span>
                        <span className="text-[8px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{store.competences[d.id]?.split(' — ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-slate-400">U:{d.urgency.toFixed(1)}</span>
                        <div className="w-px h-3 bg-slate-200" />
                        <span className="text-[9px] font-black text-slate-400">I:{d.impact}%</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[9px] font-bold text-slate-300 italic py-2">Aucun point de vigilance dans ce quadrant</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation */}
      <StepValidationFooter
        stepId={3}
        isValidated={stepValidation?.validated}
        onValidate={() => onValidate(3)}
        onInvalidate={onInvalidate}
        validationChecks={[
          { label: 'La heatmap reflète ma connaissance terrain', checked: checks.heatmap, onChange: v => setChecks(p => ({ ...p, heatmap: v })) },
          { label: 'Le classement des urgences est validé', checked: checks.classement, onChange: v => setChecks(p => ({ ...p, classement: v })) },
          { label: 'L\'arbre causal correspond à ce que j\'observe sur le terrain', checked: checks.arbre, onChange: v => setChecks(p => ({ ...p, arbre: v })) },
          { label: 'La cause racine identifiée est pédagogiquement juste', checked: checks.racine, onChange: v => setChecks(p => ({ ...p, racine: v })) },
          { label: 'La recommandation d\'ordre T1/T2/T3 est validée', checked: checks.ordre, onChange: v => setChecks(p => ({ ...p, ordre: v })) },
        ]}
      />
    </div>
  );
}
