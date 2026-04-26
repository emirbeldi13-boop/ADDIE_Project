import React, { useMemo, useState } from 'react';
import { Activity, Info, Sparkles, Flame, Filter, ChevronRight, Zap, Target, CheckCircle2, TrendingUp, Rocket, Plus, Layers } from 'lucide-react';

export function CompetencyCorrelationHeatmap({ store, participants, selectedRCs, formations, quickWins = [], topUrgencyRC }) {
  const [hoveredCell, setHoveredCell] = useState(null); 
  const [fusionThreshold, setFusionThreshold] = useState(0.70);
  const [validatedFusions, setValidatedFusions] = useState([]);
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);

  // ─── DATA ENGINE ───
  const correlationData = useMemo(() => {
    if (!participants || participants.length < 5) return [];

    const calculateCorrelation = (rc1, rc2) => {
      const scores1 = participants.map(p => p.scores?.[rc1] || 3);
      const scores2 = participants.map(p => p.scores?.[rc2] || 3);
      const mean1 = scores1.reduce((a, b) => a + b, 0) / scores1.length;
      const mean2 = scores2.reduce((a, b) => a + b, 0) / scores2.length;
      let num = 0, den1 = 0, den2 = 0;
      for (let i = 0; i < scores1.length; i++) {
        const diff1 = scores1[i] - mean1;
        const diff2 = scores2[i] - mean2;
        num += diff1 * diff2;
        den1 += diff1 * diff1;
        den2 += diff2 * diff2;
      }
      const res = num / Math.sqrt(den1 * den2);
      return isNaN(res) ? 0 : res;
    };

    return selectedRCs.map(rc1 => ({
      rc: rc1,
      correlations: selectedRCs.map(rc2 => ({
        target: rc2,
        value: rc1 === rc2 ? 1 : calculateCorrelation(rc1, rc2)
      }))
    }));
  }, [participants, selectedRCs]);

  const validationAnalysis = useMemo(() => {
    if (!correlationData.length || !formations) return { hybridOps: [], highCorrelations: [] };

    const hybridOps = [];
    quickWins.forEach(qw => {
       formations.forEach(other => {
          if (qw.id === other.id) return;
          const qwComps = qw.targetedComps || [];
          const otherComps = other.targetedComps || [];
          let totalCorr = 0, count = 0, maxCorr = { a: '', b: '', value: 0 };

          qwComps.forEach(rcA => {
             otherComps.forEach(rcB => {
                let val = rcA === rcB ? 1 : Math.abs(correlationData.find(r => r.rc === rcA)?.correlations.find(c => c.target === rcB)?.value || 0);
                if (val > maxCorr.value) maxCorr = { a: rcA, b: rcB, value: val };
                totalCorr += val;
                count++;
             });
          });

          const fusionIndex = count > 0 ? (totalCorr / count) : 0;
          if (fusionIndex > fusionThreshold) {
             if (!hybridOps.some(op => (op.source.id === other.id && op.target.id === qw.id))) {
                hybridOps.push({
                   source: qw,
                   target: other,
                   score: fusionIndex,
                   sharedTargets: qwComps.filter(rc => otherComps.includes(rc)),
                   strongestLink: maxCorr
                });
             }
          }
       });
    });

    const highCorrelations = [];
    correlationData.forEach(row => {
      row.correlations.forEach(cor => {
        if (cor.value > 0.8 && cor.value < 1 && row.rc < cor.target) {
          const strugglingBoth = participants.filter(p => (p.scores?.[row.rc] < 3) && (p.scores?.[cor.target] < 3)).length;
          highCorrelations.push({ a: row.rc, b: cor.target, score: cor.value, impactedCount: strugglingBoth });
        }
      });
    });

    return { 
       hybridOps: hybridOps.sort((a,b) => b.score - a.score).slice(0, 2),
       highCorrelations: highCorrelations.sort((a, b) => b.score - a.score)
    };
  }, [correlationData, formations, quickWins, fusionThreshold, participants]);

  const targetedRCs = useMemo(() => {
    const set = new Set();
    quickWins.forEach(f => (f.targetedComps || []).forEach(rc => set.add(rc)));
    return set;
  }, [quickWins]);

  const getHeatColor = (val) => {
    if (val === 1) return 'bg-slate-50';
    if (val > 0.8) return 'bg-[#E11D48] text-white shadow-inner';
    if (val > 0.6) return 'bg-[#F59E0B] text-white';
    if (val > 0.4) return 'bg-[#FDE68A] text-slate-800';
    if (val > 0.2) return 'bg-[#FEF3C7] text-slate-600';
    return 'bg-white text-slate-300';
  };

  return (
    <div className="bg-[#F8FAFC] rounded-[48px] p-10 border border-slate-200/60 shadow-2xl space-y-12 overflow-hidden">
      <style>{`
        .mono-label { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        .animate-pulse-soft { animation: pulse-soft 3s infinite ease-in-out; }
      `}</style>

      {/* --- HEADER : Dashboard Style --- */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit">
             <Layers size={12} className="text-slate-500" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Engineering Analytics</span>
          </div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
            Matrix Correlation <span className="text-slate-400 font-light">&</span> Hybrid Intelligence
          </h3>
          <p className="text-sm font-medium text-slate-500 max-w-xl">
            Optimisez le parcours pédagogique en identifiant les synergies structurelles entre vos modules de formation.
          </p>
        </div>

        <div className="flex items-center gap-6 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
           <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seuil de Fusion</span>
              <div className="flex items-center gap-2">
                 <span className="text-lg font-black text-indigo-600">{Math.round(fusionThreshold * 100)}%</span>
                 <Info size={14} className="text-slate-300" />
              </div>
           </div>
           <input 
             type="range" min="0.5" max="0.95" step="0.05" 
             value={fusionThreshold} 
             onChange={(e) => setFusionThreshold(parseFloat(e.target.value))}
             className="w-32 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* --- HEATMAP PANEL --- */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm relative group">
          <div className="absolute top-6 right-8 flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#E11D48]" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Critique</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-slate-200" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Stable</span>
             </div>
          </div>

          <div className="overflow-x-auto pt-12 pb-4">
            <div className="min-w-[500px]">
              <div className="flex mb-2">
                <div className="w-16 h-12" />
                {selectedRCs.map(rc => (
                  <div key={rc} className="w-12 h-12 flex items-end justify-center pb-2">
                    <span className="mono-label text-[10px] font-bold text-slate-400 -rotate-90 origin-bottom-left translate-x-3 translate-y-2 whitespace-nowrap">
                      {rc}
                    </span>
                  </div>
                ))}
              </div>

              {correlationData.map(row => {
                const isTopRow = topUrgencyRC && row.rc === topUrgencyRC.id;
                return (
                  <div key={row.rc} className="flex mb-1 group/row">
                    <div className={`w-16 h-12 flex items-center pr-4 justify-end border-r-2 ${isTopRow ? 'border-amber-400 bg-amber-50/30' : 'border-slate-100'}`}>
                      <span className={`mono-label text-[10px] font-black ${isTopRow ? 'text-amber-600' : 'text-slate-900'}`}>
                        {row.rc}
                      </span>
                    </div>
                    {row.correlations.map(cor => {
                      const isCritical = cor.value > 0.8 && cor.value < 1;
                      return (
                        <div 
                          key={cor.target}
                          onMouseEnter={() => setHoveredCell({ r: row.rc, c: cor.target, v: cor.value })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-12 h-12 m-0.5 rounded-sm flex items-center justify-center transition-all cursor-crosshair hover:scale-110 hover:z-10 relative group/cell ${getHeatColor(cor.value)} ${isCritical ? 'animate-pulse-soft' : ''}`}
                        >
                          <span className={`text-[10px] font-bold transition-opacity ${cor.value < 0.4 ? 'opacity-0 group-hover/cell:opacity-100' : 'opacity-80'}`}>
                            {cor.value === 1 ? '•' : Math.round(cor.value * 100)}
                          </span>
                          {hoveredCell?.r === row.rc && hoveredCell?.c === cor.target && (
                             <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-bold z-50 whitespace-nowrap shadow-2xl border border-white/10">
                                <div className="flex flex-col items-center gap-0.5">
                                   <span className="text-slate-400 mono-label">{row.rc} / {cor.target}</span>
                                   <span className="text-white">Correlation : {Math.round(cor.value * 100)}%</span>
                                </div>
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
                             </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- STRATEGIC SIDEBAR --- */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Hybrid Section */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Zap size={16} className="text-indigo-600" />
                   <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.15em]">Strategic Hybrids</h5>
                </div>
                <div className="h-px flex-1 bg-slate-200 mx-4" />
                <span className="text-[9px] font-bold text-slate-400 uppercase">Analysis Driven</span>
             </div>

             <div className="space-y-4">
                {validationAnalysis.hybridOps.length > 0 ? validationAnalysis.hybridOps.map((op, idx) => (
                  <div key={idx} className="group bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-500">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                           <span className="text-[10px] font-bold text-slate-500">PACK #{idx+1}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
                           <TrendingUp size={12} />
                           <span>+{Math.round(op.score * 100)}% Synergy</span>
                        </div>
                     </div>

                     <div className="flex flex-col items-center gap-4 mb-6">
                        <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                           <p className="text-[11px] font-black text-slate-900 uppercase text-center leading-tight">{op.source.libelle || op.source.title}</p>
                        </div>
                        <div className="relative w-full flex justify-center h-4">
                           <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-100" />
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg z-10 group-hover:scale-110 transition-transform">
                              <Plus size={16} strokeWidth={3} />
                           </div>
                        </div>
                        <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50/30 transition-colors">
                           <p className="text-[11px] font-black text-slate-900 uppercase text-center leading-tight">{op.target.libelle || op.target.title}</p>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                        <div className="flex flex-wrap gap-1.5 max-w-[150px]">
                           {op.sharedTargets?.slice(0, 3).map(rc => (
                             <span key={rc} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-bold mono-label uppercase tracking-tighter">{rc}</span>
                           ))}
                        </div>
                        <button 
                          onClick={() => {
                             const id = `${op.source.id}-${op.target.id}`;
                             setValidatedFusions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
                          }}
                          className={`flex-1 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${validatedFusions.includes(`${op.source.id}-${op.target.id}`) ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-200'} active:scale-95`}
                        >
                           {validatedFusions.includes(`${op.source.id}-${op.target.id}`) ? 'Adopted' : 'Adopt Hybrid'}
                        </button>
                     </div>
                  </div>
                )) : (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                     <p className="text-xs font-medium text-slate-400 italic">No direct synergies detected.</p>
                  </div>
                )}
             </div>
          </div>

          {/* Dependencies Section */}
          {validationAnalysis.highCorrelations?.length > 0 && (
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Flame size={16} className="text-rose-500" />
                      <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.15em]">Critical Risks</h5>
                   </div>
                   <button 
                     onClick={() => setIsDepsExpanded(!isDepsExpanded)}
                     className="text-[9px] font-black text-slate-400 uppercase hover:text-rose-500 transition-colors"
                   >
                      {isDepsExpanded ? 'Hide' : `Show All (${validationAnalysis.highCorrelations.length})`}
                   </button>
                </div>

                <div className="space-y-3">
                   {validationAnalysis.highCorrelations.slice(0, isDepsExpanded ? undefined : 2).map((dep, idx) => (
                     <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-3xl border border-slate-200 hover:border-rose-200 transition-colors group/dep">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 group-hover/dep:scale-110 transition-transform">
                           <Activity size={18} />
                        </div>
                        <div className="flex-1 space-y-1">
                           <div className="flex items-center gap-2">
                              <span className="mono-label text-[11px] font-black text-slate-900">{dep.a}</span>
                              <ChevronRight size={12} className="text-slate-300" />
                              <span className="mono-label text-[11px] font-black text-slate-900">{dep.b}</span>
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Systemic Dependency</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-black text-slate-900">{Math.round(dep.score * 100)}%</p>
                           <p className="text-[8px] font-bold text-rose-500 uppercase">{dep.impactedCount} Teachers</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          )}

          <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                <TrendingUp size={80} />
             </div>
             <div className="relative z-10 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Strategic Insight</p>
                <p className="text-xs font-medium leading-relaxed text-slate-300 italic">
                   "Une corrélation supérieure à 80% indique une dépendance structurelle. Agir sur une compétence sans traiter sa jumelle risque de limiter l'ancrage pédagogique."
                </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
