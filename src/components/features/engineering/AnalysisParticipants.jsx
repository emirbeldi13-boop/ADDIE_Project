import React, { useState, useMemo } from 'react';
import { Search, UserPlus, UserMinus, Users, MapPin, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

export function AnalysisParticipants({ session, store, handleUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [circoFilter, setCircoFilter] = useState('');

  const inscritsIds = useMemo(() => session?.inscrits || [], [session]);
  
  const availableTeachers = useMemo(() => {
    return store.enseignants.filter(e => {
      if (inscritsIds.includes(e.ID)) return false;
      if (searchTerm && !e.Nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (circoFilter && e.Circonscription !== circoFilter) return false;
      return true;
    });
  }, [store.enseignants, inscritsIds, searchTerm, circoFilter]);

  const inscribedTeachers = useMemo(() => {
    return inscritsIds.map(id => store.enseignants.find(e => e.ID === id)).filter(Boolean);
  }, [store.enseignants, inscritsIds]);

  const handleEnroll = (id) => handleUpdate({ inscrits: [...inscritsIds, id] });
  const handleUnenroll = (id) => handleUpdate({ inscrits: inscritsIds.filter(i => i !== id) });
  
  const handleEnrollAllFiltered = () => {
    const newIds = availableTeachers.map(t => t.ID);
    if (newIds.length === 0) return;
    const updatedInscrits = [...new Set([...inscritsIds, ...newIds])];
    handleUpdate({ inscrits: updatedInscrits });
  };
  
  const circosList = [...new Set(store.enseignants.map(e => e.Circonscription))].filter(Boolean);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* LEFT: DIRECTORY */}
      <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-8 border-b border-gray-50 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-[#1F3864] uppercase tracking-tighter flex items-center gap-2">
                <Search size={18} className="text-blue-500" /> Annuaire Territorial
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base de données des enseignants éligibles</p>
            </div>
            <button 
              onClick={handleEnrollAllFiltered} 
              disabled={availableTeachers.length === 0}
              className="px-5 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl text-[9px] font-black uppercase transition-all disabled:opacity-30 shadow-sm"
            >
              + Tout inscrire
            </button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input 
                type="text" placeholder="Rechercher un enseignant..." value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold text-[#1F3864] outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
              />
            </div>
            <select 
              value={circoFilter} onChange={(e) => setCircoFilter(e.target.value)}
              className="bg-gray-50 border border-gray-100 rounded-2xl py-3.5 px-4 text-[10px] font-black text-gray-500 outline-none cursor-pointer focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Toutes Circonscriptions</option>
              {circosList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar max-h-[400px]">
          {availableTeachers.length === 0 && (
            <div className="text-center py-20 opacity-30">
              <Filter size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-xs font-black uppercase text-gray-500">Aucun enseignant disponible</p>
            </div>
          )}
          {availableTeachers.map(t => (
            <div key={t.ID} className="bg-gray-50/50 p-4 rounded-[24px] flex items-center justify-between group hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black ${t.Statut === 'Stagiaire' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {t.Nom?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black text-[#1F3864] leading-none">{t.Nom} {t.Prénom}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase mt-1 flex items-center gap-1">
                    <MapPin size={10} /> {t.Circonscription} · {t.Statut}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleEnroll(t.ID)} 
                className="w-10 h-10 bg-white text-gray-300 rounded-2xl flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-sm border border-gray-100"
              >
                <UserPlus size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: ROSTER / SESSION PARTICIPANTS */}
      <div className="bg-[#1F3864] rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative border border-white/10">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none text-white">
          <Users size={120} />
        </div>
        
        <div className="p-8 border-b border-white/10 bg-white/5 relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" /> Roster de la Session
            </h3>
            <span className="px-3 py-1 bg-white/10 text-emerald-400 rounded-xl text-[10px] font-black">
              {inscribedTeachers.length} INSCRITS
            </span>
          </div>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest opacity-60">Liste officielle des participants pour l'analyse ADDIE</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2 custom-scrollbar relative z-10 max-h-[500px]">
          {inscribedTeachers.length === 0 && (
            <div className="text-center py-24 space-y-4">
              <AlertCircle size={48} className="text-blue-300/30 mx-auto" />
              <p className="text-xs font-black text-blue-200/40 uppercase tracking-widest">Le roster est vide</p>
              <p className="text-[10px] text-blue-200/30 max-w-[200px] mx-auto">Ajoutez des participants depuis l'annuaire pour lancer l'analyse.</p>
            </div>
          )}
          {inscribedTeachers.map(t => (
            <div key={t.ID} className="bg-white/5 hover:bg-white/10 p-4 rounded-[24px] flex items-center justify-between transition-all border border-white/5 group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black ${t.Statut === 'Stagiaire' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {t.Nom?.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-black text-white leading-none">{t.Nom} {t.Prénom}</p>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${t.Statut === 'Stagiaire' ? 'text-orange-300/60' : 'text-blue-300/60'}`}>
                    {t.Statut} · {t.Circonscription}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleUnenroll(t.ID)} 
                className="w-10 h-10 bg-white/5 text-blue-200 rounded-2xl flex items-center justify-center hover:bg-red-500/80 hover:text-white hover:scale-110 active:scale-95 transition-all border border-white/5"
              >
                <UserMinus size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-8 bg-black/20 border-t border-white/5">
           <div className="flex items-center justify-between text-blue-200/60 text-[10px] font-black uppercase tracking-widest">
              <span>Capacité estimée</span>
              <span className="text-white">25 places</span>
           </div>
           <div className="w-full bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${inscribedTeachers.length > 25 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(100, (inscribedTeachers.length / 25) * 100)}%` }} 
              />
           </div>
        </div>
      </div>
    </div>
  );
}
