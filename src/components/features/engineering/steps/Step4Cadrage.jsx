import * as React from 'react';
import { 
  MapPin, ShieldAlert, CheckCircle, AlertCircle, 
  Rocket, Wand2, Zap, Settings
} from 'lucide-react';

export function Step4Cadrage({
  formation,
  session,
  logisticsInsight,
  feasibility,
  handleUpdate,
  handleGenerateSMART,
  handleAutoGenerateReport,
  onOpenSession,
  isTerritorialMode,
  selectedFormationId,
  store
}) {
  
  const [isCreating, setIsCreating] = React.useState(false);

  const handleFinalCreate = () => {
    setIsCreating(true);
    // Simulate some logic or validation before actual creation if needed
    onOpenSession(formation?.id, null); // Creates a new session if sid is null
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Logistics Audit Card */}
        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1F3864] italic uppercase tracking-tighter flex items-center gap-2">
              <MapPin size={18} className="text-blue-500" /> Audit Logistique
            </h3>
            {feasibility && (
               <div className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${feasibility.index < 50 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  Indice de Faisabilité : {feasibility.index}%
               </div>
            )}
          </div>

          {logisticsInsight ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <MapPin className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest">{logisticsInsight.lieu}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Capacité : {logisticsInsight.capacity} places</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Équipements Requis</p>
                <div className="grid grid-cols-2 gap-3">
                  {logisticsInsight.requiredEquipments.map((eq, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${eq.isAvailable ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100 opacity-60'}`}>
                      <eq.icon size={14} className={eq.isAvailable ? 'text-emerald-500' : 'text-red-500'} />
                      <span className={`text-[10px] font-black ${eq.isAvailable ? 'text-emerald-700' : 'text-red-700'} uppercase tracking-tighter`}>{eq.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {feasibility?.alert && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[10px] font-bold text-amber-700 leading-relaxed">{feasibility.alert}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center space-y-4">
                <Settings className="text-gray-200 mx-auto animate-spin-slow" size={48} />
                <p className="text-xs font-bold text-gray-400 uppercase italic">Configuration du lieu requise</p>
            </div>
          )}
        </div>

        {/* Cadrage Stratégique (Objectifs) */}
        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#1F3864] italic uppercase tracking-tighter flex items-center gap-2">
                <Zap size={18} className="text-amber-500" /> Cadrage Stratégique
              </h3>
              <div className="flex gap-2">
                 <button onClick={handleGenerateSMART} className="p-2 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-colors shadow-sm" title="Générer Objectifs SMART">
                    <Wand2 size={16} />
                 </button>
                 <button onClick={handleAutoGenerateReport} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors shadow-sm" title="Remplir le diagnostic IA">
                    <Rocket size={16} />
                 </button>
              </div>
           </div>

           <div className="space-y-4">
              <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Contexte du Diagnostic</label>
                  <textarea 
                    value={session?.cdc?.contexte || ''}
                    onChange={(e) => handleUpdate({ cdc: { ...session.cdc, contexte: e.target.value } })}
                    className="w-full h-24 bg-gray-50 border-none rounded-3xl p-5 text-xs font-medium focus:ring-2 focus:ring-[#1F3864] transition-all resize-none"
                    placeholder="Pourquoi cette session est-elle nécessaire ?"
                  />
              </div>

              <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Objectifs Ciblés</label>
                  <div className="p-5 bg-gray-50 rounded-3xl space-y-3">
                     <p className="text-[10px] font-bold text-gray-500 italic leading-relaxed">
                        Les objectifs seront finalisés dans la phase Design, mais sont cadrés ici pour valider l'investissement.
                     </p>
                     {/* Preview of objectives */}
                     <div className="flex flex-wrap gap-2">
                        {(formation?.targetedComps || []).map(cid => (
                          <span key={cid} className="px-2 py-1 bg-white border border-gray-100 rounded-lg text-[8px] font-black text-[#1F3864] uppercase">{cid}</span>
                        ))}
                     </div>
                  </div>
              </div>
           </div>
        </div>
      </div>

      {/* FINAL ACTION BAR */}
      <div className="bg-[#1F3864] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
             <Rocket size={120} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="space-y-2 text-center md:text-left">
                <h4 className="text-2xl font-black italic tracking-tighter">Validation de l'Ingénierie</h4>
                <p className="text-xs text-blue-200 font-medium max-w-lg">
                  En validant ce cadrage, vous instanciez officiellement le projet de formation. Toutes les données d'analyse seront transmises à l'équipe de design.
                </p>
             </div>
             
             <button 
                onClick={handleFinalCreate}
                disabled={isCreating}
                className={`flex items-center gap-4 px-10 py-5 bg-white text-[#1F3864] rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50`}
             >
                {isCreating ? 'Initialisation...' : 'Lancer le Studio ADDIE'}
                <ArrowRight size={20} />
             </button>
          </div>
      </div>
    </div>
  );
}

function ArrowRight({ size, className }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
