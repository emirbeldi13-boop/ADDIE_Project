import React, { useMemo, useState } from 'react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ReferenceLine, LabelList, ReferenceArea
} from 'recharts';
import { Zap, Settings2, Info, ChevronRight, Activity, AlertCircle, Sparkles, CheckSquare, Square, Filter, Target, TrendingUp, BarChart3, Layers, LayoutGrid, Rocket } from 'lucide-react';

const FAMILY_COLORS = {
  "Linguistique": "#3b82f6", 
  "Didactique": "#a855f7",   
  "Ingénierie": "#10b981",   
  "Évaluation": "#f59e0b",   
  "Inclusion": "#f97316",    
  "Numérique": "#06b6d4",    
  "Professionnel": "#64748b", 
  "default": "#94a3b8"
};

export function EffortImpactMatrix({ store, participants, formations, selectedCircos, topUrgencyRC, selectedIds }) {
  const [selectedCrefocId, setSelectedCrefocId] = useState(
    selectedCircos.length === 1 && selectedCircos[0] !== 'National' ? selectedCircos[0] : Object.keys(store.crefocs)[0]
  );
  const [comparisonCrefocId, setComparisonCrefocId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [visibleFormations, setVisibleFormations] = useState(
    formations.reduce((acc, f) => ({ ...acc, [f.id]: true }), {})
  );
  const [activeSidebarTab, setActiveSidebarTab] = useState('catalogue'); 
  const [weights, setWeights] = useState({
    material: 33,
    deployment: 33,
    heterogeneity: 34
  });

  const crefoc = store.crefocs[selectedCrefocId];
  const compCrefoc = comparisonCrefocId ? store.crefocs[comparisonCrefocId] : null;
  const STANDARD_KIT = ['videoproj', 'internet', 'tableau', 'multiprises'];

  const calculateForCrefoc = (targetCrefoc, type = 'primary') => {
    return formations.map(f => {
      const targeted = f.targetedComps && f.targetedComps.length > 0 ? f.targetedComps : ['RC1', 'RC2'];
      const teacherAverages = participants.map(p => {
        const compScores = targeted.map(rcId => p.realityScores?.[rcId] ?? 3);
        return compScores.reduce((a, b) => a + b, 0) / compScores.length;
      });

      const avgTerritory = teacherAverages.reduce((a, b) => a + b, 0) / (teacherAverages.length || 1);
      let impactScore = Math.min(100, Math.max(0, 5 - avgTerritory) * 20);
      if (topUrgencyRC && targeted.includes(topUrgencyRC.id)) {
        impactScore = Math.min(100, impactScore + 30); 
      }

      const metItems = STANDARD_KIT.filter(item => targetCrefoc?.logistics?.[item] === true).length;
      const materialFactor = ((STANDARD_KIT.length - metItems) / STANDARD_KIT.length) * weights.material;
      const totalTeachers = participants.length || 1;
      const seats = targetCrefoc?.places || 20;
      const sessionsNeeded = totalTeachers / seats;
      const deploymentFactor = Math.min(weights.deployment, (sessionsNeeded / 3) * weights.deployment);
      const mean = teacherAverages.length > 0 ? teacherAverages.reduce((a, b) => a + b, 0) / teacherAverages.length : 3;
      const sd = Math.sqrt(teacherAverages.length > 0 ? teacherAverages.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / teacherAverages.length : 0);
      const heterogeneityFactor = Math.min(weights.heterogeneity, sd * (weights.heterogeneity / 1.7));

      const effortScore = materialFactor + deploymentFactor + heterogeneityFactor;
      const jitterX = ((f.id.length * 7) % 10) - 5; 
      const jitterY = ((f.id.charCodeAt(0) * 3) % 10) - 5;

      const isSelected = selectedIds?.has(f.id);

      return {
        id: f.id,
        name: f.libelle || f.title || f.titre || "Sans titre",
        impact: f.finalScore !== undefined ? f.finalScore : Math.min(100, Math.max(0, Math.round(impactScore) + jitterY / 2)),
        effort: Math.min(100, Math.max(0, Math.round(effortScore) + jitterX / 2)),
        z: f.finalScore !== undefined ? f.finalScore : impactScore,
        family: f.family || "default",
        type,
        crefocId: targetCrefoc?.id || selectedCrefocId,
        targetedComps: targeted,
        finalScore: f.finalScore,
        isSelected,
        details: { material: Math.round(materialFactor), deployment: Math.round(deploymentFactor), heterogeneity: Math.round(heterogeneityFactor) }
      };
    });
  };

  const matrixData = useMemo(() => {
    if (!formations || formations.length === 0) return [];
    const primary = calculateForCrefoc(crefoc, 'primary');
    if (comparisonCrefocId) {
      const secondary = calculateForCrefoc(compCrefoc, 'comparison');
      return [...primary, ...secondary];
    }
    return primary;
  }, [formations, participants, crefoc, compCrefoc, weights, comparisonCrefocId, topUrgencyRC]);

  const filteredData = matrixData.filter(d => visibleFormations[d.id]);
  const recommendations = useMemo(() => {
    return matrixData
      .filter(d => d.type === 'primary' && visibleFormations[d.id])
      .sort((a, b) => {
        if (b.finalScore !== undefined && a.finalScore !== undefined) {
          return b.finalScore - a.finalScore;
        }
        return ((b.impact * 1.6) - b.effort) - ((a.impact * 1.6) - a.effort);
      })
      .slice(0, 3);
  }, [matrixData, visibleFormations]);

  const findBestSite = (formationId) => {
    const formation = formations.find(f => f.id === formationId);
    if (!formation) return null;
    
    let best = { id: null, score: -1 };
    Object.entries(store.crefocs).forEach(([id, c]) => {
      // Small reusable version of effort calculation
      const activeLogistics = c.logistics || {};
      const specificRequirements = formation.requirements || [];
      const universalRequirements = ['tableau', 'photocopieuse', 'videoproj'];
      const allRequirements = [...new Set([...universalRequirements, ...specificRequirements])];
      
      let logisticsGap = 0;
      allRequirements.forEach(req => {
        if (!activeLogistics[req]) logisticsGap += 10;
      });

      const deploymentEffort = Math.min(40, (participants.length / 15) * 5);
      const score = 100 - (20 + deploymentEffort + logisticsGap);
      if (score > best.score) best = { id, score };
    });
    return best;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border border-white/10 min-w-[220px] backdrop-blur-md">
          <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
             <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: FAMILY_COLORS[data.family] }} />
                <span className="mono-label text-[10px] font-black uppercase tracking-widest text-slate-400">{data.id}</span>
             </div>
             <span className="px-2 py-0.5 bg-white/10 rounded-md text-[8px] font-black uppercase border border-white/10">{data.crefocId}</span>
          </div>
          <p className="text-xs font-black mb-4 leading-tight uppercase">{data.name}</p>
          <div className="space-y-3 pt-1">
            <div className="flex justify-between items-center text-[10px] font-black uppercase">
              <span className="text-slate-400 tracking-widest">Faisabilité</span>
              <span className="text-emerald-400">{100 - data.effort}%</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-black uppercase">
               <span className="text-slate-400 tracking-widest">Merite Strat.</span>
               <span className="text-indigo-400">{data.finalScore || data.impact}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#F8FAFC] rounded-[48px] p-10 border border-slate-200/60 shadow-2xl space-y-10 overflow-hidden">
      <style>{`
        .mono-label { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        @keyframes pulse-ring {
          0% { transform: scale(0.33); }
          80%, 100% { opacity: 0; }
        }
        .animate-pulse-ring {
          position: relative;
        }
        .animate-pulse-ring::before {
          content: '';
          position: absolute;
          width: 300%;
          height: 300%;
          left: -100%;
          top: -100%;
          border-radius: 50%;
          background-color: currentColor;
          animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
      `}</style>

      {/* --- HEADER --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-slate-200 pb-10">
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit">
             <BarChart3 size={12} className="text-indigo-600" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Decision Matrix</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
            Strategic <span className="text-slate-400 font-light">Effort & Impact</span> Analysis
          </h3>
          <p className="text-sm font-medium text-slate-500 max-w-xl">
            Arbitrage territorial basé sur la pénibilité logistique de <b>{crefoc?.nom}</b> et l'impact diagnostiqué des compétences.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-1 bg-white p-1 rounded-[32px] border border-slate-200 shadow-sm min-w-[400px]">
           <div className="flex-1 flex flex-col gap-1 p-4 bg-slate-50/50 rounded-[28px] border border-slate-100">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Base Territorial</span>
              <div className="flex gap-1.5">
                 {Object.keys(store.crefocs).map(id => (
                    <button key={id} onClick={() => setSelectedCrefocId(id)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${selectedCrefocId === id ? 'bg-slate-900 text-white shadow-lg scale-[1.02]' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-900 shadow-sm'}`}>{id}</button>
                 ))}
              </div>
           </div>
           <div className="flex-1 flex flex-col gap-1 p-4 bg-white rounded-[28px]">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">Benchmark Comparatif</span>
              <div className="flex gap-1.5">
                 {Object.keys(store.crefocs).map(id => (
                    <button key={id} disabled={id === selectedCrefocId} onClick={() => setComparisonCrefocId(comparisonCrefocId === id ? null : id)} className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${comparisonCrefocId === id ? 'bg-amber-500 text-white shadow-lg scale-[1.02]' : id === selectedCrefocId ? 'opacity-20 bg-slate-50 text-slate-300' : 'bg-slate-50 text-slate-400 border border-transparent hover:text-slate-900'}`}>{id}</button>
                 ))}
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT PANEL */}
        <div className="lg:col-span-3 space-y-6">
           <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button onClick={() => setActiveSidebarTab('catalogue')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSidebarTab === 'catalogue' ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>
                <LayoutGrid size={14} /> View Items
              </button>
              <button onClick={() => setActiveSidebarTab('simulation')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSidebarTab === 'simulation' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>
                <Settings2 size={14} /> Tune Model
              </button>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm max-h-[600px] overflow-hidden flex flex-col">
              {activeSidebarTab === 'catalogue' ? (
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-4 animate-in fade-in zoom-in-95 duration-500">
                   <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Training Inventory</span>
                      <button onClick={() => {
                        const allOn = Object.values(visibleFormations).filter(v => v).length === formations.length;
                        const next = {}; formations.forEach(f => next[f.id] = !allOn);
                        setVisibleFormations(next);
                      }} className="text-[10px] font-black text-indigo-600 hover:underline">Toggle All</button>
                   </div>
                   {calculateForCrefoc(crefoc).sort((a,b) => (b.finalScore || 0) - (a.finalScore || 0)).map(f => (
                      <div key={f.id} className={`p-4 rounded-3xl border transition-all cursor-not-allowed group ${f.isSelected ? 'bg-indigo-600 border-indigo-400 shadow-xl scale-[1.02]' : 'bg-slate-50 border-slate-200 opacity-40 grayscale'}`}>
                         <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                               <p className={`text-[11px] font-black uppercase truncate leading-tight ${f.isSelected ? 'text-white' : 'text-slate-900'}`}>{f.name}</p>
                               <p className={`text-[9px] font-bold mt-1 ${f.isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>{f.id} • Score Stratégique: {f.finalScore || 'N/A'}</p>
                            </div>
                            {f.isSelected && (
                              <div className="w-5 h-5 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
                                 <CheckSquare size={12} />
                              </div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 py-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Simulation Weights</p>
                   {Object.entries(weights).map(([key, val]) => (
                     <div key={key} className="space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-900 tracking-widest">
                           <span>{key.replace('material', 'LOGISTIC').replace('deployment', 'SESSIONS').replace('heterogeneity', 'PROFILES')}</span>
                           <span className="text-indigo-600">{val}%</span>
                        </div>
                        <input type="range" value={val} onChange={(e) => setWeights(prev => ({ ...prev, [key]: parseInt(e.target.value) }))} className="w-full h-1 bg-slate-100 appearance-none cursor-pointer accent-indigo-600 rounded-full" />
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>

        {/* MIDDLE CHART AREA */}
        <div className="lg:col-span-6 space-y-8">
           <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative min-h-[500px]">
              <div className="absolute top-10 left-10 text-[10px] font-black text-slate-200 uppercase tracking-[0.3em]">High ROI / Structural</div>
              <div className="absolute top-10 right-10 text-[10px] font-black text-emerald-300/40 uppercase tracking-[0.3em]">Quick Wins</div>
              <div className="absolute bottom-10 left-10 text-[10px] font-black text-slate-200 uppercase tracking-[0.3em]">Maintenance</div>
              <div className="absolute bottom-10 right-10 text-[10px] font-black text-amber-300/40 uppercase tracking-[0.3em]">Low Priority</div>

              <ResponsiveContainer width="100%" height={450} minWidth={1} minHeight={1}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                   <CartesianGrid strokeDasharray="1 6" stroke="#e2e8f0" />
                   <XAxis type="number" dataKey="effort" reversed domain={[0, 100]} tick={{fontSize: 9, fill: '#94a3b8', className: 'mono-label font-bold'}} label={{ value: "← EFFORT LOGISTIQUE (%)", position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8', fontWeight: '900', className: 'tracking-[0.1em]' }} />
                   <YAxis type="number" dataKey="impact" domain={[0, 300]} tick={{fontSize: 9, fill: '#94a3b8', className: 'mono-label font-bold'}} label={{ value: "MÉRITE STRATÉGIQUE (SCORE GLOBAL) →", angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#94a3b8', fontWeight: '900', className: 'tracking-[0.1em]' }} />
                   <ZAxis type="number" dataKey="z" range={[100, 1200]} />
                   
                   <ReferenceArea ifOverflow="hidden" x1={50} x2={100} y1={150} y2={300} fill="#6366f1" fillOpacity={0.04} />
                   <ReferenceArea ifOverflow="hidden" x1={0} x2={50} y1={150} y2={300} fill="#10b981" fillOpacity={0.05} />
                   <ReferenceArea ifOverflow="hidden" x1={0} x2={100} y1={0} y2={150} fill="#f1f5f9" fillOpacity={0.03} />
                   <ReferenceLine x={50} stroke="#cbd5e1" strokeDasharray="8 8" />
                   <ReferenceLine y={150} stroke="#cbd5e1" strokeDasharray="8 8" />

                   <Tooltip content={<CustomTooltip />} />
                   <Scatter data={filteredData}>
                      {filteredData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.id}-${entry.crefocId}-${entry.type}`} 
                          onMouseEnter={() => setHoveredId(entry.id)} 
                          onMouseLeave={() => setHoveredId(null)} 
                          fill={entry.isSelected ? '#4f46e5' : (entry.type === 'primary' ? FAMILY_COLORS[entry.family] : 'transparent')} 
                          stroke={entry.isSelected ? '#ffffff' : FAMILY_COLORS[entry.family]} 
                          strokeWidth={entry.isSelected ? 3 : (entry.type === 'comparison' ? 2 : 0.5)} 
                          strokeDasharray={entry.type === 'comparison' ? '4 4' : 'none'} 
                          className={`transition-all duration-300 cursor-pointer hover:scale-125 ${entry.isSelected ? 'drop-shadow-[0_0_10px_rgba(79,70,229,0.6)]' : ''}`} 
                          fillOpacity={hoveredId === entry.id || entry.isSelected ? 1 : 0.4} 
                        />
                      ))}
                      <LabelList dataKey="id" content={(props) => {
                         const { x, y, payload } = props;
                         if (!payload || payload.type === 'comparison' || hoveredId !== payload.id) return null;
                         return <text x={x} y={y} dy={-15} fill="#1e293b" fontSize={11} fontWeight={900} textAnchor="middle" className="mono-label uppercase tracking-widest">{payload.id}</text>
                      }} />
                   </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
           </div>

           {/* RECOMMENDATIONS CARDS */}
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {recommendations.map((rec, idx) => {
                const feasibility = 100 - rec.effort;
                const bestSite = findBestSite(rec.id);
                
                return (
                  <div key={rec.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                        <Layers size={40} className="text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: FAMILY_COLORS[rec.family] }} />
                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Faisabilité à {selectedCrefocId}</span>
                    </div>
                    <p className="text-xs font-black text-slate-900 leading-tight uppercase line-clamp-2 min-h-[32px] mb-4 tracking-tight">{rec.name}</p>
                    
                    <div className="space-y-3 mb-4">
                       {[
                         { label: 'Logistique', val: 100 - (rec.details?.material || 0), color: 'bg-emerald-500' },
                         { label: 'Pédagogie', val: 100 - (rec.details?.heterogeneity || 0), color: 'bg-indigo-500' },
                         { label: 'Déploiement', val: 100 - (rec.details?.deployment || 0), color: 'bg-amber-500' },
                       ].map(pillar => (
                         <div key={pillar.label} className="space-y-1">
                            <div className="flex justify-between text-[7px] font-black uppercase text-slate-400">
                               <span>{pillar.label}</span>
                               <span>{pillar.val}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 rounded-full">
                               <div className={`h-full ${pillar.color} rounded-full transition-all duration-1000`} style={{ width: `${pillar.val}%` }} />
                            </div>
                         </div>
                       ))}
                    </div>

                    <div className="flex justify-between items-center py-3 border-t border-slate-100 mb-2">
                        <div className="flex flex-col">
                           <span className="text-[14px] font-black text-slate-900">{feasibility}%</span>
                           <span className="text-[7px] font-black text-slate-400 uppercase">Score Local</span>
                        </div>
                        <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase ${feasibility > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                           {feasibility > 70 ? 'Optimal' : 'Sous tension'}
                        </div>
                    </div>

                    {bestSite && bestSite.id !== selectedCrefocId && (
                      <div 
                        onClick={() => setSelectedCrefocId(bestSite.id)}
                        className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/50 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors"
                      >
                         <div className="flex flex-col">
                            <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest">Meilleur Site Alternatif</span>
                            <span className="text-[9px] font-black text-indigo-900">{bestSite.id}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-indigo-600">{bestSite.score}%</span>
                            <Activity size={10} className="text-indigo-400" />
                         </div>
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </div>

        {/* RIGHT PANEL: LEGEND & STRATEGY */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-8 text-slate-400 flex items-center gap-2">
                 <Filter size={12} /> Global Legend
              </h4>
              <div className="space-y-5">
                 {Object.entries(FAMILY_COLORS).filter(([k]) => k !== 'default').map(([family, color]) => (
                    <div key={family} className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: color }} />
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{family}</span>
                       </div>
                    </div>
                 ))}
              </div>
              <div className="mt-12 pt-8 border-t border-white/5 space-y-6">
                 <div className="space-y-2">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Analyse Dynamique</p>
                    <p className="text-[10px] font-medium leading-relaxed text-slate-400 italic">
                       Les modules identifiés comme "Quick Wins" offrent le meilleur retour sur investissement logistique immédiat.
                    </p>
                 </div>
              </div>
           </div>

           <div className="p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Rocket size={16} />
                 </div>
                 <p className="text-[10px] font-black text-slate-900 uppercase">Prochaine Étape</p>
              </div>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
                 "Une fois vos modules prioritaires validés, passez à la phase de <b>Design</b> pour définir les séquences pédagogiques."
              </p>
              <button className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                 Valider Stratégie <ChevronRight size={14} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
