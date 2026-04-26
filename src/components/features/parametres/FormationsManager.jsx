import { useState } from 'react';
import { ChevronDown, ChevronUp, Edit2, Check, X, Target, Plus, Trash2, PlusCircle, AlertCircle, ShieldCheck, FileText, Settings2, Info, Landmark, Briefcase } from 'lucide-react';
import { LOGISTICS_LABELS } from '../../../constants/logistics';
import { SimpleInputModal } from '../../ui/SimpleInputModal';

function AddCompInline({ onAdd }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
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

export function FormationsManager({ 
  formations, 
  competences, 
  updateFormation, 
  addFormation, 
  deleteFormation, 
  updateObjectif, 
  addObjectif, 
  deleteObjectif,
  addCompetence 
}) {
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [isAddingForm, setIsAddingForm] = useState(false);
  const [newFormName, setNewFormName] = useState('');
  const [modalTab, setModalTab] = useState('settings'); // 'settings' | 'cdc'

  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const [showOpModal, setShowOpModal] = useState(null); // stores formationId

  const startEdit = (id, form) => {
    setEditingId(id);
    const targetedComps = form.targetedComps?.length
      ? form.targetedComps
      : [(form.competence || '').split(' ')[0]].filter(Boolean);
    setEditValues({ ...form, targetedComps, status: form.status || 'En attente' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
    setModalTab('settings');
  };

  const saveEdit = (id) => {
    updateFormation(id, editValues);
    setEditingId(null);
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const [editingObj, setEditingObj] = useState(null);

  const saveEditObj = () => {
    const { formId, objIndex, libelle } = editingObj;
    updateObjectif(formId, objIndex, { libelle });
    setEditingObj(null);
  };

  const handleAddForm = () => {
    if (!newFormName.trim()) return;
    const id = `F${Object.keys(formations).length + 1}`;
    addFormation({
      id,
      libelle: newFormName.trim(),
      court: newFormName.trim().substring(0, 10),
      trimestre: 'T1',
      color: '#2E75B6',
      objectifTerminal: '',
      objectifs: [],
      status: 'En attente'
    });
    setNewFormName('');
    setIsAddingForm(false);
  };

  const handleDeleteForm = (id) => {
    if (window.confirm('Supprimer définitivement cette formation ?')) {
      deleteFormation(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1F3864]">Catalogue des Formations</h3>
          <p className="text-xs text-gray-400">Gérez les sessions, objectifs et compétences associées</p>
        </div>
        <button
          onClick={() => setIsAddingForm(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-[#2E75B6] text-white rounded-lg hover:bg-[#1F3864] active:scale-95 transition-all shadow-sm"
        >
          <Plus size={14} /> Nouvelle Formation
        </button>
      </div>

      {isAddingForm && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            autoFocus
            className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20"
            placeholder="Nom de la formation..."
            value={newFormName}
            onChange={e => setNewFormName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddForm()}
          />
          <button onClick={handleAddForm} className="bg-[#2E75B6] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1F3864]">Créer</button>
          <button onClick={() => setIsAddingForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {Object.values(formations).map((form) => {
          const statusCfg = FORM_STATUSES.find(s => s.value === form.status) || FORM_STATUSES[0];
          return (
            <div key={form.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                onClick={() => toggleExpand(form.id)}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div 
                    className="w-1.5 h-12 rounded-full" 
                    style={{ backgroundColor: form.color || '#2E75B6' }} 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[#1F3864] text-base">{form.libelle}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                        Trimestre: <span className="text-gray-600">{form.trimestre}</span>
                      </span>
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                        OPP: <span className="text-gray-600">{form.objectifs?.length || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEdit(form.id, form); }}
                    className="p-2 text-gray-400 hover:text-[#2E75B6] hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteForm(form.id); }}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                  {expandedId === form.id ? <ChevronUp size={20} className="text-gray-400 ml-2" /> : <ChevronDown size={20} className="text-gray-400 ml-2" />}
                </div>
              </div>

              {expandedId === form.id && (
                <div className="px-6 pb-6 border-t border-gray-50 pt-5 space-y-8 animate-in fade-in duration-300">
                  {/* Basic Info Columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                        <Target size={12} className="text-[#2E75B6]" /> Objectif Terminal
                      </h5>
                      <div className="text-sm text-gray-700 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 min-h-[100px] leading-relaxed italic">
                        {form.objectifTerminal || "Aucun objectif terminal défini."}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                        <Check size={12} className="text-green-500" /> Compétences Ciblées
                      </h5>
                      <div className="flex flex-wrap gap-2 bg-gray-50/50 p-4 rounded-2xl border border-gray-100 min-h-[100px] align-content-start">
                        {(form.targetedComps?.length
                          ? form.targetedComps
                          : [(form.competence || '').split(' ')[0]].filter(Boolean)
                        ).length > 0 ? (
                          (form.targetedComps || [(form.competence || '').split(' ')[0]].filter(Boolean)).map(code => (
                            <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-white border border-gray-100 text-[#1F3864] shadow-sm">
                              <span className="text-[#2E75B6] font-mono">{code}</span>
                              {competences[code] && (
                                <span className="font-normal text-gray-500 border-l border-gray-100 pl-1.5 ml-0.5">{competences[code].replace(/^C\d+ — /, '')}</span>
                              )}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Aucune compétence associée.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* OPP Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between ml-1">
                      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <PlusCircle size={12} className="text-[#2E75B6]" /> Objectifs Pédagogiques Opérationnels
                      </h5>
                      <button 
                        onClick={() => setShowOpModal(form.id)}
                        className="text-[10px] font-bold text-[#2E75B6] hover:underline"
                      >
                        + Ajouter un objectif
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {form.objectifs.map((obj, idx) => (
                        <div key={obj.id} className="group relative flex items-start gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-[#2E75B6]/30 transition-all hover:shadow-sm">
                          {editingObj && editingObj.formId === form.id && editingObj.objIndex === idx ? (
                            <div className="flex-1 flex flex-col gap-2">
                              <textarea 
                                autoFocus
                                className="w-full text-sm border-b border-[#2E75B6] focus:outline-none py-1 bg-transparent resize-none"
                                value={editingObj.libelle}
                                onChange={(e) => setEditingObj({ ...editingObj, libelle: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), saveEditObj())}
                              />
                              <div className="flex justify-end gap-1">
                                <button onClick={saveEditObj} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={16}/></button>
                                <button onClick={() => setEditingObj(null)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={16}/></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-[10px] font-bold text-[#2E75B6] bg-blue-50 rounded-lg">
                                {idx + 1}
                              </span>
                              <p className="flex-1 text-sm text-gray-700 leading-snug pt-0.5">{obj.libelle}</p>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                <button 
                                  onClick={() => setEditingObj({ formId: form.id, objIndex: idx, libelle: obj.libelle })}
                                  className="p-1.5 text-gray-400 hover:text-[#2E75B6] hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button 
                                  onClick={() => window.confirm('Supprimer cet objectif ?') && deleteObjectif(form.id, idx)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {form.objectifs.length === 0 && (
                        <div className="col-span-full py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                           <p className="text-xs text-gray-400">Aucun objectif opérationnel pour cette formation.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CDC Summary */}
                  <div className="space-y-4 pt-4 border-t border-gray-50">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                      <FileText size={12} className="text-[#2E75B6]" /> Cahier des Charges (Résumé)
                    </h5>
                    {form.cdc ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                           <p className="text-[9px] font-black text-[#2E75B6] uppercase tracking-widest">Contexte & Enjeux</p>
                           <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed italic">{form.cdc.contexte || "N/A"}</p>
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                           <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Problème à résoudre</p>
                           <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed italic">{form.cdc.probleme || "N/A"}</p>
                        </div>
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-2">
                           <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Modalités & Budget</p>
                           <div className="space-y-1">
                             <p className="text-[10px] font-bold text-gray-500">Budget: <span className="text-gray-700">{form.cdc.budget || "Non défini"}</span></p>
                             <p className="text-[10px] font-bold text-gray-500">Modalités: <span className="text-gray-700 font-normal">{form.cdc.modalites || "N/A"}</span></p>
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center bg-gray-50/30 rounded-2xl border-2 border-dashed border-gray-100">
                        <p className="text-xs text-gray-400 italic">Aucun cahier des charges renseigné pour le moment.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Edit Modal */}
              {editingId === form.id && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                      <div>
                        <h3 className="font-bold text-[#1F3864] text-xl">Paramètres Formation</h3>
                        <p className="text-xs text-gray-400 font-medium">Référence UNIQUE: {form.id}</p>
                      </div>
                      <button onClick={cancelEdit} className="p-2.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 rounded-2xl text-gray-400 transition-all">
                        <X size={20} />
                      </button>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex px-8 border-b border-gray-100 bg-white">
                      <button
                        onClick={() => setModalTab('settings')}
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                          modalTab === 'settings' ? 'text-[#2E75B6]' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <Settings2 size={14} /> Réglages Techniques
                        {modalTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2E75B6]" />}
                      </button>
                      <button
                        onClick={() => setModalTab('cdc')}
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
                          modalTab === 'cdc' ? 'text-[#2E75B6]' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        <FileText size={14} /> Cahier des Charges
                        {modalTab === 'cdc' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2E75B6]" />}
                      </button>
                    </div>

                    <div className="p-8 space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar bg-gray-50/30">
                      {modalTab === 'settings' ? (
                        <div className="space-y-6 animate-in slide-in-from-left-2 duration-300">
                          {/* Grid for Name & Trimestre */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Libellé Complet</label>
                          <input 
                            className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[#2E75B6]/10 focus:outline-none transition-all font-semibold text-[#1F3864]"
                            value={editValues.libelle}
                            onChange={(e) => handleInputChange('libelle', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Trimestre</label>
                          <select 
                            className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all"
                            value={editValues.trimestre}
                            onChange={(e) => handleInputChange('trimestre', e.target.value)}
                          >
                            <option value="T1">Trimestre 1</option>
                            <option value="T2">Trimestre 2</option>
                            <option value="T3">Trimestre 3</option>
                            <option value="T4">Trimestre 4</option>
                            <option value="Annuel">Annuel</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Statut Actuel</label>
                          <div className="flex flex-wrap gap-2">
                            {FORM_STATUSES.map(s => (
                              <button
                                key={s.value}
                                onClick={() => handleInputChange('status', s.value)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                                  editValues.status === s.value 
                                    ? `${s.color} border-current shadow-sm` 
                                    : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Identité Visuelle (Couleur)</label>
                          <div className="flex gap-4">
                            <input 
                              type="color"
                              className="w-12 h-10 border-none bg-transparent cursor-pointer p-0"
                              value={editValues.color || '#2E75B6'}
                              onChange={(e) => handleInputChange('color', e.target.value)}
                            />
                            <input 
                              className="flex-1 border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all font-mono"
                              value={editValues.color}
                              onChange={(e) => handleInputChange('color', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Objectif Terminal de la Formation</label>
                        <textarea 
                          className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all min-h-[100px] leading-relaxed italic"
                          value={editValues.objectifTerminal}
                          placeholder="Décrire le résultat final attendu à la fin de cette session..."
                          onChange={(e) => handleInputChange('objectifTerminal', e.target.value)}
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                             <ShieldCheck size={12} className="text-[#2E75B6]" /> Besoins Logistiques & Équipements
                           </label>
                           <span className="text-[10px] text-gray-400 italic">Validation Readiness (§2.8)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                          {Object.entries(LOGISTICS_LABELS).map(([key, { label, icon: Icon }]) => {
                            const reqs = editValues.techRequirements || [];
                            const isChecked = reqs.includes(key);
                            return (
                              <label
                                key={key}
                                className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all select-none ${
                                  isChecked
                                    ? 'bg-white border-[#2E75B6] shadow-sm text-[#1F3864]'
                                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const next = isChecked ? reqs.filter(r => r !== key) : [...reqs, key];
                                    handleInputChange('techRequirements', next);
                                  }}
                                  className="w-4 h-4 accent-[#2E75B6] rounded"
                                />
                                <Icon size={14} className={isChecked ? 'text-[#2E75B6]' : 'text-gray-300'} />
                                <span className="text-xs font-semibold">{label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between ml-1">
                           <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Compétences du Référentiel ciblées</label>
                           <span className="text-[10px] text-gray-400 italic">Scoring §2.8</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                          {Object.entries(competences).map(([cCode, cLabel]) => {
                            const current = editValues.targetedComps || [];
                            const isChecked = current.includes(cCode);
                            return (
                              <label
                                key={cCode}
                                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all select-none ${
                                  isChecked
                                    ? 'bg-white border-[#2E75B6] shadow-sm text-[#1F3864]'
                                    : 'bg-transparent border-transparent text-gray-400 hover:bg-white/50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const next = isChecked ? current.filter(c => c !== cCode) : [...current, cCode];
                                    handleInputChange('targetedComps', next);
                                  }}
                                  className="mt-1 flex-shrink-0 accent-[#2E75B6] w-4 h-4"
                                />
                                <div>
                                  <p className="text-xs font-bold font-mono">{cCode}</p>
                                  <p className="text-[11px] leading-tight mt-0.5 opacity-80">{cLabel.replace(/^C\d+ — /, '')}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                        {(!editValues.targetedComps || editValues.targetedComps.length === 0) && (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 text-[11px] font-medium animate-pulse">
                             <AlertCircle size={14} /> 
                             <div>
                               <strong>Note :</strong> Aucune compétence ciblée. Le système utilisera la <strong>moyenne globale</strong> par défaut (Mode sécurité).
                             </div>
                          </div>
                        )}
                        {addCompetence && <AddCompInline onAdd={addCompetence} />}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                      {/* CDC Structure */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 1: Vision & Contexte */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2E75B6] flex items-center gap-2 ml-1">
                            <Info size={12} /> Vision & Contexte
                          </h4>
                          {[
                            { field: 'titreProjet', label: 'Titre du Projet', placeholder: 'Nom formel du projet...' },
                            { field: 'contexte', label: 'Contexte et enjeux', placeholder: 'Pourquoi cette formation ?' },
                            { field: 'objectifs', label: 'Objectifs Stratégiques', placeholder: 'Impact attendu au niveau de la circonscription...' },
                          ].map(cfg => (
                            <div key={cfg.field} className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-400 ml-1">{cfg.label}</label>
                              <textarea
                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder:text-gray-200 min-h-[80px]"
                                value={editValues.cdc?.[cfg.field] || ''}
                                placeholder={cfg.placeholder}
                                onChange={(e) => handleInputChange('cdc', { ...(editValues.cdc || {}), [cfg.field]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Section 2: Analyse & Diagnostic */}
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 flex items-center gap-2 ml-1">
                            <Target size={12} /> Diagnostic
                          </h4>
                          {[
                            { field: 'probleme', label: 'Problème à résoudre', placeholder: 'Lacunes constatées sur le terrain...' },
                            { field: 'amelioration', label: 'Amélioration souhaitée', placeholder: 'Qu\'est-ce qui doit changer après ?' },
                            { field: 'population', label: 'Population concernée', placeholder: 'Profil des enseignants visés...' },
                          ].map(cfg => (
                            <div key={cfg.field} className="space-y-1.5">
                              <label className="text-xs font-bold text-gray-400 ml-1">{cfg.label}</label>
                              <textarea
                                className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-orange-50 focus:outline-none transition-all placeholder:text-gray-200 min-h-[80px]"
                                value={editValues.cdc?.[cfg.field] || ''}
                                placeholder={cfg.placeholder}
                                onChange={(e) => handleInputChange('cdc', { ...(editValues.cdc || {}), [cfg.field]: e.target.value })}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Section 3: Logistique & Budget */}
                        <div className="md:col-span-2 space-y-4">
                           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 flex items-center gap-2 ml-1">
                            <Landmark size={12} /> Organisation & Budget
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                              { field: 'organisation', label: 'Organisation', placeholder: 'Équipe, calendrier, intervenants...', icon: Briefcase },
                              { field: 'budget', label: 'Budget (Prévisionnel)', placeholder: 'Frais de déplacement, restauration...', icon: Landmark },
                              { field: 'modalites', label: 'Modalités', placeholder: 'Présentiel, Hybride, Atelier...', icon: Info },
                            ].map(cfg => (
                              <div key={cfg.field} className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-400 ml-1">{cfg.label}</label>
                                <textarea
                                  className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-emerald-50 focus:outline-none transition-all placeholder:text-gray-200 min-h-[100px]"
                                  value={editValues.cdc?.[cfg.field] || ''}
                                  placeholder={cfg.placeholder}
                                  onChange={(e) => handleInputChange('cdc', { ...(editValues.cdc || {}), [cfg.field]: e.target.value })}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                      <button onClick={cancelEdit} className="px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
                      <button 
                        onClick={() => saveEdit(form.id)}
                        className="px-10 py-2.5 text-sm font-bold text-white bg-[#2E75B6] hover:bg-[#1F3864] rounded-2xl shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5"
                      >
                        Appliquer les modifications
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showOpModal && (
        <SimpleInputModal
          title="Nouvel objectif pédagogique"
          subtitle="Décrivez l'objectif opérationnel à atteindre"
          placeholder="Ex : Être capable de différencier les supports..."
          isTextarea={true}
          onSave={(val) => addObjectif(showOpModal, val)}
          onClose={() => setShowOpModal(null)}
        />
      )}
    </div>
  );
}
