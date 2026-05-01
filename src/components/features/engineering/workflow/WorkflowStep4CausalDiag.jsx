import React, { useMemo, useState, useEffect } from 'react';
import { Network, BarChart3 } from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { CausalDiagnosticPanel } from '../CausalDiagnosticPanel';
import { summarizeReliabilityABC } from '../../../../utils/causalEngine';

/**
 * ÉTAPE 4 — Quelle est la vraie cause ?
 */
export function WorkflowStep4CausalDiag({ store, participants, selectedRCs, robustness, workflowData, updateWorkflowData, stepValidation, onValidate, onInvalidate }) {
  const [checks, setChecks] = useState({ arbre: false, racine: false, ordre: false });

  const reliabilitySummary = useMemo(
    () => (participants?.length ? summarizeReliabilityABC(participants) : null),
    [participants]
  );

  const handleDiagnosticsMetaChange = (meta) => {
    updateWorkflowData(4, { causalDiagnostics: meta });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl">
          <Network size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">4. Diagnostic Causal</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            Derrière les déficits observés, quelle est la compétence racine à traiter ?
          </p>
        </div>
      </div>

      <CausalDiagnosticPanel 
        store={store} 
        participants={participants} 
        selectedRCs={selectedRCs} 
        onDiagnosticsMetaChange={handleDiagnosticsMetaChange} 
        robustness={robustness} 
        reliabilitySummary={reliabilitySummary} 
        isWorkflowMode={true}
      />

      <StepValidationFooter
        stepId={4}
        isValidated={stepValidation?.validated}
        onValidate={() => onValidate(4)}
        onInvalidate={onInvalidate}
        validationChecks={[
          { label: 'L\'arbre causal correspond à ce que j\'observe sur le terrain', checked: checks.arbre, onChange: v => setChecks(p => ({ ...p, arbre: v })) },
          { label: 'La cause racine identifiée est pédagogiquement juste', checked: checks.racine, onChange: v => setChecks(p => ({ ...p, racine: v })) },
          { label: 'La recommandation d\'ordre T1/T2/T3 est validée', checked: checks.ordre, onChange: v => setChecks(p => ({ ...p, ordre: v })) },
        ]}
      />
    </div>
  );
}
