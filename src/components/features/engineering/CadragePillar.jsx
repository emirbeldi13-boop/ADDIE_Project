import React, { useState, useMemo } from 'react';
import { 
  Settings2, Target, Calendar, Users, Plus, ShieldCheck, 
  MapPin, Search, Filter, UserPlus, UserMinus,
  List, SlidersHorizontal, AlertCircle, Palette, Clock,
  ChevronDown, ChevronUp, CheckCircle
} from 'lucide-react';
import { SessionsList } from '../sessions/SessionsList';
import { GanttView } from '../sessions/GanttView';
import { LOGISTICS_LABELS } from '../../../constants/logistics';

const FORM_STATUSES = [
  { value: 'En attente', label: 'En attente', dot: 'bg-amber-400' },
  { value: 'Confirmée', label: 'Confirmée', dot: 'bg-emerald-500' },
  { value: 'Annulée', label: 'Annulée', dot: 'bg-red-400' }
];

// Reusable section wrapper
function Section({ number, title, subtitle, icon: Icon, iconColor = 'bg-blue-50 text-blue-600', children, collapsible = false, defaultOpen = true, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
      <button 
        onClick={collapsible ? () => setOpen(!open) : undefined}
        className={`w-full flex items-center justify-between p-5 ${collapsible ? 'cursor-pointer hover:bg-gray-50/50' : 'cursor-default'} transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${iconColor} rounded-xl flex items-center justify-center text-sm font-black`}>
            {number ? number : <Icon size={16} />}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-[#1F3864] leading-none">{title}</h3>
            {subtitle && <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {badge && <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">{badge}</span>}
          {collapsible && (open ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />)}
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}

export function CadragePillar({ 
  formation, competences, store, updateFormation, addCompetence,
  filteredSessions, sessionView, setSessionView, handleQuickCreate,
  displaySession, selectedSessionId, handleUpdate
}) {
  if (!formation) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [circoFilter, setCircoFilter] = useState('');

  const handleInputChange = (field, value) => updateFormation(formation.id, { [field]: value });

  // Cohortes logic
  const inscritsIds = displaySession?.inscrits || [];
  const hasActiveSession = !!selectedSessionId && !!displaySession?.['ID Session'];

  const availableTeachers = useMemo(() => {
    if (!hasActiveSession) return [];
    return store.enseignants.filter(e => {
      if (inscritsIds.includes(e.ID)) return false;
      if (searchTerm && !e.Nom.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (circoFilter && e.Circonscription !== circoFilter) return false;
      return true;
    });
  }, [store.enseignants, inscritsIds, searchTerm, circoFilter, hasActiveSession]);

  const inscribedTeachers = useMemo(() => {
    if (!hasActiveSession) return [];
    return inscritsIds.map(id => store.enseignants.find(e => e.ID === id)).filter(Boolean);
  }, [store.enseignants, inscritsIds, hasActiveSession]);

  const handleEnroll = (id) => handleUpdate({ inscrits: [...inscritsIds, id] });
  const handleUnenroll = (id) => handleUpdate({ inscrits: inscritsIds.filter(i => i !== id) });
  const handleEnrollAllFiltered = () => handleUpdate({ inscrits: [...inscritsIds, ...availableTeachers.map(t => t.ID)] });
  const circosList = [...new Set(store.enseignants.map(e => e.Circonscription))].filter(Boolean);
  const selectedCompsCount = (formation.targetedComps || []).length;
  const logisticsCount = (formation.techRequirements || []).length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 pb-20">
      
      {/* ════════ SECTION 1 : IDENTITÉ ════════ */}
      <Section number="1" title="Identité du Programme" subtitle="Informations fondamentales" iconColor="bg-[#1F3864] text-white">
        <div className="space-y-4">
          {/* Row 1: Libellé */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Libellé du programme</label>
            <input 
              className="w-full bg-gray-50 border border-gray-100 focus:border-blue-200 focus:bg-white rounded-xl px-4 py-3 text-sm font-black text-[#1F3864] outline-none transition-all"
              value={formation.libelle || ''} onChange={(e) => handleInputChange('libelle', e.target.value)}
            />
          </div>

          {/* Row 2: Circo + Trimestre + Statut + Couleur — 4 colonnes compactes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={8} /> Circonscription</label>
              <select className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs font-black text-blue-700 outline-none appearance-none cursor-pointer"
                value={formation.Circonscription || ''} onChange={(e) => handleInputChange('Circonscription', e.target.value)}>
                <option value="">Nationale</option>
                {Object.keys(store.crefocs).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Clock size={8} /> Trimestre</label>
              <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-black text-[#1F3864] outline-none appearance-none cursor-pointer"
                value={formation.trimestre} onChange={(e) => handleInputChange('trimestre', e.target.value)}>
                <option value="T1">T1 · Nov 2026</option>
                <option value="T2">T2 · Fév 2027</option>
                <option value="T3">T3 · Mars-Mai 2027</option>
                <option value="Annuel">Annuel</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Statut</label>
              <div className="flex gap-1.5">
                {FORM_STATUSES.map(s => (
                  <button key={s.value} onClick={() => handleInputChange('status', s.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-[8px] font-black uppercase border transition-all ${
                      formation.status === s.value 
                        ? 'bg-white border-gray-200 text-[#1F3864] shadow-sm' 
                        : 'border-transparent text-gray-300 hover:text-gray-500'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Palette size={8} /> Couleur</label>
              <div className="flex gap-2 items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
                <input type="color" className="w-8 h-8 border-none bg-transparent cursor-pointer p-0 rounded"
                  value={formation.color || '#2E75B6'} onChange={(e) => handleInputChange('color', e.target.value)} />
                <input className="flex-1 bg-transparent text-[10px] font-mono font-black text-gray-500 outline-none w-0"
                  value={formation.color} onChange={(e) => handleInputChange('color', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ════════ SECTION 2 : COMPÉTENCES ════════ */}
      <Section number="2" title="Compétences Ciblées" subtitle="Référentiel RCET" iconColor="bg-blue-500 text-white" 
        collapsible={true} defaultOpen={selectedCompsCount === 0} badge={`${selectedCompsCount} sélectionnée${selectedCompsCount > 1 ? 's' : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
          {Object.entries(competences).map(([cCode, cLabel]) => {
            const current = formation.targetedComps || [];
            const isChecked = current.includes(cCode);
            return (
              <label key={cCode} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all select-none cursor-pointer ${
                isChecked ? 'bg-blue-50 border-blue-200 text-[#1F3864]' : 'bg-white border-gray-50 text-gray-300 hover:bg-gray-50'
              }`}>
                <input type="checkbox" checked={isChecked}
                  onChange={() => { const next = isChecked ? current.filter(c => c !== cCode) : [...current, cCode]; handleInputChange('targetedComps', next); }}
                  className="flex-shrink-0 accent-[#2E75B6] w-3.5 h-3.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-black font-mono">{cCode}</span>
                  <span className="text-[8px] font-bold opacity-50 ml-1.5 truncate">{cLabel.replace(/^[A-Z]\d+ — /, '').substring(0, 25)}</span>
                </div>
              </label>
            );
          })}
        </div>
      </Section>

      {/* ════════ SECTION 3 : SESSIONS ════════ */}
      <Section number="3" title="Sessions de Déploiement" subtitle="Instances locales" iconColor="bg-indigo-500 text-white" badge={`${filteredSessions.length} session${filteredSessions.length > 1 ? 's' : ''}`}>
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button onClick={() => setSessionView('list')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${sessionView === 'list' ? 'bg-white shadow-sm text-[#1F3864]' : 'text-gray-400'}`}>
                <List size={11} className="inline mr-1" /> Liste
              </button>
              <button onClick={() => setSessionView('gantt')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${sessionView === 'gantt' ? 'bg-white shadow-sm text-[#1F3864]' : 'text-gray-400'}`}>
                <SlidersHorizontal size={11} className="inline mr-1" /> Gantt
              </button>
            </div>
            <button onClick={handleQuickCreate} className="px-5 py-2.5 bg-[#1F3864] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-md flex items-center gap-1.5">
              <Plus size={12} /> Nouvelle Session
            </button>
          </div>

          {/* Content */}
          {sessionView === 'list' ? (
            <SessionsList sessions={filteredSessions} store={store} />
          ) : (
            <div className="bg-gray-50 rounded-2xl p-1 overflow-hidden border border-gray-100">
              <GanttView sessions={filteredSessions} store={store} onEdit={() => {}} />
            </div>
          )}
        </div>
      </Section>

      {/* ════════ SECTION 4 : LOGISTIQUE ════════ */}
      <Section number="4" title="Pré-requis Logistiques" subtitle="Équipements nécessaires" iconColor="bg-emerald-500 text-white" 
        collapsible={true} defaultOpen={logisticsCount === 0} badge={`${logisticsCount}/${Object.keys(LOGISTICS_LABELS).length}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(LOGISTICS_LABELS).map(([key, { label, icon: Icon }]) => {
            const reqs = hasActiveSession 
              ? (displaySession?.logistics?.requirements || []) 
              : (formation?.techRequirements || []);
            const isChecked = reqs.includes(key);
            return (
              <label key={key} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all select-none cursor-pointer ${
                isChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-50 text-gray-300 hover:bg-gray-50'
              }`}>
                <input type="checkbox" checked={isChecked}
                  onChange={() => { 
                    const next = isChecked ? reqs.filter(r => r !== key) : [...reqs, key]; 
                    if (hasActiveSession) {
                       handleUpdate({ logistics: { ...(displaySession.logistics || {}), requirements: next } });
                    } else {
                       handleInputChange('techRequirements', next); 
                    }
                  }}
                  className="w-3 h-3 accent-emerald-500 rounded flex-shrink-0" />
                <Icon size={12} className={isChecked ? 'text-emerald-500 flex-shrink-0' : 'text-gray-200 flex-shrink-0'} />
                <span className="text-[9px] font-bold uppercase tracking-tight truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* ════════ SECTION 5 : COHORTES ════════ */}
      <Section number="5" title="Cohortes & Participants" 
        subtitle={hasActiveSession ? `Session ${selectedSessionId}` : 'Sélectionner une session'} 
        iconColor="bg-violet-500 text-white"
        badge={hasActiveSession ? `${inscribedTeachers.length} inscrits` : '—'}>
        
        {!hasActiveSession ? (
          <div className="py-10 text-center space-y-3">
            <Users size={36} className="text-gray-200 mx-auto" />
            <p className="text-xs font-black text-gray-300 uppercase tracking-tighter">Sélectionnez une session dans la section 3</p>
            <p className="text-[10px] text-gray-400 font-bold">Les participants alimentent l'analyse ADDIE</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[350px]">
            {/* Annuaire */}
            <div className="bg-gray-50 rounded-2xl flex flex-col overflow-hidden border border-gray-100">
              <div className="p-4 border-b border-gray-100 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest flex items-center gap-1.5">
                    <Search size={12} className="text-blue-500" /> Annuaire
                  </h4>
                  <button onClick={handleEnrollAllFiltered} disabled={availableTeachers.length === 0}
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-30">
                    + Tout inscrire
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 pl-7 pr-2 text-[10px] font-bold text-[#1F3864] outline-none focus:border-blue-200" />
                  </div>
                  <select value={circoFilter} onChange={(e) => setCircoFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-[9px] font-bold text-gray-500 outline-none cursor-pointer">
                    <option value="">Toutes</option>
                    {circosList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {availableTeachers.length === 0 && (
                  <div className="text-center py-6 opacity-40"><Filter size={20} className="mx-auto text-gray-400 mb-1" /><p className="text-[8px] font-black uppercase text-gray-500">Aucun résultat</p></div>
                )}
                {availableTeachers.map(t => (
                  <div key={t.ID} className="bg-white p-2.5 rounded-xl flex items-center justify-between group hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black ${t.Statut === 'Stagiaire' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'}`}>
                        {t.Nom?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-[#1F3864] leading-none">{t.Nom}</p>
                        <p className="text-[7px] font-bold text-gray-400 uppercase mt-0.5"><MapPin size={6} className="inline mr-0.5" />{t.Circonscription}</p>
                      </div>
                    </div>
                    <button onClick={() => handleEnroll(t.ID)} className="w-7 h-7 bg-gray-50 text-gray-300 rounded-lg flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all">
                      <UserPlus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Roster */}
            <div className="bg-gradient-to-br from-[#1F3864] to-indigo-900 shadow-xl rounded-2xl border border-indigo-500/20 flex flex-col overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Users size={100} className="text-white" /></div>
              <div className="p-4 border-b border-white/10 bg-white/5 relative z-10 flex items-center justify-between">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-400" /> Roster
                </h4>
                <span className="text-[10px] font-black text-emerald-400">{inscribedTeachers.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar relative z-10">
                {inscribedTeachers.length === 0 && (
                  <div className="text-center py-10"><AlertCircle size={20} className="text-indigo-300 mx-auto mb-1" /><p className="text-[9px] font-black text-indigo-200 uppercase">Vide</p></div>
                )}
                {inscribedTeachers.map(t => (
                  <div key={t.ID} className="bg-white/5 hover:bg-white/10 p-2.5 rounded-xl flex items-center justify-between transition-all border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black ${t.Statut === 'Stagiaire' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {t.Nom?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white leading-none">{t.Nom}</p>
                        <span className={`text-[7px] font-black uppercase ${t.Statut === 'Stagiaire' ? 'text-orange-300' : 'text-blue-300'}`}>{t.Statut}</span>
                      </div>
                    </div>
                    <button onClick={() => handleUnenroll(t.ID)} className="w-7 h-7 bg-white/5 text-indigo-300 rounded-lg flex items-center justify-center hover:bg-red-500/80 hover:text-white transition-all">
                      <UserMinus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Section>

    </div>
  );
}
