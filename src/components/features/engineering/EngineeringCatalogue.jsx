import * as React from 'react';
import { 
  ChevronDown, ChevronUp, Edit2, Check, X, Target, Plus, Trash2, PlusCircle, 
  AlertCircle, ShieldCheck, FileText, Settings2, Info, Landmark, Briefcase,
  Calendar, Users, MapPin, ArrowRight, Wand2, Clock, Eye, Sparkles, BrainCircuit,
  Lightbulb, Zap, Rocket, ChevronRight, BarChart3, Search, LayoutDashboard,
  Library, Activity, Filter, ArrowRightCircle, BookOpen
} from 'lucide-react';
import { LOGISTICS_LABELS } from '../../../constants/logistics';
import { SimpleInputModal } from '../../ui/SimpleInputModal';
import { SessionEditModal } from '../sessions/SessionEditModal';
import { ReferentialEditModal } from './ReferentialEditModal';
import { CATALOGUE_FORMATIONS } from '../../../constants/catalogue';
import { 
  calculateDeficit, 
  calculateIPT, 
  calculateCS, 
  calculateEligibilityScore, 
  getRecommendationLabel 
} from '../../../utils/eligibilityEngine';
import { RCET_LABELS } from '../../../constants/competences';

function AddCompInline({ onAdd }) {
  const [code, setCode] = React.useState('');
  const [label, setLabel] = React.useState('');
  function submit(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const l = label.trim();
    if (!c || !l) return;
    onAdd(c, l);
    setCode(''); setLabel('');
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Code</label>
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="C8"
          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20" />
      </div>
      <div className="flex-1 min-w-32">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Libellé</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Nouvelle compétence"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20" />
      </div>
      <button type="submit"
        className="flex items-center gap-1 px-2.5 py-1.5 bg-[#2E75B6] text-white text-xs rounded-lg hover:bg-[#1F3864] transition-colors">
        <Plus size={11} /> Ajouter
      </button>
    </form>
  );
}

