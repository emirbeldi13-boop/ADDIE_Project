import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, AlertTriangle, ArrowRight, Edit3, Sparkles,
  FileText, ShieldCheck, Zap, TrendingUp, LayoutGrid, Map,
  Target, Info, ChevronRight, FileCheck, Clock, Download,
  Rocket, Award, History
} from 'lucide-react';
import { DecisionArbitrageHub } from '../DecisionArbitrageHub';
import { exportStrategyReportToPDF } from '../../../../utils/pdfGenerator';
import { ConfirmationModal } from '../../../common/ConfirmationModal';

/**
 * Dashboard de Décision Finale — Récapitule tout le workflow
 */
export function WorkflowDecisionDashboard({
  store,
  participants,
  selectedCircos = [],
  selectedRCs = [],
  advancedStats,
  robustness,
  workflowData,
  updateWorkflowData,
  stepValidations,
  onResetStep,
  onOpenSession,
  recommendedFormations
}) {
  const [isFinalized, setIsFinalized] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleExportPDF = async () => {
    await exportStrategyReportToPDF(workflowData, participants, store, stepValidations, selectedCircos, selectedRCs);
  };

  const handleFinalValidation = () => {
    setShowConfirmModal(true);
  };

  const confirmValidation = () => {
    setIsFinalized(true);
    setShowConfirmModal(false);
    // Automatically export PDF on final validation
    handleExportPDF();
  };

  const allStepsValidated = [1, 2, 3, 4, 5, 6].every(s => stepValidations?.[`step${s}`]?.validated);
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const stepSummaries = [
    { id: 1, label: 'Ciblage', icon: Map, summary: `${selectedCircos.length} zone(s) sélectionnée(s)` },
    { id: 2, label: 'Fiabilité', icon: ShieldCheck, summary: `Indice ${robustness?.level || 'stable'}` },
    { id: 3, label: 'Déficits', icon: Zap, summary: `${selectedRCs.length} compétences ciblées` },
    { id: 4, label: 'Scoring', icon: FileText, summary: `${workflowData?.step4?.selectedFormations?.length || 0} module(s) retenu(s)` },
    { id: 5, label: 'Séquençage', icon: TrendingUp, summary: `Priorité : ${workflowData?.step5?.nextFormation || 'Non définie'}` },
    { id: 6, label: 'Priorisation', icon: Target, summary: `${participants.length} bénéficiaires identifiés` },
  ];

  // Final Validation & Decision Arbitrage
  const decisionData = useMemo(() => {
    const selectedIds = workflowData?.step4?.selectedFormations || [];
    const allFormations = Object.values(store.referential || {});
    
    const quickWins = allFormations.filter(f => selectedIds.includes(f.id));
    
    // Simple synergy logic for the dashboard
    const hybridOps = [];
    if (quickWins.length >= 2) {
      // Look for the best synergy among selected ones
      for (let i = 0; i < quickWins.length; i++) {
        for (let j = i + 1; j < quickWins.length; j++) {
          const f1 = quickWins[i];
          const f2 = quickWins[j];
          const comps1 = f1.targetedComps || [];
          const comps2 = f2.targetedComps || [];
          const shared = comps1.filter(c => comps2.includes(c));
          if (shared.length > 0) {
            hybridOps.push({ source: f1, target: f2, score: shared.length / Math.max(comps1.length, comps2.length) });
          }
        }
      }
    }

    return { quickWins, hybridOps: hybridOps.sort((a,b) => b.score - a.score).slice(0, 2) };
  }, [workflowData?.step4?.selectedFormations, store.referential]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[32px] bg-slate-900 text-white flex items-center justify-center shadow-2xl border-4 border-white">
            <FileCheck size={36} />
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              Décision Stratégique
            </h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" /> Validation Finale ADDIE
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
           <div className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 ${allStepsValidated ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'} shadow-lg`}>
              {allStepsValidated ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                 {allStepsValidated ? 'Prêt pour validation' : 'Diagnostic incomplet'}
              </span>
           </div>
        </div>
      </div>

      {/* ── VALIDATION STATUS BANNER ── */}
      {isFinalized ? (
        <div className="group p-10 bg-gradient-to-br from-emerald-600 to-teal-900 rounded-[48px] border border-white/20 shadow-2xl relative overflow-hidden animate-in zoom-in duration-700">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 blur-[100px] -mr-48 -mt-48 rounded-full" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-white">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30">
                <Award size={40} className="text-yellow-300" />
              </div>
              <div className="text-left">
                <h3 className="text-3xl font-black uppercase tracking-tight">Stratégie T1 Validée</h3>
                <p className="text-emerald-100 font-bold text-sm mt-2 uppercase tracking-widest opacity-90 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Rapport archivé et prêt pour la Phase Design
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
               <button 
                 onClick={handleExportPDF}
                 className="px-8 py-5 bg-white/10 hover:bg-white/20 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all border border-white/20 flex items-center gap-3"
               >
                 <Download size={16} />
                 Télécharger le Rapport
               </button>
               <button className="px-10 py-5 bg-white text-emerald-900 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all shadow-2xl flex items-center gap-3">
                 Démarrer le Design
                 <Rocket size={16} />
               </button>
            </div>
          </div>
        </div>
      ) : allStepsValidated ? (
        <div className="group p-10 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[48px] border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] -mr-32 -mt-32 rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-8 text-white">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <CheckCircle2 size={32} />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-black uppercase tracking-tight">Diagnostic certifié conforme</h3>
                <p className="text-indigo-200 font-bold text-sm mt-1 uppercase tracking-widest opacity-70">
                  Toutes les étapes du cycle d'analyse ont été validées avec succès.
                </p>
              </div>
            </div>
            <button 
              onClick={handleFinalValidation}
              className="px-10 py-5 bg-white text-slate-900 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] hover:bg-emerald-500 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center gap-3"
            >
              Valider la Stratégie T1
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-10 bg-white rounded-[48px] border-2 border-dashed border-slate-200 flex flex-col items-center text-center gap-6">
          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
             <AlertTriangle size={32} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Le workflow est encore ouvert</h3>
            <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">
              Veuillez compléter les étapes restantes pour générer votre arbitrage final.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── STEPS SUMMARY ── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-8 flex items-center gap-3">
              <LayoutGrid size={20} className="text-indigo-500" /> État des Jalons
            </h3>
            <div className="space-y-3">
              {stepSummaries.map(step => {
                const validation = stepValidations?.[`step${step.id}`];
                const isValidated = validation?.validated;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className={`group flex items-center justify-between p-5 rounded-[24px] border transition-all ${
                    isValidated ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50/50 border-slate-100 opacity-60'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                        isValidated ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isValidated ? <CheckCircle2 size={16} /> : <span className="text-xs font-black">{step.id}</span>}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                          Étape {step.id} — {step.label}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{step.summary}</p>
                      </div>
                    </div>
                    {isValidated && (
                      <button
                        onClick={() => onResetStep(step.id)}
                        className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Réouvrir cette étape"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-8 bg-indigo-600 rounded-[40px] text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
             <div className="relative z-10 space-y-4">
                <Info size={24} className="text-indigo-200" />
                <h4 className="text-lg font-black uppercase tracking-tight leading-tight">Garantie de Traçabilité</h4>
                <p className="text-[11px] font-bold text-indigo-100 leading-relaxed uppercase tracking-wider opacity-80">
                  Toute modification d'une étape antérieure invalide automatiquement les suivantes pour assurer une intégrité totale des données stratégiques.
                </p>
             </div>
          </div>
        </div>

        {/* ── FINAL ARBITRAGE HUB ── */}
        <div className="lg:col-span-8">
          {allStepsValidated ? (
            <div className="animate-in fade-in zoom-in-95 duration-1000 space-y-8">
              <DecisionArbitrageHub 
                store={store}
                formations={Object.values(store.referential || {})}
                quickWins={decisionData.quickWins}
                hybridOps={decisionData.hybridOps}
                onOpenSession={onOpenSession}
                participants={participants}
                causalDiagnostics={workflowData?.step3?.causalDiagnostics}
              />
              
              <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">
                    Validation de la Décision
                  </h3>
                  <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                    Phase Analyse → Phase Design (ADDIE)
                  </p>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-4 text-center">
                  <p className="text-sm font-bold text-white/80 leading-relaxed italic">
                    « La décision ci-dessus a été prise après analyse systématique des données territoriales, 
                    vérification de la fiabilité des sources, diagnostic causal des déficits, 
                    scoring des formations éligibles, et priorisation des bénéficiaires. »
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Clock size={14} className="text-indigo-400" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      Horodaté : {dateStr} à {timeStr}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    disabled={isFinalized}
                    onClick={handleFinalValidation}
                    className={`flex-1 py-4 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all ${
                      isFinalized 
                        ? 'bg-slate-700 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    <CheckCircle2 size={18} />
                    {isFinalized ? 'Stratégie Archivée' : 'Valider & Passer en Phase Design'}
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="py-4 px-6 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-white/20"
                  >
                    <Download size={16} />
                    Rapport PDF
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-slate-50/50 rounded-[48px] border-2 border-dashed border-slate-200 flex items-center justify-center p-20">
               <div className="max-w-xs text-center space-y-4">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                     <ShieldCheck size={32} className="text-slate-200" />
                  </div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                     En attente de la clôture du diagnostic...
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ── */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmValidation}
        title="Validation de la Stratégie T1"
        message="Êtes-vous sûr de vouloir valider cette stratégie ? Cela générera le rapport final et clôturera la phase d'Analyse (ADDIE) pour ce cycle."
        confirmLabel="Confirmer la Stratégie"
        type="success"
      />
    </div>
  );
}
