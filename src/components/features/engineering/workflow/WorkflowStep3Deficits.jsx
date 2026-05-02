import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Compass, TrendingDown, Map, LayoutGrid, BarChart2, 
  Sparkles, Zap, Users, ShieldCheck, Settings, Sliders, ChevronDown, ChevronUp, Eye, EyeOff,
  Target, Activity, CheckCircle, AlertTriangle
} from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { EffortImpactMatrix } from '../EffortImpactMatrix';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, Cell, ReferenceArea, ReferenceLine,
  BarChart, Bar
} from 'recharts';
import { CausalDiagnosticPanel } from '../CausalDiagnosticPanel';
import { summarizeReliabilityABC } from '../../../../utils/causalEngine';
import { CAUSAL_MAP } from '../../../../constants/causalMap';

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
const HEAT_COLORS = [
  { max: 2.0, bg: 'bg-rose-600', text: 'text-white', label: 'Critique' },
  { max: 2.5, bg: 'bg-orange-500', text: 'text-white', label: 'Significatif' },
  { max: 3.0, bg: 'bg-amber-400', text: 'text-slate-900', label: 'Modéré' },
  { max: 3.5, bg: 'bg-lime-200', text: 'text-slate-800', label: 'Vigilance' },
  { max: 5.0, bg: 'bg-slate-100', text: 'text-slate-400', label: 'Satisfaisant' },
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
  const [showEisenhowerMatrix, setShowEisenhowerMatrix] = useState(false);
  const [activeMatrixCirco, setActiveMatrixCirco] = useState('National');
  const [targetedRCs, setTargetedRCs] = useState(workflowData.step3?.targetedRCs || []);

  const handleTargetToggle = (id, circo) => {
    const key = `${id}|${circo}`;
    const next = targetedRCs.includes(key) 
      ? targetedRCs.filter(k => k !== key) 
      : [...targetedRCs, key];
    setTargetedRCs(next);
    updateWorkflowData(3, { ...workflowData.step3, targetedRCs: next });
  };

  const RC_FAMILIES = [
    { label: 'Pédagogie', icon: Target, color: 'blue', ids: ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6'] },
    { label: 'Évaluation', icon: Activity, color: 'rose', ids: ['RC7', 'RC8'] },
    { label: 'Inclusion', icon: Users, color: 'amber', ids: ['RC9'] },
    { label: 'Innovation', icon: Compass, color: 'purple', ids: ['RC10', 'RC11', 'RC12'] },
  ];

  const rcIds = Object.keys(store.competences || {});
  const circos = [...new Set(store.enseignants.map(e => e['Circonscription']))].filter(Boolean);

  // ═══ Outil 3.1 — Heatmap de Fragilité (% < 2.5) ═══
  const VIGILANCE_SCORE = 2.5;

  const heatmapData = useMemo(() => {
    const grid = {};
    const processSet = (teachers, label) => {
      grid[label] = {};
      rcIds.forEach(rcId => {
        const scores = teachers.map(p => p.realityScores?.[rcId] ?? 3);
        const inDanger = scores.filter(s => s < VIGILANCE_SCORE).length;
        const pct = scores.length > 0 ? Math.round((inDanger / scores.length) * 100) : 0;
        
        // Calcul de stabilité (Ecart-type inverse)
        const mean = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
        const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length || 1);
        const stdDev = Math.sqrt(variance);
        
        grid[label][rcId] = {
          pct,
          mean: +mean.toFixed(1),
          isSystemic: pct > 50 && stdDev < 0.8, // Majorité en difficulté avec peu de dispersion
          isScattered: pct > 30 && stdDev >= 0.8, // Beaucoup de difficulté mais profils très variés
          count: scores.length
        };
      });
    };

    circos.forEach(c => processSet(participants.filter(p => p['Circonscription'] === c), c));
    processSet(participants, 'GLOBAL');
    
    return grid;
  }, [participants, rcIds, circos]);

  // Tri des familles par fragilité moyenne
  const sortedFamilies = useMemo(() => {
    return RC_FAMILIES.map(fam => ({
      ...fam,
      avgFragility: fam.ids.reduce((sum, id) => sum + (heatmapData['GLOBAL']?.[id]?.pct || 0), 0) / fam.ids.length
    })).sort((a, b) => b.avgFragility - a.avgFragility);
  }, [heatmapData]);

  // Tri des circos par "Index de Fragilité" (Moyenne des % de difficulté)
  const sortedCircos = useMemo(() => {
    return [...circos].sort((a, b) => {
      const avgA = rcIds.reduce((sum, rc) => sum + (heatmapData[a]?.[rc]?.pct || 0), 0) / (rcIds.length || 1);
      const avgB = rcIds.reduce((sum, rc) => sum + (heatmapData[b]?.[rc]?.pct || 0), 0) / (rcIds.length || 1);
      return avgB - avgA; // Plus fragile en premier
    });
  }, [circos, rcIds, heatmapData]);

  // ═══ Outil 3.2 — Radar data ═══
  const radarData = useMemo(() => {
    return rcIds.map(rcId => {
      const row = { name: store.competences[rcId]?.split(' — ')[0] || rcId, id: rcId, Cible: store.referential?.[rcId]?.targetScore || 4.0 };
      circos.forEach(c => {
        row[c] = heatmapData[c]?.[rcId]?.mean || 0;
      });
      row['Global'] = heatmapData['GLOBAL']?.[rcId]?.mean || 0;
      return row;
    });
  }, [rcIds, circos, heatmapData, store.competences, store.referential]);

  // ═══ Outil 3.3 — Classement des déficits ═══
  const deficitRanking = useMemo(() => {
    return rcIds.map(rcId => {
      const data = heatmapData['GLOBAL']?.[rcId] || {};
      const score = data.mean || 0;
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
  }, [advancedStats, selectedRCs, store.riskThresholds]);

  const enhancedMatrixData = useMemo(() => {
    const filtered = activeMatrixCirco === 'all' ? allUrgencyData : allUrgencyData.filter(d => d.circo === activeMatrixCirco);
    return filtered.map(d => {
      const isGlobal = d.circo === 'National' || !d.circo;
      const targetScore = store.referential?.[d.id]?.targetScore || 4.0;
      let relevantParticipants = participants;
      if (!isGlobal) relevantParticipants = participants.filter(p => p['Circonscription'] === d.circo);
      
      const concernedCount = relevantParticipants.filter(p => (p.realityScores?.[d.id] ?? 3) < targetScore).length;
      
      // --- Calcul de Fiabilité par RC (Triangulation) ---
      const withBoth = relevantParticipants.filter(p => 
        (p.scores?.[d.id] != null) && (p.hasVisit && p.realityScores?.[d.id] != null)
      ).length;
      const triangulationRatio = relevantParticipants.length > 0 ? (withBoth / relevantParticipants.length) : 0;
      
      let reliability = { label: 'C', color: 'text-slate-400', bg: 'bg-slate-50', full: 'Faible coverage' };
      if (triangulationRatio > 0.4) reliability = { label: 'A', color: 'text-emerald-600', bg: 'bg-emerald-50', full: 'Haute (Double Preuve)' };
      else if (triangulationRatio > 0.15) reliability = { label: 'B', color: 'text-amber-600', bg: 'bg-amber-50', full: 'Moyenne (Mixte)' };

      // --- Score de Priorité Stratégique (0-100) ---
      // Nouvelle pondération intégrant l'impact systémique (Causal)
      // 25% Urgence, 25% Masse, 15% Fiabilité, 35% Impact Causal (E3.4)
      
      const causalResults = workflowData.step3?.causalDiagnostics?.processingOrder || [];
      const causalChain = causalResults.find(chain => 
         chain.rootId === d.id || (chain.symptoms || []).includes(d.id)
      );
      
      // On récupère le poids causal (0 à 100%)
      const causalWeight = causalChain ? (causalChain.responsibilityPct / 100) : 0;
      const isRoot = causalChain?.rootId === d.id;
      
      const normUrgency = Math.min(1, d.urgency / 2); 
      const normImpact = d.impact / 100;
      const normRel = triangulationRatio > 0.4 ? 1 : (triangulationRatio > 0.15 ? 0.6 : 0.3);
      
      // Calcul du score de base (Données réelles)
      const baseScoreRaw = (normUrgency * 0.25) + (normImpact * 0.25) + (normRel * 0.15) + (causalWeight * 0.35);
      let finalPriorityScore = Math.round(baseScoreRaw * 100);
      
      // --- Bonus Interactifs (Strategic Overlay) ---
      // Le score réagit aux réglages des seuils de l'utilisateur
      if (d.urgency >= urgencyThreshold) finalPriorityScore += 10;
      if (d.impact >= impactThreshold) finalPriorityScore += 10;
      
      const priorityScore = Math.min(100, finalPriorityScore);

      return { 
        ...d, 
        volume: concernedCount, 
        total: relevantParticipants.length,
        reliability,
        priorityScore,
        triangulationRatio,
        isRoot
      };
    });
  }, [allUrgencyData, activeMatrixCirco, participants, store.referential, urgencyThreshold, impactThreshold, workflowData.step3?.causalDiagnostics]);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Heatmap de Fragilité Systémique</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">% d'enseignants sous le seuil de vigilance (Score &lt; 2.5)</p>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-rose-600 shadow-sm" />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rupture (&gt;60%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-400 shadow-sm" />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Alerte (40-60%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-200 shadow-sm" />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Vigilance (20-40%)</span>
            </div>
            <div className="h-4 w-px bg-slate-200 mx-2" />
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-900" />
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Systémique</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-8">
          <table className="w-full text-[10px] border-separate border-spacing-x-1">
            <thead>
              {/* Pillar Headers */}
              <tr>
                <th className="w-32"></th>
                {sortedFamilies.map(fam => (
                  <th key={fam.label} colSpan={fam.ids.length} className="px-1 pb-2">
                    <div className={`py-1.5 rounded-xl bg-${fam.color}-50 border border-${fam.color}-100 flex items-center justify-center gap-2`}>
                      <fam.icon size={12} className={`text-${fam.color}-500`} />
                      <span className={`text-[8px] font-black uppercase tracking-[0.2em] text-${fam.color}-600`}>{fam.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
              <tr>
                <th className="text-left py-2 px-2 font-black text-slate-400 uppercase text-[8px]">Territoire</th>
                {sortedFamilies.flatMap(fam => fam.ids).map(rc => {
                  const shortName = store.competences[rc]?.split(' — ')[0] || rc;
                  return (
                    <th key={rc} className="text-center py-2 px-0 align-bottom min-w-[48px] group relative">
                      <div className="text-[8px] font-bold text-slate-500 h-24 mx-auto flex items-end justify-center pb-2 relative">
                         <span className="origin-bottom-left -rotate-45 whitespace-nowrap absolute bottom-2 left-1/2 -translate-x-1 w-24 text-left truncate" title={shortName}>
                           {shortName}
                         </span>
                      </div>
                      <div className="font-black text-slate-900 uppercase text-[9px] py-1 bg-slate-50 rounded-t-lg border-x border-t border-slate-200">{rc}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* GLOBAL ROW */}
              <tr className="bg-slate-900 text-white shadow-lg">
                <td className="py-3 px-4 font-black text-[10px] uppercase tracking-wider rounded-l-2xl">MOYENNE GLOBALE</td>
                {sortedFamilies.flatMap(fam => fam.ids).map(rc => {
                  const data = heatmapData['GLOBAL']?.[rc] || {};
                  const pct = data.pct || 0;
                  return (
                    <td key={rc} className="py-3 px-0 text-center first:rounded-l-2xl last:rounded-r-2xl">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[12px] font-black">{pct}%</span>
                        <div className="w-6 h-0.5 bg-white/20 rounded-full">
                           <div className="h-full bg-white rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              <tr className="h-4"></tr>

              {/* CIRCOS ROWS */}
              {sortedCircos.map(row => {
                const rowFragility = rcIds.reduce((sum, rc) => sum + (heatmapData[row]?.[rc]?.pct || 0), 0) / rcIds.length;
                let archetype = "Équilibré";
                if (rowFragility > 50) archetype = "Critique";
                else if (rowFragility > 30) archetype = "Vigilance";

                return (
                  <tr key={row} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-2 border-l-4 border-slate-100 group-hover:border-slate-300">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-[9px] uppercase truncate max-w-[120px]" title={row}>{row}</span>
                        <span className={`text-[7px] font-black uppercase tracking-tighter ${rowFragility > 50 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {archetype} • {Math.round(rowFragility)}% gap
                        </span>
                      </div>
                    </td>
                    {sortedFamilies.flatMap(fam => fam.ids).map(rc => {
                      const data = heatmapData[row]?.[rc] || {};
                      const pct = data.pct || 0;
                      
                      const bgColor = pct > 60 ? 'bg-rose-600 text-white' : 
                                     pct > 40 ? 'bg-orange-400 text-white' : 
                                     pct > 20 ? 'bg-amber-100 text-amber-900' : 
                                     'bg-slate-50 text-slate-400';
                      
                      return (
                        <td key={rc} className="py-1 px-0 text-center group/cell relative">
                          <div className={`relative h-10 flex flex-col items-center justify-center rounded-xl transition-all group-hover/cell:scale-105 border border-transparent hover:border-slate-300 shadow-sm ${bgColor}`}>
                            <span className="text-[11px] font-black leading-none">{pct}%</span>
                            {data.isSystemic && (
                              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-900 shadow-sm" />
                            )}
                            {data.isScattered && (
                              <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-slate-400" />
                            )}
                          </div>
                          
                          {/* Hover Details */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white p-3 rounded-2xl opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all scale-90 group-hover/cell:scale-100 z-50 shadow-2xl border border-white/10">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-white/10">
                              <span className="text-[10px] font-black text-indigo-400">{rc}</span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase">{row}</span>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">Difficulté de masse</span>
                                <span className="font-black">{pct}%</span>
                              </div>
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">Score moyen</span>
                                <span className="font-black">{data.mean} / 5</span>
                              </div>
                              <div className="pt-2 border-t border-white/10 text-[8px] font-bold text-slate-400 italic">
                                {data.isSystemic ? "🚨 BLOCAGE SYSTÉMIQUE : Déficit homogène sur tout le groupe." : 
                                 data.isScattered ? "⚠️ HÉTÉROGÉNÉITÉ : Les profils sont très disparates." : 
                                 "✓ Situation stable."}
                              </div>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
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
            <div className="h-[500px] w-full" style={{ minHeight: '500px', minWidth: '100%', display: 'flex', flexDirection: 'column' }}>
              {chartMode === 'matrix' ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50} minWidth={0} minHeight={0}>
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    
                    {/* Crosshair Reference Lines */}
                    <ReferenceLine x={impactThreshold} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'SEUIL MASSE', position: 'insideTopRight', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                    <ReferenceLine y={urgencyThreshold} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" label={{ value: 'SEUIL URGENCE', position: 'insideBottomLeft', fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />

                    {/* Quadrants with Enhanced Visibility */}
                    <ReferenceArea ifOverflow="hidden" x1={-10} x2={impactThreshold} y1={urgencyThreshold} y2={5.5} fill="#fff7ed" fillOpacity={0.6} label={{ value: 'ZONE TACTIQUE', position: 'insideTopLeft', fill: '#d97706', fontSize: 12, fontWeight: 900, opacity: 0.4, offset: 20 }} />
                    <ReferenceArea ifOverflow="hidden" x1={impactThreshold} x2={110} y1={urgencyThreshold} y2={5.5} fill="#fff1f2" fillOpacity={0.7} label={{ value: 'URGENCE CRITIQUE', position: 'insideTopRight', fill: '#e11d48', fontSize: 12, fontWeight: 900, opacity: 0.5, offset: 20 }} />
                    <ReferenceArea ifOverflow="hidden" x1={-10} x2={impactThreshold} y1={-0.5} y2={urgencyThreshold} fill="#f0fdf4" fillOpacity={0.5} label={{ value: 'ZONE DE CONFORT', position: 'insideBottomLeft', fill: '#059669', fontSize: 12, fontWeight: 900, opacity: 0.4, offset: 20 }} />
                    <ReferenceArea ifOverflow="hidden" x1={impactThreshold} x2={110} y1={-0.5} y2={urgencyThreshold} fill="#eef2ff" fillOpacity={0.5} label={{ value: 'ZONE STRATÉGIQUE', position: 'insideBottomRight', fill: '#4f46e5', fontSize: 12, fontWeight: 900, opacity: 0.4, offset: 20 }} />
                    
                    <XAxis type="number" dataKey="impact" domain={[-10, 110]} ticks={[0, 20, 40, 60, 80, 100]} stroke="#cbd5e1" fontSize={10} tickFormatter={(v) => `${v}%`} label={{ value: 'INTENSITÉ %', position: 'insideBottom', offset: -25, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <YAxis type="number" dataKey="urgency" domain={[-0.5, 5.5]} ticks={[0, 1, 2, 3, 4, 5]} stroke="#cbd5e1" fontSize={10} label={{ value: 'URGENCE (GAP)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                    <ZAxis type="number" dataKey="z" range={[250, 1400]} />
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
                    const sortedSelected = [...selectedRCs].sort();
                    const sortedFamIds = [...fam.ids].sort();
                    const isActive = JSON.stringify(sortedSelected) === JSON.stringify(sortedFamIds);
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

      {/* ═══ OUTIL 3.5 — Matrice de Ciblage Pédagogique ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowEisenhowerMatrix(!showEisenhowerMatrix)}
          className="w-full flex items-center justify-between p-6 bg-white hover:bg-slate-50 transition-colors"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-left">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all ${showEisenhowerMatrix ? 'bg-indigo-900 shadow-indigo-200' : 'bg-slate-200'}`}>
                  <Target size={20} className={showEisenhowerMatrix ? 'text-white' : 'text-slate-500'} />
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Matrice de Ciblage Pédagogique</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Analyse Stratégique des Compétences</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {/* Small preview pills when collapsed */}
             {!showEisenhowerMatrix && (
                <div className="hidden md:flex items-center gap-3 mr-4">
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 shadow-sm">
                      <span className="text-[11px] font-black text-indigo-600">{targetedRCs.length}</span>
                      <Target size={12} className="text-indigo-500"/>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest ml-1">Cibles validées</span>
                   </div>
                   <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] font-black text-slate-600">{enhancedMatrixData.length}</span>
                      <Activity size={12} className="text-slate-400"/>
                   </div>
                </div>
             )}
             {showEisenhowerMatrix ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </div>
        </button>

        {showEisenhowerMatrix && (() => {
          const availableCircos = [...new Set(allUrgencyData.map(d => d.circo))];
          return (
          <div className="p-6 pt-0 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="flex flex-wrap items-center gap-2 mt-4">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filtrer par territoire :</span>
               {availableCircos.map(c => (
                  <button 
                     key={c}
                     onClick={() => setActiveMatrixCirco(c)} 
                     className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeMatrixCirco === c ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 hover:bg-slate-100 border-slate-200'}`}
                  >
                     {c === 'National' ? 'Global' : c} ({allUrgencyData.filter(d => d.circo === c).length})
                  </button>
               ))}
            </div>

            <div className="mt-8 overflow-x-auto">
               <table className="w-full border-collapse">
                     <thead>
                        <tr className="bg-slate-100/80 border-b border-slate-200">
                           <th className="py-5 px-6 text-left w-14 border-r border-slate-200">
                              <div className="w-6 h-6 rounded-lg bg-slate-900/10" />
                           </th>
                           <th className="py-5 px-4 text-left border-r border-slate-200">
                              <div className="flex items-center gap-2">
                                 <Compass size={12} className="text-slate-400" />
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compétence Diagnostic</span>
                              </div>
                           </th>
                           <th className="py-5 px-4 text-center border-r border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Gravité</span>
                           </th>
                           <th className="py-5 px-4 text-center border-r border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Masse territoriale</span>
                           </th>
                           <th className="py-5 px-4 text-center border-r border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fiabilité</span>
                           </th>
                           <th className="py-5 px-4 text-left border-r border-slate-200">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analyse Causale & Recommandation</span>
                           </th>
                           <th className="py-5 px-6 text-right">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Priorité</span>
                           </th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                     {enhancedMatrixData.sort((a, b) => b.priorityScore - a.priorityScore).map(d => {
                        const isSelected = targetedRCs.includes(`${d.id}|${d.circo}`);
                        
                        // --- Récupération des données du Diagnostic Causal (E3.4) ---
                        const causalResults = workflowData.step3?.causalDiagnostics?.processingOrder || [];
                        const causalChain = causalResults.find(chain => 
                           chain.rootId === d.id || (chain.symptoms || []).includes(d.id)
                        );
                        
                        const isRoot = causalChain?.rootId === d.id;
                        const priorityIdx = causalResults.findIndex(r => r.rootId === (causalChain?.rootId));
                        const priorityLabel = priorityIdx !== -1 ? `T${priorityIdx + 1}` : null;
                        
                        const causeDescription = causalChain 
                           ? (isRoot ? "RACINE PRIORITAIRE" : `Symptôme de ${causalChain.rootId}`)
                           : null;

                        // Bordure dynamique selon le score
                        const borderClass = d.priorityScore > 80 ? 'border-l-[6px] border-l-rose-500' : 
                                            d.priorityScore > 50 ? 'border-l-[6px] border-l-amber-500' : 
                                            'border-l-[6px] border-l-indigo-500';

                        return (
                           <tr 
                              key={`${d.id}-${d.circo}`} 
                              className={`group transition-all hover:bg-white active:scale-[0.998] ${isSelected ? 'bg-indigo-50/40' : ''}`}
                           >
                              <td className={`py-6 px-6 ${borderClass}`}>
                                 <button 
                                    onClick={() => handleTargetToggle(d.id, d.circo)}
                                    className={`w-8 h-8 rounded-2xl border-2 transition-all flex items-center justify-center shadow-sm ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white scale-110' : 'border-slate-200 bg-white hover:border-indigo-400 hover:text-indigo-500'}`}
                                 >
                                    {isSelected ? <CheckCircle size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400" />}
                                 </button>
                              </td>
                              <td className="py-6 px-4">
                                 <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                       <span className="text-[11px] font-black text-slate-900 uppercase leading-none">{d.id}</span>
                                       <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">{d.circo === 'National' ? 'Global' : d.circo}</span>
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 truncate max-w-[220px]" title={store.competences[d.id]}>
                                       {store.competences[d.id]?.split(' — ')[0]}
                                    </span>
                                 </div>
                              </td>
                              <td className="py-6 px-4 text-center">
                                 <div className={`inline-flex flex-col items-center justify-center w-12 h-12 rounded-2xl border transition-all ${d.urgency >= urgencyThreshold ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm shadow-rose-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                    <span className="text-[14px] font-black leading-none">{d.urgency.toFixed(1)}</span>
                                    <span className="text-[7px] font-black uppercase tracking-tighter opacity-60">Gap</span>
                                 </div>
                              </td>
                              <td className="py-6 px-4 text-center">
                                 <div className="flex flex-col items-center gap-1">
                                    <div className="relative w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                       <div 
                                          className={`h-full transition-all duration-700 ${d.impact >= impactThreshold ? 'bg-indigo-500' : 'bg-slate-400'}`}
                                          style={{ width: `${d.impact}%` }}
                                       />
                                    </div>
                                    <span className={`text-[11px] font-black ${d.impact >= impactThreshold ? 'text-indigo-600' : 'text-slate-600'}`}>{d.impact}%</span>
                                 </div>
                              </td>
                              <td className="py-6 px-4 text-center">
                                 <div className="group/rel relative inline-block">
                                    <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center text-xs font-black shadow-sm border transition-transform hover:scale-110 cursor-help ${d.reliability.bg} ${d.reliability.color} ${d.reliability.color.replace('text', 'border')}`}>
                                       <span className="text-[12px] leading-none">{d.reliability.label}</span>
                                       <ShieldCheck size={10} className="mt-0.5 opacity-40" />
                                    </div>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-slate-900/95 backdrop-blur shadow-2xl text-white text-[9px] p-3 rounded-2xl opacity-0 group-hover/rel:opacity-100 pointer-events-none transition-all scale-90 group-hover/rel:scale-100 z-50">
                                       <div className="font-black border-b border-white/10 pb-1.5 mb-1.5 flex items-center gap-2 uppercase tracking-widest text-indigo-400">
                                          <ShieldCheck size={12} /> Fiabilité
                                       </div>
                                       {d.reliability.full}
                                       <div className="mt-1 text-slate-400 font-medium">Couverture territoriale basée sur la triangulation Étape 2.</div>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-6 px-4">
                                 {causalChain ? (
                                    <div className="flex flex-col gap-2 max-w-[280px]">
                                       <div className="flex items-center gap-2">
                                          {priorityLabel && (
                                             <div className={`px-2 py-1 rounded-lg text-[10px] font-black text-white shadow-lg ${priorityIdx === 0 ? 'bg-indigo-600 shadow-indigo-200' : 'bg-slate-800 shadow-slate-200'}`}>
                                                {priorityLabel}
                                             </div>
                                          )}
                                          <div className="flex flex-col">
                                             <span className={`text-[9px] font-black uppercase tracking-tighter leading-none ${isRoot ? 'text-indigo-600' : 'text-amber-600'}`}>
                                                {causeDescription}
                                             </span>
                                             <span className="text-[10px] font-bold text-slate-700 leading-tight truncate">
                                                {CAUSAL_MAP[causalChain.rootId]?.label || 'Déficit structurel'}
                                             </span>
                                          </div>
                                       </div>
                                       {causalChain.formation && (
                                          <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-100 px-3 py-2 rounded-xl group/form hover:bg-emerald-100 transition-colors cursor-pointer">
                                             <Sparkles size={12} className="text-emerald-500 shrink-0" />
                                             <div className="flex flex-col min-w-0">
                                                <span className="text-[8px] font-black text-emerald-500 uppercase leading-none mb-0.5">Formation Recommandée</span>
                                                <span className="text-[10px] font-bold text-emerald-700 truncate leading-tight">
                                                   {causalChain.formation.id} — {causalChain.formation.libelle}
                                                </span>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 ) : (
                                    <div className="flex items-center gap-3 py-2 px-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                                       <EyeOff size={14} className="text-slate-300" />
                                       <span className="text-[10px] text-slate-400 font-bold italic">Pas d'impact racine identifié</span>
                                    </div>
                                 )}
                              </td>
                              <td className="py-6 px-6 text-right">
                                 <div className="flex flex-col items-end gap-1.5">
                                    <div className="flex flex-col items-end">
                                       <span className="text-2xl font-black text-slate-900 leading-none">{d.priorityScore}</span>
                                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Score / 100</span>
                                    </div>
                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-[1px]">
                                       <div 
                                          className={`h-full rounded-full transition-all duration-1000 ${d.priorityScore > 75 ? 'bg-gradient-to-r from-rose-400 to-rose-600' : d.priorityScore > 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
                                          style={{ width: `${d.priorityScore}%` }}
                                       />
                                    </div>
                                 </div>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
            {enhancedMatrixData.length === 0 && (
               <div className="w-full flex items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl mt-6">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aucun besoin détecté</p>
               </div>
            )}
          </div>
          );
        })()}
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
