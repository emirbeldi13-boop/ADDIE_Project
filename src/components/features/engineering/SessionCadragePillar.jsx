import React, { useState, useMemo } from 'react';
import { 
  MapPin, Calendar, ShieldCheck, Users, Search, Filter,
  UserPlus, UserMinus, AlertCircle, Clock, ChevronDown, ChevronUp,
  Target, BookOpen, Star, Award
} from 'lucide-react';
import { LOGISTICS_LABELS } from '../../../constants/logistics';

function Section({ number, title, badge, collapsible, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-[20px] border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={collapsible ? () => setOpen(!open) : undefined}
        className={`w-full flex items-center justify-between p-5 ${collapsible ? 'cursor-pointer hover:bg-gray-50/50' : 'cursor-default'} transition-colors`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1F3864] text-white rounded-xl flex items-center justify-center text-sm font-black">{number}</div>
          <h3 className="text-sm font-black text-[#1F3864]">{title}</h3>
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

export function SessionCadragePillar({ session, formation, store, handleUpdate, selectedSessionId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [circoFilter, setCircoFilter] = useState('');

  if (!session || !session['ID Session']) {
    return (
      <div className="py-20 text-center space-y-3">
        <AlertCircle size={36} className="text-gray-200 mx-auto" />
        <p className="text-sm font-black text-gray-300 uppercase">Session non trouvée</p>
      </div>
    );
  }

  const handleSessionField = (field, value) => {
    store.updateSession(selectedSessionId, { [field]: value });
  };

  // Cohortes
  const inscritsIds = session.inscrits || [];
  const availableTeachers = useMemo(() => {
    return store.enseignants.filter(e => {
      if (inscritsIds.includes(e.ID)) return false;
      if (searchTerm && !e.Nom.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !(e.Prénom || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (circoFilter && e.Circonscription !== circoFilter) return false;
      return true;
    });
  }, [store.enseignants, inscritsIds, searchTerm, circoFilter]);

  const inscribedTeachers = useMemo(() => {
    return inscritsIds.map(id => store.enseignants.find(e => e.ID === id)).filter(Boolean);
  }, [store.enseignants, inscritsIds]);

  const handleEnroll = (id) => handleUpdate({ inscrits: [...inscritsIds, id] });
  const handleUnenroll = (id) => handleUpdate({ inscrits: inscritsIds.filter(i => i !== id) });
  const handleEnrollAllFiltered = () => handleUpdate({ inscrits: [...inscritsIds, ...availableTeachers.map(t => t.ID)] });
  const circosList = [...new Set(store.enseignants.map(e => e.Circonscription))].filter(Boolean);
  const logisticsCount = (formation?.techRequirements || []).length;
  const stagiairesCount = inscribedTeachers.filter(t => t.Statut === 'Stagiaire').length;
  const titulairesCount = inscribedTeachers.length - stagiairesCount;
  const targetedComps = formation?.targetedComps || [];

  // Teacher row component
  const TeacherRow = ({ t, action, actionIcon: ActionIcon, actionColor }) => (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 transition-all group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
        t.Statut === 'Stagiaire' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
      }`}>
        {(t.Nom || '').substring(0, 1)}{(t.Prénom || t.Nom || '').substring(0, 1)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-[#1F3864] leading-none truncate">
          {t.Nom} {t.Prénom || ''}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[8px] font-bold text-gray-400 flex items-center gap-0.5"><MapPin size={7} />{t.Circonscription}</span>
          {t.Matière && <span className="text-[8px] font-bold text-gray-400">· {t.Matière}</span>}
          {t['Ancienneté (ans)'] && <span className="text-[8px] font-bold text-gray-400">· {t['Ancienneté (ans)']}a</span>}
          {t['Note dernière visite /20'] && <span className="text-[8px] font-bold text-amber-500 flex items-center gap-0.5"><Star size={7} />{t['Note dernière visite /20']}</span>}
        </div>
      </div>
      <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex-shrink-0 ${
        t.Statut === 'Stagiaire' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
      }`}>{t.Statut === 'Stagiaire' ? 'STG' : 'TIT'}</span>
      <button onClick={() => action(t.ID)} className={`w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all ${actionColor}`}>
        <ActionIcon size={13} />
      </button>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 pb-20">

      {/* ════════ CONTEXTE FORMATION (read-only summary) ════════ */}
      <div className="bg-blue-50/50 rounded-[20px] border border-blue-100 p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <BookOpen size={16} className="text-blue-500 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Programme parent</p>
            <p className="text-xs font-black text-[#1F3864] truncate">{formation?.libelle}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600">
            <Target size={10} /> {targetedComps.length} compétences
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600">
            <Clock size={10} /> {formation?.trimestre || '—'}
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600">
            <Calendar size={10} /> {store.sessions.filter(s => s.Formation === formation?.id).length} sessions
          </div>
          {targetedComps.length > 0 && (
            <div className="flex gap-1">
              {targetedComps.slice(0, 4).map(c => (
                <span key={c} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[7px] font-black font-mono">{c}</span>
              ))}
              {targetedComps.length > 4 && <span className="text-[7px] font-bold text-blue-400">+{targetedComps.length - 4}</span>}
            </div>
          )}
        </div>
      </div>

      {/* ════════ SECTION 1: LOCALISATION & PLANIFICATION ════════ */}
      <Section number="1" title="Localisation & Planification">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><MapPin size={8} /> Circonscription</label>
            <select className="w-full bg-blue-50/50 border border-blue-100 rounded-xl px-3 py-2.5 text-xs font-black text-blue-700 outline-none appearance-none cursor-pointer"
              value={session.Circonscription || ''} onChange={(e) => {
                handleSessionField('Circonscription', e.target.value);
                const crefoc = store.crefocs[e.target.value];
                if (crefoc) handleSessionField('Lieu', crefoc.nom);
              }}>
              <option value="">— Choisir —</option>
              {Object.keys(store.crefocs).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Lieu (CREFOC)</label>
            <select className="w-full bg-gray-50 border border-gray-100 focus:border-blue-200 rounded-xl px-3 py-2.5 text-xs font-black text-[#1F3864] outline-none appearance-none cursor-pointer"
              value={session.Lieu || ''} onChange={(e) => {
                const selectedLieu = e.target.value;
                handleSessionField('Lieu', selectedLieu);
                // Sync Circonscription if found
                const targetCirco = Object.keys(store.crefocs).find(c => store.crefocs[c].nom === selectedLieu);
                if (targetCirco) handleSessionField('Circonscription', targetCirco);
              }}>
              <option value="">— Choisir —</option>
              {Object.values(store.crefocs).map(c => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Calendar size={8} /> Date</label>
            <input type="date" className="w-full bg-gray-50 border border-gray-100 focus:border-blue-200 rounded-xl px-3 py-2.5 text-xs font-black text-[#1F3864] outline-none cursor-pointer"
              value={session['Date (Samedi)'] || ''} onChange={(e) => handleSessionField('Date (Samedi)', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1"><Clock size={8} /> Statut</label>
            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-xs font-black text-[#1F3864] outline-none appearance-none cursor-pointer"
              value={session.Statut || 'Planifiée'} onChange={(e) => handleSessionField('Statut', e.target.value)}>
              {['Planifiée', 'Confirmée', 'En cours', 'Terminée', 'Annulée'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Section>

      {/* ════════ SECTION 2: PRÉ-REQUIS LOGISTIQUES ════════ */}
      <Section number="2" title="Pré-requis Logistiques" collapsible defaultOpen={logisticsCount === 0} badge={`${logisticsCount}/${Object.keys(LOGISTICS_LABELS).length}`}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(LOGISTICS_LABELS).map(([key, { label, icon: Icon }]) => {
            const reqs = formation?.techRequirements || [];
            const isChecked = reqs.includes(key);
            return (
              <label key={key} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all select-none cursor-pointer ${
                isChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-50 text-gray-300 hover:bg-gray-50'
              }`}>
                <input type="checkbox" checked={isChecked}
                  onChange={() => {
                    const next = isChecked ? reqs.filter(r => r !== key) : [...reqs, key];
                    store.updateFormation(formation.id, { techRequirements: next });
                  }}
                  className="w-3 h-3 accent-emerald-500 rounded flex-shrink-0" />
                <Icon size={12} className={isChecked ? 'text-emerald-500 flex-shrink-0' : 'text-gray-200 flex-shrink-0'} />
                <span className="text-[9px] font-bold uppercase tracking-tight truncate">{label}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* ════════ SECTION 3: COHORTES & PARTICIPANTS ════════ */}
      <Section number="3" title="Cohortes & Participants" badge={`${inscribedTeachers.length} inscrits`}>
        <div className="space-y-4">

          {/* Quick Stats Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[9px] font-black text-blue-700">{titulairesCount} Titulaires</span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-[9px] font-black text-orange-700">{stagiairesCount} Stagiaires</span>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg">
              <Users size={10} className="text-gray-400" />
              <span className="text-[9px] font-black text-gray-500">Total : {inscribedTeachers.length}</span>
            </div>
            {session.Circonscription && (
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg">
                <MapPin size={10} className="text-emerald-500" />
                <span className="text-[9px] font-black text-emerald-700">{session.Circonscription}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* ── LEFT: Annuaire ── */}
            <div className="bg-gray-50 rounded-2xl flex flex-col overflow-hidden border border-gray-100 max-h-[420px]">
              <div className="p-3 border-b border-gray-100 space-y-2 bg-white flex-shrink-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest flex items-center gap-1.5">
                    <Search size={12} className="text-blue-500" /> Annuaire
                    <span className="text-gray-400 font-bold">({availableTeachers.length})</span>
                  </h4>
                  <button onClick={handleEnrollAllFiltered} disabled={availableTeachers.length === 0}
                    className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[8px] font-black uppercase transition-all disabled:opacity-30">
                    + Tout
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="text" placeholder="Nom, prénom..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg py-2 pl-7 pr-2 text-[10px] font-bold text-[#1F3864] outline-none focus:border-blue-200" />
                  </div>
                  <select value={circoFilter} onChange={(e) => setCircoFilter(e.target.value)}
                    className="bg-gray-50 border border-gray-100 rounded-lg py-2 px-2 text-[9px] font-bold text-gray-500 outline-none cursor-pointer">
                    <option value="">Toutes</option>
                    {circosList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-1.5 py-1 custom-scrollbar">
                {availableTeachers.length === 0 && (
                  <div className="text-center py-8 opacity-40"><Filter size={18} className="mx-auto text-gray-400 mb-1" /><p className="text-[8px] font-black uppercase text-gray-500">Aucun résultat</p></div>
                )}
                {availableTeachers.map(t => (
                  <TeacherRow key={t.ID} t={t} action={handleEnroll} actionIcon={UserPlus} actionColor="bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white" />
                ))}
              </div>
            </div>

            {/* ── RIGHT: Roster ── */}
            <div className="bg-gradient-to-br from-[#1F3864] to-indigo-900 shadow-xl rounded-2xl border border-indigo-500/20 flex flex-col overflow-hidden relative max-h-[420px]">
              <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Users size={80} className="text-white" /></div>
              <div className="p-3 border-b border-white/10 bg-white/5 relative z-10 flex items-center justify-between flex-shrink-0">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-emerald-400" /> Roster
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-bold text-blue-300">{titulairesCount}T</span>
                  <span className="text-[8px] font-bold text-orange-300">{stagiairesCount}S</span>
                  <span className="text-[10px] font-black text-emerald-400 ml-1">{inscribedTeachers.length}</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-1.5 py-1 custom-scrollbar relative z-10">
                {inscribedTeachers.length === 0 && (
                  <div className="text-center py-10"><AlertCircle size={20} className="text-indigo-300 mx-auto mb-1" /><p className="text-[9px] font-black text-indigo-200 uppercase">Aucun participant</p></div>
                )}
                {inscribedTeachers.map(t => (
                  <div key={t.ID} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/10 transition-all group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                      t.Statut === 'Stagiaire' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {(t.Nom || '').substring(0, 1)}{(t.Prénom || t.Nom || '').substring(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white leading-none truncate">{t.Nom} {t.Prénom || ''}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[8px] font-bold text-indigo-300 flex items-center gap-0.5"><MapPin size={7} />{t.Circonscription}</span>
                        {t.Matière && <span className="text-[8px] font-bold text-indigo-300">· {t.Matière}</span>}
                        {t['Ancienneté (ans)'] && <span className="text-[8px] font-bold text-indigo-300">· {t['Ancienneté (ans)']}a</span>}
                        {t['Note dernière visite /20'] && <span className="text-[8px] font-bold text-amber-300 flex items-center gap-0.5"><Star size={7} />{t['Note dernière visite /20']}</span>}
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex-shrink-0 ${
                      t.Statut === 'Stagiaire' ? 'bg-orange-500/20 text-orange-300' : 'bg-blue-500/20 text-blue-300'
                    }`}>{t.Statut === 'Stagiaire' ? 'STG' : 'TIT'}</span>
                    <button onClick={() => handleUnenroll(t.ID)} className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white">
                      <UserMinus size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
