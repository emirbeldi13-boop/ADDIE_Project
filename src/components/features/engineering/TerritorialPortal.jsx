import React from 'react'; // v4-comparative-sync
import { 
  Target, AlertCircle, ShieldCheck, Users, 
  ChevronRight, ArrowRight, Settings, Sliders, Sparkles, Activity, Compass, BarChart2, Zap, Layout, Layers, BarChart3, LayoutGrid, Rocket
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
  const [showTargets, setShowTargets] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [chartMode, setChartMode] = React.useState('matrix'); // 'matrix' | 'radar' | 'bar'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  // --- DYNAMIC THRESHOLDS FOR MATRIX ---
  const impactThreshold = store.riskThresholds?.high || 70;
  const urgencyThreshold = store.riskThresholds?.urgency || 2.5; 

  const allUrgencyData = React.useMemo(() => {
    if (!advancedStats?.circosData) return [];
    return Object.entries(advancedStats.circosData).flatMap(([circo, data]) => 
      (data.urgencyData || []).filter(d => selectedRCs.includes(d.id))
    );
  }, [advancedStats, selectedRCs]);

  const radarData = React.useMemo(() => {
    if (!advancedStats?.circosData) return [];
    const rcs = selectedRCs;
    return rcs.map(rcId => {
      const row = { 
        name: store.competences[rcId]?.split(' — ')[0] || rcId,
        id: rcId
      };
      Object.entries(advancedStats.circosData).forEach(([circo, data]) => {
        const rcData = data.urgencyData.find(d => d.id === rcId);
        row[circo] = rcData?.urgency || 0;
      });
      return row;
    });
  }, [advancedStats, selectedRCs, store.competences]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[180px] backdrop-blur-md pointer-events-none">
          <div className="flex flex-col gap-1 mb-3 border-b border-white/10 pb-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{data.circo}</p>
             <p className="text-xs font-black uppercase leading-none">{data.name}</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Impact Groupe</span>
               <span className="text-xs font-black text-rose-400">{data.impact}%</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Urgence (IGE)</span>
               <span className="text-xs font-black text-amber-400">{data.urgency}</span>
            </div>
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
    const urgencies = allUrgencyData.sort((a, b) => b.urgency - a.urgency);
    const topUrgency = urgencies[0]?.id || null;
    const quickWins = recommendedFormations.filter(f => {
       const targeted = f.targetedComps || ['RC1', 'RC2'];
       const teacherAverages = participants.map(p => {
         const compScores = targeted.map(rcId => {
           const auto = p.scores?.[rcId] || 3;
           const obs = p.temporalObsScore;
           return obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
         });
         return compScores.reduce((a, b) => a + b, 0) / compScores.length;
       });
       const avgTerritory = teacherAverages.reduce((a, b) => a + b, 0) / (teacherAverages.length || 1);
       const impact = Math.min(100, Math.max(0, 5 - avgTerritory) * 20);
       return impact > 50;
    });
    return { topUrgency, quickWinCount: quickWins.length, quickWins: quickWins.slice(0, 5), hybridOps: [] };
  }, [allUrgencyData, recommendedFormations, participants]);

  const hybridOps = React.useMemo(() => {
    const ops = [];
    decisionMetrics.quickWins.forEach(qw => {
       recommendedFormations.forEach(other => {
          if (qw.id === other.id) return;
          const qwComps = qw.targetedComps || [];
          const otherComps = other.targetedComps || [];
          let totalCorr = 0, count = 0;
          qwComps.forEach(rcA => {
             otherComps.forEach(rcB => {
                if (rcA === rcB) { totalCorr += 1; count++; }
                else { totalCorr += 0.4; count++; } 
             });
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
      `}</style>
      
      {/* --- TOP NAVIGATION --- */}
      <div className="bg-white/80 backdrop-blur-2xl rounded-[40px] p-2.5 border border-slate-200/60 shadow-2xl flex items-center justify-between sticky top-4 z-[100] mx-4">
        <div className="flex bg-slate-100/50 rounded-3xl p-1 gap-1 overflow-x-auto scrollbar-hide border border-slate-200/40">
           {['National', ...Object.keys(store.crefocs)].map(c => {
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
                 className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                   isSelected ? 'bg-slate-900 text-white shadow-xl scale-105' : 'text-slate-400 hover:text-slate-900 hover:bg-white'
                 }`}
               >
                 {c === 'National' ? 'Global' : c}
               </button>
             );
           })}
        </div>
        <div className="px-6 py-2.5 bg-slate-50 rounded-3xl border border-slate-200 flex items-center gap-4">
           <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Diagnostic Scope</p>
              <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                {selectedCircos.includes('National') ? 'Tout le Territoire' : selectedCircos.length > 1 ? `${selectedCircos.length} Zones Actives` : selectedCircos[0]}
              </p>
           </div>
           <Compass size={20} className="text-slate-300" />
        </div>
      </div>

      {/* --- BREADCRUMB --- */}
      <div className="mx-4">
         <DecisionBreadcrumb 
           store={store}
           globalKPIs={globalKPIs}
           topUrgency={decisionMetrics.topUrgency}
           topCorrelation={null}
           quickWinCount={decisionMetrics.quickWinCount}
         />
      </div>

      {/* --- PIPELINE SECTION --- */}
      <div className="space-y-6 mx-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit">
               <Activity size={12} className="text-indigo-600" />
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Operational Pipeline</span>
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
              ADDIE <span className="text-slate-400 font-light">Sessions Workflow</span>
            </h3>
            <p className="text-sm font-medium text-slate-500">Suivi en temps réel de l'ingénierie par projet sur le territoire sélectionné.</p>
          </div>
          <button onClick={() => { setSelectedCircos(['National']); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-6 py-3 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 group shadow-sm">
            <Compass size={16} className="group-hover:rotate-180 transition-transform duration-700" />
            Reset Global Flow
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {store.sessions
            .filter(s => selectedCircos.includes('National') || selectedCircos.includes(s.Circonscription))
            .slice(0, 3) 
            .map(s => {
              const currentStep = s.currentStep || 1;
              const stepLabels = ['Analyse', 'Design', 'Développement', 'Implémentation', 'Évaluation'];
              return (
                <div key={s['ID Session']} onClick={() => onOpenSession(s.Formation, s['ID Session'])}
                  className="bg-white border border-slate-200 rounded-[40px] p-8 hover:shadow-2xl hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-150 transition-transform duration-700" />
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex flex-col">
                      <span className="mono-label text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{s['ID Session']}</span>
                      <h4 className="text-base font-black text-slate-900 uppercase line-clamp-1 italic tracking-tight">{s['Titre formation']}</h4>
                    </div>
                    <div className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 uppercase border border-slate-200">
                      {s.Circonscription}
                    </div>
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phase ADDIE</span>
                      <span className="text-xs font-black text-indigo-600 uppercase">{stepLabels[currentStep - 1]}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${(currentStep / 5) * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                    <div className="flex -space-x-2">
                      {(s.inscrits || []).slice(0, 3).map(id => <div key={id} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100" />)}
                      {(s.inscrits || []).length > 3 && <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-400">+{s.inscrits.length - 3}</div>}
                    </div>
                    <div className="text-[10px] font-black text-slate-300 group-hover:text-slate-900 transition-colors uppercase flex items-center gap-2 tracking-widest">
                      Resume <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* --- DIAGNOSTIC HUB --- */}
      <div className="bg-[#F8FAFC] p-10 rounded-[48px] shadow-2xl border border-slate-200/60 mx-4 space-y-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-slate-200 pb-10">
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit">
                <BarChart3 size={12} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Comparative Diagnostic</span>
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-4">
                Eisenhower <span className="text-slate-400 font-light">Regional Comparison</span>
             </h2>
             <p className="text-sm font-medium text-slate-500">Visualisation comparative de la dispersion des besoins et de l'urgence pédagogique par zone.</p>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setShowSettings(!showSettings)} className={`p-4 rounded-2xl transition-all border shadow-sm ${showSettings ? 'bg-slate-900 border-slate-900 text-white rotate-90 shadow-slate-200' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>
               <Settings size={20} />
            </button>
            <button onClick={() => setShowTargets(!showTargets)} className="flex items-center gap-3 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 group">
               <Target size={18} className="group-hover:scale-125 transition-transform" />
               Ajuster les Cibles
            </button>
          </div>
        </div>

        {/* --- INTELLIGENCE FOCUS (RC Chips & Family Filters) --- */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-700">
           <div className="flex flex-col xl:flex-row items-start justify-between gap-8">
              {/* Family Presets */}
              <div className="space-y-4 flex-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Focus Stratégique (Presets)</p>
                 <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'Vue Globale', icon: Sparkles, color: 'text-indigo-600', bg: 'bg-indigo-50', ids: Object.keys(store.competences) },
                      { label: 'Pédagogie', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', ids: ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6'] },
                      { label: 'Évaluation', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', ids: ['RC7', 'RC8'] },
                      { label: 'Inclusion', icon: Users, color: 'text-amber-600', bg: 'bg-amber-50', ids: ['RC9'] },
                      { label: 'Innovation', icon: Compass, color: 'text-purple-600', bg: 'bg-purple-50', ids: ['RC10', 'RC11', 'RC12'] },
                    ].map((fam, i) => {
                      const isActive = JSON.stringify(selectedRCs) === JSON.stringify(fam.ids);
                      return (
                        <button 
                          key={i}
                          onClick={() => setSelectedRCs(fam.ids)}
                          className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all border shadow-sm ${
                            isActive ? 'bg-slate-900 border-slate-900 text-white scale-105 shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          <fam.icon size={14} className={isActive ? 'text-white' : fam.color} />
                          {fam.label}
                        </button>
                      );
                    })}
                 </div>
              </div>

              {/* Tactical Stats */}
              <div className="flex items-center gap-3">
                 <div className="px-5 py-3 bg-slate-900 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-4">
                    <Activity size={16} className="text-rose-400" />
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">IGE Territorial</span>
                       <span className="text-sm font-black text-white">{tacticalIGE}</span>
                    </div>
                 </div>
                 <div className="px-5 py-3 bg-slate-100 rounded-2xl border border-slate-200 flex items-center gap-4">
                    <Users size={16} className="text-slate-400" />
                    <div className="flex flex-col">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Masse Critique</span>
                       <span className="text-sm font-black text-slate-900">{demandIntensity}%</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Fine RC Selection Grid */}
           <div className="pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between mb-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sélection Précise des Compétences</p>
                 <div className="flex gap-4">
                    <button onClick={() => setSelectedRCs(Object.keys(store.competences))} className="text-[10px] font-black text-indigo-600 hover:underline uppercase tracking-widest">Tout sélectionner</button>
                    <button onClick={() => setSelectedRCs([])} className="text-[10px] font-black text-slate-400 hover:underline uppercase tracking-widest">Effacer</button>
                 </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(store.competences).map(cid => {
                  const isSelected = selectedRCs.includes(cid);
                  return (
                    <button 
                      key={cid}
                      onClick={(e) => {
                        if (e.altKey || e.metaKey) setSelectedRCs([cid]); 
                        else isSelected ? setSelectedRCs(selectedRCs.filter(id => id !== cid)) : setSelectedRCs([...selectedRCs, cid])
                      }}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border mono-label ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                          : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={store.competences[cid]}
                    >
                      {cid.replace('RC', 'RC ')}
                    </button>
                  );
                })}
              </div>
           </div>
        </div>
        <div className="space-y-8">
          {showSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white rounded-[40px] border border-slate-200 shadow-xl animate-in slide-in-from-top-4 duration-500">
              <div className="md:col-span-2 space-y-4">
                 <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
                    <div className="flex items-center gap-6">
                       <div className={`p-4 rounded-2xl shadow-lg transition-all ${store.strategicMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>
                          <Sparkles size={24} />
                       </div>
                       <div>
                          <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Mode Stratégique (IPF)</p>
                          <p className="text-[10px] font-medium text-slate-500 max-w-md">Inclure automatiquement les priorités stratégiques identifiées dans le catalogue de formation.</p>
                       </div>
                    </div>
                    <button 
                      onClick={() => store.updateStrategicMode(!store.strategicMode)}
                      className={`relative w-14 h-7 rounded-full transition-all duration-300 ${store.strategicMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${store.strategicMode ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                 </div>
              </div>
            </div>
          )}

          {showTargets && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-10 bg-slate-900 rounded-[40px] shadow-2xl animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 opacity-5">
                 <Target size={120} className="text-white" />
              </div>
              <div className="lg:col-span-3 border-b border-white/10 pb-6 mb-2">
                 <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">Cibles de Compétences</p>
                 <p className="text-[10px] font-medium text-slate-400 mt-1">Ajustez le niveau attendu par RC pour recalibrer les GAPs de formation.</p>
              </div>
              {Object.keys(store.competences).map(cid => (
                <div key={cid} className="bg-white/5 p-5 rounded-3xl border border-white/10 space-y-4 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-tight truncate w-32">{store.competences[cid] || cid}</span>
                    <span className="mono-label text-xs font-black text-indigo-400">{store.referential?.[cid]?.targetScore || 4.0}</span>
                  </div>
                  <input 
                    type="range" min="0" max="5" step="0.5"
                    value={store.referential?.[cid]?.targetScore || 4.0}
                    onChange={(e) => store.updateReferentialItem(cid, { targetScore: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 h-1 bg-white/10 appearance-none rounded-full cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch relative">
          <div className={`transition-all duration-500 ease-in-out relative overflow-hidden flex flex-col ${isSidebarCollapsed ? 'w-20' : 'lg:w-64'} bg-white rounded-[40px] border border-slate-200 shadow-sm p-8`}>
             <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 z-20">
                {isSidebarCollapsed ? <ArrowRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
             </button>

             <div className={`space-y-10 transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100'}`}>
                <div className="space-y-6">
                   <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Sliders size={14} className="text-indigo-600" /> Thresholds</p>
                   <div className="space-y-6">
                      <div className="space-y-3">
                         <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-2">
                               <Target size={14} className="text-indigo-600" />
                               <span>Impact</span>
                            </div>
                            <span className="text-indigo-600">{impactThreshold}%</span>
                         </div>
                         <input type="range" min="30" max="90" step="5" value={impactThreshold} onChange={(e) => store.updateRiskThresholds({ high: parseInt(e.target.value) })} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-indigo-600 rounded-full" />
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <div className="flex items-center gap-2">
                               <Activity size={14} className="text-rose-600" />
                               <span>Urgence</span>
                            </div>
                            <span className="text-rose-600">{urgencyThreshold}</span>
                         </div>
                         <input type="range" min="0.5" max="4.0" step="0.1" value={urgencyThreshold} onChange={(e) => store.updateRiskThresholds({ urgency: parseFloat(e.target.value) })} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-rose-600 rounded-full" />
                      </div>
                   </div>
                </div>
                <div className="pt-8 border-t border-slate-100 space-y-4">
                   <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <Users size={14} className="text-slate-400" />
                      <div className="flex flex-col">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Masse Critique</span>
                         <span className="text-sm font-black text-slate-900">{demandIntensity}%</span>
                      </div>
                   </div>
                </div>
             </div>

             {isSidebarCollapsed && (
               <div className="absolute inset-0 flex flex-col items-center justify-center gap-10">
                 <div className="flex flex-col items-center gap-1 group/item">
                    <Target size={20} className="text-indigo-300 group-hover/item:text-indigo-600 transition-colors" />
                    <span className="text-[9px] font-black text-indigo-400">{impactThreshold}%</span>
                 </div>
                 <div className="flex flex-col items-center gap-1 group/item">
                    <Activity size={20} className="text-rose-300 group-hover/item:text-rose-600 transition-colors" />
                    <span className="text-[9px] font-black text-rose-400">{urgencyThreshold}</span>
                 </div>
               </div>
             )}
          </div>

          <div className="flex-1 bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm relative min-h-[550px] flex flex-col">
             {/* 🕹️ VIEW SWITCHER */}
             <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3 p-2 bg-white rounded-3xl border border-slate-200 shadow-xl z-50">
                {[
                  { id: 'matrix', icon: Target, label: 'Matrix' },
                  { id: 'radar', icon: Sparkles, label: 'Radar' },
                  { id: 'bar', icon: BarChart3, label: 'Ranking' }
                ].map(mode => {
                  const isActive = chartMode === mode.id;
                  return (
                    <button 
                      key={mode.id}
                      onClick={() => setChartMode(mode.id)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all group relative ${
                        isActive ? 'bg-slate-900 text-white shadow-lg scale-110' : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <mode.icon size={20} />
                      <div className="absolute right-full mr-4 px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap shadow-xl">
                         {mode.label}
                         <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-slate-900" />
                      </div>
                    </button>
                  );
                })}
             </div>

             <div className="absolute top-10 left-10 text-[10px] font-black text-slate-200 uppercase tracking-[0.3em]">Critical Area</div>
             <div className="absolute bottom-10 right-10 text-[10px] font-black text-slate-200 uppercase tracking-[0.3em]">Stable Zone</div>
             
             <div className="flex-1">
                <ResponsiveContainer width="100%" height={500} key={chartMode}>
                   {chartMode === 'matrix' ? (
                     <ScatterChart margin={{ top: 40, right: 30, bottom: 40, left: 30 }}>
                        <CartesianGrid strokeDasharray="1 6" stroke="#e2e8f0" />
                        <XAxis type="number" dataKey="impact" domain={[-5, 105]} tick={{fontSize: 9, fill: '#94a3b8', className: 'mono-label font-bold'}} label={{ value: "Impact Établissement (Masse Critique) →", position: 'insideBottom', offset: -15, fontSize: 10, fill: '#94a3b8', fontWeight: '900', className: 'tracking-[0.1em]' }} />
                        <YAxis type="number" dataKey="urgency" domain={[-0.5, 5.5]} tick={{fontSize: 9, fill: '#94a3b8', className: 'mono-label font-bold'}} label={{ value: "Urgence Pédagogique (IGE) →", angle: -90, position: 'insideLeft', offset: 5, fontSize: 10, fill: '#94a3b8', fontWeight: '900', className: 'tracking-[0.1em]' }} />
                        <ZAxis type="number" dataKey="gap" range={[150, 800]} />
                        
                        <ReferenceArea x1={impactThreshold} x2={105} y1={urgencyThreshold} y2={5.5} fill="#E11D48" fillOpacity={0.03} label={{ value: "CRITIQUE", position: 'insideTopRight', fill: '#E11D48', fontSize: 10, fontWeight: '900', className: 'uppercase tracking-[0.2em] opacity-30' }} />
                        <ReferenceArea x1={-5} x2={impactThreshold} y1={urgencyThreshold} y2={5.5} fill="#6366f1" fillOpacity={0.03} label={{ value: "CIBLÉ", position: 'insideTopLeft', fill: '#6366f1', fontSize: 10, fontWeight: '900', className: 'uppercase tracking-[0.2em] opacity-30' }} />
                        <ReferenceArea x1={impactThreshold} x2={105} y1={-0.5} y2={urgencyThreshold} fill="#10b981" fillOpacity={0.03} label={{ value: "CONTINU", position: 'insideBottomRight', fill: '#10b981', fontSize: 10, fontWeight: '900', className: 'uppercase tracking-[0.2em] opacity-30' }} />

                        <ReferenceLine x={impactThreshold} stroke="#cbd5e1" strokeDasharray="8 8" />
                        <ReferenceLine y={urgencyThreshold} stroke="#cbd5e1" strokeDasharray="8 8" />

                        <RechartsTooltip 
                          content={<CustomTooltip />} 
                          isAnimationActive={false}
                          offset={20}
                        />
                        <Legend verticalAlign="bottom" height={40} iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                        
                        {Object.keys(advancedStats?.circosData || {}).map((circo, i) => (
                          <Scatter 
                            key={circo}
                            name={circo} 
                            data={advancedStats.circosData[circo].urgencyData.filter(d => selectedRCs.includes(d.id))} 
                            fill={CHART_COLORS[i % CHART_COLORS.length]} 
                            isAnimationActive={true}
                            animationDuration={1000}
                            className="drop-shadow-lg cursor-pointer transition-all hover:brightness-125"
                          />
                        ))}
                     </ScatterChart>
                   ) : chartMode === 'radar' ? (
                     <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                       <PolarGrid stroke="#e2e8f0" />
                       <PolarAngleAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b', fontWeight: 'bold' }} />
                       <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 1']} tick={{ fontSize: 8 }} />
                       {Object.keys(advancedStats?.circosData || {}).map((circo, i) => (
                         <Radar
                           key={circo}
                           name={circo}
                           dataKey={circo}
                           stroke={CHART_COLORS[i % CHART_COLORS.length]}
                           fill={CHART_COLORS[i % CHART_COLORS.length]}
                           fillOpacity={0.3}
                         />
                       ))}
                       <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                       <RechartsTooltip 
                          isAnimationActive={false}
                          offset={20}
                        />
                     </RadarChart>
                   ) : (
                     <BarChart 
                       key="bar-ranking-chart"
                       layout="vertical" 
                       data={[...allUrgencyData].sort((a,b) => b.urgency - a.urgency)} 
                       margin={{ left: 40, right: 40 }}
                     >
                       <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                       <XAxis type="number" domain={[0, 'dataMax + 1']} tick={{fontSize: 10}} key="bar-x-axis" />
                       <YAxis type="category" dataKey="id" tick={{fontSize: 10, fontWeight: 'bold'}} width={40} key="bar-y-axis" />
                        <RechartsTooltip 
                          content={<CustomTooltip />} 
                          isAnimationActive={false}
                          offset={20}
                        />
                       <Bar dataKey="urgency" radius={[0, 10, 10, 0]} barSize={10}>
                         {[...allUrgencyData].sort((a,b) => b.urgency - a.urgency).map((entry, index) => {
                            const circoIndex = Object.keys(advancedStats.circosData).indexOf(entry.circo);
                            return <Cell key={`cell-${entry.id}-${entry.circo}-${index}`} fill={CHART_COLORS[circoIndex % CHART_COLORS.length]} />;
                         })}
                       </Bar>
                       <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                     </BarChart>
                   )}
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-1000 delay-300">
        <div className="mx-4">
           <EffortImpactMatrix 
             store={store}
             participants={participants || []}
             formations={recommendedFormations}
             selectedCircos={selectedCircos}
             topUrgencyRC={topUrgencyRC}
           />
        </div>

        <div className="mx-4">
           <CompetencyCorrelationHeatmap 
             store={store} 
             participants={participants || []} 
             selectedRCs={selectedRCs} 
             formations={recommendedFormations}
             quickWins={decisionMetrics.quickWins}
             topUrgencyRC={topUrgencyRC}
           />
        </div>

        <div className="mx-4 space-y-6">
           <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
             <div className="space-y-3">
               <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit">
                  <Zap size={12} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Decision Engine</span>
               </div>
               <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                 Arbitrage <span className="text-slate-400 font-light">Final & Choix</span>
               </h3>
               <p className="text-sm font-medium text-slate-500">Validez vos fusions et planifiez l'intervention prioritaire.</p>
             </div>
           </div>
           
           <DecisionArbitrageHub 
             store={store}
             formations={recommendedFormations}
             quickWins={decisionMetrics.quickWins}
             hybridOps={hybridOps}
             onOpenSession={onOpenSession}
             participants={participants || []}
           />
        </div>
      </div>
    </div>
  );
}
