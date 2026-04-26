import * as React from 'react';
import { 
  ArrowLeft, Download, ChevronRight,
  ClipboardList, Layout, PenTool, Rocket, BarChart
} from 'lucide-react';
import { StudioPillar } from './StudioPillar';
import { ModuleEditModal } from './ModuleEditModal';
import { useSessionInheritance } from '../../../hooks/useSessionInheritance';
import { useSessionInsights } from '../../../hooks/useSessionInsights';
import { exportSessionToPDF } from '../../../utils/pdfGenerator';

const STUDIO_TABS = [
  { id: 'analysis', label: 'Analyse', icon: ClipboardList },
  { id: 'design', label: 'Design', icon: Layout },
  { id: 'development', label: 'Développement', icon: PenTool },
  { id: 'implementation', label: 'Implémentation', icon: Rocket },
  { id: 'evaluation', label: 'Évaluation', icon: BarChart },
];

export function FormationDetailView({ formationId, initialSessionId, store, onBack }) {
  const {
    selectedFormationId, setSelectedFormationId,
    selectedSessionId, setSelectedSessionId,
    formation, displaySession, isInSession
  } = useSessionInheritance(store, formationId, initialSessionId);

  const [activeStudioTab, setActiveStudioTab] = React.useState('analysis');
  const [editingModule, setEditingModule] = React.useState(null);
  const [showModuleModal, setShowModuleModal] = React.useState(false);

  const handleUpdate = React.useCallback((changes) => {
    if (selectedSessionId) store.updateSession(selectedSessionId, changes);
    else store.updateFormation(selectedFormationId, changes);
  }, [selectedSessionId, selectedFormationId, store]);

  const { logisticsInsight, participants } = 
    useSessionInsights({ displaySession, formation, store, currentCirco: null });

  const handleAddModule = () => { setEditingModule(null); setShowModuleModal(true); };
  const handleSaveModule = (moduleData) => {
    const mods = displaySession.modules || [];
    handleUpdate({ modules: editingModule ? mods.map(m => m.id === editingModule.id ? moduleData : m) : [...mods, moduleData] });
    setShowModuleModal(false); setEditingModule(null);
  };
  const handleEditModule = (mod) => { setEditingModule(mod); setShowModuleModal(true); };
  const handleDeleteModule = (modId) => { if (!window.confirm("Supprimer ce module ?")) return; handleUpdate({ modules: (displaySession.modules || []).filter(m => m.id !== modId) }); };
  
  const handleExportPDF = async () => {
    if (!displaySession) return;
    const crefoc = Object.values(store.crefocs).find(c => c.nom === displaySession.Lieu) || {};
    await exportSessionToPDF(displaySession, formation, crefoc, store.enseignants.filter(e => (displaySession.inscrits || []).includes(e.ID)), store);
  };

  const handleCommitToMaster = () => {
    if (!isInSession) return;
    if (!window.confirm("Voulez-vous définir cette session comme le nouveau standard Master pour cette formation ?")) return;
    
    store.updateFormation(selectedFormationId, {
      cdc: displaySession.cdc,
      modules: displaySession.modules,
      targetScores: displaySession.targetScores,
      inscrits: displaySession.inscrits
    });
    alert("Standard Master mis à jour avec succès ! Toutes les futures sessions de cette formation utiliseront ce modèle.");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      
      {/* 🚀 THE UNIFIED COCKPIT BAR (Everything on one line) */}
      <div className="bg-white/80 backdrop-blur-xl border border-white rounded-[32px] p-2 pr-6 shadow-2xl flex items-center justify-between sticky top-0 z-[200]">
        
        {/* LEFT: Identity */}
        <div className="flex items-center gap-4">
          <button onClick={onBack}
            className="w-12 h-12 bg-gray-50 text-gray-400 hover:text-[#1F3864] hover:bg-white hover:shadow-md rounded-2xl flex items-center justify-center transition-all shrink-0 ml-1">
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
               <span className="px-1.5 py-0.5 bg-[#1F3864]/10 text-[#1F3864] rounded text-[8px] font-black uppercase tracking-widest">
                  {typeof formation?.id === 'string' ? formation.id : (typeof formationId === 'string' ? formationId : 'PROJET')}
               </span>
               <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
               <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">
                  {isInSession ? `Session ${selectedSessionId}` : "Ingénierie Master"}
               </span>
            </div>
            <h1 className="text-sm font-black text-[#1F3864] uppercase tracking-tighter truncate max-w-[200px] italic">
              {formation?.libelle || formation?.title || 'Studio ADDIE'}
            </h1>
          </div>
        </div>

        {/* CENTER: Navigation */}
        <div className="flex p-1 bg-gray-100/50 rounded-2xl gap-1">
          {STUDIO_TABS.map(tab => {
            const isActive = activeStudioTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveStudioTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-[#1F3864] text-white shadow-lg scale-105' 
                    : 'text-gray-400 hover:text-[#1F3864] hover:bg-white'
                }`}
              >
                <tab.icon size={14} />
                <span className="hidden xl:inline tracking-[0.15em]">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-3">
          {isInSession && (
            <>
              <button onClick={handleCommitToMaster}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-sm group"
                title="Définir comme modèle Master"
              >
                <Rocket size={14} className="group-hover:animate-bounce" />
                <span className="hidden sm:inline">Set Master</span>
              </button>

              <button onClick={handleExportPDF}
                className="w-10 h-10 flex items-center justify-center bg-[#1F3864]/5 text-[#1F3864] rounded-xl hover:bg-[#1F3864] hover:text-white transition-all group"
                title="Exporter en PDF"
              >
                <Download size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 🎭 WORKSPACE CONTENT (Full Width) */}
      <div className="min-h-[70vh] pt-4">
          <StudioPillar activeTab={activeStudioTab} setActiveTab={setActiveStudioTab}
            session={displaySession} formation={formation} store={store}
            selectedFormationId={selectedFormationId}
            logisticsInsight={logisticsInsight}
            participants={participants}
            handleUpdate={handleUpdate} handleAddModule={handleAddModule}
            handleEditModule={handleEditModule} handleDeleteModule={handleDeleteModule}
            onOpenSession={(fid, sid) => {
              setSelectedFormationId(fid);
              setSelectedSessionId(sid);
              setActiveStudioTab('analysis');
            }}
          />
      </div>

      {showModuleModal && (
        <ModuleEditModal module={editingModule} session={displaySession}
          onSave={handleSaveModule} onClose={() => setShowModuleModal(false)}
          onDelete={editingModule ? handleDeleteModule : null} />
      )}
    </div>
  );
}
