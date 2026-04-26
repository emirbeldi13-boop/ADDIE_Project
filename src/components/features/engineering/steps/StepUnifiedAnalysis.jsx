import React from 'react';
import { AnalysisParticipants } from '../AnalysisParticipants';
import { Step2Identification } from './Step2Identification';
import { IndividualDifferentiationMatrix } from '../IndividualDifferentiationMatrix';
import { Sparkles, Users, MapPin, Activity, CheckCircle2, LayoutGrid, Info } from 'lucide-react';
import { LOGISTICS_LABELS } from '../../../../constants/logistics';

export function StepUnifiedAnalysis({
  session,
  formation,
  store,
  participants,
  handleUpdate,
  segmentation,
  aiPersonas
}) {
  // --- LOGISTICS LOGIC ---
  const crefocs = Object.values(store.crefocs || {});
  const selectedCrefoc = crefocs.find(c => c.nom === session?.Lieu);
  const requiredEquipments = session?.cdc?.equipments || formation?.techRequirements || [];

  const handleToggleEquipment = (eqKey) => {
    const next = requiredEquipments.includes(eqKey)
      ? requiredEquipments.filter(k => k !== eqKey)
      : [...requiredEquipments, eqKey];
    
    handleUpdate({ 
      cdc: { ...(session?.cdc || {}), equipments: next } 
    });
  };

  const feasibilityScore = React.useMemo(() => {
    if (!selectedCrefoc) return 0;
    if (requiredEquipments.length === 0) return 100;
    const met = requiredEquipments.filter(k => selectedCrefoc.logistics?.[k]).length;
    return Math.round((met / requiredEquipments.length) * 100);
  }, [selectedCrefoc, requiredEquipments]);

  // --- DYNAMIC LAYOUT ---
  const targetCount = formation?.targetedComps?.length || 0;
  // If few targets, give more space to roster
  const rosterSpan = targetCount <= 1 ? 'xl:col-span-8' : 'xl:col-span-5';
  const matrixSpan = targetCount <= 1 ? 'xl:col-span-4' : 'xl:col-span-7';

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      {/* 🚀 SECTION 1: PILOTAGE PÉDAGOGIQUE (Side-by-Side) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
           <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl shadow-sm">
              <LayoutGrid size={20} />
           </div>
           <div>
              <h3 className="text-xl font-black text-[#1F3864] uppercase tracking-tighter italic">Analyse de la Cohorte</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pilotage simultané du roster et des profils de compétences</p>
           </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Roster (Left) */}
          <div className={rosterSpan}>
            <AnalysisParticipants 
              session={session} 
              store={store} 
              handleUpdate={handleUpdate} 
            />
          </div>

          {/* Matrix (Right) */}
          <div className={`${matrixSpan} min-h-[400px]`}>
            {participants.length > 0 ? (
              <IndividualDifferentiationMatrix 
                segmentation={segmentation}
                store={store}
                formation={formation}
                session={session}
              />
            ) : (
              <div className="h-full bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center text-center p-8 space-y-3">
                 <Users size={32} className="text-gray-200" />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ajoutez des participants pour<br/>générer la matrice de différenciation</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 🏢 SECTION 2: CADRAGE LOGISTIQUE (Full Width Banner) */}
      <section className="bg-white/50 backdrop-blur-xl p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
               <div className="p-2.5 bg-red-50 text-red-500 rounded-2xl shadow-sm">
                  <MapPin size={20} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-[#1F3864] uppercase tracking-tighter italic">Faisabilité Logistique</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sélection du lieu et validation du cahier des charges technique</p>
               </div>
            </div>
            <div className={`px-6 py-3 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center gap-3 ${feasibilityScore > 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <CheckCircle2 size={18} />
              Readiness : {feasibilityScore}%
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Choix du Centre (CREFOC)</label>
                  <select 
                    value={session?.Lieu || ''}
                    onChange={(e) => {
                      const newLieu = e.target.value;
                      handleUpdate({ Lieu: newLieu, Circonscription: newLieu });
                    }}
                    className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-xs font-black text-[#1F3864] outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                  >
                     <option value="">Sélectionner un lieu...</option>
                     {crefocs.map(c => (
                       <option key={c.nom} value={c.nom}>{c.nom} (Capacité: {c.places || '?'})</option>
                     ))}
                  </select>
               </div>
               {selectedCrefoc && (
                  <div className="p-4 bg-[#1F3864]/5 rounded-2xl border border-[#1F3864]/10 flex items-center gap-3 animate-in zoom-in-95 duration-300">
                     <Activity size={18} className="text-[#1F3864] opacity-30" />
                     <p className="text-[10px] font-black text-[#1F3864] uppercase">{selectedCrefoc.nom} — {selectedCrefoc.places} places disponibles</p>
                  </div>
               )}
            </div>

            <div className="lg:col-span-2">
               <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                  {Object.entries(LOGISTICS_LABELS).map(([key, info]) => {
                    const isRequired = requiredEquipments.includes(key);
                    const isAvailable = selectedCrefoc?.logistics?.[key];
                    
                    return (
                      <button 
                        key={key}
                        onClick={() => handleToggleEquipment(key)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all text-center ${
                          isRequired 
                            ? (isAvailable ? 'bg-emerald-50 border-emerald-200 shadow-md scale-105' : 'bg-red-50 border-red-200 shadow-md scale-105')
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <info.icon size={16} className={isRequired ? (isAvailable ? 'text-emerald-500' : 'text-red-500') : 'text-gray-300'} />
                        <p className={`text-[8px] font-black uppercase tracking-tighter leading-tight ${isRequired ? 'text-[#1F3864]' : 'text-gray-400'}`}>{info.label}</p>
                      </button>
                    );
                  })}
               </div>
            </div>
         </div>
      </section>

      {/* 🟠 SECTION 3: INTELLIGENCE STRATÉGIQUE (Deep Insights) */}
      <section className="space-y-6 pt-10 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2">
           <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
              <Sparkles size={20} />
           </div>
           <div>
              <h3 className="text-xl font-black text-[#1F3864] uppercase tracking-tighter italic">Intelligence de Cohorte</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Analyse prédictive et recommandations stratégiques de l'IA</p>
           </div>
        </div>

        {participants.length === 0 ? (
          <div className="py-12 text-center text-gray-300 text-[10px] font-bold uppercase tracking-widest">
             En attente de profils pour calcul stratégique...
          </div>
        ) : (
          <Step2Identification 
            segmentation={segmentation}
            aiPersonas={aiPersonas}
            participants={participants}
            store={store}
            formation={formation}
            session={session}
          />
        )}
      </section>
    </div>
  );
}
