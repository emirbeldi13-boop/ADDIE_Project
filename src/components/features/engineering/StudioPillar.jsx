import React from 'react';
import { Rocket, BarChart } from 'lucide-react';
import { AnalysisWorkflow } from './AnalysisWorkflow';
import { DesignTab } from './DesignTab';
import { DevelopmentTab } from './DevelopmentTab';

export function StudioPillar({
  activeTab,
  session,
  formation,
  store,
  selectedFormationId,
  logisticsInsight,
  participants,
  handleUpdate,
  handleAddModule,
  handleEditModule,
  handleDeleteModule,
  onOpenSession
}) {
  return (
    <>
      {activeTab === 'analysis' && (
        <AnalysisWorkflow 
          session={session}
          formation={formation}
          store={store}
          selectedFormationId={selectedFormationId}
          logisticsInsight={logisticsInsight}
          participants={participants}
          handleUpdate={handleUpdate}
          onOpenSession={onOpenSession}
        />
      )}

      {activeTab === 'design' && (
        <DesignTab 
          session={session}
          handleAddModule={handleAddModule}
          handleEditModule={handleEditModule}
          handleDeleteModule={handleDeleteModule}
          handleUpdate={handleUpdate}
        />
      )}

      {activeTab === 'development' && (
        <DevelopmentTab 
          session={session}
          handleUpdate={handleUpdate}
          store={store}
        />
      )}

      {activeTab === 'implementation' && (
         <div className="py-32 text-center bg-white border border-gray-100 rounded-[60px] space-y-6">
            <Rocket size={48} className="text-gray-200 mx-auto" />
            <p className="text-xl font-black text-[#1F3864]/30 uppercase tracking-tighter italic">Phase Implémentation : Bientôt Disponible</p>
         </div>
      )}

      {activeTab === 'evaluation' && (
         <div className="py-32 text-center bg-white border border-gray-100 rounded-[60px] space-y-6">
            <BarChart size={48} className="text-gray-200 mx-auto" />
            <p className="text-xl font-black text-[#1F3864]/30 uppercase tracking-tighter italic">Phase Évaluation : En cours de construction</p>
         </div>
      )}
    </>
  );
}
