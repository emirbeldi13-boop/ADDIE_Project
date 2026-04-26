import React from 'react';
import { CheckCircle2, Circle, ArrowRight, Activity, Target, Link, Zap, Rocket } from 'lucide-react';

export function DecisionBreadcrumb({ store, globalKPIs, topUrgency, topCorrelation, quickWinCount }) {
  const steps = [
    {
      id: 'diagnostic',
      label: 'Diagnostic Macro',
      status: globalKPIs.ige > 0 ? 'complete' : 'pending',
      summary: `IGE: ${globalKPIs.ige}`,
      icon: Activity
    },
    {
      id: 'targeting',
      label: 'Ciblage RC',
      status: topUrgency ? 'complete' : 'pending',
      summary: topUrgency || 'En attente',
      icon: Target
    },
    {
      id: 'correlation',
      label: 'Analyse Synergie',
      status: topCorrelation ? 'complete' : 'pending',
      summary: topCorrelation || 'Calcul...',
      icon: Link
    },
    {
      id: 'arbitrage',
      label: 'Arbitrage',
      status: quickWinCount > 0 ? 'complete' : 'active',
      summary: `${quickWinCount} Quick Wins`,
      icon: Zap
    },
    {
      id: 'action',
      label: 'Prêt à Action',
      status: quickWinCount > 0 ? 'active' : 'pending',
      summary: 'Prêt',
      icon: Rocket
    }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-white shadow-sm p-4 sticky top-16 z-[90] mt-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide">
        {steps.map((step, i) => {
          const Icon = step.icon;
          const isActive = step.status === 'active';
          const isComplete = step.status === 'complete';

          return (
            <React.Fragment key={step.id}>
              <div className={`flex items-center gap-3 shrink-0 transition-all duration-500 ${isActive ? 'scale-105' : 'opacity-60'}`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  isComplete ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 
                  isActive ? 'bg-[#1F3864] text-white shadow-lg shadow-indigo-100' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  {isComplete ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-[#1F3864]' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                  <span className={`text-[10px] font-bold ${isComplete ? 'text-emerald-600' : isActive ? 'text-indigo-600' : 'text-gray-300'}`}>
                    {step.summary}
                  </span>
                </div>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight size={14} className="text-gray-200 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
