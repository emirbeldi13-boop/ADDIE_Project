import React, { useState } from 'react';
import { 
  CheckCircle2, Lock, Circle, ArrowRight, Edit3,
  Users, ShieldCheck, BarChart3, Network, Target, Calendar, UserCheck, Sparkles 
} from 'lucide-react';
import { ConfirmationModal } from '../../../common/ConfirmationModal';

const STEPS = [
  { id: 1, label: 'Profil Groupe', shortLabel: 'Groupe', icon: Users, question: 'Qui est mon groupe ?' },
  { id: 2, label: 'Fiabilité', shortLabel: 'Fiabilité', icon: ShieldCheck, question: 'Mes données sont-elles fiables ?' },
  { id: 3, label: 'Déficits & Causal', shortLabel: 'Diagnostic', icon: BarChart3, question: 'Où sont les déficits et quelles en sont les causes ?' },
  { id: 4, label: 'Formations', shortLabel: 'Formations', icon: Target, question: 'Quelles formations sont éligibles ?' },
  { id: 5, label: 'Séquençage', shortLabel: 'Séquençage', icon: Calendar, question: 'Dans quel ordre former ?' },
  { id: 6, label: 'Priorisation', shortLabel: 'Priorisation', icon: UserCheck, question: 'Qui former en priorité ?' },
  { id: 'decision', label: 'Décision', shortLabel: 'Décision', icon: Sparkles, question: 'Décision de l\'inspecteur' },
];

export function WorkflowStepper({ currentStep, stepValidations, onStepClick }) {
  // Compute the highest step the user can reach:
  // Any validated step AND the first non-validated step after a contiguous chain of validated steps
  const highestReachable = React.useMemo(() => {
    // Find the highest contiguous validated step from step 1
    let highest = 1; // Step 1 is always reachable
    for (let s = 1; s <= 6; s++) {
      if (stepValidations?.[`step${s}`]?.validated) {
        highest = s + 1; // The step after the validated one is also reachable
      } else {
        break;
      }
    }
    return Math.min(highest, 7); // 7 means 'decision' is reachable
  }, [stepValidations]);

  const allValidated = [1,2,3,4,5,6].every(s => stepValidations?.[`step${s}`]?.validated);

  return (
    <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] p-3 border border-slate-200/60 shadow-2xl sticky top-4 z-[100] mx-4">
      <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-hide px-2">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const validation = stepValidations?.[`step${step.id}`];
          const isComplete = validation?.validated === true;
          const isCurrent = currentStep === step.id;
          const stepNum = typeof step.id === 'number' ? step.id : 7;
          const canNavigate = stepNum <= highestReachable;
          const canGoDecision = step.id === 'decision' && allValidated;
          const isLocked = !canNavigate && !canGoDecision;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => {
                  if (canNavigate || canGoDecision) onStepClick(step.id);
                }}
                disabled={!canNavigate && !canGoDecision}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all shrink-0 group ${
                  isCurrent 
                    ? 'bg-slate-900 text-white shadow-xl scale-105' 
                    : isComplete 
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                      : isLocked && !canGoDecision
                        ? 'opacity-30 cursor-not-allowed' 
                        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  isCurrent 
                    ? 'bg-white/20' 
                    : isComplete 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-100'
                }`}>
                  {isComplete ? <CheckCircle2 size={14} /> : isLocked && !canGoDecision ? <Lock size={12} /> : <Icon size={14} />}
                </div>
                <div className="flex flex-col items-start">
                  <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${
                    isCurrent ? 'text-white/60' : isComplete ? 'text-emerald-500' : 'text-slate-400'
                  }`}>
                    {typeof step.id === 'number' ? `Étape ${step.id}` : ''}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-tight leading-tight ${
                    isCurrent ? 'text-white' : ''
                  }`}>
                    {step.shortLabel}
                  </span>
                </div>
                {isComplete && validation?.timestamp && (
                  <span className="text-[7px] font-bold text-emerald-400 whitespace-nowrap ml-1">
                    {new Date(validation.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </button>
              {i < STEPS.length - 1 && (
                <ArrowRight size={12} className={`shrink-0 ${isComplete ? 'text-emerald-300' : 'text-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function StepValidationFooter({ stepId, onValidate, onInvalidate, validationChecks, isValidated }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const allChecked = validationChecks.every(c => c.checked);

  const handleModifyClick = () => {
    setIsModalOpen(true);
  };

  const handleConfirmReset = () => {
    onInvalidate(stepId);
  };

  if (isValidated) {
    return (
      <div className="mt-8 p-6 bg-slate-900 rounded-[32px] border border-white/10 flex items-center justify-between shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-4 text-white">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest">Étape Verrouillée</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Le diagnostic est validé et archivé pour cette phase.</p>
          </div>
        </div>
        {onInvalidate && (
          <>
            <button
              onClick={handleModifyClick}
              className="flex items-center gap-3 px-6 py-3.5 bg-white/10 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:border-amber-400 hover:text-white transition-all shadow-sm group"
            >
              <Edit3 size={14} className="group-hover:rotate-12 transition-transform" />
              Modifier cette étape
            </button>

            <ConfirmationModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onConfirm={handleConfirmReset}
              title="Réinitialiser l'étape ?"
              message={stepId < 6 
                ? "La modification de cette étape annulera toutes les étapes suivantes pour garantir la cohérence de votre ingénierie ADDIE." 
                : "Voulez-vous rouvrir cette étape pour modification ?"}
              confirmLabel="Réinitialiser"
              variant="warning"
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 p-8 bg-slate-50 rounded-[32px] border border-slate-200 space-y-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
        Décision de passage à l'étape suivante
      </p>
      <div className="space-y-3">
        {validationChecks.map((check, i) => (
          <label key={i} className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={check.checked}
              onChange={() => check.onChange(!check.checked)}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500 accent-slate-900"
            />
            <span className={`text-[11px] font-bold leading-snug transition-colors ${
              check.checked ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
            }`}>
              {check.label}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={onValidate}
        disabled={!allChecked}
        className={`w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
          allChecked
            ? 'bg-slate-900 text-white shadow-xl hover:bg-indigo-600 active:scale-[0.98]'
            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
        }`}
      >
        <CheckCircle2 size={16} />
        Valider et continuer
      </button>
    </div>
  );
}

export { STEPS };
