import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Target, Activity, Compass, Users, Map, LayoutGrid, Sliders, ShieldCheck, Zap, Sparkles, ChevronLeft, X
} from 'lucide-react';
import { WorkflowStepper } from './WorkflowStepper';
import { WorkflowStep1GroupProfile } from './WorkflowStep1GroupProfile';
import { WorkflowStep2Reliability } from './WorkflowStep2Reliability';
import { WorkflowStep3Deficits } from './WorkflowStep3Deficits';
import { WorkflowStep5Eligibility } from './WorkflowStep5Eligibility';
import { WorkflowStep6Sequencing } from './WorkflowStep6Sequencing';
import { WorkflowStep7Prioritization } from './WorkflowStep7Prioritization';
import { WorkflowDecisionDashboard } from './WorkflowDecisionDashboard';
import { calculateRobustnessIndex } from '../../../../utils/causalEngine';

const STORAGE_KEY = 'addie_workflow_validations';
const DATA_STORAGE_KEY = 'addie_workflow_data';

function loadValidations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveValidations(validations) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validations));
  } catch {}
}

function loadWorkflowData() {
  try {
    const raw = localStorage.getItem(DATA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveWorkflowData(data) {
  try {
    localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * AnalysisWorkflowPortal — Orchestrateur du workflow 6 étapes
 * Remplace TerritorialPortal dans le mode "Workflow" de l'Ingénierie Stratégique.
 */
export function AnalysisWorkflowPortal({ 
  store, 
  selectedCircos, 
  setSelectedCircos,
  selectedRCs, 
  setSelectedRCs,
  participants, 
  advancedStats,
  recommendedFormations,
  topUrgencyRC,
  tacticalIGE,
  onOpenSession
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepValidations, setStepValidations] = useState(() => loadValidations());
  const [workflowData, setWorkflowData] = useState(() => loadWorkflowData());

  // Persist state on change
  useEffect(() => {
    saveValidations(stepValidations);
  }, [stepValidations]);

  useEffect(() => {
    saveWorkflowData(workflowData);
  }, [workflowData]);

  const updateWorkflowData = useCallback((stepId, data) => {
    setWorkflowData(prev => {
      const stepKey = `step${stepId}`;
      const currentStepData = prev[stepKey] || {};
      
      // Deep check for causalDiagnostics specifically as it's the main loop source
      if (data.causalDiagnostics && currentStepData.causalDiagnostics) {
        const nextSig = data.causalDiagnostics._orderSignature;
        const prevSig = currentStepData.causalDiagnostics._orderSignature;
        if (nextSig === prevSig && nextSig !== undefined) return prev;
      }

      // Shallow check for other properties
      const hasChanges = Object.keys(data).some(key => data[key] !== currentStepData[key]);
      if (!hasChanges) return prev;

      return {
        ...prev,
        [stepKey]: { ...currentStepData, ...data }
      };
    });
  }, []);

  const handleValidateStep = useCallback((stepId) => {
    setStepValidations(prev => {
      const next = {
        ...prev,
        [`step${stepId}`]: {
          validated: true,
          timestamp: new Date().toISOString(),
        }
      };
      return next;
    });
    // Auto-advance to next step
    if (typeof stepId === 'number' && stepId < 6) {
      setCurrentStep(stepId + 1);
    } else if (stepId === 6) {
      setCurrentStep('decision');
    }
  }, []);

  const handleResetStep = useCallback((stepId) => {
    setStepValidations(prev => {
      const next = { ...prev };
      // Invalidate all steps from stepId onwards to maintain linear consistency
      for (let s = stepId; s <= 6; s++) {
        delete next[`step${s}`];
      }
      return next;
    });
    setCurrentStep(stepId);
  }, []);

  const handleStepClick = useCallback((stepId) => {
    setCurrentStep(stepId);
  }, []);

  // Robustness for the entire territory (needed by steps 4, 5)
  const robustness = useMemo(() => {
    const totalInTerritory = store.enseignants.length;
    return calculateRobustnessIndex(participants, totalInTerritory);
  }, [participants, store.enseignants]);

  // Common props passed to all step components
  const commonProps = {
    store,
    participants,
    selectedCircos,
    setSelectedCircos,
    selectedRCs,
    setSelectedRCs,
    advancedStats,
    robustness,
    workflowData,
    updateWorkflowData,
    recommendedFormations,
    topUrgencyRC,
    tacticalIGE,
    onOpenSession
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Principe directeur ── */}
      <div className="mx-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center">
        <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed max-w-2xl mx-auto">
          Ce workflow ne produit pas une réponse automatique. Il produit une 
          <strong className="text-slate-900"> décision argumentée et traçable</strong>. 
          Chaque étape pose une question précise. Chaque outil y répond avec des données. 
          L'inspecteur valide et avance. <strong className="text-slate-900">La décision finale lui appartient toujours.</strong>
        </p>
      </div>

      {/* ── Stepper Navigation ── */}
      <WorkflowStepper
        currentStep={currentStep}
        stepValidations={stepValidations}
        onStepClick={handleStepClick}
      />

      {/* ── Step Content ── */}
      <div className="px-4 max-w-7xl mx-auto">
        {currentStep === 1 && (
          <WorkflowStep1GroupProfile
            {...commonProps}
            stepValidation={stepValidations.step1}
            onValidate={handleValidateStep}
            onInvalidate={handleResetStep}
          />
        )}
        {currentStep === 2 && (
          <WorkflowStep2Reliability
            {...commonProps}
            stepValidation={stepValidations.step2}
            onValidate={handleValidateStep}
            onInvalidate={handleResetStep}
          />
        )}
        {currentStep === 3 && (
          <WorkflowStep3Deficits
            {...commonProps}
            stepValidation={stepValidations.step3}
            onValidate={handleValidateStep}
            onInvalidate={handleResetStep}
          />
        )}
        {currentStep === 4 && (
          <WorkflowStep5Eligibility
            {...commonProps}
            stepValidation={stepValidations.step4}
            onValidate={handleValidateStep}
            onInvalidate={handleResetStep}
          />
        )}
        {currentStep === 5 && (
          <WorkflowStep6Sequencing
            {...commonProps}
            stepValidation={stepValidations.step5}
            onValidate={handleValidateStep}
            onInvalidate={handleResetStep}
          />
        )}
        {currentStep === 6 && (
          <WorkflowStep7Prioritization
            {...commonProps}
            stepValidation={stepValidations.step6}
            onValidate={handleValidateStep}
            onInvalidate={handleResetStep}
          />
        )}
        {currentStep === 'decision' && (
          <WorkflowDecisionDashboard
            {...commonProps}
            stepValidations={stepValidations}
            onResetStep={handleResetStep}
          />
        )}
      </div>
    </div>
  );
}
