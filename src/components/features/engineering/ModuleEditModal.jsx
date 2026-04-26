import { useState, useMemo } from 'react';
import { 
  X, Save, Trash2, Clock, 
  Target, CheckCircle2,
  AlertCircle, Info
} from 'lucide-react';
import { METHOD_LIST, RESOURCE_TYPES } from '../../../constants/pedagogicalMethods';

export function ModuleEditModal({ module, session, onSave, onClose, onDelete }) {
  const [formData, setFormData] = useState({
    title: module?.title || '',
    duration: module?.duration || 60,
    method: module?.method || 'APPLICATIF',
    content: module?.content || '',
    activities: module?.activities || '',
    resources: module?.resources || '',
    linkedObjectives: module?.linkedObjectives || []
  });
  const [validationError, setValidationError] = useState(null);

  // ─── P0 FIX: Safeguard against undefined session (Master Mode) ───
  const smartObjectives = useMemo(() => {
    if (!session || !session.cdc) return [];
    try {
      const objs = JSON.parse(session.cdc.objectifs || '[]');
      return Array.isArray(objs) ? objs : [];
    } catch (e) {
      return [];
    }
  }, [session?.cdc?.objectifs]);

  // Extract linked pedagogical resources (Direct Heritage from Phase 3)
  const linkedResources = useMemo(() => {
    if (!session || !session.cdc) return [];
    const allResources = session.cdc.resources || [];
    return allResources.filter(res => res.linkedModules?.includes(module?.id));
  }, [session?.cdc?.resources, module?.id]);

  const handleSave = () => {
    if (!formData.title.trim()) {
      setValidationError('title');
      setTimeout(() => setValidationError(null), 2000);
      return;
    }
    if (formData.duration <= 0) {
      setValidationError('duration');
      setTimeout(() => setValidationError(null), 2000);
      return;
    }
    onSave({
      ...module,
      ...formData,
      id: module?.id || `MOD_${Date.now()}`
    });
  };

  const toggleObjective = (idx) => {
    setFormData(prev => {
      const exists = prev.linkedObjectives.includes(idx);
      const next = exists 
        ? prev.linkedObjectives.filter(i => i !== idx)
        : [...prev.linkedObjectives, idx];
      return { ...prev, linkedObjectives: next };
    });
  };

  const selectedMethod = METHOD_LIST.find(m => m.id === formData.method) || METHOD_LIST[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F3864]/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white relative">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${selectedMethod.classes.bg} ${selectedMethod.classes.text} rounded-2xl flex items-center justify-center shadow-sm`}>
              <selectedMethod.icon size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1F3864] italic">Configuration du Module</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Design Pédagogique — {selectedMethod.label}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Titre du module</label>
                <input 
                  autoFocus
                  type="text"
                  value={formData.title}
                  onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setValidationError(null); }}
                  placeholder="Ex: Atelier de mise en œuvre..."
                  className={`w-full bg-gray-50 border-2 focus:border-blue-100 rounded-2xl px-6 py-4 text-base font-black text-[#1F3864] outline-none shadow-inner transition-all ${
                    validationError === 'title' ? 'border-red-300 bg-red-50/30 animate-shake' : 'border-transparent'
                  }`}
                />
                {validationError === 'title' && (
                  <p className="text-[9px] font-bold text-red-500 ml-4 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle size={10} /> Le titre est obligatoire
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Durée estimée</label>
                  <div className="relative">
                    <input 
                      type="number"
                      min="1"
                      value={formData.duration}
                      onChange={(e) => { setFormData({ ...formData, duration: Math.max(0, parseInt(e.target.value) || 0) }); setValidationError(null); }}
                      className={`w-full bg-gray-50 border-2 focus:border-blue-100 rounded-2xl px-6 py-4 font-black text-[#1F3864] outline-none shadow-inner pr-16 transition-all ${
                        validationError === 'duration' ? 'border-red-300 bg-red-50/30 animate-shake' : 'border-transparent'
                      }`}
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-300 font-black text-xs uppercase">
                      <Clock size={14} /> min
                    </div>
                  </div>
                  {validationError === 'duration' && (
                    <p className="text-[9px] font-bold text-red-500 ml-4 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle size={10} /> La durée doit être positive
                    </p>
                  )}
                </div>

                {/* ─── Fix E: Method Picker placeholder label ─── */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Méthode Pédagogique</label>
                  <div className={`p-2 ${selectedMethod.classes.bg} rounded-2xl border ${selectedMethod.classes.border} shadow-inner`}>
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <selectedMethod.icon size={16} className={selectedMethod.classes.text} />
                      <span className={`text-xs font-black ${selectedMethod.classes.text}`}>{selectedMethod.label}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── Fix E: Method Grid Picker ─── */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Changer la méthode</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {METHOD_LIST.map(m => {
                    const isSelected = formData.method === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setFormData({ ...formData, method: m.id })}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          isSelected 
                            ? `${m.classes.bg} ${m.classes.border} ${m.classes.text} shadow-md ring-2 ${m.classes.ring}` 
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <m.icon size={16} />
                        <div>
                          <p className={`text-[9px] font-black uppercase tracking-wider ${isSelected ? m.classes.text : 'text-[#1F3864]'}`}>
                            {m.label.split('/')[0].trim()}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Activités & Déroulement</label>
                <textarea 
                  value={formData.activities}
                  onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
                  placeholder="Décrivez les exercices, débats ou travaux pratiques..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl p-6 text-sm font-bold text-[#1F3864] outline-none min-h-[120px] resize-none shadow-inner"
                />
              </div>

              {/* SECTION: DIRECT HERITAGE (DEVELOPMENT) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between ml-4">
                  <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest">Livrables de Développement</label>
                  <span className="text-[8px] font-black text-blue-400 uppercase bg-blue-50 px-2 py-0.5 rounded-full">Héritage Direct</span>
                </div>
                
                {linkedResources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {linkedResources.map(res => {
                      const typeInfo = RESOURCE_TYPES[res.type] || RESOURCE_TYPES.OTHER;
                      return (
                        <div key={res.id} className="bg-gray-50/50 border border-gray-100 p-3.5 rounded-xl flex items-center gap-3 group hover:bg-white hover:shadow-md transition-all">
                          <div className={`w-9 h-9 ${typeInfo.classes.bg} ${typeInfo.classes.text} rounded-lg flex items-center justify-center`}>
                            <typeInfo.icon size={16} />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-[#1F3864] leading-tight">{res.title}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">
                              {typeInfo.label} • <span className={res.status === 'FINAL' ? 'text-emerald-500' : 'text-orange-400'}>{res.status}</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-gray-50/30 border-2 border-dashed border-gray-100 p-5 rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-gray-300 italic">Aucun livrable formel lié. Définissez-les dans l'onglet 'Développement'.</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest ml-4">Logistique & Matériel spécifique</label>
                <textarea 
                  value={formData.resources}
                  onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                  placeholder="Marqueurs, post-its, configuration salle, accès spécifiques..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-2xl p-6 text-sm font-bold text-[#1F3864] outline-none min-h-[80px] resize-none shadow-inner"
                />
              </div>
            </div>

            {/* Sidebar: Objective Linking */}
            <div className="space-y-6">
              <div className="bg-indigo-50/50 p-6 rounded-[32px] border border-indigo-100 space-y-5">
                <div className="flex items-center gap-3">
                  <Target size={18} className="text-indigo-600" />
                  <h3 className="text-xs font-black text-[#1F3864] uppercase tracking-widest">Cibles SMART</h3>
                </div>
                <p className="text-[10px] font-bold text-indigo-400/80 leading-relaxed italic">Associez ce module aux objectifs de la phase d'analyse.</p>
                
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {smartObjectives.length > 0 ? (
                    smartObjectives.map((obj, idx) => (
                      <button 
                        key={idx}
                        onClick={() => toggleObjective(idx)}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-2.5 group ${formData.linkedObjectives.includes(idx) ? 'bg-[#1F3864] border-[#1F3864] text-white shadow-lg' : 'bg-white border-white/50 text-gray-500 hover:border-indigo-200'}`}
                      >
                        <div className={`mt-0.5 p-1 rounded-md transition-colors flex-shrink-0 ${formData.linkedObjectives.includes(idx) ? 'bg-indigo-400/30' : 'bg-gray-100'}`}>
                          <CheckCircle2 size={12} className={formData.linkedObjectives.includes(idx) ? 'text-indigo-200' : 'text-gray-300'} />
                        </div>
                        <span className="text-[10px] font-black leading-tight uppercase tracking-wide line-clamp-2">{obj.text || `Objectif #${idx+1}`}</span>
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center space-y-3">
                      <AlertCircle size={20} className="mx-auto text-gray-300" />
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Aucun objectif SMART trouvé</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Method Insight Card */}
              <div className="bg-gray-50 p-6 rounded-[32px] space-y-3">
                 <div className="flex items-center gap-2 text-gray-400">
                    <Info size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Guide de méthode</span>
                 </div>
                 <p className="text-[11px] font-bold text-[#1F3864] leading-relaxed italic">"{selectedMethod.description}"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-50 bg-gray-50/20 flex justify-between items-center">
          {onDelete && (
            <button 
              onClick={() => {
                if (window.confirm("Supprimer ce module ?")) {
                  onDelete(module.id);
                  onClose();
                }
              }}
              className="px-6 py-3.5 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
            >
              <Trash2 size={14} className="inline mr-2" /> Supprimer
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-8 py-4 text-[#1F3864] font-black text-xs uppercase tracking-widest hover:bg-gray-100 rounded-2xl transition-all">
              Annuler
            </button>
            <button 
              onClick={handleSave}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Save size={16} /> Enregistrer le Module
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
