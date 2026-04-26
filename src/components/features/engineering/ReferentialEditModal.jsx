import { useState, useEffect } from 'react';
import { X, Save, Trash2, Info, Target, Briefcase, Plus, Minus, List } from 'lucide-react';

import { RCET_LABELS } from '../../../constants/competences';

export function ReferentialEditModal({ isOpen, onClose, onSave, onDelete, item, referential = {}, mode = 'edit' }) {
  const [formData, setFormData] = useState({
    id: '',
    libelle: '',
    family: 'Didactique',
    targetedComps: [],
    prerequisites: [],
    objectifs: [],
    ipf: 3
  });
  const [hoveredRC, setHoveredRC] = useState(null);
  const [newObj, setNewObj] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        targetedComps: item.targetedComps || [],
        prerequisites: item.prerequisites || [],
        objectifs: item.objectifs || [],
        ipf: item.ipf || 3
      });
    } else {
      setFormData({
        id: `REF${Date.now()}`,
        libelle: '',
        family: 'Didactique',
        targetedComps: [],
        prerequisites: [],
        objectifs: [],
        ipf: 3
      });
    }
  }, [item, isOpen]);

  const addObjectif = () => {
    if (!newObj.trim()) return;
    setFormData({
      ...formData,
      objectifs: [...formData.objectifs, { id: `OP${formData.objectifs.length + 1}`, libelle: newObj.trim() }]
    });
    setNewObj('');
  };

  const removeObjectif = (idx) => {
    const next = formData.objectifs.filter((_, i) => i !== idx);
    setFormData({ ...formData, objectifs: next });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-12 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1F3864] to-[#2E75B6] p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Target size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black italic uppercase tracking-tighter">
                Ingénierie du Module de Formation
              </h3>
              <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest opacity-80">
                Conception détaillée du référentiel et des cibles pédagogiques
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT: Config (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Titre de la Formation</label>
                  <textarea 
                    value={formData.libelle}
                    onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
                    placeholder="Ex: Maîtrise des outils numériques..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold text-[#1F3864] focus:bg-white focus:border-blue-300 transition-all outline-none min-h-[80px] shadow-inner"
                  />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Famille Métier</label>
                    <select 
                      value={formData.family}
                      onChange={(e) => setFormData({ ...formData, family: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-xs font-bold text-[#1F3864] focus:bg-white transition-all outline-none"
                    >
                      {['Linguistique', 'Didactique', 'Ingénierie', 'Évaluation', 'Inclusion', 'Numérique', 'Professionnel'].map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Priorité (IPF)</label>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
                      <input 
                        type="range" min="1" max="5" step="1"
                        value={formData.ipf}
                        onChange={(e) => setFormData({ ...formData, ipf: parseInt(e.target.value) })}
                        className="flex-1 accent-[#1F3864]"
                      />
                      <span className="text-sm font-black text-[#1F3864] w-4">{formData.ipf}</span>
                    </div>
                 </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Objectifs Pédagogiques (OPP)</label>
                  <div className="space-y-2">
                    {formData.objectifs.map((obj, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 group">
                        <List size={14} className="text-gray-300" />
                        <span className="text-xs font-bold text-[#1F3864] flex-1">{obj.libelle}</span>
                        <button onClick={() => removeObjectif(i)} className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Minus size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input 
                        value={newObj}
                        onChange={(e) => setNewObj(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addObjectif()}
                        placeholder="Ajouter un objectif pédagogique (OPP)..."
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-[#1F3864] outline-none focus:border-blue-400"
                      />
                      <button onClick={addObjectif} className="p-2 bg-[#1F3864] text-white rounded-xl hover:bg-blue-600 transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
               </div>

               <div className="p-6 bg-blue-50 rounded-[32px] border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Info size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Aide à l'ingénierie</span>
                  </div>
                  <p className="text-[10px] font-bold text-blue-700/80 leading-relaxed">
                    {hoveredRC 
                      ? `La compétence ${hoveredRC} (${RCET_LABELS[hoveredRC]}) sera associée à ce module pour le diagnostic territorial.`
                      : "Définissez les cibles RCET et les prérequis pour optimiser le séquençage automatisé du plan de formation."}
                  </p>
               </div>
            </div>

            {/* RIGHT: Matrix (7 cols) */}
            <div className="lg:col-span-7 space-y-8">
               {/* Competencies Matrix */}
               <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cibles Pédagogiques (RCET)</label>
                    <span className="text-[9px] font-black text-[#1F3864] bg-gray-100 px-3 py-1 rounded-full uppercase tracking-tighter">
                      {formData.targetedComps?.length || 0} / 12 cibles
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(RCET_LABELS).map(([rc, label]) => {
                      const isActive = formData.targetedComps?.includes(rc);
                      return (
                        <button
                          key={rc}
                          onMouseEnter={() => setHoveredRC(rc)}
                          onMouseLeave={() => setHoveredRC(null)}
                          onClick={() => {
                            const current = formData.targetedComps || [];
                            const next = isActive ? current.filter(c => c !== rc) : [...current, rc];
                            setFormData({ ...formData, targetedComps: next });
                          }}
                          className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all border group ${
                            isActive 
                              ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md' 
                              : 'bg-white text-[#1F3864] border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black transition-colors ${
                            isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                          }`}>
                            {rc}
                          </div>
                          <span className={`text-[10px] font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-600'}`}>
                            {label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
               </div>

               {/* Prerequisites selection */}
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Prérequis du Séquençage</label>
                  <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto p-2 border border-gray-50 rounded-2xl bg-gray-50/50">
                    {Object.values(referential)
                      .filter(f => f.id !== formData.id)
                      .map(f => {
                        const isActive = formData.prerequisites?.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            onClick={() => {
                              const current = formData.prerequisites || [];
                              const next = isActive ? current.filter(p => p !== f.id) : [...current, f.id];
                              setFormData({ ...formData, prerequisites: next });
                            }}
                            className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                              isActive 
                                ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                : 'bg-white text-gray-500 border-gray-100 hover:border-amber-200'
                            }`}
                          >
                            {f.id} - {f.libelle}
                          </button>
                        );
                      })
                    }
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 flex items-center justify-between border-t border-gray-100">
          {mode === 'edit' && onDelete && (
            <button 
              onClick={() => {
                if (window.confirm('Supprimer définitivement ce module ?')) {
                  onDelete(formData.id);
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
            <button 
              onClick={onClose}
              className="px-6 py-4 text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={() => {
                if (!formData.libelle) return alert('Le titre est requis');
                onSave(formData);
                onClose();
              }}
              className="flex items-center gap-2 px-8 py-4 bg-[#1F3864] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2E75B6] hover:scale-105 transition-all shadow-xl shadow-[#1F3864]/20"
            >
              <Save size={14} /> {mode === 'create' ? 'Créer le Module' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
