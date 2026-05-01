import React, { useMemo, useState, useEffect } from 'react';
import { 
  Calendar, AlertCircle, ArrowRight, Clock, Target, CheckCircle2, 
  TrendingUp, ShieldAlert, Sparkles, LayoutGrid, Info, ChevronRight,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { calculatePedagogicalDebt, buildDebtCompensationPlan } from '../../../../utils/causalEngine';
import { calculateCS } from '../../../../utils/eligibilityEngine';

/**
 * ÉTAPE 5 — Prochaine Formation à Planifier
 */
export function WorkflowStep6Sequencing({ 
  store, 
  participants, 
  workflowData, 
  updateWorkflowData, 
  stepValidation, 
  onValidate, 
  onInvalidate 
}) {
  const isLocked = stepValidation?.validated;
  const [checks, setChecks] = useState({ priorite: false, dette: false, dates: false });
  
  const savedNextFormation = useMemo(() => workflowData?.step5?.nextFormation || null, [workflowData?.step5?.nextFormation]);
  const [nextFormationId, setNextFormationId] = useState(savedNextFormation);

  useEffect(() => {
    setNextFormationId(savedNextFormation);
  }, [savedNextFormation]);

  const threshold = store.riskThresholds?.urgency || 2.5;

  const rcIds = Object.keys(store.competences || {});
  const aggregateScores = useMemo(() => {
    const scores = {};
    rcIds.forEach(rcId => {
      const pScores = participants.map(p => p.realityScores?.[rcId] ?? 3);
      scores[rcId] = pScores.length ? pScores.reduce((a, b) => a + b, 0) / pScores.length : 0;
    });
    return scores;
  }, [participants, rcIds]);

  // Selected formations from Step 4
  const plannedFormations = useMemo(() => {
    const selectedIds = workflowData?.step4?.selectedFormations || [];
    const completedFormations = store.sessions?.filter(s => s.Statut === 'Réalisée')?.map(s => s.Formation) || [];
    
    return selectedIds
      .map(id => {
        const f = store.referential?.[id] || { id, libelle: 'Formation Inconnue', targetedComps: [] };
        const cs = calculateCS(f, completedFormations);
        const debt = calculatePedagogicalDebt(f.targetedComps?.[0], aggregateScores, threshold, store.referential);
        let compensation = null;
        if (debt.level !== 'null') {
          compensation = buildDebtCompensationPlan(debt.level, cs, debt.unsatisfied, debt.unsatisfied);
        }
        return { ...f, cs, debt, compensation };
      })
      .sort((a, b) => b.cs - a.cs);
  }, [workflowData?.step4?.selectedFormations, store.referential, store.sessions, aggregateScores, threshold]);

  useEffect(() => {
    if (nextFormationId && nextFormationId !== workflowData?.step5?.nextFormation) {
      updateWorkflowData(5, { nextFormation: nextFormationId });
    }
  }, [nextFormationId, updateWorkflowData, workflowData?.step5?.nextFormation]);

  const debtColors = { 
    null: 'text-emerald-600 bg-emerald-50 border-emerald-100', 
    light: 'text-amber-600 bg-amber-50 border-amber-100', 
    severe: 'text-orange-600 bg-orange-50 border-orange-100', 
    blocking: 'text-rose-600 bg-rose-50 border-rose-100' 
  };
  const debtLabels = { null: 'Nulle', light: 'Légère', severe: 'Sévère', blocking: 'Bloquante' };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl">
          <Calendar size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">5. Priorité d'Action</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            Arbitrage du séquençage et gestion de la dette pédagogique
          </p>
        </div>
      </div>

      {/* ═══ OUTIL 5.1 — Sélection de la Prochaine Formation ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Clock size={20} className="text-indigo-500" /> Choix de la Prochaine Formation (T1)
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Déterminez le module le plus pertinent à lancer immédiatement selon le score CS
          </p>
        </div>
        
        <div className="p-8">
          {plannedFormations.length > 0 ? (
            <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ${isLocked ? 'opacity-70 pointer-events-none' : ''}`}>
              {plannedFormations.map(f => (
                <div 
                  key={f.id} 
                  onClick={() => setNextFormationId(f.id)}
                  className={`group p-6 rounded-[28px] border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[180px] ${
                    nextFormationId === f.id 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100/50' 
                      : 'border-slate-100 hover:border-indigo-300 hover:bg-slate-50 shadow-sm'
                  }`}
                >
                  {nextFormationId === f.id && (
                    <div className="absolute top-6 right-6 text-indigo-600 animate-in zoom-in-50 duration-300">
                      <div className="bg-white rounded-full p-1 shadow-md">
                        <CheckCircle2 size={24} />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                        {f.id}
                      </span>
                      {f.cs >= 1.0 && <Sparkles size={12} className="text-amber-500" />}
                    </div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-tight line-clamp-2">{f.libelle}</p>
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Score de Succès</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-black ${f.cs < 0.7 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {f.cs.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">/ 5</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Dette</span>
                      <span className={`text-[9px] font-black px-3 py-1 rounded-xl border ${debtColors[f.debt?.level || 'null']}`}>
                        {debtLabels[f.debt?.level || 'null']}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200 text-center">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4 shadow-sm border border-slate-100">
                <AlertCircle size={32} />
              </div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Aucune formation sélectionnée</p>
              <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Veuillez valider l'étape précédente pour continuer.</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ OUTIL 5.2 — Séquençage Ultérieur & Dette ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert size={20} className="text-amber-500" /> Séquençage & Mesures Compensatoires
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Analyse de la viabilité pédagogique des modules restants
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3">
             <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Priorité T1</span>
             </div>
             <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">En Attente</span>
             </div>
          </div>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left py-5 px-8 font-black text-slate-400 uppercase text-[8px] tracking-widest">Formation</th>
                <th className="text-center py-5 px-3 font-black text-slate-400 uppercase text-[8px] tracking-widest">Statut</th>
                <th className="text-center py-5 px-3 font-black text-slate-400 uppercase text-[8px] tracking-widest">CS</th>
                <th className="text-center py-5 px-3 font-black text-slate-400 uppercase text-[8px] tracking-widest">Dette Pédagogique</th>
                <th className="text-left py-5 px-8 font-black text-slate-400 uppercase text-[8px] tracking-widest">Mesures Recommandées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {plannedFormations.map(f => {
                const isNext = nextFormationId === f.id;
                return (
                  <tr key={f.id} className={`group transition-colors ${isNext ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
                    <td className="py-6 px-8">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{f.libelle}</span>
                        <div className="flex gap-1">
                           {f.targetedComps?.map(rc => (
                             <span key={rc} className="text-[7px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">{rc}</span>
                           ))}
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-6 px-3">
                      <div className="flex justify-center">
                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm border ${
                          isNext ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                          {isNext ? <Sparkles size={10} /> : <Clock size={10} />}
                          {isNext ? 'Planifiée' : 'En attente'}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-6 px-3">
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-black ${f.cs <= 0.4 ? 'text-rose-600' : f.cs < 1.0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {f.cs.toFixed(1)}
                        </span>
                        {f.cs <= 0.4 && <span className="text-[7px] font-bold text-rose-400 uppercase tracking-tighter">Risque Élevé</span>}
                      </div>
                    </td>
                    <td className="text-center py-6 px-3">
                      <div className="flex justify-center">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black border shadow-sm ${debtColors[f.debt?.level || 'null']}`}>
                          {debtLabels[f.debt?.level || 'null']}
                        </span>
                      </div>
                    </td>
                    <td className="py-6 px-8 max-w-md">
                      {f.compensation ? (
                        <div className="flex items-start gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                           <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                              {f.compensation.remedLine}
                           </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[9px] tracking-widest">
                           <ShieldCheck size={14} />
                           Aucune mesure nécessaire
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <StepValidationFooter
        stepId={5}
        isValidated={stepValidation?.validated}
        onValidate={() => onValidate(5)}
        onInvalidate={onInvalidate}
        validationChecks={[
          { label: 'La priorité de la prochaine formation est juste', checked: checks.priorite, onChange: v => setChecks(p => ({ ...p, priorite: v })) },
          { label: 'Les dettes pédagogiques sont gérables', checked: checks.dette, onChange: v => setChecks(p => ({ ...p, dette: v })) },
          { label: 'Les recommandations pour la suite sont documentées', checked: checks.dates, onChange: v => setChecks(p => ({ ...p, dates: v })) },
        ]}
      />
    </div>
  );
}
