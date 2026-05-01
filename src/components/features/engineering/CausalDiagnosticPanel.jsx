import React, { useMemo, useState, useEffect } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2,
  Info, LucideSearch,
  Network, ShieldAlert, Sparkles, Zap,
  ShieldCheck, MapPin, Target, Eye, EyeOff
} from 'lucide-react';
import { CAUSAL_MAP } from '../../../constants/causalMap';
import {
  collectTerminalRoots,
  getBlockedRCs,
  calculateCausalScore,
  calculatePedagogicalDebt,
  calculateRobustnessIndex,
  getRobustnessMultiplier,
  resolveCatalogFormationForRc,
  summarizeReliabilityABC,
  buildDebtCompensationPlan,
  findFusionSuggestions,
} from '../../../utils/causalEngine';

function debtLabel(level) {
  if (level === 'null') return 'Nulle';
  if (level === 'light') return 'Légère';
  if (level === 'severe') return 'Sévère';
  if (level === 'blocking') return 'Bloquante';
  return level;
}

export function CausalDiagnosticPanel({ 
  store, 
  participants, 
  selectedRCs, 
  onDiagnosticsMetaChange, 
  robustness, 
  reliabilitySummary, 
  isWorkflowMode,
  hideResults = false,
  resultsOnly = false
}) {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const threshold = store.riskThresholds?.urgency || 3.0;



  const allAggregateScores = useMemo(() => {
    const circos = [...new Set(participants.map((p) => p['Circonscription']))];
    const results = { Global: {} };
    circos.forEach((c) => {
      results[c] = {};
    });
    const rcIds = [
      ...new Set([
        ...Object.keys(CAUSAL_MAP),
        ...Object.keys(store.competences || {}),
        ...selectedRCs,
      ]),
    ];
    rcIds.forEach((rcId) => {
      const globalPScores = participants.map((p) => p.realityScores?.[rcId] ?? 3);
      results.Global[rcId] = globalPScores.length
        ? globalPScores.reduce((a, b) => a + b, 0) / globalPScores.length
        : 0;
      circos.forEach((c) => {
        const cPScores = participants
          .filter((p) => p['Circonscription'] === c)
          .map((p) => p.realityScores?.[rcId] ?? 3);
        results[c][rcId] = cPScores.length ? cPScores.reduce((a, b) => a + b, 0) / cPScores.length : 0;
      });
    });
    return results;
  }, [participants, store.competences, selectedRCs]);

  const aggregateScores = allAggregateScores.Global;

  const causalRobustnessLevel =
    robustness?.level === 'insufficient' ? 'insufficient' : robustness?.level || 'robust';

  const diagnosticResults = useMemo(() => {
    const symptoms = selectedRCs.filter((rcId) => {
      const score = aggregateScores[rcId] ?? 0;
      const target = store.referential?.[rcId]?.targetScore || 4.0;
      const gap = target - score;
      return score > 0 && gap >= threshold;
    });
    const chains = [];

    symptoms.forEach((symptomId) => {
      const roots = collectTerminalRoots(symptomId, aggregateScores, threshold, store.referential);
      roots.forEach((rootId) => {
        const blocked = getBlockedRCs(rootId);
        const rootScore = aggregateScores[rootId] ?? 0;
        const { formation, ipf, topThree } = resolveCatalogFormationForRc(rootId, store.referential);
        const causalResult = calculateCausalScore(
          rootId,
          rootScore,
          blocked.length,
          ipf,
          causalRobustnessLevel
        );
        chains.push({
          symptomId,
          rootId,
          rootScore,
          blocked,
          scoreCausal: causalResult.score,
          baseScore: causalResult.baseScore,
          multiplier: causalResult.multiplier,
          ipf,
          formation,
          topThree: topThree || [],
          isAbsoluteRoot: CAUSAL_MAP[rootId]?.prerequisites?.length === 0,
          isPivotAbsolu: blocked.length >= 5,
        });
      });
    });

    const rootGroups = {};
    chains.forEach((chain) => {
      if (!rootGroups[chain.rootId]) {
        rootGroups[chain.rootId] = {
          rootId: chain.rootId,
          rootScore: chain.rootScore,
          symptoms: [],
          blocked: chain.blocked,
          scoreCausal: chain.scoreCausal,
          baseScore: chain.baseScore,
          multiplier: chain.multiplier,
          ipf: chain.ipf,
          formation: chain.formation,
          topThree: chain.topThree,
          isAbsoluteRoot: chain.isAbsoluteRoot,
          isPivotAbsolu: chain.isPivotAbsolu,
        };
      }
      const g = rootGroups[chain.rootId];
      g.symptoms.push(chain.symptomId);
      g.symptoms = [...new Set(g.symptoms)];
    });

    return Object.values(rootGroups)
      .sort((a, b) => b.scoreCausal - a.scoreCausal)
      .slice(0, 3);
  }, [selectedRCs, aggregateScores, threshold, store.referential, causalRobustnessLevel]);

  const cycleResults = useMemo(() => {
    if (!robustness?.isMacro || !diagnosticResults.length) return diagnosticResults;
    const circos = [...new Set(participants.map((p) => p['Circonscription']))];
    return diagnosticResults.map((res) => {
      const circosWithDeficit = circos.filter((c) => {
        const circoScore = allAggregateScores[c][res.rootId];
        return circoScore > 0 && circoScore < threshold;
      });
      const isCyclePriority = circosWithDeficit.length >= 2;
      return {
        ...res,
        isCyclePriority,
        isLocalSpecificity: !isCyclePriority,
        affectedCircos: circosWithDeficit,
      };
    });
  }, [diagnosticResults, robustness, allAggregateScores, threshold, participants]);

  const processingOrderRaw = useMemo(() => {
    return cycleResults.map((res) => {
      const debt = calculatePedagogicalDebt(res.rootId, aggregateScores, threshold, store.referential);
      const formation =
        res.formation ||
        resolveCatalogFormationForRc(res.rootId, store.referential).formation ||
        { id: 'N/A', libelle: `Formation ${res.rootId}` };
      const prereqLabels = (debt.unsatisfied || []).map(
        (id) => `${id} (${CAUSAL_MAP[id]?.label || id})`
      );
      const compensation =
        debt.score < 1.0
          ? buildDebtCompensationPlan(debt.level, debt.score, prereqLabels, res.symptoms)
          : null;
      return { ...res, debt, formation, compensation };
    });
  }, [cycleResults, aggregateScores, threshold, store.referential]);

  const processingOrder = useMemo(() => {
    const sum = processingOrderRaw.reduce((acc, r) => acc + r.scoreCausal, 0) || 1;
    return processingOrderRaw.map((r) => ({
      ...r,
      responsibilityPct: Math.round((r.scoreCausal / sum) * 1000) / 10,
    }));
  }, [processingOrderRaw]);

  const fusionSuggestions = useMemo(() => findFusionSuggestions(processingOrder), [processingOrder]);

  const signature = useMemo(() => {
    if (!processingOrder || processingOrder.length === 0) return '';
    const currentOrderIds = processingOrder.map(r => r.rootId).join('|');
    const currentScores = processingOrder.map(r => Math.round(r.scoreCausal)).join(',');
    return `${currentOrderIds}#${currentScores}#${robustness?.level}`;
  }, [processingOrder, robustness?.level]);

  useEffect(() => {
    if (!signature) return;

    // Use a ref to track the last signature sent to avoid loops
    if (window._lastDiagSig === signature) return;
    window._lastDiagSig = signature;

    onDiagnosticsMetaChange?.({
      processingOrder,
      robustnessLevel: robustness?.level,
      primaryRootId: processingOrder[0]?.rootId ?? null,
      primaryFormationId: processingOrder[0]?.formation?.id ?? null,
      _orderSignature: signature 
    });
  }, [signature, processingOrder, robustness?.level, onDiagnosticsMetaChange]);

  const quorumWeak = robustness?.level === 'insufficient';

  if (!participants || !participants.length) return null;

  const handleValidatePlan = () => {
    if (!processingOrder.length) return;
    const roots = processingOrder.map((r) => r.rootId).join(', ');
    const comps = processingOrder.flatMap((r) => r.symptoms);
    if (typeof store.validateNeedsTheme === 'function') {
      void store.validateNeedsTheme(
        `Traitement causal prioritaire (${roots})`,
        [...new Set(comps)],
        `Ordre validé depuis le moteur causal — ${new Date().toLocaleString('fr-FR')}`
      );
    }
  };

  const handleAdjustClick = () => {
    document.getElementById('arbitrage-hub')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">


      <div className={resultsOnly || hideResults ? "space-y-8" : "grid grid-cols-1 xl:grid-cols-2 gap-8"}>
        {!resultsOnly && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
              <Network size={20} />
            </div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 uppercase">Phase 3. Diagnostic Causal & Racines</h3>
          </div>

          {fusionSuggestions.filter((f) => f.fusionEligible).length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
              <p className="text-[10px] font-black uppercase text-indigo-700 tracking-widest">
                Fusion de chaînes (règle prompt)
              </p>
              {fusionSuggestions
                .filter((f) => f.fusionEligible)
                .slice(0, 2)
                .map((f, i) => (
                  <p key={i} className="text-[10px] text-indigo-900 leading-relaxed">
                    Modules {f.a.formation?.id ?? f.a.rootId} et {f.b.formation?.id ?? f.b.rootId} : scores
                    proches (&lt;15&nbsp;% d’écart), niveau carte ou famille compatible, faisabilité session —
                    envisager un module combiné ; CS fusionné = min(CS des deux chaînes).
                  </p>
                ))}
            </div>
          )}

          <div className="space-y-4">
            {processingOrder.map((res) => (
              <div
                key={res.rootId}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative"
              >
                <div className="absolute -top-2 -right-2 text-4xl font-black text-slate-50 opacity-10 group-hover:opacity-20 transition-opacity italic">
                  {Math.round(res.scoreCausal)}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">
                        Symptômes Détectés
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {res.isPivotAbsolu && (
                          <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                            Pivot Absolu
                          </span>
                        )}
                        {res.symptoms.map((sId) => (
                          <span
                            key={sId}
                            className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md text-[9px] font-bold border border-rose-100"
                          >
                            {sId}
                          </span>
                        ))}
                      </div>
                      {res.symptoms.length > 1 && (
                        <p className="text-[9px] font-medium text-indigo-600 mt-2 leading-snug">
                          Convergence : plusieurs déficits de surface partagent la même cause — traiter{' '}
                          {res.rootId} peut lever ces symptômes simultanément.
                        </p>
                      )}
                    </div>
                    {res.isLocalSpecificity && (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 uppercase">
                        <MapPin size={10} /> Local
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-slate-900 rounded-xl p-4 text-white">
                    <div className="text-center flex-shrink-0 border-r border-white/10 pr-4">
                      <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-tighter">Racine</p>
                      <p className="text-xl font-black italic">{res.rootId}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{CAUSAL_MAP[res.rootId]?.label}</p>
                      <p className="text-[9px] text-slate-400 truncate font-medium">
                        {CAUSAL_MAP[res.rootId]?.role}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[8px] font-bold text-emerald-400 uppercase">Poids causal</p>
                      <p className="text-sm font-black text-white">{res.responsibilityPct}%</p>
                    </div>
                  </div>

                  {showTechnicalDetails && (
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3 animate-in slide-in-from-top-2">
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-tighter">
                        <span>Justification Causale</span>
                        <span className="text-indigo-600">Branches déficitaires fusionnées</span>
                      </div>
                      <p className="text-[9px] font-medium text-slate-600 leading-relaxed italic">
                        La compétence {res.rootId} est une racine avec IPF module {res.ipf} (
                        {res.formation?.libelle || 'catalogue'}) ; elle bloque {res.blocked.length} RC en aval.
                      </p>
                      <div className="flex items-center gap-4 pt-2 border-t border-slate-200/50">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Score Base</span>
                          <span className="text-xs font-bold text-slate-900">{Math.round(res.baseScore)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Pénalité Robustesse</span>
                          <span className="text-xs font-bold text-rose-500">x{res.multiplier.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col ml-auto text-right">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Score Final</span>
                          <span className="text-xs font-black text-indigo-600">{Math.round(res.scoreCausal)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase border-t border-slate-50 pt-3">
                    <span>Impact : {res.blocked.length} RCs débloquées</span>
                    <span className="text-slate-600">
                      Gravité : {Math.round((res.blocked.length / 12) * 100)}%
                    </span>
                  </div>
                  {res.symptoms[0] && res.symptoms[0] !== res.rootId && (
                    <p className="text-[9px] text-slate-500 font-medium">
                      RC cible en surface (symptôme initial) : {res.symptoms[0]} — ordre de traitement catalogue
                      suit la racine {res.rootId} (T1 si prioritaire absolue).
                    </p>
                  )}
                </div>
              </div>
            ))}
            {processingOrder.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-[11px]">
                Aucune chaîne causale active pour les RC et le seuil courants.
              </div>
            )}
          </div>
        </div>
        )}

        {!hideResults && (
        <div className="space-y-6">
          <div className="space-y-5">
            {processingOrder.map((res, idx) => (
              <div
                key={res.rootId}
                className="bg-white rounded-[32px] p-6 border border-slate-200 space-y-5 shadow-sm hover:border-indigo-200 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-indigo-200 shrink-0">
                      T{idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                          Racine : {res.rootId}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter border ${
                          res.debt.level === 'null' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          res.debt.level === 'light' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          Dette {debtLabel(res.debt.level)}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                        {CAUSAL_MAP[res.rootId]?.label || 'Déficit structurel'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Impact Causal</p>
                    <p className="text-sm font-black text-slate-900">{res.responsibilityPct}%</p>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-[24px] p-5 text-white shadow-xl border border-white/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-black shadow-lg">T{idx + 1}</div>
                       <div>
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">{res.rootId} — Priorité</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{CAUSAL_MAP[res.rootId]?.label || 'Déficit structurel'}</p>
                       </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter border ${
                      res.debt.level === 'null' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      res.debt.level === 'light' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      Dette {debtLabel(res.debt.level)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {res.topThree?.map((alt, aIdx) => (
                      <div key={alt.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${aIdx === 0 ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent opacity-50 hover:opacity-100 hover:bg-white/5'}`}>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${aIdx === 0 ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                          {aIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className={`text-[10px] font-black uppercase tracking-tight truncate ${aIdx === 0 ? 'text-white' : 'text-slate-400'}`}>{alt.libelle}</p>
                           {aIdx === 0 && <p className="text-[7px] font-bold text-indigo-400 uppercase tracking-tighter">Option Optimale</p>}
                        </div>
                        <div className="text-[9px] font-black text-slate-600">IPF:{alt.ipf}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                    {res.symptoms.map((sId) => (
                      <span key={sId} className="px-2 py-0.5 bg-white/5 text-white/40 rounded-md text-[7px] font-bold border border-white/5 uppercase">
                        {sId}
                      </span>
                    ))}
                  </div>
                </div>

                {res.debt.score < 1.0 && res.compensation && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <Info size={14} className="text-amber-600" />
                      </div>
                      <div className="space-y-1.5 text-[10px] text-amber-900 font-medium leading-snug">
                        <p className="font-bold uppercase text-[8px] text-amber-700 tracking-widest">Alerte de Dette Pédagogique</p>
                        <p>{res.compensation.riskLine}</p>
                        <p className="text-[9px] text-amber-800/70 italic border-t border-amber-200/50 pt-2">
                          💡 {res.compensation.remedLine}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {!isWorkflowMode && !hideResults && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  5. Arbitrage & Décision
                </h3>
                <p className="text-slate-500 text-xs font-medium">Validation stratégique par l&apos;inspecteur.</p>
              </div>
            </div>

            <div className="space-y-3 text-sm font-medium text-slate-700 leading-relaxed max-w-2xl">
              <p>
                {processingOrder.length > 0
                  ? `Synthèse : ${processingOrder[0].rootId} est le pivot prioritaire (${processingOrder[0].responsibilityPct}% du score causal agrégé). Traiter cette racine peut débloquer jusqu’à ${processingOrder[0].blocked.length} compétences en aval selon la carte RCET.`
                  : quorumWeak
                    ? 'Quorum faible : la décision doit intégrer les réserves de fiabilité ci-dessus.'
                    : 'Aucun blocage hiérarchique critique détecté pour la sélection courante.'}
              </p>
              <p className="text-slate-600 text-xs">
                La décision finale appartient à Mohamed Amir Beldi. Vous pouvez valider ce plan (enregistrement
                dans l&apos;analyse des besoins) ou ajuster en passant au hub catalogue ci-dessous pour comparer
                modules, effort et sessions.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleValidatePlan}
                disabled={!processingOrder.length}
                className={`px-8 py-3.5 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-3 ${
                  !processingOrder.length
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-indigo-600'
                }`}
              >
                <CheckCircle2 size={16} />
                Valider le Plan
              </button>
              <button
                type="button"
                onClick={handleAdjustClick}
                className="px-8 py-3.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-900 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
              >
                Ajuster (hub catalogue)
              </button>
            </div>
          </div>

          <div className="hidden lg:flex w-64 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-200 border-4 border-white shadow-lg flex items-center justify-center text-slate-400 overflow-hidden">
              <LucideSearch size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase">M. Amir Beldi</p>
              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Inspecteur</p>
            </div>
            <p className="text-[9px] font-medium text-slate-500 italic leading-tight">
              Outil d&apos;aide à l&apos;arbitrage — recommandations non contraignantes.
            </p>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
