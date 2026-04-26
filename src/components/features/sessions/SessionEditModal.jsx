import { useState, useEffect } from 'react';
import { 
  Calendar, X, MapPin, Info, Save, AlertCircle, 
  ShieldCheck, AlertTriangle, Check, XCircle, Download, CheckCircle2
} from 'lucide-react';
import { exportSessionToPDF } from '../../../utils/pdfGenerator';
import { LOGISTICS_LABELS } from '../../../constants/logistics';
import { analyzeVenueReadiness } from '../../../utils/formationMatcher';

const STATUTS = ['Planifiée', 'Confirmée', 'En cours', 'Terminée', 'Annulée'];

export function SessionEditModal({ session, store, isNew, onSave, onClose }) {
  const [form, setForm] = useState({ 
    ...session, 
    inscrits: session.inscrits || [] 
  });

  useEffect(() => { 
    setForm({ ...session, inscrits: session.inscrits || [] }); 
  }, [session]);

  function set(field, value) {
    let nextForm = { ...form, [field]: value };

    if (field === 'Circonscription') {
      const crefoc = store.crefocs[value];
      if (crefoc) nextForm['Lieu'] = crefoc.nom || value;
    }

    if (field === 'Formation') {
      const formation = store.formations[value];
      if (formation) nextForm['Titre formation'] = formation.libelle;
    }

    setForm(nextForm);
  }

  function handleSave() {
    if (!form['Formation'] || !form['Circonscription'] || !form['Date (Samedi)']) {
      alert("Veuillez remplir les champs obligatoires (Formation, Circo, Date).");
      return;
    }
    onSave(form);
    onClose();
  }

  const selectedCrefoc = store.crefocs[form['Circonscription']];
  const readiness = (form.Formation && selectedCrefoc) 
    ? analyzeVenueReadiness(store.formations[form.Formation], selectedCrefoc)
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F3864]/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Ribbon */}
        <div className="bg-gray-50/50 px-8 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#2E75B6]">
            <MapPin size={16} /> Planification Logistique
          </h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="px-8 py-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-8">
            {/* Identification Area */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E75B6] flex items-center gap-2">
                <ShieldCheck size={12} /> Identification du Cycle
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Thématique RCET</label>
                  <select
                    value={form['Formation']}
                    onChange={e => set('Formation', e.target.value)}
                    className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#1F3864] transition-all outline-none"
                  >
                    <option value="">Choisir une formation...</option>
                    {Object.values(store.formations).map(f => (
                      <option key={f.id} value={f.id}>{f.id} — {f.libelle}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Titre Personnalisé</label>
                  <input
                    value={form['Titre formation']}
                    onChange={e => set('Titre formation', e.target.value)}
                    className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#1F3864] transition-all outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Venue & Logistics Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E75B6] flex items-center gap-2">
                  <MapPin size={12} /> Localisation
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 ml-1">Circonscription</label>
                    <select
                      value={form['Circonscription']}
                      onChange={e => set('Circonscription', e.target.value)}
                      className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#1F3864] transition-all outline-none"
                    >
                      {Object.keys(store.crefocs).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 ml-1">Centre CREFOC</label>
                    <select
                      value={form['Lieu']}
                      onChange={e => set('Lieu', e.target.value)}
                      className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#1F3864] transition-all outline-none"
                    >
                      {Object.values(store.crefocs).map(c => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E75B6] flex items-center justify-between">
                  <span className="flex items-center gap-2"><ShieldCheck size={12} /> Readiness Venue</span>
                  {readiness && (
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${readiness.canHost ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'}`}>
                      {readiness.canHost ? 'Conforme' : 'Alerte Logistique'}
                    </span>
                  )}
                </h3>
                
                {readiness ? (
                  <div className="space-y-3">
                    <div className={`p-4 rounded-[24px] border border-white shadow-inner flex items-center justify-between ${readiness.canHost ? 'bg-emerald-50/50' : 'bg-orange-50/50'}`}>
                      <div className="flex flex-col">
                        <span className={`text-xl font-black ${readiness.canHost ? 'text-emerald-600' : 'text-orange-500'}`}>
                          {readiness.score}%
                        </span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Score de Conformité</span>
                      </div>
                      {readiness.canHost ? (
                         <CheckCircle2 className="text-emerald-500" size={24} />
                      ) : (
                         <AlertTriangle className="text-orange-400" size={24} />
                      )}
                    </div>

                    {/* Detailed Checklist */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-[24px] p-4 space-y-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Checklist Équipements</p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {store.formations[form.Formation]?.techRequirements?.length > 0 ? (
                          store.formations[form.Formation].techRequirements.map(reqKey => {
                            const labelCfg = LOGISTICS_LABELS[reqKey];
                            const isOk = !readiness.missing.includes(reqKey);
                            const Icon = labelCfg?.icon || Info;
                            return (
                              <div key={reqKey} className="flex items-center justify-between p-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <Icon size={12} className={isOk ? 'text-emerald-500' : 'text-red-400'} />
                                  <span className={`text-[10px] font-semibold ${isOk ? 'text-gray-700' : 'text-red-500 font-bold'}`}>
                                    {labelCfg?.label || reqKey}
                                  </span>
                                </div>
                                {isOk ? (
                                  <Check size={12} className="text-emerald-500" />
                                ) : (
                                  <XCircle size={12} className="text-red-400" />
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-gray-400 italic text-center py-2">Aucun équipement spécifique requis pour cette formation.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full bg-gray-50 rounded-[24px] border-2 border-dashed border-gray-100 flex items-center justify-center p-6 text-center min-h-[160px]">
                    <p className="text-[10px] font-bold text-gray-400 italic">Choisissez un centre pour analyser la conformité logistique</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timing & Status */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E75B6] flex items-center gap-2">
                <Calendar size={12} /> Planification & Statut
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Session (Samedi)</label>
                  <input
                    type="date"
                    value={form['Date (Samedi)']}
                    onChange={e => set('Date (Samedi)', e.target.value)}
                    className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-black text-[#1F3864] transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Statut Courant</label>
                  <select
                    value={form['Statut']}
                    onChange={e => set('Statut', e.target.value)}
                    className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-[#1F3864] transition-all outline-none"
                  >
                    {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-400 ml-1">Formateur Principal</label>
                  <input
                    value={form['Formateur principal'] || ''}
                    onChange={e => set('Formateur principal', e.target.value)}
                    placeholder="Identité formateur"
                    className="w-full bg-gray-50/80 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl px-4 py-3 text-sm font-semibold text-[#1F3864] transition-all outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-6 bg-[#F8FAFC] border-t border-gray-100">
          {!isNew && (
            <button
               onClick={() => {
                 const formation = store.formations[form.Formation] || { libelle: form['Titre formation'] || form.Formation };
                 const crefoc = Object.values(store.crefocs).find(c => c.nom === form['Lieu']) || store.crefocs[form['Circonscription']] || {};
                 const participants = (form.inscrits || []).map(id => store.enseignants.find(e => e.ID === id)).filter(Boolean);
                 exportSessionToPDF(form, formation, crefoc, participants, store);
               }}
               className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 text-[#2E75B6] rounded-2xl font-black text-sm hover:bg-blue-50 transition-all shadow-sm mr-auto"
            >
              <Download size={16} /> Dossier PDF
            </button>
          )}
          <button 
            onClick={onClose} 
            className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave} 
            className="flex items-center gap-2 px-8 py-3 bg-[#2E75B6] text-white rounded-2xl font-black text-sm hover:bg-[#1F3864] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200"
          >
            <Save size={18} /> 
            {isNew ? 'Créer la Session' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
