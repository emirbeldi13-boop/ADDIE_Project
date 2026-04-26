import * as React from 'react';
import { 
  Users, CheckCircle2
} from 'lucide-react';
import { Step4Cadrage } from './steps/Step4Cadrage';
import { StepUnifiedAnalysis } from './steps/StepUnifiedAnalysis';

/**
 * Workflow ADDIE pour une Session Spécifique
 * Se concentre sur l'Analyse du groupe (Micro) et le Cadrage.
 */
export function AnalysisWorkflow({ 
  session, formation, store, 
  participants, handleUpdate,
  selectedFormationId, onOpenSession,
  logisticsInsight
}) {
  const [currentStep, setCurrentStep] = React.useState(1);

  // ─── Profiling Logic (Micro-Analyse de la cohorte) ───
  const allRCs = Object.keys(store.competences);

  const advancedStats = React.useMemo(() => {
    if (!participants || participants.length === 0) return { ige: 0, ch: 0 };
    const wObs = store.groupWeights?.obs ?? 0.60;
    const wAuto = store.groupWeights?.autopos ?? 0.40;
    const validScores = participants.map(p => {
      const auto = p.avgAutoposScore;
      const obs = p.temporalObsScore;
      if (obs !== null && obs !== undefined && auto !== null && auto !== undefined) return (obs * wObs) + (auto * wAuto);
      return obs ?? auto ?? null;
    }).filter(s => s !== null && s > 0);
    
    let ch = 0;
    if (validScores.length > 1) {
      const mean = validScores.reduce((a, b) => a + b, 0) / validScores.length;
      const variance = validScores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validScores.length;
      ch = (Math.sqrt(variance) / (mean || 1)) * 100;
    }
    return { ch: ch.toFixed(1), ige: 2.5 };
  }, [participants, store.groupWeights]);

  const { segmentation, aiPersonas } = React.useMemo(() => {
    if (!participants || participants.length === 0) return { segmentation: { experts: 0, inter: 0, low: 0, list: [] }, aiPersonas: null };
    
    const targetComps = (formation?.targetedComps && formation.targetedComps.length > 0) 
      ? formation.targetedComps 
      : allRCs;

    const highThresh = (store.riskThresholds?.high || 70) / 100;
    const medThresh = (store.riskThresholds?.medium || 40) / 100;
    
    let experts = 0, inter = 0, low = 0;
    const list = participants.map(p => {
      let totalReach = 0;
      targetComps.forEach(cid => {
        const auto = p.scores?.[cid] || p.avgAutoposScore || 3;
        const obs = p.temporalObsScore;
        const score = obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
        const target = session?.targetScores?.[cid] || formation?.targetScores?.[cid] || 4.0;
        totalReach += score / (target || 1);
      });
      const avgReach = totalReach / (targetComps.length || 1);
      let cluster = 'inter';
      if (avgReach >= highThresh) { experts++; cluster = 'expert'; }
      else if (avgReach >= medThresh) { inter++; cluster = 'inter'; }
      else { low++; cluster = 'low'; }
      return { ...p, cluster, score: avgReach * 5 };
    });

    const ch = parseFloat(advancedStats?.ch || 0);
    return { segmentation: { experts, inter, low, list }, aiPersonas: { portrait: 'Analyse en cours...', recommendations: [] } };
  }, [participants, advancedStats, store.riskThresholds, formation, session]);

  const feasibility = React.useMemo(() => {
    if (!logisticsInsight) return null;
    const ch = parseFloat(advancedStats?.ch || 0);
    const conformity = logisticsInsight.conformityScore || 0;
    let index = (conformity * 0.6) + (Math.max(0, 100 - ch) * 0.4);
    return { index: Math.round(index), alert: null };
  }, [logisticsInsight, advancedStats]);

  const STEPS = [
    { id: 1, label: 'Cohorte' },
    { id: 2, label: 'Cadrage' },
  ];

  return (
    <div className="space-y-8">
      {/* 🧭 MINIMALIST STEPPER */}
      <div className="flex items-center justify-center gap-6 py-2 border-b border-gray-50/50 max-w-xs mx-auto">
        {STEPS.map((step, idx) => (
          <React.Fragment key={step.id}>
            <button 
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center gap-2 group transition-all ${currentStep === step.id ? 'opacity-100 scale-110' : 'opacity-20 hover:opacity-50'}`}
            >
              <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black transition-colors ${currentStep === step.id ? 'bg-[#1F3864] text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
                {step.id}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#1F3864]">{step.label}</span>
            </button>
            {idx < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200" />}
          </React.Fragment>
        ))}
      </div>

      {/* 🎭 WORKSPACE */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {currentStep === 1 && (
          <StepUnifiedAnalysis 
            session={session} formation={formation} store={store}
            participants={participants} handleUpdate={handleUpdate}
            segmentation={segmentation} aiPersonas={aiPersonas}
          />
        )}
        {currentStep === 2 && (
          <Step4Cadrage 
            formation={formation} session={session} logisticsInsight={logisticsInsight}
            feasibility={feasibility} handleUpdate={handleUpdate}
            onOpenSession={onOpenSession} isTerritorialMode={false}
            selectedFormationId={selectedFormationId} store={store}
          />
        )}
      </div>
    </div>
  );
}
