import { Save, Plus, Trash2, Wifi, Volume2, Power, FileText, Coffee, Accessibility, Layout, Monitor, Projector, Tv, Wind, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LOGISTICS_LABELS } from '../../../constants/logistics';

const CIRCO_COLORS = { Kef: '#0E6655', Béja: '#2E75B6', Jendouba: '#4A235A' };
const GET_COLOR = (c) => CIRCO_COLORS[c] || '#6B7280';

export function CrefocsManager({ crefocs, saveAllCrefocs }) {
  const [localCrefocs, setLocalCrefocs] = useState(crefocs);
  const [saved, setSaved] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCirco, setNewCirco] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync with store if it changes externally
  useEffect(() => {
    setLocalCrefocs(crefocs);
    setHasChanges(false);
  }, [crefocs]);

  function update(circo, field, value) {
    const next = { ...localCrefocs, [circo]: { ...localCrefocs[circo], [field]: value } };
    setLocalCrefocs(next);
    setHasChanges(true);
    setSaved(false);
  }

  function updateLogistics(circo, key, value) {
    const currentLog = localCrefocs[circo].logistics || {};
    const nextLog = { ...currentLog, [key]: value };
    update(circo, 'logistics', nextLog);
  }

  function save() {
    saveAllCrefocs(localCrefocs);
    setHasChanges(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleAdd() {
    if (!newCirco.trim()) return;
    const circo = newCirco.trim();
    const next = {
      ...localCrefocs,
      [circo]: {
        nom: `CREFOC ${circo}`,
        lieu: '',
        contact: '',
        adresse: '',
        note: '',
        confirmed: false,
        places: 20,
        logistics: {}
      }
    };
    setLocalCrefocs(next);
    setNewCirco('');
    setIsAdding(false);
    // Persist structural change immediately
    saveAllCrefocs(next);
    setHasChanges(false);
  }

  function handleDelete(circo) {
    if (window.confirm(`Supprimer le CREFOC ${circo} ? \n\nCette action supprimera également ce choix dans tous les filtres regional.`)) {
      const next = { ...localCrefocs };
      delete next[circo];
      setLocalCrefocs(next);
      saveAllCrefocs(next);
      setHasChanges(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1F3864]">Unités Régionales (CREFOC)</h3>
          <p className="text-xs text-gray-400">Coordonnées, logistique et capacités d'accueil par circonscription</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
          >
            <Plus size={14} className="text-[#2E75B6]" /> Nouveau CREFOC
          </button>
          <button
            onClick={save}
            className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm ${
              saved 
                ? 'bg-green-500 text-white' 
                : hasChanges
                  ? 'bg-orange-500 text-white animate-pulse hover:bg-orange-600 active:scale-95'
                  : 'bg-[#2E75B6] text-white hover:bg-[#1F3864] active:scale-95'
            }`}
          >
            <Save size={14} /> {saved ? 'Enregistré !' : hasChanges ? 'Enregistrer les modifications' : 'Enregistrer tout'}
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <input
            autoFocus
            className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20"
            placeholder="Nom de la circonscription (ex: Siliana)..."
            value={newCirco}
            onChange={e => setNewCirco(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} className="bg-[#2E75B6] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1F3864]">Ajouter</button>
          <button onClick={() => setIsAdding(false)} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.entries(localCrefocs).map(([circo, cfg]) => (
          <div key={circo} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
            <div className="h-1.5" style={{ backgroundColor: GET_COLOR(circo) }} />
            <div className="p-5 flex flex-col md:flex-row gap-6">
              {/* Left Column: Coordinates */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-[#1F3864] text-lg">{circo}</h4>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${cfg.confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {cfg.confirmed ? 'Confirmé' : 'À valider'}
                    </div>
                    <button onClick={() => handleDelete(circo)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {[
                  { field: 'nom', label: 'Nom du CREFOC' },
                  { field: 'lieu', label: 'Lieu de formation principal' },
                  { field: 'contact', label: 'Contact / Responsable' },
                  { field: 'adresse', label: 'Adresse complète' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 px-1">{label}</label>
                    <input
                      className="w-full border border-gray-100 bg-gray-50/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 transition-all placeholder:text-gray-300"
                      value={cfg[field] || ''}
                      onChange={e => update(circo, field, e.target.value)}
                    />
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 px-1">Nombre de places</label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 transition-all"
                      value={cfg.places || 20}
                      onChange={e => update(circo, 'places', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={cfg.confirmed}
                        onChange={e => update(circo, 'confirmed', e.target.checked)}
                        className="w-4 h-4 accent-[#2E75B6] rounded"
                      />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Confirmé</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 px-1">Notes internes</label>
                  <textarea
                    className="w-full border border-gray-100 bg-gray-50/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 transition-all min-h-[60px] resize-none"
                    value={cfg.note || ''}
                    onChange={e => update(circo, 'note', e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Logistics */}
              <div className="w-full md:w-64 space-y-3">
                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">Équipements & Logistique</h5>
                <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-3 grid grid-cols-1 gap-1.5">
                  {Object.entries(LOGISTICS_LABELS).map(([key, { label, icon: Icon }]) => (
                    <label key={key} className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer hover:bg-white transition-all group border border-transparent hover:border-gray-100">
                      <input
                        type="checkbox"
                        checked={cfg.logistics?.[key] || false}
                        onChange={e => updateLogistics(circo, key, e.target.checked)}
                        className="w-4 h-4 accent-[#2E75B6] rounded"
                      />
                      <Icon size={14} className={`${cfg.logistics?.[key] ? 'text-[#2E75B6]' : 'text-gray-300'} group-hover:scale-110 transition-transform`} />
                      <span className={`text-xs ${cfg.logistics?.[key] ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
