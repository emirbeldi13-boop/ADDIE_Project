import { useState, useMemo } from 'react';
import { 
  X, Save, Trash2, 
  Sparkles, Target, 
  Layers, CheckCircle2,
  AlertCircle, Info,
  Wand2, FileText, Link, Clock
} from 'lucide-react';
import { RESOURCE_TYPES } from '../../../constants/pedagogicalMethods';

export function ResourceEditModal({ resource, session, onSave, onClose, onDelete }) {
  const [formData, setFormData] = useState({
    title: resource?.title || '',
    type: resource?.type || 'PRESENTATION',
    status: resource?.status || 'BROUILLON', // BROUILLON, REVUE, FINAL
    description: resource?.description || '',
    deliverableUrl: resource?.deliverableUrl || '',
    linkedModules: resource?.linkedModules || []
  });

  const resourceTypes = Object.values(RESOURCE_TYPES);
  const selectedType = RESOURCE_TYPES[formData.type] || RESOURCE_TYPES.OTHER;

  const handleSave = () => {
    if (!formData.title.trim()) return;
    onSave({
      ...resource,
      ...formData,
      id: resource?.id || `RES_${Date.now()}`
    });
  };

  const toggleModule = (modId) => {
    setFormData(prev => {
      const exists = prev.linkedModules.includes(modId);
      const next = exists 
        ? prev.linkedModules.filter(id => id !== modId)
        : [...prev.linkedModules, modId];
      return { ...prev, linkedModules: next };
    });
  };

  const handleGenerateOutline = () => {
    // Mock AI Outline generation
    const outline = `CONTEXTE PÉDAGOGIQUE :
Basé sur les modules : ${formData.linkedModules.length} module(s) lié(s).

STRUCTURE SUGGÉRÉE :
1. Introduction & Rappel des Objectifs
2. Corps du sujet (Concepts clés)
3. Étude de cas / Mise en situation
4. Synthèse & Évaluation rapide

POINTS D'ATTENTION : 
- Assurer le lien avec la phase de Design.
- Inclure des visuels pour le type ${selectedType.label}.`;
    
    setFormData(prev => ({ ...prev, description: outline }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3864]/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-white relative">
        
        {/* Header */}
        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 bg-${selectedType.color}-50 text-${selectedType.color}-600 rounded-[20px] flex items-center justify-center shadow-sm`}>
              <selectedType.icon size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#1F3864] italic">Livrable Pédagogique</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Développement — {selectedType.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Nom de la ressource</label>
                <input 
                  autoFocus
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Support de cours PPT, Guide animateur..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-8 py-5 text-lg font-black text-[#1F3864] outline-none shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Type de Ressource</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-8 py-5 font-black text-[#1F3864] outline-none shadow-inner appearance-none cursor-pointer"
                  >
                    {resourceTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Statut de Production</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-8 py-5 font-black text-[#1F3864] outline-none shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="BROUILLON">🟠 Brouillon</option>
                    <option value="REVUE">🔵 En Revue</option>
                    <option value="FINAL">🟢 Finalisé / Prêt</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between ml-4 mr-4">
                  <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest">Description / Outline du contenu</label>
                  <button 
                    onClick={handleGenerateOutline}
                    className="flex items-center gap-2 text-[9px] font-black text-indigo-600 uppercase hover:text-indigo-800 transition-colors"
                  >
                    <Wand2 size={12} /> Suggérer un Outline
                  </button>
                </div>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Structure du document, points clés à aborder..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[32px] p-8 text-sm font-bold text-[#1F3864] outline-none min-h-[220px] resize-none shadow-inner leading-relaxed"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Lien vers le livrable (Cloud / Drive)</label>
                <div className="relative">
                  <input 
                    type="text"
                    value={formData.deliverableUrl}
                    onChange={(e) => setFormData({ ...formData, deliverableUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-8 py-5 font-black text-[#1F3864] outline-none shadow-inner pr-16"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300">
                    <Link size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar: Module Linking */}
            <div className="space-y-8">
              <div className="bg-blue-50/50 p-8 rounded-[40px] border border-blue-100 space-y-6">
                <div className="flex items-center gap-3">
                  <Layers size={20} className="text-blue-600" />
                  <h3 className="text-xs font-black text-[#1F3864] uppercase tracking-widest">Alignement Design</h3>
                </div>
                <p className="text-[10px] font-bold text-blue-400/80 leading-relaxed italic">Cochez les modules du Design couverts par cette ressource.</p>
                
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {(session.modules || []).length > 0 ? (
                    (session.modules || []).map((mod) => (
                      <button 
                        key={mod.id}
                        onClick={() => toggleModule(mod.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 group ${formData.linkedModules.includes(mod.id) ? 'bg-[#1F3864] border-[#1F3864] text-white shadow-lg' : 'bg-white border-white/50 text-gray-400 hover:border-blue-200'}`}
                      >
                        <div className={`mt-0.5 p-1 rounded-md transition-colors ${formData.linkedModules.includes(mod.id) ? 'bg-blue-400/30' : 'bg-gray-100'}`}>
                          <CheckCircle2 size={12} className={formData.linkedModules.includes(mod.id) ? 'text-blue-200' : 'text-gray-300'} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black leading-tight uppercase tracking-widest">{mod.title}</span>
                          <span className={`text-[7px] font-bold uppercase mt-1 ${formData.linkedModules.includes(mod.id) ? 'text-blue-200' : 'text-gray-400'}`}>{mod.duration} min</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-10 text-center space-y-4">
                      <AlertCircle size={24} className="mx-auto text-gray-300" />
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Aucun module de design créé</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Insight Card */}
              <div className="bg-gray-50 p-8 rounded-[40px] space-y-4">
                 <div className="flex items-center gap-3 text-gray-400">
                    <Clock size={16} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Temps de production</span>
                 </div>
                 <p className="text-[11px] font-bold text-[#1F3864] leading-relaxed italic">"Le développement moyen d'une ressource de type {selectedType.label} prend entre 2 et 4 heures d'ingénierie."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-gray-50 bg-gray-50/20 flex justify-between items-center">
          {onDelete && (
            <button 
              onClick={() => {
                if (window.confirm("Supprimer ce livrable ?")) {
                  onDelete(resource.id);
                  onClose();
                }
              }}
              className="px-8 py-4 bg-red-50 text-red-500 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 size={16} className="inline mr-2" /> Supprimer
            </button>
          )}
          <div className="flex gap-4 ml-auto">
            <button onClick={onClose} className="px-10 py-5 text-[#1F3864] font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-3xl transition-all">
              Annuler
            </button>
            <button 
              onClick={handleSave}
              className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-800 text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
            >
              <Save size={18} /> Enregistrer le Livrable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
