import React, { useState, useMemo } from 'react';
import { Users, Search, Filter, UserPlus, UserMinus, ShieldCheck, MapPin, Building2, AlertCircle } from 'lucide-react';

export function ParticipantsPillar({ 
  session, 
  store, 
  handleUpdate 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [circoFilter, setCircoFilter] = useState('');

  // If no session is selected, prompt user
  if (!session || !session['ID Session']) {
    return (
      <div className="py-32 text-center bg-white/50 border-4 border-dashed border-gray-100 rounded-[60px] space-y-6 animate-in fade-in zoom-in">
        <Users size={64} className="text-gray-300 mx-auto opacity-50" />
        <div className="space-y-2">
          <p className="text-2xl font-black text-[#1F3864]/40 uppercase tracking-tighter italic">Aucune Session Sélectionnée</p>
          <p className="text-sm font-bold text-gray-400">Veuillez sélectionner une session dans la barre d'en-tête pour gérer ses participants.</p>
        </div>
      </div>
    );
  }

  const inscritsIds = session.inscrits || [];
  
  // Available Teachers logic
  const availableTeachers = useMemo(() => {
    return store.enseignants.filter(e => {
      // Not already inscribed
      if (inscritsIds.includes(e.ID)) return false;
      
      // Filter by search
      if (searchTerm && !e.Nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Filter by circo
      if (circoFilter && e.Circonscription !== circoFilter) return false;

      return true;
    });
  }, [store.enseignants, inscritsIds, searchTerm, circoFilter]);

  const inscribedTeachers = useMemo(() => {
    return inscritsIds.map(id => store.enseignants.find(e => e.ID === id)).filter(Boolean);
  }, [store.enseignants, inscritsIds]);

  // Statistics
  const stagiairesCount = inscribedTeachers.filter(t => t.Statut === 'Stagiaire').length;
  const titulairesCount = inscribedTeachers.length - stagiairesCount;

  // Handlers
  const handleEnroll = (teacherId) => {
    handleUpdate({ inscrits: [...inscritsIds, teacherId] });
  };

  const handleUnenroll = (teacherId) => {
    handleUpdate({ inscrits: inscritsIds.filter(id => id !== teacherId) });
  };

  const handleEnrollAllFiltered = () => {
    const toAdd = availableTeachers.map(t => t.ID);
    handleUpdate({ inscrits: [...inscritsIds, ...toAdd] });
  };

  const circosList = [...new Set(store.enseignants.map(e => e.Circonscription))].filter(Boolean);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-8">
      
      {/* Pillar Header / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex items-center justify-between bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-2xl gap-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-[24px] flex items-center justify-center shadow-inner">
                <Users size={28} />
            </div>
            <div>
                <h3 className="text-xl font-black text-[#1F3864]">Gestion des Cohortes</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enrôlement pour la session {session['ID Session']}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-2xl flex flex-col justify-center space-y-3">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <span className="text-[9px] font-black uppercase text-gray-400">Total Inscrits</span>
            <span className="text-2xl font-black text-[#1F3864]">{inscribedTeachers.length}</span>
          </div>
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-orange-400"></div>
               <span className="text-[9px] font-bold text-gray-500 uppercase">Stagiaires</span>
             </div>
             <span className="text-xs font-black text-orange-600">{stagiairesCount}</span>
          </div>
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div>
               <span className="text-[9px] font-bold text-gray-500 uppercase">Titulaires</span>
             </div>
             <span className="text-xs font-black text-blue-600">{titulairesCount}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
        {/* Left Col: Available Directory */}
        <div className="bg-white/60 backdrop-blur-md rounded-[40px] border border-white shadow-lg flex flex-col overflow-hidden">
          <div className="p-8 border-b border-white space-y-6 bg-white/40">
            <h4 className="text-sm font-black text-[#1F3864] uppercase tracking-widest flex items-center gap-3">
              <Search size={16} className="text-blue-500" /> Annuaire des Enseignants
            </h4>
            
            <div className="space-y-4">
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher par nom..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-[#1F3864] outline-none shadow-sm focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={circoFilter}
                  onChange={(e) => setCircoFilter(e.target.value)}
                  className="flex-1 bg-white border-none rounded-2xl py-3 px-4 text-xs font-bold text-gray-500 outline-none shadow-sm focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                >
                  <option value="">Toutes les circonscriptions</option>
                  {circosList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button 
                  onClick={handleEnrollAllFiltered}
                  disabled={availableTeachers.length === 0}
                  className="px-4 py-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl text-[10px] font-black uppercase transition-all whitespace-nowrap disabled:opacity-50"
                  title="Inscrire tous les résultats"
                >
                  Tout Inscrire
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {availableTeachers.length === 0 ? (
              <div className="text-center py-12 space-y-3 opacity-50">
                <Filter size={32} className="mx-auto text-gray-400" />
                <p className="text-[10px] font-black uppercase text-gray-500">Aucun enseignant trouvé</p>
              </div>
            ) : null}
            
            {availableTeachers.map(teacher => (
              <div key={teacher.ID} className="bg-white p-4 rounded-3xl flex items-center justify-between group hover:shadow-md transition-all border border-transparent hover:border-blue-50">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner ${teacher.Statut === 'Stagiaire' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                    {teacher.Nom?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#1F3864]">{teacher.Nom}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase"><MapPin size={8} /> {teacher.Circonscription}</span>
                      <span className="flex items-center gap-1 text-[8px] font-bold text-gray-400 uppercase"><Building2 size={8} /> Etab. {teacher.Etablissement}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleEnroll(teacher.ID)}
                  className="w-10 h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-emerald-500 hover:text-white hover:scale-110 active:scale-95 transition-all shadow-sm"
                >
                  <UserPlus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Inscribed Roster */}
        <div className="bg-gradient-to-br from-[#1F3864] to-indigo-900 shadow-2xl rounded-[40px] border border-indigo-500/30 flex flex-col overflow-hidden relative">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <Users size={200} className="text-white" />
          </div>
          <div className="p-8 border-b border-white/10 space-y-2 bg-white/5 backdrop-blur-md relative z-10">
            <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <ShieldCheck size={16} className="text-emerald-400" /> Roster de la Session
            </h4>
            <p className="text-[10px] text-indigo-200/60 font-bold uppercase tracking-widest">Enseignants validés pour {session.Lieu}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative z-10">
            {inscribedTeachers.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                   <AlertCircle size={24} className="text-indigo-300" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-indigo-200">Session vide</p>
                  <p className="text-[10px] font-bold text-indigo-300/50">Ajoutez des participants depuis l'annuaire</p>
                </div>
              </div>
            ) : null}

            {inscribedTeachers.map(teacher => (
              <div key={teacher.ID} className="bg-white/5 hover:bg-white/10 backdrop-blur-sm p-4 rounded-3xl flex items-center justify-between group transition-all border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-inner ${teacher.Statut === 'Stagiaire' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                    {teacher.Nom?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{teacher.Nom}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${teacher.Statut === 'Stagiaire' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {teacher.Statut}
                      </span>
                      <span className="text-[8px] font-bold text-indigo-200/70 uppercase"><MapPin size={8} className="inline mr-1"/>{teacher.Circonscription}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleUnenroll(teacher.ID)}
                  className="w-10 h-10 bg-white/5 text-indigo-200 rounded-2xl flex items-center justify-center hover:bg-red-500/80 hover:text-white transition-all"
                  title="Désinscrire"
                >
                  <UserMinus size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
