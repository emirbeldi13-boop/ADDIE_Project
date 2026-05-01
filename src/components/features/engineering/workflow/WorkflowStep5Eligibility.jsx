import React, { useMemo, useState, useEffect } from 'react';
import { 
  Target, Zap, FileText, ArrowUpRight, ArrowDownRight, Check, 
  Info, AlertTriangle, PlusCircle, Search, Filter, X, Plus,
  CheckCircle2, Sparkles, TrendingUp, Layers
} from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { calculateIPT, calculateCS, calculateEligibilityScore, getRecommendationLabel } from '../../../../utils/eligibilityEngine';
import { getRobustnessMultiplier } from '../../../../utils/causalEngine';
import { CompetencyCorrelationHeatmap } from '../CompetencyCorrelationHeatmap';
import { EffortImpactMatrix } from '../EffortImpactMatrix';
import { CausalDiagnosticPanel } from '../CausalDiagnosticPanel';

/**
 * ÉTAPE 4 — Quelles formations sont éligibles ?
 */
export function WorkflowStep5Eligibility({ 
  store, 
  participants, 
  selectedRCs, 
  selectedCircos,
  topUrgencyRC,
  recommendedFormations,
  robustness, 
  workflowData, 
  updateWorkflowData, 
  stepValidation, 
  onValidate, 
  onInvalidate 
}) {
  const isLocked = stepValidation?.validated;
  const [checks, setChecks] = useState({ matrice: false, scoring: false, selection: false });
  
  // Use a stable reference from workflowData to avoid re-renders resetting the Set
  const savedFormations = useMemo(() => workflowData?.step4?.selectedFormations || [], [workflowData?.step4?.selectedFormations]);
  
  const [selectedFormations, setSelectedFormations] = useState(new Set(savedFormations));
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newFormation, setNewFormation] = useState({ libelle: '', family: 'Pédagogie', targetedComps: [], duration: '6h' });

  // Sync internal state if workflowData changes externally (e.g. on mount)
  useEffect(() => {
    setSelectedFormations(new Set(savedFormations));
  }, [savedFormations]);

  const threshold = store.riskThresholds?.urgency || 2.5;

  const rcIds = Object.keys(store.competences || {});

  // Aggregate scores
  const aggregateScores = useMemo(() => {
    const scores = {};
    rcIds.forEach(rcId => {
      const pScores = participants.map(p => p.realityScores?.[rcId] ?? 3);
      scores[rcId] = pScores.length ? pScores.reduce((a, b) => a + b, 0) / pScores.length : 0;
    });
    return scores;
  }, [participants, rcIds]);

  // Group stats for IPT
  const groupStats = useMemo(() => {
    const stats = {};
    rcIds.forEach(rcId => {
      const target = store.referential?.[rcId]?.targetScore || 4.0;
      const deficit = Math.max(0, target - (aggregateScores[rcId] || 0));
      const concerned = participants.filter(p => (p.realityScores?.[rcId] ?? 3) < target).length;
      const coverage = participants.length > 0 ? Math.round((concerned / participants.length) * 100) : 0;
      stats[rcId] = { deficit, coverage };
    });
    return stats;
  }, [rcIds, aggregateScores, participants, store.referential]);

  // ═══ Outil 5.1 — Urgence × Impact matrix data ═══
  const matrixData = useMemo(() => {
    return rcIds.map(rcId => {
      const score = aggregateScores[rcId] || 0;
      const target = store.referential?.[rcId]?.targetScore || 4.0;
      const urgency = +(target - score).toFixed(1);
      const concerned = participants.filter(p => (p.realityScores?.[rcId] ?? 3) < target).length;
      const impactPct = participants.length > 0 ? Math.round((concerned / participants.length) * 100) : 0;
      // Scale impact: 0-100 → 0-5
      const impact = +(impactPct / 20).toFixed(1);
      const quadrant = urgency >= 2.0 && impact >= 3 ? 'critical' : urgency >= 2.0 ? 'urgent' : impact >= 3 ? 'impactful' : 'monitor';
      return { id: rcId, label: store.competences[rcId]?.split(' — ')[0] || rcId, urgency, impact, impactPct, score, quadrant };
    }).filter(d => d.urgency > 0);
  }, [rcIds, aggregateScores, participants, store.competences, store.referential]);

  // ═══ Outil 5.2 — Formation scoring (Calcul de fond) ═══
  const allScoredFormations = useMemo(() => {
    const completedFormations = store.sessions
      ?.filter(s => s.Statut === 'Réalisée')
      ?.map(s => s.Formation) || [];

    return Object.values(store.referential || {})
      .filter(f => f && f.libelle)
      .map(f => {
        const ipf = f.ipf || 3;
        const ipt = calculateIPT(f.targetedComps || [], groupStats);
        const cs = calculateCS(f, completedFormations);
        const robMult = getRobustnessMultiplier(robustness?.level || 'robust');
        const rawScore = calculateEligibilityScore(ipf, ipt, cs);
        const finalScore = rawScore * robMult;
        const recommendation = getRecommendationLabel(finalScore);

        return {
          id: f.id,
          libelle: f.libelle,
          family: f.family,
          targetedComps: f.targetedComps || [],
          ipf, ipt: Math.round(ipt), cs, robMult,
          rawScore: Math.round(rawScore),
          finalScore: Math.round(finalScore),
          recommendation,
          duration: f.duration,
          parents: f.parents,
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }, [store.referential, store.sessions, groupStats, robustness]);

  // Filtrage réactif à la recherche
  const formationScoring = useMemo(() => {
    const query = searchQuery.toLowerCase();
    if (!query) return allScoredFormations;
    
    return allScoredFormations.filter(f => {
      const matchesName = f.libelle.toLowerCase().includes(query);
      const matchesFamily = f.family?.toLowerCase().includes(query);
      const matchesRC = f.targetedComps?.some(rc => rc.toLowerCase().includes(query));
      return matchesName || matchesFamily || matchesRC;
    });
  }, [allScoredFormations, searchQuery]);

  const selectRecommended = () => {
    const recommended = allScoredFormations
      .filter(f => f.recommendation === 'Fortement recommandée' || f.recommendation === 'Recommandée')
      .map(f => f.id);
    setSelectedFormations(new Set(recommended));
  };

  const handleCreateCustom = () => {
    if (!newFormation.libelle || newFormation.targetedComps.length === 0) return;
    
    const customId = `CUSTOM_${Date.now()}`;
    const formationToAdd = {
      ...newFormation,
      id: customId,
      status: 'Custom',
      objectifs: [],
      ipf: 3 // Default priority for custom
    };

    store.addReferentialItem(formationToAdd);
    
    // Auto-select the new one and deselect parents if it's a merge
    setSelectedFormations(prev => {
      const next = new Set(prev);
      if (newFormation.parents) {
        newFormation.parents.forEach(pId => next.delete(pId));
      }
      next.add(customId);
      return next;
    });

    setNewFormation({ libelle: '', family: 'Pédagogie', targetedComps: [], duration: '6h' });
    setIsCreateModalOpen(false);
  };

  const handleMergeFormations = (formA, formB) => {
    // Helper to extract numeric duration from strings like "6h (2x3h)" or "4.5h"
    const getHours = (str) => {
      const match = str?.match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0;
    };

    const hA = getHours(formA.duration);
    const hB = getHours(formB.duration);
    // Optimized duration: (A + B) / 1.2 (20% synergy gain)
    const optimizedH = Math.ceil((hA + hB) / 1.2);

    const mergedTitle = `HYBRIDE : ${formA.libelle?.split(' — ')[1] || formA.libelle} + ${formB.libelle?.split(' — ')[1] || formB.libelle}`;
    const mergedComps = Array.from(new Set([...(formA.targetedComps || []), ...(formB.targetedComps || [])]));

    setNewFormation({
      libelle: mergedTitle,
      family: 'Innovation', // Default for hybrid
      targetedComps: mergedComps,
      duration: `${optimizedH}h (Fusion Synergie)`,
      parents: [formA.id, formB.id],
      ipf: Math.min(5, Math.max(formA.ipf, formB.ipf) + 1) // Bonus priority for systemic coverage
    });

    setIsCreateModalOpen(true);
  };

  const toggleFormation = (id) => {
    setSelectedFormations(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    const nextList = Array.from(selectedFormations).sort();
    const prevList = (workflowData?.step4?.selectedFormations || []).sort();
    
    if (JSON.stringify(nextList) !== JSON.stringify(prevList)) {
      updateWorkflowData(4, { selectedFormations: nextList });
    }
  }, [selectedFormations, updateWorkflowData, workflowData?.step4?.selectedFormations]);

  const uncoveredCriticalRCs = useMemo(() => {
    const criticalRCs = matrixData.filter(d => d.quadrant === 'critical' || d.urgency >= 2.0).map(d => d.id);
    const coveredRCs = new Set();
    Array.from(selectedFormations).forEach(fId => {
      const f = formationScoring.find(fs => fs.id === fId);
      if (f && f.targetedComps) {
        f.targetedComps.forEach(rc => coveredRCs.add(rc));
      }
    });
    return criticalRCs.filter(rc => !coveredRCs.has(rc));
  }, [matrixData, selectedFormations, formationScoring]);

  const recColors = {
    'Fortement recommandée': 'bg-rose-50 text-rose-600 border-2 border-rose-500 shadow-rose-100',
    'Recommandée': 'bg-amber-50 text-amber-600 border border-amber-200 shadow-amber-50',
    'Pertinente': 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-indigo-50',
    'À envisager plus tard': 'bg-slate-50 text-slate-400 border border-slate-100'
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl">
          <Target size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">4. Formations Éligibles</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            Quelles formations répondent le mieux aux causes identifiées ?
          </p>
        </div>
      </div>

      {/* ═══ CENTRE DE COMMANDEMENT STRATÉGIQUE (Plan & Dette + Intelligence Hybride) ═══ */}
      <div className="space-y-8">
        {/* Recommandations Causales */}
        <CausalDiagnosticPanel 
          store={store} 
          participants={participants} 
          selectedRCs={selectedRCs} 
          robustness={robustness} 
          isWorkflowMode={true}
          resultsOnly={true} 
        />

        {/* Synergies & Intelligence Hybride */}
        <CompetencyCorrelationHeatmap 
          store={{ ...store, onMergeFormations: handleMergeFormations }} 
          participants={participants || []} 
          selectedRCs={selectedRCs} 
          formations={formationScoring} 
          quickWins={formationScoring.filter(f => selectedFormations.has(f.id))} 
          topUrgencyRC={topUrgencyRC}
          isLocked={isLocked}
          compact={false}
        />
      </div>

      {/* ═══ OUTIL 5.2 — Scoring ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-8 space-y-6 bg-white z-10 border-b border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" /> Scoring & Éligibilité des Formations
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Score = IPF × IPT × CS × Pénalité Robustesse — Sélectionnez les formations à retenir
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative group flex-1 sm:flex-initial">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Search size={14} />
                </div>
                <input 
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-full lg:w-48"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={selectRecommended}
                  disabled={isLocked}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all active:scale-[0.98] ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Sparkles size={14} />
                  Auto-reco
                </button>

                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={isLocked}
                  className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10 active:scale-[0.98] ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Plus size={14} />
                  Personnalisée
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-[10px] border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-20 shadow-sm">
              <tr className="border-b border-slate-200">
                <th className="text-center py-4 px-2 font-black text-slate-400 uppercase text-[8px] w-12">✓</th>
                <th className="text-left py-4 px-3 font-black text-slate-400 uppercase text-[8px]">Formation & Synergies</th>
                <th className="text-center py-4 px-2 font-black text-slate-400 uppercase text-[8px] w-20">Priorité (IPF)</th>
                <th className="text-center py-4 px-2 font-black text-slate-400 uppercase text-[8px] w-20">Territoire (IPT)</th>
                <th className="text-center py-4 px-2 font-black text-slate-400 uppercase text-[8px] w-20">Stratégie (CS)</th>
                <th className="text-center py-4 px-2 font-black text-slate-400 uppercase text-[8px] w-32">Score Final</th>
                <th className="text-center py-4 px-3 font-black text-slate-400 uppercase text-[8px] w-32">Recommandation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {formationScoring.length > 0 ? (
                formationScoring.map((f, i) => (
                  <tr key={f.id} className={`hover:bg-slate-50/80 transition-all ${selectedFormations.has(f.id) ? 'bg-indigo-50/40' : ''} ${isLocked ? 'opacity-70' : ''}`}>
                    <td className="text-center py-4 px-2">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          disabled={isLocked}
                          checked={selectedFormations.has(f.id)}
                          onChange={() => toggleFormation(f.id)}
                          className="w-5 h-5 rounded-lg border-slate-300 accent-indigo-600 transition-all cursor-pointer disabled:cursor-not-allowed"
                        />
                      </div>
                    </td>
                    <td className="py-4 px-3">
                      <div className="flex flex-col gap-1.5">
                        <p className="font-black text-slate-900 text-[11px] uppercase tracking-tight leading-tight">{f.libelle}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/50">{f.family || 'Général'}</span>
                          <span className="text-[7px] font-bold text-slate-400 flex items-center gap-1"><Layers size={10} /> {f.duration}</span>
                          <div className="flex gap-1 ml-1">
                            {f.targetedComps?.map(rc => (
                              <span key={rc} className={`px-1.5 py-0.5 rounded text-[7px] font-black border transition-colors ${selectedRCs.includes(rc) ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{rc}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-2">
                       <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-slate-900">{f.ipf}</span>
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${(f.ipf/5)*100}%` }} />
                          </div>
                       </div>
                    </td>
                    <td className="text-center py-4 px-2">
                       <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-slate-900">{f.ipt}</span>
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(f.ipt/100)*100}%` }} />
                          </div>
                       </div>
                    </td>
                    <td className="text-center py-4 px-2">
                       <div className="flex flex-col items-center gap-1">
                          <span className="font-black text-slate-900">{f.cs.toFixed(1)}</span>
                          <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full ${f.cs < 0.7 ? 'bg-rose-400' : 'bg-amber-400'}`} style={{ width: `${Math.min(100, f.cs * 50)}%` }} />
                          </div>
                       </div>
                    </td>
                    <td className="text-center py-4 px-2">
                       <div className="flex flex-col items-center">
                          <span className={`text-sm font-black ${f.finalScore > 70 ? 'text-indigo-600' : 'text-slate-900'}`}>{f.finalScore}</span>
                          {f.robMult !== 1 && <span className="text-[7px] font-bold text-rose-400 uppercase tracking-tighter">Malus Rob. ×{f.robMult}</span>}
                       </div>
                    </td>
                    <td className="text-center py-4 px-3">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm min-w-[120px] ${recColors[f.recommendation] || 'bg-slate-100 text-slate-500'}`}>
                          {f.recommendation}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-20 text-center bg-slate-50/30">
                    <div className="flex flex-col items-center gap-3">
                       <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                          <Search size={24} />
                       </div>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Aucun résultat pour cette recherche</p>
                       <button onClick={() => setSearchQuery('')} className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:underline">Réinitialiser les filtres</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
               <CheckCircle2 size={14} />
               <span className="text-[10px] font-black uppercase tracking-widest">{selectedFormations.size} Sélectionnées</span>
            </div>
            {uncoveredCriticalRCs.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl animate-pulse">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">{uncoveredCriticalRCs.length} RC Critiques non couvertes</span>
              </div>
            )}
          </div>
          {searchQuery && (
            <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <Filter size={12} />
              Filtre : <span className="text-indigo-600">"{searchQuery}"</span> — {formationScoring.length} formations affichées
            </div>
          )}
        </div>
      </div>

      {/* Custom Formation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="h-2 w-full bg-slate-900" />
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/20">
                    <PlusCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Formation Personnalisée</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Concevoir un module hors référentiel</p>
                  </div>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titre de la formation</label>
                  <input 
                    type="text"
                    placeholder="Ex: Atelier sur l'Inclusion Numérique..."
                    value={newFormation.libelle}
                    onChange={(e) => setNewFormation(prev => ({ ...prev, libelle: e.target.value }))}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Famille</label>
                    <select 
                      value={newFormation.family}
                      onChange={(e) => setNewFormation(prev => ({ ...prev, family: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none"
                    >
                      {['Pédagogie', 'Évaluation', 'Inclusion', 'Innovation', 'Général'].map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Durée</label>
                    <input 
                      type="text"
                      placeholder="Ex: 6h (2 x 3h)"
                      value={newFormation.duration}
                      onChange={(e) => setNewFormation(prev => ({ ...prev, duration: e.target.value }))}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center">
                    <span>RC Cibles</span>
                    <span className="text-indigo-600">{newFormation.targetedComps.length} sélectionnée(s)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.keys(store.competences).map(rcId => {
                      const isSelected = newFormation.targetedComps.includes(rcId);
                      return (
                        <button 
                          key={rcId}
                          onClick={() => {
                            setNewFormation(prev => ({
                              ...prev,
                              targetedComps: isSelected 
                                ? prev.targetedComps.filter(id => id !== rcId)
                                : [...prev.targetedComps, rcId]
                            }))
                          }}
                          className={`py-2 rounded-xl text-[10px] font-black transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}
                        >
                          {rcId}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-10">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 px-6 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateCustom}
                  disabled={!newFormation.libelle || newFormation.targetedComps.length === 0}
                  className={`flex-1 px-6 py-4 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                    !newFormation.libelle || newFormation.targetedComps.length === 0 
                    ? 'bg-slate-200 cursor-not-allowed' 
                    : 'bg-slate-900 hover:bg-indigo-600 shadow-slate-900/20'
                  }`}
                >
                  Créer et Sélectionner
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* La Matrice Intelligence Hybride a été déplacée en haut à côté du Plan & Dette */}

      {/* ═══ OUTIL 5.4 — Alertes de Couverture ═══ */}
      {uncoveredCriticalRCs.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-rose-600" size={24} />
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-lg font-black text-rose-900 uppercase tracking-tight">Déficits Critiques Non Couverts</p>
            <p className="text-sm font-bold text-rose-700">
              Les compétences suivantes sont en zone de priorité (urgence élevée) mais ne sont ciblées par aucune formation sélectionnée :
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {uncoveredCriticalRCs.map(rc => (
                <span key={rc} className="px-3 py-1 bg-white rounded-lg border border-rose-200 text-rose-700 text-xs font-black shadow-sm">
                  {rc}
                </span>
              ))}
            </div>
          </div>
          <button className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg flex items-center gap-2 shrink-0">
            <PlusCircle size={16} />
            Créer Formation Sur Mesure
          </button>
        </div>
      )}

      {/* ═══ OUTIL 5.5 — Effort/Impact Matrix ═══ */}
      <EffortImpactMatrix 
        store={store} 
        participants={participants || []} 
        formations={formationScoring} 
        selectedCircos={selectedCircos} 
        topUrgencyRC={topUrgencyRC} 
        selectedIds={selectedFormations}
      />

      <StepValidationFooter
        stepId={4}
        isValidated={stepValidation?.validated}
        onValidate={() => onValidate(4)}
        onInvalidate={onInvalidate}
        validationChecks={[
          { label: 'Les recommandations T1/T2/T3 du moteur causal ont été examinées', checked: checks.matrice, onChange: v => setChecks(p => ({ ...p, matrice: v })) },
          { label: 'Le scoring des formations est validé', checked: checks.scoring, onChange: v => setChecks(p => ({ ...p, scoring: v })) },
          { label: `Les ${selectedFormations.size} formations retenues sont validées`, checked: checks.selection && selectedFormations.size > 0, onChange: v => setChecks(p => ({ ...p, selection: v })) },
        ]}
      />
    </div>
  );
}
