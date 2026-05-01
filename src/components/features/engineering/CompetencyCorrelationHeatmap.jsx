import React, { useMemo, useState } from 'react';
import { Activity, Info, Sparkles, Flame, Filter, ChevronRight, Zap, Target, CheckCircle2, TrendingUp, Rocket, Plus, Layers } from 'lucide-react';

export function CompetencyCorrelationHeatmap({ store, participants, selectedRCs, formations, quickWins = [], topUrgencyRC, isLocked, compact = false }) {
  const [hoveredCell, setHoveredCell] = useState(null); 
  const [fusionThreshold, setFusionThreshold] = useState(0.70);
  const [isDepsExpanded, setIsDepsExpanded] = useState(false);

  // ─── DATA ENGINE ───
  const correlationData = useMemo(() => {
    if (!participants || participants.length < 5) return [];

    const calculateCorrelation = (rc1, rc2) => {
      const scores1 = participants.map(p => p.realityScores?.[rc1] ?? p.scores?.[rc1] ?? 3);
      const scores2 = participants.map(p => p.realityScores?.[rc2] ?? p.scores?.[rc2] ?? 3);
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

    // Identify already merged formations to exclude them
    const allFormations = Object.values(store.referential || {});
    const alreadyMergedIds = new Set();
    allFormations.forEach(f => {
      if (f.parents) {
        f.parents.forEach(pId => alreadyMergedIds.add(pId));
      }
    });

    // Also identify formations that cover EXACTLY the same RC set as existing selections
    const existingCompSets = new Set(quickWins.map(qw => [...(qw.targetedComps || [])].sort().join('|')));

    const hybridOps = [];
    quickWins.forEach(qw => {
       if (alreadyMergedIds.has(qw.id)) return; // Skip if already part of a merge

       formations.forEach(other => {
          if (qw.id === other.id || alreadyMergedIds.has(other.id)) return;
          
          const qwComps = qw.targetedComps || [];
          const otherComps = other.targetedComps || [];

          // Check if this merge result would be a duplicate of an existing formation
          const mergedComps = Array.from(new Set([...qwComps, ...otherComps])).sort();
          const mergedSig = mergedComps.join('|');
          if (existingCompSets.has(mergedSig)) return;

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
          const strugglingBoth = participants.filter(p => (p.realityScores?.[row.rc] < 3) && (p.realityScores?.[cor.target] < 3)).length;
          highCorrelations.push({ a: row.rc, b: cor.target, score: cor.value, impactedCount: strugglingBoth });
        }
      });
    });

    return { 
       hybridOps: [...hybridOps].sort((a,b) => b.score - a.score).slice(0, 2),
       highCorrelations: [...highCorrelations].sort((a, b) => b.score - a.score)
    };
  }, [correlationData, formations, quickWins, fusionThreshold, participants, store.referential]);

  const targetedRCs = useMemo(() => {
    const set = new Set();
    quickWins.forEach(f => (f.targetedComps || []).forEach(rc => set.add(rc)));
    return set;
  }, [quickWins]);

  const systemicImpacts = useMemo(() => {
    if (!targetedRCs.size || !correlationData.length) return [];
    const impactsMap = {};
    
    Array.from(targetedRCs).forEach(tId => {
      const correlations = correlationData.find(d => d.rc === tId)?.correlations || [];
      correlations.forEach(c => {
        if (!targetedRCs.has(c.target) && c.value > 0.6 && c.value < 1) {
          if (!impactsMap[c.target] || impactsMap[c.target] < c.value) {
            impactsMap[c.target] = c.value;
          }
        }
      });
    });

    return Object.entries(impactsMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([id, score]) => ({ id, score }));
  }, [targetedRCs, correlationData]);

  const getHeatColor = (val) => {
    if (val === 1) return 'bg-slate-50';
    if (val > 0.8) return 'bg-[#E11D48] text-white shadow-inner';
    if (val > 0.6) return 'bg-[#F59E0B] text-white';
    if (val > 0.4) return 'bg-[#FDE68A] text-slate-800';
    if (val > 0.2) return 'bg-[#FEF3C7] text-slate-600';
    return 'bg-white text-slate-300';
  };

  return (
    <div className={`${compact ? 'p-6 rounded-[32px]' : 'p-10 rounded-[48px]'} bg-white border border-slate-200 shadow-sm space-y-8 overflow-hidden h-full flex flex-col`}>
      <style>{`
        .mono-label { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }
        .animate-pulse-soft { animation: pulse-soft 3s infinite ease-in-out; }
      `}</style>

      {/* --- HEADER --- */}
      <div className="flex items-start gap-4">
        <div className={`${compact ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-[20px]'} bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-lg shadow-indigo-100`}>
          <Activity size={compact ? 20 : 24} />
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-black tracking-tighter text-slate-900 uppercase`}>Intelligence Hybride</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            {compact ? 'Corrélations & Synergies' : 'Corrélations systémiques & synergies de fusion'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1">
        {/* --- LEFT: HEATMAP GRID --- */}
        <div className={`xl:col-span-8 bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 relative group ${isLocked ? 'opacity-70 pointer-events-none grayscale-[0.5]' : ''}`}>
          <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="min-w-[500px]">
              <div className="flex mb-4">
                <div className="w-14 h-12" />
                {selectedRCs.map(rc => (
                  <div key={rc} className="w-10 h-12 flex items-end justify-center pb-2">
                    <span className="mono-label text-[9px] font-black text-slate-400 -rotate-90 origin-bottom-left translate-x-3 translate-y-1 whitespace-nowrap uppercase">
                      {rc}
                    </span>
                  </div>
                ))}
              </div>

              {correlationData.map(row => {
                const isTopRow = topUrgencyRC && row.rc === topUrgencyRC.id;
                return (
                  <div key={row.rc} className="flex mb-1 group/row">
                    <div className={`w-14 h-10 flex items-center pr-4 justify-end border-r-2 ${isTopRow ? 'border-amber-400 bg-amber-50/30' : 'border-slate-100'}`}>
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
                          className={`w-10 h-10 m-0.5 rounded-lg flex items-center justify-center transition-all cursor-crosshair hover:scale-110 hover:z-10 relative group/cell ${getHeatColor(cor.value)} ${isCritical ? 'animate-pulse-soft' : ''}`}
                        >
                          <span className={`text-[9px] font-black transition-opacity ${cor.value < 0.4 ? 'opacity-0 group-hover/cell:opacity-100' : 'opacity-90'}`}>
                            {cor.value === 1 ? '•' : Math.round(cor.value * 100)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- RIGHT: STRATEGIC SIDEBAR (SYNERGIES) --- */}
        <div className="xl:col-span-4 space-y-6">
          {/* Hybrid Section */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 px-1">
                <Zap size={14} className="text-indigo-600" />
                <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Synergies de Fusion</h5>
             </div>

             <div className="grid grid-cols-1 gap-4">
                {validationAnalysis.hybridOps.length > 0 ? validationAnalysis.hybridOps.map((op, idx) => (
                  <div key={idx} className="group bg-slate-50/50 p-5 rounded-[24px] border border-slate-100 hover:border-indigo-200 transition-all">
                     <div className="flex items-center justify-between mb-4 gap-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Synergie +{Math.round(op.score * 100)}%</span>
                        <div className="flex flex-wrap justify-end gap-1 min-w-0">
                           {op.sharedTargets?.slice(0, 3).map(rc => (
                             <span key={rc} className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[7px] font-black mono-label uppercase shrink-0">{rc}</span>
                           ))}
                        </div>
                     </div>

                     <div className="flex items-center gap-2 mb-4">
                        <div className="flex-1 p-2 bg-white rounded-xl border border-slate-100 text-center min-w-0 min-h-[40px] flex items-center justify-center">
                           <p className="text-[9px] font-black text-slate-900 uppercase leading-tight line-clamp-2">
                              {op.source.libelle?.split(' — ')[1] || op.source.libelle}
                           </p>
                        </div>
                        <Plus size={10} className="text-slate-300 shrink-0" />
                        <div className="flex-1 p-2 bg-white rounded-xl border border-slate-100 text-center min-w-0 min-h-[40px] flex items-center justify-center">
                           <p className="text-[9px] font-black text-slate-900 uppercase leading-tight line-clamp-2">
                              {op.target.libelle?.split(' — ')[1] || op.target.libelle}
                           </p>
                        </div>
                     </div>

                     <button 
                        disabled={isLocked}
                        onClick={() => store.onMergeFormations?.(op.source, op.target)}
                        className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 ${isLocked ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
                     >
                        <Sparkles size={12} />
                        Fusionner en Module
                     </button>
                  </div>
                )) : (
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-[24px] text-center bg-slate-50/30">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-relaxed">
                        Analyse Driven<br/>
                        Aucune synergie directe détectée
                     </p>
                  </div>
                )}
             </div>

             {/* ─── NEW: SYSTEMIC IMPACTS SECTION ─── */}
             {quickWins.length > 0 && (
               <div className="pt-6 space-y-4">
                 <div className="flex items-center gap-2 px-1">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Impacts Systémiques</h5>
                 </div>
                 <div className="bg-emerald-50/30 border border-emerald-100 rounded-[24px] p-5 space-y-3">
                    <p className="text-[8px] font-bold text-emerald-700 uppercase tracking-tighter leading-tight mb-2">
                       Compétences corrélées bénéficiant indirectement des formations sélectionnées
                    </p>
                    <div className="space-y-2">
                      {systemicImpacts.length > 0 ? systemicImpacts.map(({ id, score }) => (
                        <div key={id} className="flex items-center justify-between bg-white/60 p-2 rounded-xl border border-white">
                           <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-600">
                                 {id}
                              </div>
                              <p className="text-[9px] font-bold text-slate-700 uppercase truncate max-w-[120px]">
                                 {store.competences[id]?.split(' — ')[0]}
                              </p>
                           </div>
                           <div className="text-right">
                              <span className="text-[8px] font-black text-emerald-600">Lien : {Math.round(score * 100)}%</span>
                           </div>
                        </div>
                      )) : (
                        <p className="text-[9px] text-slate-400 italic text-center py-2">Aucun impact collatéral majeur détecté</p>
                      )}
                    </div>
                 </div>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-[#E11D48]" />
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Risque Critique</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-slate-200" />
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Stable</span>
            </div>
         </div>
         <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            <span className="text-[8px] font-black text-slate-400 uppercase">Seuil : {Math.round(fusionThreshold * 100)}%</span>
            <input 
              type="range" min="0.5" max="0.95" step="0.05" 
              value={fusionThreshold} 
              onChange={(e) => setFusionThreshold(parseFloat(e.target.value))}
              className="w-16 accent-indigo-600 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
            />
         </div>
      </div>
    </div>
  );
}
