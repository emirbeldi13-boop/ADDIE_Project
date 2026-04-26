import React from 'react';
import { Calendar, List, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { SessionsList } from '../sessions/SessionsList';
import { GanttView } from '../sessions/GanttView';
import { LOGISTICS_LABELS } from '../../../constants/logistics';

export function DeploymentPillar({
  filteredSessions,
  store,
  sessionView,
  setSessionView,
  handleQuickCreate,
  formation,
  updateFormation
}) {

  const handleInputChange = (field, value) => {
    updateFormation(formation.id, { [field]: value });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content: Agenda & Sessions */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-2xl gap-6">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-[24px] flex items-center justify-center shadow-inner">
                  <Calendar size={28} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-[#1F3864]">Agenda des Sessions</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Planification territoriale</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex p-1.5 bg-gray-100 rounded-2xl">
                  <button onClick={() => setSessionView('list')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sessionView === 'list' ? 'bg-white shadow text-[#1F3864]' : 'text-gray-400 hover:text-gray-600'}`}>
                    <List size={14} className="inline mr-2" /> Liste
                  </button>
                  <button onClick={() => setSessionView('gantt')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sessionView === 'gantt' ? 'bg-white shadow text-[#1F3864]' : 'text-gray-400 hover:text-gray-600'}`}>
                    <SlidersHorizontal size={14} className="inline mr-2" /> Gantt
                  </button>
              </div>
              <button onClick={handleQuickCreate} className="px-8 py-3.5 bg-[#1F3864] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg">+ Nouvelle Session</button>
            </div>
          </div>

          {sessionView === 'list' ? (
            <SessionsList sessions={filteredSessions} store={store} />
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-1 border border-white shadow-2xl overflow-hidden">
              <GanttView sessions={filteredSessions} store={store} onEdit={(s) => {}} />
            </div>
          )}
        </div>

        {/* Sidebar: Pré-requis Logistiques Master */}
        <div className="space-y-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 border border-white shadow-2xl space-y-8 sticky top-8">
            <div className="space-y-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1F3864] flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Pré-requis Logistiques
              </h4>
              <p className="text-[10px] text-gray-400 font-bold italic">Ces pré-requis s'appliquent à l'ensemble du programme de formation quel que soit le lieu d'exécution.</p>
            </div>

            <div className="flex flex-col gap-3">
              {Object.entries(LOGISTICS_LABELS).map(([key, { label, icon: Icon }]) => {
                const reqs = formation?.techRequirements || [];
                const isChecked = reqs.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-4 p-4 rounded-3xl border-2 transition-all select-none cursor-pointer ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-200 shadow-sm text-emerald-900'
                        : 'bg-white border-transparent text-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = isChecked ? reqs.filter(r => r !== key) : [...reqs, key];
                        handleInputChange('techRequirements', next);
                      }}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <Icon size={16} className={isChecked ? 'text-emerald-500' : 'text-gray-200'} />
                    <span className="text-[11px] font-black uppercase tracking-tight">{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
