import React from 'react'; // v4-comparative-sync
import { 
  Target, AlertCircle, ShieldCheck, Users, 
  ChevronRight, ArrowRight, Settings, Sliders, Sparkles, Activity, Compass, BarChart2, Zap, Layout, Layers, BarChart3, LayoutGrid, Rocket, Network,
  ShieldAlert, Eye, EyeOff, Info, X, HelpCircle, Map, ChevronLeft, ArrowLeft
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, 
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell, ReferenceArea, ReferenceLine
} from 'recharts';
import { EngineeringCatalogue } from './EngineeringCatalogue';
import { CompetencyCorrelationHeatmap } from './CompetencyCorrelationHeatmap';
import { EffortImpactMatrix } from './EffortImpactMatrix';
import { DecisionBreadcrumb } from './DecisionBreadcrumb';
import { DecisionArbitrageHub } from './DecisionArbitrageHub';
import { CausalDiagnosticPanel } from './CausalDiagnosticPanel';
import { 
  calculateRobustnessIndex, 
  summarizeReliabilityABC,
  getRobustnessMultiplier 
} from '../../../utils/causalEngine';

const CHART_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'
];

export function TerritorialPortal({ 
  store,
  selectedCircos,
  setSelectedCircos,
  advancedStats,
  triangulationIndex,
  participants,
  recommendedFormations,
  onOpenSession,
  handleUpdate,
  selectedRCs,
  setSelectedRCs,
  topUrgencyRC,
  demandIntensity,
  tacticalIGE
}) {
  const [sidebarMode, setSidebarMode] = React.useState('selection'); // 'selection' | 'targets'
  const [hoveredRC, setHoveredRC] = React.useState(null);
  const [chartMode, setChartMode] = React.useState('matrix'); // 'matrix' | 'radar' | 'bar'
  const [causalDiagnosticsMeta, setCausalDiagnosticsMeta] = React.useState(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

  const RC_FAMILIES = [
    { label: 'Pédagogie', icon: Target, color: 'blue', ids: ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6'] },
    { label: 'Évaluation', icon: Activity, color: 'rose', ids: ['RC7', 'RC8'] },
    { label: 'Inclusion', icon: Users, color: 'amber', ids: ['RC9'] },
    { label: 'Innovation', icon: Compass, color: 'purple', ids: ['RC10', 'RC11', 'RC12'] },
  ];

  // --- ROBUSTNESS LOGIC ---
  const robustness = React.useMemo(() => {
    if (!participants || !participants.length || !store.enseignants) return null;
    const realTotals = { Global: store.enseignants.length };
    const circosList = [...new Set(store.enseignants.map((p) => p['Circonscription']))];
    circosList.forEach((c) => {
      realTotals[c] = store.enseignants.filter((p) => p['Circonscription'] === c).length;
    });
    const currentCirco = selectedCircos.includes('National') ? 'Global' : selectedCircos[0];
    const totalInScope = realTotals[currentCirco] || participants.length;
    const index = calculateRobustnessIndex(participants, totalInScope);
    if (index.quorum > 1) index.quorum = 1;
    return { ...index, currentCirco, totalInScope, sampleSize: participants.length };
  }, [participants, store.enseignants, selectedCircos]);

  const reliabilitySummary = React.useMemo(
    () => (participants?.length ? summarizeReliabilityABC(participants) : null),
    [participants]
  );

  const quorumWeak = robustness?.level === 'insufficient';

  // --- DYNAMIC THRESHOLDS ---
  const impactThreshold = store.riskThresholds?.high || 70;
  const urgencyThreshold = store.riskThresholds?.urgency || 2.5; 

  const allUrgencyData = React.useMemo(() => {
    if (!advancedStats?.circosData) return [];
    return Object.entries(advancedStats.circosData).flatMap(([circo, data]) => 
      (data.urgencyData || []).filter(d => selectedRCs.includes(d.id))
    ).map(d => ({ ...d, z: d.impact }));
  }, [advancedStats, selectedRCs]);

  const radarData = React.useMemo(() => {
    if (!advancedStats?.circosData) return [];
    const rcs = selectedRCs;
    const circosEntries = Object.entries(advancedStats.circosData);
    return rcs.map(rcId => {
      const row = { name: store.competences[rcId]?.split(' — ')[0] || rcId, id: rcId };
      let totalUrgency = 0; let count = 0;
      circosEntries.forEach(([circo, data]) => {
        const rcData = data.urgencyData.find(d => d.id === rcId);
        if (rcData) { row[circo] = rcData.urgency; totalUrgency += rcData.urgency; count++; }
        else { row[circo] = 0; }
      });
      row['Global'] = count > 0 ? totalUrgency / count : 0;
      return row;
    });
  }, [advancedStats, selectedRCs, store.competences]);

  const rankingData = React.useMemo(() => {
    return radarData.map(d => ({ id: d.id, name: d.name, urgency: d.Global })).sort((a, b) => b.urgency - a.urgency);
  }, [radarData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const isMulti = payload.length > 1;
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[200px] backdrop-blur-md pointer-events-none">
          <div className="flex flex-col gap-1 mb-3 border-b border-white/10 pb-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isMulti ? 'Analyse Comparative' : (data.circo || 'Territoire')}</p>
             <p className="text-xs font-black uppercase leading-tight">{data.name || data.subject}</p>
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

  const globalKPIs = React.useMemo(() => {
    const circos = Object.keys(advancedStats?.circosData || {});
    if (circos.length === 0) return { ige: '0.0', ch: '0' };
    const totalIge = circos.reduce((acc, c) => acc + parseFloat(advancedStats.circosData[c].ige || 0), 0);
    const avgIge = (totalIge / circos.length).toFixed(1);
    const allIges = circos.map(c => parseFloat(advancedStats.circosData[c].ige || 0));
    const mean = allIges.reduce((a, b) => a + b, 0) / allIges.length;
    const variance = allIges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / allIges.length;
    const ch = circos.length > 1 ? Math.round((Math.sqrt(variance) / (mean || 1)) * 100) : 0;
    return { ige: avgIge, ch };
  }, [advancedStats]);

  const decisionMetrics = React.useMemo(() => {
    const urgencies = (advancedStats?.circosData ? Object.entries(advancedStats.circosData).flatMap(([c, d]) => d.urgencyData || []) : []).sort((a, b) => b.urgency - a.urgency);
    const quickWins = recommendedFormations.filter(f => {
       const targeted = f.targetedComps || ['RC1', 'RC2'];
       const teacherAverages = participants.map(p => {
         const compScores = targeted.map(rcId => p.realityScores?.[rcId] ?? 3);
         return compScores.length ? compScores.reduce((a, b) => a + b, 0) / compScores.length : 3;
       });
       const avgTerritory = teacherAverages.reduce((a, b) => a + b, 0) / (teacherAverages.length || 1);
       const impact = Math.min(100, Math.max(0, 5 - avgTerritory) * 20);
       return impact > 50;
    });
    return { topUrgency: urgencies[0]?.id || null, quickWinCount: quickWins.length, quickWins: quickWins.slice(0, 5) };
  }, [advancedStats, recommendedFormations, participants]);

  const hybridOps = React.useMemo(() => {
    if (!decisionMetrics.quickWins.length) return [];
    const ops = [];
    decisionMetrics.quickWins.forEach(qw => {
       recommendedFormations.forEach(other => {
          if (qw.id === other.id) return;
          const qwComps = qw.targetedComps || [];
          const otherComps = other.targetedComps || [];
          let totalCorr = 0, count = 0;
          qwComps.forEach(rcA => {
             otherComps.forEach(rcB => { if (rcA === rcB) { totalCorr += 1; count++; } else { totalCorr += 0.4; count++; } });
          });
          const score = count > 0 ? (totalCorr / count) : 0;
          if (score > 0.6) ops.push({ source: qw, target: other, score });
       });
    });
    return ops.sort((a,b) => b.score - a.score).slice(0, 2);
  }, [decisionMetrics.quickWins, recommendedFormations]);

  return (
    <div className="space-y-12">
      <style>{`
        .mono-label { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        @keyframes glow-pulse {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.4)); }
          50% { opacity: 0.7; filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.8)); }
        }
        .glow-pulse { animation: glow-pulse 3s infinite ease-in-out; }
        
        .left-scrollbar {
          direction: rtl;
          scrollbar-gutter: stable;
        }
        .left-scrollbar > * {
          direction: ltr;
        }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .sidebar-locked-height { 
          height: 920px !important; 
          max-height: 920px !important; 
        }
      `}</style>
      
      {/* TOP NAV */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] p-2.5 border border-slate-200/60 shadow-2xl flex items-center justify-between sticky top-4 z-[100] mx-4">
        <div className="flex bg-slate-100/50 rounded-3xl p-1 gap-1 overflow-x-auto scrollbar-hide border border-slate-200/40">
           {['National', ...Object.keys(store.crefocs)].map(c => {
             const isSelected = selectedCircos.includes(c);
             return (
               <button key={c} onClick={() => { if (c === 'National') setSelectedCircos(['National']); else { const filtered = selectedCircos.filter(item => item !== 'National'); const next = isSelected ? filtered.filter(item => item !== c) : [...filtered, c]; setSelectedCircos(next.length === 0 ? ['National'] : next); } }} className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${isSelected ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-900 hover:bg-white'}`}>{c === 'National' ? 'Global' : c}</button>
             );
           })}
        </div>
        <div className="px-6 py-2.5 bg-slate-50 rounded-3xl border border-slate-200 flex items-center gap-4">
           <div className="text-right"><p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Scope</p><p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{selectedCircos.includes('National') ? 'Territoire' : selectedCircos.join(' + ')}</p></div>
           <Compass size={20} className="text-slate-300" />
        </div>
      </div>

      <div className="mx-4"><DecisionBreadcrumb store={store} globalKPIs={globalKPIs} topUrgency={decisionMetrics.topUrgency} topCorrelation={null} quickWinCount={decisionMetrics.quickWinCount} /></div>

      {/* PHASE 1 */}
      <div className="mx-4">
        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-900 text-white shadow-lg"><ShieldAlert size={24} /></div><div><h3 className="text-xl font-black text-slate-900 uppercase">1. Robustesse Statistique</h3><div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Triangulation RCET v2.2</p></div></div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-center gap-2 shadow-inner"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Indice de Confiance</span><div className="flex items-center gap-3"><div className="p-2 rounded-xl bg-white shadow-sm" style={{ color: robustness?.color }}>{robustness?.level === 'robust' ? <ShieldCheck size={20} /> : <Zap size={20} />}</div><span className="text-xl font-black text-slate-900">{robustness?.label}</span></div></div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col justify-center gap-4 shadow-inner"><div className="flex justify-between items-end"><span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quorum</span><span className="text-xl font-black text-slate-900 mono-label">{Math.round((robustness?.quorum || 0) * 100)}%</span></div><div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden"><div className="h-full transition-all duration-1000" style={{ width: `${Math.min(100, (robustness?.quorum || 0) * 100)}%`, backgroundColor: robustness?.color }} /></div></div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-5 shadow-inner"><Info size={20} className="text-indigo-500 flex-shrink-0" /><p className="text-[11px] font-bold text-slate-600 leading-normal italic">Calculé sur {robustness?.sampleSize} diagnostics actifs pour {robustness?.totalInScope} inscrits.</p></div>
          </div>

          <div className="mt-4 p-8 bg-slate-50/50 rounded-[32px] border border-slate-100 shadow-inner">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* ÉCHANTILLONNAGE DÉVELOPPÉ */}
                <div className="space-y-4">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Échantillonnage & Quorum</p>
                   <div className="flex items-end gap-3"><span className="text-3xl font-black text-slate-900 mono-label">{Math.round((robustness?.quorum || 0) * 100)}%</span><span className="text-slate-400 text-[10px] font-bold mb-1.5 uppercase tracking-tighter">de représentativité</span></div>
                   <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex"><div className="h-full transition-all duration-1000" style={{ width: `${Math.round((robustness?.quorum || 0) * 100)}%`, backgroundColor: robustness?.color }} /></div>
                   <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Auto-pos.</p><p className="text-xs font-bold text-slate-900">{robustness?.sourcePercentages?.auto}%</p></div>
                      <div className="space-y-1"><p className="text-[8px] font-black text-slate-400 uppercase">Obs. Terrain</p><p className="text-xs font-bold text-slate-900">{robustness?.sourcePercentages?.obs}%</p></div>
                   </div>
                </div>

                {/* FIABILITÉ DÉVELOPPÉE */}
                <div className="space-y-4 lg:col-span-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fiabilité du Diagnostic Causal</p>
                   <div className="grid grid-cols-3 gap-6">
                      {reliabilitySummary?.dist && Object.entries(reliabilitySummary.dist).map(([cat, val]) => {
                         const percentage = reliabilitySummary.pct[cat];
                         return (
                            <div key={cat} className="space-y-2">
                               <div className="flex justify-between items-end">
                                  <span className={`text-[11px] font-black ${cat === 'A' ? 'text-emerald-500' : cat === 'B' ? 'text-amber-500' : 'text-slate-400'}`}>NIVEAU {cat}</span>
                                  <span className="text-[10px] font-black text-slate-900">{percentage}%</span>
                               </div>
                               <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${cat === 'A' ? 'bg-emerald-500' : cat === 'B' ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${percentage}%` }} /></div>
                               <p className="text-[8px] text-slate-400 font-bold uppercase leading-tight">
                                  {cat === 'A' ? 'Double Preuve (Auto+Obs)' : cat === 'B' ? 'Source Unique' : 'Donnée Indicative'}
                                </p>
                            </div>
                         );
                      })}
                   </div>
                   <div className="mt-4 p-3 bg-white/50 rounded-2xl border border-slate-200/50 flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${robustness?.level === 'robust' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <p className="text-[9px] font-bold text-slate-500 italic">L&apos;indice de confiance global est estimé à <span className="text-slate-900 not-italic">{Math.min(100, ( (reliabilitySummary?.pct?.A || 0) * 1.0 + (reliabilitySummary?.pct?.B || 0) * 0.6 + (reliabilitySummary?.pct?.C || 0) * 0.2 )).toFixed(0)}/100</span> sur la base du mix de sources.</p>
                   </div>
                </div>

                {/* MULTIPLICATEUR */}
                <div className="space-y-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pondération IGE</p>
                   <p className="text-3xl font-black text-indigo-600 mono-label">x{getRobustnessMultiplier(robustness?.quorum || 0).toFixed(2)}</p>
                   <p className="text-[10px] text-slate-500 font-medium leading-tight">Ajustement automatique des scores d&apos;urgence selon la solidité des preuves collectées.</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* PHASE 2 */}
      <div className="mx-4 space-y-6">
        <div className="flex items-center gap-6 mb-2"><div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl"><BarChart3 size={32} /></div><div><h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">2. Cartographie des Urgences</h2><p className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><Zap size={14} className="text-amber-500" /> Segmentation & Pilotage</p></div></div>

        <div className="bg-[#F8FAFC] rounded-[48px] shadow-2xl border border-slate-200/40 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 sidebar-locked-height">
            
            {/* LEFT COLUMN: CONTEXTUAL SIDEBAR */}
            <div className="lg:col-span-3 bg-white border-r border-slate-200/60 p-8 flex flex-col h-[920px] max-h-[920px] relative z-[50] overflow-visible">
              
              {sidebarMode === 'selection' && 
                <div className="flex flex-col h-full overflow-visible animate-in slide-in-from-left-4 duration-500">
                  <div className="mb-8 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg"><Sliders size={16} /></div>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Console Stratégique</h3>
                  </div>
                  
                  <div className="flex-1 overflow-visible pr-1 min-h-0 space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Map size={12} /> Focus par Circonscription</h4>
                      <div className="grid grid-cols-2 gap-2">
                          {['National', ...Object.keys(store.crefocs)].map((c) => {
                            const isSelected = selectedCircos.includes(c);
                            return (
                              <button key={c} onClick={() => { if (c === 'National') setSelectedCircos(['National']); else { const filtered = selectedCircos.filter(item => item !== 'National'); const next = isSelected ? filtered.filter(item => item !== c) : [...filtered, c]; setSelectedCircos(next.length === 0 ? ['National'] : next); } }} className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border-transparent'}`}>
                                {c === 'National' ? 'Global' : c}
                              </button>
                            )
                          })}
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-2" />
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><LayoutGrid size={12} /> Focus par Famille</h4>
                      <div className="flex flex-col gap-2">
                          <button 
                            onClick={() => setSelectedRCs(Object.keys(store.competences))} 
                            className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${selectedRCs.length === Object.keys(store.competences).length ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'}`}
                          >
                            <LayoutGrid size={14} className={selectedRCs.length === Object.keys(store.competences).length ? 'text-white' : 'text-slate-500'} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Vue Globale</span>
                          </button>

                          {RC_FAMILIES.map((fam, i) => {
                            const isActive = JSON.stringify(selectedRCs.sort()) === JSON.stringify(fam.ids.sort());
                            return (
                              <button key={i} onClick={() => setSelectedRCs(fam.ids)} className={`flex items-center gap-4 p-3 rounded-2xl transition-all border ${isActive ? 'bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]' : 'bg-white border-transparent text-slate-400 hover:bg-slate-50'}`}>
                                <fam.icon size={14} className={isActive ? 'text-white' : `text-${fam.color}-500`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">{fam.label}</span>
                              </button>
                            )
                          })}
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-2" />
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Target size={12} /> Focus par Compétence</h4>
                            <button onClick={() => setSelectedRCs(Object.keys(store.competences))} className="text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-colors">Tout sélectionner</button>
                        </div>
                        <div className="grid grid-cols-4 gap-1 p-1">
                          {Object.keys(store.competences).map(cid => {
                            const isSelected = selectedRCs.includes(cid);
                            return (
                               <button 
                                 key={cid} 
                                 onClick={() => { if (isSelected) setSelectedRCs(selectedRCs.filter(id => id !== cid)); else setSelectedRCs([...selectedRCs, cid]); }} 
                                 onDoubleClick={() => setSelectedRCs([cid])}
                                 onMouseEnter={() => setHoveredRC(cid)}
                                 onMouseLeave={() => setHoveredRC(null)}
                                 className={`relative py-1.5 rounded-xl text-[10px] font-black transition-all border ${isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                               >
                                 {cid}
                                 {hoveredRC === cid && (
                                   <div className="absolute bottom-full left-0 mb-3 px-3 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-xl text-[10px] font-bold shadow-2xl z-[100] border border-white/10 animate-in fade-in zoom-in-95 duration-200 pointer-events-none min-w-[140px] max-w-[200px] leading-tight">
                                     <div className="flex flex-col items-start gap-0.5">
                                       <span className="text-indigo-400 text-[8px] uppercase tracking-tighter">{cid}</span>
                                       <span className="tracking-tight">{store.competences[cid]}</span>
                                     </div>
                                     <div className="absolute top-full left-4 border-[6px] border-transparent border-t-slate-900/95" />
                                   </div>
                                 )}
                               </button>
                            )
                          })}
                        </div>
                    </div>
                  </div>


                  <div className="pt-6 border-t border-slate-100 shrink-0">
                     <button onClick={() => setSidebarMode('targets')} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all"><Target size={12} /> Accéder au Référentiel des Cibles</button>
                  </div>
                </div>
              }

              {sidebarMode === 'targets' && (
                <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-500 overflow-hidden">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100 shrink-0">
                     <button onClick={() => setSidebarMode('selection')} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all"><ChevronLeft size={16} /></button>
                     <div><h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Cibles de Maîtrise</h4><p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">Référentiel</p></div>
                  </div>
                  
                  {/* LEFT SCROLLBAR CONTAINER */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden left-scrollbar my-6 pl-5">
                     <div className="space-y-2 pr-1">
                        {Object.keys(store.competences).map(cid => (
                          <div key={cid} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-100 hover:bg-white transition-all">
                             <div className="flex justify-between items-start mb-1.5">
                                <div className="flex flex-col">
                                   <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{cid}</span>
                                   <span className="text-[11px] font-bold text-slate-900 uppercase tracking-tighter leading-tight">{store.competences[cid]}</span>
                                </div>
                                <span className="mono-label text-[10px] font-black text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-100">{store.referential?.[cid]?.targetScore || 4.0}</span>
                             </div>
                             <input type="range" min="0" max="5" step="0.5" value={store.referential?.[cid]?.targetScore || 4.0} onChange={(e) => store.updateReferentialItem(cid, { targetScore: parseFloat(e.target.value) })} className="w-full accent-indigo-500 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer" />
                          </div>
                        ))}
                     </div>
                  </div>
                  
                  <button onClick={() => setSidebarMode('selection')} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shrink-0"><ShieldCheck size={14} /> Valider la Stratégie</button>
                </div>
              )}
            </div>

            {/* CANVAS */}
            <div className="lg:col-span-7 p-10 flex flex-col gap-8 bg-slate-50/30 h-[920px] max-h-[920px] overflow-visible">
               <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-30">
                  <div className="px-5 py-2.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Diagnostic Actif</span></div>
                  <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-sm gap-1">
                     {[
                       { id: 'matrix', label: 'Eisenhower', icon: LayoutGrid },
                       { id: 'radar', label: 'Radar Diagnostic', icon: Compass },
                       { id: 'bar', label: 'Ranking Urgence', icon: BarChart2 },
                     ].map(mode => (
                       <button key={mode.id} onClick={() => setChartMode(mode.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMode === mode.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><mode.icon size={12} /> {mode.label}</button>
                     ))}
                  </div>
               </div>

              <div className="flex-1 bg-white rounded-[48px] border border-slate-200/60 shadow-2xl relative p-10 flex flex-col min-h-[450px] overflow-visible">
                 <div className="flex-1 w-full h-full min-h-0 relative z-10">
                    {chartMode === 'matrix' ? (
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <ReferenceArea x1={0} x2={impactThreshold} y1={urgencyThreshold} y2={5} fill="#fff7ed" fillOpacity={0.3} label={{ value: 'ZONE TACTIQUE', position: 'insideTopLeft', fill: '#d97706', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                          <ReferenceArea x1={impactThreshold} x2={100} y1={urgencyThreshold} y2={5} fill="#fff1f2" fillOpacity={0.4} label={{ value: 'URGENCE CRITIQUE', position: 'insideTopRight', fill: '#e11d48', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                          <ReferenceArea x1={0} x2={impactThreshold} y1={0} y2={urgencyThreshold} fill="#f0fdf4" fillOpacity={0.3} label={{ value: 'ZONE DE CONFORT', position: 'insideBottomLeft', fill: '#059669', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                          <ReferenceArea x1={impactThreshold} x2={100} y1={0} y2={urgencyThreshold} fill="#eef2ff" fillOpacity={0.3} label={{ value: 'ZONE STRATÉGIQUE', position: 'insideBottomRight', fill: '#4f46e5', fontSize: 10, fontWeight: 900, opacity: 0.2, offset: 20 }} />
                          <XAxis type="number" dataKey="impact" domain={[0, 100]} stroke="#cbd5e1" fontSize={10} tickFormatter={(v) => `${v}%`} label={{ value: 'INTENSITÉ %', position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                          <YAxis type="number" dataKey="urgency" domain={[0, 5]} stroke="#cbd5e1" fontSize={10} label={{ value: 'URGENCE (GAP)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                          <ZAxis type="number" dataKey="z" range={[100, 1500]} />
                          <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} isAnimationActive={false} />
                          {/* STABLE KEY & SMOOTH ANIMATION */}
                          <Scatter 
                            name="RC Data"
                            data={allUrgencyData} 
                            isAnimationActive={true}
                            animationDuration={400}
                            animationEasing="ease-out"
                          >
                            {allUrgencyData.map((entry, index) => (
                              <Cell 
                                key={`bubble-${entry.id}-${entry.circo || 'global'}`} 
                                fill={CHART_COLORS[index % CHART_COLORS.length]} 
                                fillOpacity={0.6} 
                                stroke={selectedRCs.includes(entry.id) ? '#1e293b' : '#fff'} 
                                strokeWidth={selectedRCs.includes(entry.id) ? 2 : 1} 
                              />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : chartMode === 'radar' ? (
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <RadarChart cx="50%" cy="50%" outerRadius="85%" data={radarData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                          <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 8 }} />
                          <Radar name="Territoire" dataKey="Global" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.5} dot={{ r: 4, fill: '#f43f5e', stroke: '#fff' }} />
                          <RechartsTooltip content={<CustomTooltip />} />
                        </RadarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <BarChart data={rankingData} layout="vertical" margin={{ left: 40, right: 30, top: 10, bottom: 10 }}>
                          <XAxis type="number" domain={[0, 5]} fontSize={10} stroke="#94a3b8" />
                          <YAxis type="category" dataKey="id" fontSize={9} fontWeight={700} width={40} />
                          <Bar dataKey="urgency" radius={[0, 4, 4, 0]}>
                            {rankingData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                 </div>

                  <div className="mt-8 p-5 bg-slate-900 rounded-[40px] flex flex-col xl:flex-row items-center gap-4 shadow-2xl relative z-20 border border-white/10 overflow-visible">
                     <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                     
                     <div className="flex items-center gap-6 flex-1 w-full">

                        
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-3 mb-3">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Analyseur d&apos;Intention Stratégique</p>
                              {selectedRCs.length > 0 && (
                                 <div className="px-2 py-0.5 bg-indigo-500/20 rounded-md border border-indigo-500/30">
                                    <span className="text-[9px] font-black text-indigo-200 uppercase">{selectedRCs.length} Compétences</span>
                                 </div>
                              )}
                           </div>
                           
                           {selectedRCs.length > 0 ? (
                             <div className="flex flex-wrap gap-2 max-h-[80px] overflow-y-auto pr-2 scrollbar-hide">
                                {selectedRCs.map(rcId => (
                                  <div key={rcId} className="group flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{rcId}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedRCs(selectedRCs.filter(id => id !== rcId)); }} className="text-slate-500 group-hover:text-rose-400 transition-colors">
                                       <X size={12} />
                                    </button>
                                  </div>
                                ))}
                             </div>
                           ) : (
                             <p className="text-sm text-slate-400 italic font-medium">Sélectionnez des points sur la matrice pour activer l&apos;analyse...</p>
                           )}
                        </div>
                     </div>

                     {selectedRCs.length > 0 && (
                        <div className="flex items-center gap-6 pl-6 border-l border-white/10 w-full xl:w-auto">
                           <div className="text-center">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Urgence Moyenne</p>
                              <p className="text-2xl font-black text-white mono-label">
                                 {(rankingData.filter(d => selectedRCs.includes(d.id)).reduce((acc, d) => acc + d.urgency, 0) / selectedRCs.length).toFixed(1)}
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
              </div>
            </div>

            {/* RIGHT COLUMN: SCOPE */}
            <div className="lg:col-span-2 bg-white border-l border-slate-200/60 p-6 flex flex-col gap-10 h-[920px] max-h-[920px] overflow-visible">
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><Settings size={12} /> Réglages</h4>
                

                <div className="space-y-4">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intelligence</p>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                       <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg transition-all ${store.strategicMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-300'}`}>
                             <Sparkles size={12} />
                          </div>
                          <p className="text-[8px] font-black text-slate-900 uppercase tracking-wider leading-tight">Mode Stratégique</p>
                       </div>
                       <button onClick={() => store.updateStrategicMode(!store.strategicMode)} className={`relative w-8 h-4 rounded-full transition-all duration-300 flex-shrink-0 ${store.strategicMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-md transition-all duration-300 ${store.strategicMode ? 'translate-x-4' : 'translate-x-0'}`} />
                       </button>
                    </div>
                 </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                <div className="space-y-6">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sensibilité & Masse</p>
                   <div className="space-y-3">
                      <div className="flex justify-between items-end"><div className="flex items-center gap-2"><Zap size={14} className="text-rose-500" /><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sensibilité</span></div><span className="mono-label text-sm font-black text-rose-600">{urgencyThreshold.toFixed(1)}</span></div>
                      <input type="range" min="0.1" max="4.0" step="0.1" value={urgencyThreshold} onChange={(e) => store.updateRiskThresholds({ urgency: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer accent-rose-600 rounded-full" />
                   </div>
                   <div className="space-y-3">
                      <div className="flex justify-between items-end"><div className="flex items-center gap-2"><Users size={14} className="text-indigo-500" /><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Masse</span></div><span className="mono-label text-sm font-black text-indigo-600">{impactThreshold}%</span></div>
                      <input type="range" min="10" max="95" step="5" value={impactThreshold} onChange={(e) => store.updateRiskThresholds({ high: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 appearance-none cursor-pointer accent-indigo-600 rounded-full" />
                   </div>
                </div>
              </div>

              <div className="mt-auto p-5 bg-slate-900 rounded-[32px] text-white space-y-4 shadow-2xl">
                 <div className="flex items-center gap-2 text-rose-400"><Activity size={14} /><span className="text-[9px] font-black uppercase tracking-widest">IGE Global</span></div>
                 <p className="text-3xl font-black italic tracking-tighter leading-none">{tacticalIGE}</p>
                 <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-rose-500" style={{ width: `${parseFloat(tacticalIGE) * 20}%` }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 space-y-8">
          <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-2xl w-fit"><Network size={16} className="text-indigo-600" /><span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Causal Analysis Engine</span></div>
          <CausalDiagnosticPanel store={store} participants={participants} selectedRCs={selectedRCs} onDiagnosticsMetaChange={setCausalDiagnosticsMeta} robustness={robustness} reliabilitySummary={reliabilitySummary} />
      </div>

       <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000 delay-300">
        <div className="mx-4"><EffortImpactMatrix store={store} participants={participants || []} formations={recommendedFormations} selectedCircos={selectedCircos} topUrgencyRC={topUrgencyRC} /></div>
        <div className="mx-4"><CompetencyCorrelationHeatmap store={store} participants={participants || []} selectedRCs={selectedRCs} formations={recommendedFormations} quickWins={decisionMetrics.quickWins} topUrgencyRC={topUrgencyRC} /></div>
        <div id="decision-arbitrage" className="mx-4 space-y-6">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6"><div className="space-y-3"><div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit"><Zap size={12} className="text-amber-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Decision Engine</span></div><h3 className="text-3xl font-black text-slate-900 tracking-tighter">Phase 4. <span className="text-slate-400 font-light">Arbitrage & Plan d&apos;Action</span></h3></div></div>
           <DecisionArbitrageHub store={store} formations={recommendedFormations} quickWins={decisionMetrics.quickWins} hybridOps={hybridOps} onOpenSession={onOpenSession} participants={participants || []} causalDiagnostics={causalDiagnosticsMeta} />
        </div>
      </div>
    </div>
  );
}
