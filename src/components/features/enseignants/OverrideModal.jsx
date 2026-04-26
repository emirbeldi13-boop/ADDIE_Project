/**
 * OverrideModal — §2.2 Inspector Override (Absolute Priority)
 * Marks a teacher as top-priority with mandatory reason (dropdown + free text).
 */
import { useState } from 'react';
import { X, Star, AlertCircle } from 'lucide-react';
import { OVERRIDE_REASONS } from '../../../hooks/useDataStore';

export function OverrideModal({ enseignant, formations = {}, onSave, onClose }) {
  const [reason, setReason] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [scopeMode, setScopeMode] = useState('GLOBAL'); // 'GLOBAL' | 'SELECTIVE'
  const [selectedScopes, setSelectedScopes] = useState([]); // Array of formation IDs
  const [errors, setErrors] = useState({});

  function validate() {
    const errs = {};
    if (!reason) errs.reason = 'Motif obligatoire';
    if (reason === 'Cas spécial' && !reasonText.trim()) {
      errs.reasonText = 'Précision obligatoire pour "Cas spécial"';
    }
    if (scopeMode === 'SELECTIVE' && selectedScopes.length === 0) {
      errs.scopes = 'Veuillez sélectionner au moins une formation';
    }
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    
    const finalScopes = scopeMode === 'GLOBAL' ? ['GLOBAL'] : selectedScopes;
    onSave({ reason, reasonText, scopes: finalScopes });
  }

  function toggleScope(id) {
    setSelectedScopes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
    setErrors(e => ({ ...e, scopes: undefined }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-purple-600" fill="currentColor" />
            <h2 className="text-lg font-bold text-[#1F3864]">Priorité absolue — §2.2</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              <strong>{enseignant?.['Prénom']} {enseignant?.['Nom']}</strong> sera forcé en tête
              de liste pour les formations sélectionnées. Cette décision est
              horodatée et archivée.
            </div>
          </div>

          <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <label className="block text-[10px] font-black uppercase tracking-widest text-[#1F3864]/50">Périmètre de priorité</label>
            <div className="flex gap-2">
              <button
                onClick={() => setScopeMode('GLOBAL')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  scopeMode === 'GLOBAL' ? 'bg-[#1F3864] text-white shadow-md' : 'bg-white text-gray-400 hover:text-gray-600'
                }`}
              >
                Global (Toutes)
              </button>
              <button
                onClick={() => setScopeMode('SELECTIVE')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                  scopeMode === 'SELECTIVE' ? 'bg-[#1F3864] text-white shadow-md' : 'bg-white text-gray-400 hover:text-gray-600'
                }`}
              >
                Sélectif
              </button>
            </div>

            {scopeMode === 'SELECTIVE' && (
              <div className="grid grid-cols-1 gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                {Object.values(formations).map(f => (
                  <label key={f.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-xl cursor-pointer hover:border-purple-200 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-purple-600 uppercase">{f.id}</span>
                      <span className="text-xs font-semibold text-gray-700">{f.libelle}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(f.id)}
                      onChange={() => toggleScope(f.id)}
                      className="w-4 h-4 accent-purple-600"
                    />
                  </label>
                ))}
                {errors.scopes && (
                  <p className="text-[10px] text-red-500 font-bold px-1">{errors.scopes}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Motif de priorité <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {OVERRIDE_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => { setReason(r); setErrors(e => ({ ...e, reason: undefined })); }}
                    className="accent-purple-600"
                  />
                  <span className={`text-sm ${reason === r ? 'text-purple-700 font-medium' : 'text-gray-600 group-hover:text-gray-800'}`}>
                    {r}
                  </span>
                </label>
              ))}
            </div>
            {errors.reason && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.reason}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Précision / commentaire libre
              {reason === 'Cas spécial' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={reasonText}
              onChange={e => setReasonText(e.target.value)}
              rows={3}
              placeholder="Détaillez la situation…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            {errors.reasonText && (
              <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                <AlertCircle size={11} /> {errors.reasonText}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100">
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Star size={14} fill="currentColor" /> Marquer prioritaire
          </button>
        </div>
      </div>
    </div>
  );
}