const FORM_STATUSES = [
  { value: 'En attente', label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  { value: 'Confirmée', label: 'Confirmée', color: 'bg-green-100 text-green-700' },
  { value: 'Annulée', label: 'Annulée', color: 'bg-red-100 text-red-700' }
];

export function EngineeringCatalogue({ 
  formations, myFormations, store, addFormation, deleteFormation, onOpenSession, selectedCircos
}) {
  const [activeTab, setActiveTab] = React.useState('strategy'); // 'strategy' | 'library'
  const [catalogueSearch, setCatalogueSearch] = React.useState('');
  const [filterFamily, setFilterFamily] = React.useState('Tous');
  const [filterPriority, setFilterPriority] = React.useState('Tous');
  const [filterComp, setFilterComp] = React.useState('Tous');
  const [referentialModal, setReferentialModal] = React.useState({ isOpen: false, mode: 'edit', item: null });
  const [editingSession, setEditingSession] = React.useState(null);

  const handleCreateSession = (formId) => {
    console.log("Creating/Opening session for formation:", formId);
    // On cherche dans le référentiel global
    let form = store.referential[formId];
    
    // Fallback de sécurité : si l'ID ne correspond pas, on cherche par libellé
    if (!form) {
      form = Object.values(store.referential).find(f => f.id === formId || f.libelle === store.formations[formId]?.libelle);
    }

    if (!form) {
      console.error("Formation not found in referential:", formId);
      return;
    }
    
    const existingSession = store.sessions.find(s => s.Formation === formId);
    if (existingSession) {
      onOpenSession(formId, existingSession['ID Session']);
      return;
    }

    const targetCirco = selectedCircos.find(c => c !== 'National') || 'Kef';

    const newId = store.addSession({
      Formation: formId,
      'Titre formation': form.libelle,
      'Circonscription': targetCirco,
      'Lieu': store.crefocs[targetCirco]?.nom || 'CREFOC',
      'Date (Samedi)': new Date().toISOString().split('T')[0],
      Statut: 'Planifiée',
      inscrits: []
    });
    onOpenSession(formId, newId);
  };

  // Utilise les formations recommandées passées par le workflow (déjà filtrées par circonscription)
  const displayFormations = formations || [];

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* ─── LEFT: Main Portfolio Surface ─────────────────────────────────── */}
      <div className="flex-1 space-y-8">
        
        {/* 1. SMART NAV & FILTERS */}
        <div className="bg-white/60 backdrop-blur-md p-3 rounded-[32px] border border-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-1">
            {[
              { id: 'strategy', label: 'Recommandations IA', icon: Sparkles },
              { id: 'library', label: 'Bibliothèque Complète', icon: Library }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.id ? 'bg-[#1F3864] text-white shadow-xl shadow-blue-900/20 scale-105' : 'text-gray-400 hover:bg-gray-50'
                }`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pr-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Filtrer le portfolio..." 
                value={catalogueSearch} 
                onChange={(e) => setCatalogueSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 bg-gray-50/50 border border-gray-100 rounded-xl text-[10px] font-bold text-[#1F3864] focus:outline-none focus:ring-2 focus:ring-blue-100 w-48 transition-all" 
              />
            </div>
            {activeTab === 'library' && (
              <button onClick={() => setReferentialModal({ isOpen: true, mode: 'create', item: null })}
                className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                <Plus size={18} />
              </button>
            )}
            <button className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:text-[#1F3864] transition-all"><Settings2 size={18} /></button>
          </div>
        </div>

        {/* 2. CATEGORY SELECTOR */}
        <div className="flex flex-wrap gap-2">
          {['Tous', 'Didactique', 'Ingénierie', 'Évaluation', 'Numérique', 'Professionnel'].map(f => (
            <button 
              key={f}
              onClick={() => setFilterFamily(f)}
              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                filterFamily === f ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 3. MAIN EXPLORER AREA */}
        <div className="space-y-6">
        {/* 3. CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(activeTab === 'strategy' ? displayFormations.slice(0, 3) : Object.values(store.referential || {}))
            .filter(f => filterFamily === 'Tous' || f.family === filterFamily)
            .filter(f => f.libelle.toLowerCase().includes(catalogueSearch.toLowerCase()))
            .map((f, i) => {
              const isAdded = Object.values(myFormations || {}).some(existing => existing.id === f.id);
              const matchingScore = Math.min(Math.round(f.score || 0), 100);
              const isHighPriority = matchingScore >= 90;
              
              return (
                <div key={f.id} className={`group bg-white rounded-[40px] border p-6 hover:shadow-xl transition-all duration-500 flex flex-col relative overflow-hidden ${
                  isHighPriority ? 'border-red-200 shadow-sm ring-1 ring-red-50' : 'border-gray-100'
                }`}>
                  {/* Subtle Indicator */}
                  {isHighPriority && <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />}
                  
                  {/* Header: Family & Score */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                         <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">{f.family || 'GÉNÉRAL'}</span>
                         {isHighPriority && (
                           <span className="text-[7px] font-black uppercase bg-red-50 text-red-600 px-2 py-0.5 rounded-md border border-red-100">Priorité 1</span>
                         )}
                      </div>
                      <div className={`h-1 rounded-full transition-all duration-500 ${isHighPriority ? 'w-10 bg-red-500' : 'w-6 bg-indigo-500/20'}`} />
                    </div>
                    {activeTab === 'strategy' && (
                      <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 border ${
                        isHighPriority ? 'bg-red-600 border-red-500 text-white' : 
                        matchingScore > 70 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}>
                        <Target size={10} className={isHighPriority ? 'text-white' : 'text-current'} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{matchingScore}%</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="flex-1 space-y-2 mb-6">
                    <h4 className={`text-sm font-black uppercase leading-tight italic line-clamp-2 min-h-[2.8em] transition-colors ${
                      isHighPriority ? 'text-red-900' : 'text-[#1F3864] group-hover:text-indigo-600'
                    }`}>
                      {f.libelle}
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {(f.targetedComps || []).slice(0, 3).map(rc => (
                        <span key={rc} className="text-[7px] font-black text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 uppercase">
                          {rc}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Micro Specs */}
                  <div className="grid grid-cols-2 gap-3 mb-6 p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                    <div className="flex items-center gap-2">
                       <Clock size={12} className="text-gray-300" />
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{f.duration || '2 Jours'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <Target size={12} className="text-gray-300" />
                       <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Impact Haut</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        if (!isAdded) addFormation({ ...f, id: f.id, court: f.libelle.substring(0, 10), trimestre: 'T1', color: '#2E75B6', status: 'En attente' });
                        handleCreateSession(f.id);
                      }}
                      className={`flex-1 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm ${
                        store.sessions.some(s => s.Formation === f.id)
                          ? 'bg-[#1F3864] text-white hover:shadow-lg'
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                      }`}
                    >
                      {store.sessions.some(s => s.Formation === f.id) ? <Eye size={14} /> : <PlusCircle size={14} />}
                      {store.sessions.some(s => s.Formation === f.id) ? 'Suivre Session' : 'Instancier'}
                    </button>
                    <button 
                      onClick={() => setReferentialModal({ isOpen: true, mode: 'edit', item: f })}
                      className="w-12 h-12 flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-white hover:text-[#1F3864] hover:shadow-md rounded-2xl transition-all"
                    >
                      <Settings2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Empty State */}
        {(activeTab === 'strategy' ? displayFormations : Object.values(store.referential || {})).length === 0 && (
          <div className="py-20 text-center space-y-4">
             <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto border border-gray-100">
                <Search size={32} className="text-gray-200" />
             </div>
             <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Aucun module trouvé dans cette catégorie</p>
          </div>
        )}
        </div>
      </div>

      {/* ─── RIGHT: Active Portfolio Sidebar (Dashboard) ────────────────────── */}
      <div className="w-full lg:w-96 space-y-6">
        <div className="bg-[#1F3864] rounded-[40px] p-8 text-white shadow-2xl shadow-blue-900/30 relative overflow-hidden flex flex-col min-h-[600px]">
          {/* Animated Background Element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 -mr-32 -mt-32 rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
                  <Briefcase size={22} className="text-blue-400" /> Mon Portfolio
                </h3>
                <p className="text-[10px] font-bold text-blue-300/60 uppercase tracking-widest">Ingénierie Active</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                <span className="text-lg font-black">{Object.values(myFormations || {}).length}</span>
              </div>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 gap-3 mb-8">
               <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-blue-300 uppercase mb-1">Volume Horaire</p>
                  <p className="text-sm font-black italic">
                    {Object.values(myFormations || {}).reduce((acc, f) => acc + (parseInt(f.duration) || 5), 0)}h <span className="text-[10px] opacity-40">Total</span>
                  </p>
               </div>
               <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-[8px] font-black text-blue-300 uppercase mb-1">Cible</p>
                  <p className="text-sm font-black italic">{store.sessions.length} <span className="text-[10px] opacity-40">Sessions</span></p>
               </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
              {Object.values(myFormations || {}).length === 0 ? (
                <div className="py-20 text-center space-y-4 opacity-50">
                  <div className="w-16 h-16 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto border border-white/10 shadow-inner">
                    <Sparkles size={28} className="text-blue-300/50" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                    Aucun module sélectionné<br/>
                    <span className="text-[9px] opacity-60">Utilisez l'IA pour commencer</span>
                  </p>
                </div>
              ) : (
                Object.values(myFormations || {}).map((f) => {
                  const hasSession = store.sessions.some(s => s.Formation === f.id);
                  const session = store.sessions.find(s => s.Formation === f.id);
                  
                  return (
                    <div key={f.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 group hover:bg-white/10 hover:border-blue-400/30 transition-all cursor-default">
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1 pr-4">
                           <h4 className="text-[13px] font-black leading-tight text-white group-hover:text-blue-300 transition-colors">{f.libelle}</h4>
                           <span className="text-[8px] font-black text-blue-300/50 uppercase tracking-widest">#{f.id}</span>
                        </div>
                        <button 
                          onClick={() => deleteFormation(f.id)}
                          className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {hasSession ? (
                        <div className="space-y-3">
                           <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                              <div className="flex items-center gap-2 text-emerald-400">
                                 <Check size={14} />
                                 <span className="text-[9px] font-black uppercase tracking-widest">Session Active</span>
                              </div>
                              <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">{session['ID Session']}</span>
                           </div>
                           <button 
                             onClick={() => onOpenSession(f.id, session['ID Session'])}
                             className="w-full py-3 bg-white text-[#1F3864] rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                           >
                             <Rocket size={14} /> Ouvrir le Cycle ADDIE
                           </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleCreateSession(f.id)}
                          className="w-full py-3 bg-blue-500/20 hover:bg-blue-500 text-white border border-blue-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                        >
                          <PlusCircle size={14} /> Créer une Session
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Tip */}
            <div className="mt-8 pt-6 border-t border-white/10">
               <div className="flex items-center gap-3 p-4 bg-white/5 rounded-[24px] border border-white/5">
                  <BrainCircuit size={18} className="text-blue-400 shrink-0" />
                  <p className="text-[9px] font-bold text-blue-100/60 italic leading-relaxed">
                    "Votre portfolio actuel couvre <strong>{Object.values(myFormations || {}).reduce((acc, f) => acc + (f.targetedComps?.length || 0), 0)} compétences</strong> stratégiques identifiées."
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Global Strategy Insight */}
        <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm space-y-4">
           <div className="flex items-center gap-2 text-indigo-600">
              <Activity size={18} />
              <span className="text-[10px] font-black uppercase tracking-widest">Focus Stratégique</span>
           </div>
           <p className="text-[10px] font-bold text-gray-500 leading-relaxed italic">
             L'activation de ces modules permet d'atteindre <strong>{Math.round((Object.values(myFormations || {}).length / Object.values(store.referential).length) * 100)}%</strong> de couverture du catalogue métier.
           </p>
        </div>
      </div>

      <ReferentialEditModal 
        isOpen={referentialModal.isOpen} 
        mode={referentialModal.mode} 
        item={referentialModal.item} 
        referential={store.referential}
        onClose={() => setReferentialModal({ ...referentialModal, isOpen: false })}
        onSave={(data) => { 
          if (referentialModal.mode === 'create') { 
            store.addReferentialItem(data); 
          } else { 
            store.updateReferentialItem(data.id, data); 
          } 
        }}
        onDelete={(id) => store.deleteReferentialItem(id)} 
      />

      {editingSession && (
        <SessionEditModal session={editingSession} store={store} isNew={false} onClose={() => setEditingSession(null)}
          onSave={(updatedData) => { store.updateSession(editingSession['ID Session'], updatedData); setEditingSession(null); }} />
      )}
    </div>
  );
}
