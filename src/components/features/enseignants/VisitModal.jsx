/**
 * VisitModal — §1.1 per-competency visit scoring
 * Records a new inspection visit with C1–C7 scores, weights, note /20, appreciation
 */
import { useState } from 'react';
import { X, Save, Calculator, AlertCircle, Star, Plus } from 'lucide-react';

import { computeVisitScore, validateVisitNote } from '../../../utils/scoreCalculator';

import { toISO as frToISO, isoToFR } from '../../../utils/dateUtils';

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

export function VisitModal({ enseignant, competences, onSave, onClose, addCompetence, existingVisit }) {
  const isEdit = !!existingVisit;
  const compKeys = Object.keys(competences || {});
  
  // Initialize scores and weights dynamically
  const [scores, setScores] = useState(() => {
    if (isEdit) return existingVisit.scores || {};
    return Object.fromEntries(compKeys.map(c => [c, null]));
  });
  
  const [weights, setWeights] = useState(() => {
    if (isEdit) return existingVisit.weights || {};
    const baseW = Math.floor(100 / (compKeys.length || 1));
    const rem = 100 - (baseW * compKeys.length);
    const initialWeights = Object.fromEntries(compKeys.map(c => [c, baseW]));
    if (compKeys.length > 0) initialWeights[compKeys[0]] += rem;
    return initialWeights;
  });

  const [note20, setNote20] = useState(isEdit ? (existingVisit.note20 ?? '') : '');
  const [date, setDate] = useState(() => {
    if (isEdit) return frToISO(existingVisit.date);
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [observer, setObserver] = useState(isEdit ? (existingVisit.observer || '') : 'Mohamed Amir Beldi');
  const [appreciation, setAppreciation] = useState(isEdit ? (existingVisit.appreciation || '') : '');
  const [visitType, setVisitType] = useState(isEdit ? (existingVisit.visitType || 'official') : 'official');
  const [finalized, setFinalized] = useState(isEdit ? (!!existingVisit.finalized) : false);
  const [errors, setErrors] = useState({});

  const isDisabled = isEdit && existingVisit.finalized;

  const handleVisitTypeChange = (val) => {
    setVisitType(val);
    if (val === 'informal') {
      setNote20(''); // Clear note for informal visits
    }
  };

  // ── Computed visit score (live) ────────────────────────────────────────────
  const computed = computeVisitScore(scores, weights);
  const noteValidation = validateVisitNote(note20);

  // Auto-normalize weights to 100%
  const totalWeight = Object.values(weights).reduce((s, w) => s + (parseFloat(w) || 0), 0);

  function setScore(comp, val) {
    setScores(prev => ({ ...prev, [comp]: val === '' ? null : parseInt(val) }));
  }

  function setWeight(comp, val) {
    setWeights(prev => ({ ...prev, [comp]: parseFloat(val) || 0 }));
  }

  function validate() {
    const errs = {};
    if (!date) errs.date = 'Date requise';
    if (!observer.trim()) errs.observer = 'Observateur requis';
    
    if (visitType === 'official') {
      if (!note20) {
        errs.note20 = 'La note /20 est obligatoire pour une visite officielle';
      } else if (!noteValidation.valid) {
        errs.note20 = noteValidation.error;
      }
    }

    if (computed.score === null) errs.scores = 'Au moins une compétence doit être notée';
    return errs;
  }

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const finalNoteValidation = validateVisitNote(note20);
    onSave({
      date: isoToFR(date),
      observer,
      scores,
      weights,
      visitScore: computed.score,
      partial: computed.partial,
      missingCompetencies: computed.missing,
      note20: finalNoteValidation.value,
      exceptional: finalNoteValidation.exceptional || false,
      appreciation,
      visitType,
      finalized,
    });
    onClose();
  }

  const isExceptional = noteValidation.value >= 16;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1F3864]">
               {isEdit ? (isDisabled ? 'Détails de la visite (Scellée)' : 'Modifier la visite') : 'Enregistrer une visite'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {enseignant?.['Prénom']} {enseignant?.['Nom']} — {enseignant?.['Nom du Lycée']}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* Meta */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Informations générales</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Date de la visite <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  disabled={isDisabled}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {errors.date && <p className="text-xs text-red-500 mt-0.5">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type de visite</label>
                <select
                  value={visitType}
                  onChange={e => handleVisitTypeChange(e.target.value)}
                  disabled={isDisabled}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="official">Officielle (Inspection)</option>
                  <option value="informal">Informelle (Accompagnement)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Observateur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={observer}
                  onChange={e => setObserver(e.target.value)}
                  disabled={isDisabled}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {errors.observer && <p className="text-xs text-red-500 mt-0.5">{errors.observer}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Note générale /20
                  {visitType === 'official' && <span className="text-red-500 ml-1">*</span>}
                  <span className="text-gray-400 font-normal ml-1">
                    {visitType === 'official' ? '(décimales .0 ou .5 uniquement)' : '(activé pour les visites officielles uniquement)'}
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    value={note20}
                    onChange={e => setNote20(e.target.value)}
                    placeholder="Ex: 14.5"
                    disabled={visitType === 'informal' || isDisabled}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      visitType === 'informal'
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100'
                        : errors.note20
                        ? 'border-red-300 focus:ring-red-200'
                        : isExceptional && note20
                        ? 'border-yellow-300 focus:ring-yellow-200'
                        : 'border-gray-200 focus:ring-[#2E75B6]/20'
                    }`}
                  />
                  {isExceptional && note20 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500" title="Note exceptionnelle ≥ 16/20">
                      <Star size={14} fill="currentColor" />
                    </span>
                  )}
                </div>
                {errors.note20 && visitType === 'official' && (
                  <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.note20}
                  </p>
                )}
                {isExceptional && note20 && (
                  <p className="text-xs text-yellow-600 mt-0.5">⭐ Note exceptionnelle (≥ 16/20)</p>
                )}
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Appréciation libre</label>
              <textarea
                value={appreciation}
                onChange={e => setAppreciation(e.target.value)}
                disabled={isDisabled}
                rows={3}
                placeholder="Points forts, axes d'amélioration, observations…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </section>

          {/* Per-competency scoring §1.1 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Scores par compétence RCET (§1.1)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Score 1–5 par compétence + poids. Les compétences non renseignées sont exclues du calcul.
                </p>
              </div>
              {computed.score !== null && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Score visite calculé</p>
                  <p className="text-xl font-bold text-[#2E75B6]">{computed.score}/5</p>
                  {computed.partial && (
                    <p className="text-xs text-orange-500">Score partiel</p>
                  )}
                </div>
              )}
            </div>

            {errors.scores && (
              <div className="mb-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle size={12} /> {errors.scores}
              </div>
            )}

            {/* Weight total indicator */}
            <div className={`flex items-center gap-2 mb-3 text-xs px-3 py-2 rounded-lg border ${
              Math.abs(totalWeight - 100) < 0.5
                ? 'bg-green-50 text-green-700 border-green-100'
                : 'bg-orange-50 text-orange-700 border-orange-100'
            }`}>
              <Calculator size={12} />
              Somme des poids : {totalWeight.toFixed(0)}%
              {Math.abs(totalWeight - 100) >= 0.5 && ' (auto-normalisé au calcul)'}
            </div>

            <div className="space-y-3">
              {compKeys.map(comp => (
                <div key={comp} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[#1F3864]">
                        {competences[comp] || comp}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Score 1-5 */}
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Score (1–5)</label>
                      <div className="flex gap-1">
                        {[null, 1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => !isDisabled && setScore(comp, v === null ? '' : String(v))}
                            disabled={isDisabled}
                            className={`w-9 h-9 rounded-lg text-xs font-semibold transition-colors ${
                              scores[comp] === v
                                ? (isDisabled ? 'bg-gray-400 text-white' : 'bg-[#2E75B6] text-white shadow-sm')
                                : v === null
                                ? 'bg-gray-200 text-gray-400 hover:bg-gray-300'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-[#2E75B6]'
                            } ${isDisabled ? 'cursor-not-allowed' : ''}`}
                            title={v === null ? 'Non renseigné' : `Score ${v}`}
                          >
                            {v === null ? '—' : v}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Weight */}
                    <div className="w-24">
                      <label className="block text-xs text-gray-500 mb-1">
                        Poids
                        <span className="ml-1 font-semibold text-[#1F3864]">
                          {totalWeight > 0 ? ((parseFloat(weights[comp]) || 0) / totalWeight * 100).toFixed(0) : '0'}%
                        </span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={weights[comp]}
                        onChange={e => setWeight(comp, e.target.value)}
                        disabled={isDisabled}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 disabled:bg-gray-50 disabled:text-gray-400"
                      />
                    </div>
                  </div>
                  {scores[comp] === null && (
                    <p className="text-xs text-gray-400 mt-1 italic">
                      Non renseigné — exclu du calcul
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Inline add-competence */}
            {addCompetence && (
              <AddCompInline
                onAdd={(code, label) => {
                  addCompetence(code, label);
                  setScores(prev => ({ ...prev, [code]: null }));
                  setWeights(prev => ({ ...prev, [code]: 0 }));
                }}
              />
            )}

            {/* Live score recap */}
            {computed.score !== null && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                  <Calculator size={16} className="text-[#2E75B6] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1F3864]">
                      Score visite calculé : <span className="text-[#2E75B6]">{computed.score}/5</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Calculé sur {compKeys.length - computed.missing.length}/{compKeys.length} compétences
                      {computed.partial && ' — ⚠ Score partiel (critères manquants)'}
                    </p>
                    {computed.missing.length > 0 && (
                      <p className="text-xs text-orange-600 mt-0.5">
                        Manquants : {computed.missing.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-[#2E75B6]">{computed.score}</span>
                    <span className="text-sm text-gray-400">/5</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <p className="text-xs text-gray-400">
            L'historique complet est conservé — aucune donnée n'est écrasée (§5.1)
          </p>
          <div className="flex items-center gap-4">
             <label className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                finalized ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-600'
             } ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={finalized} 
                  onChange={e => setFinalized(e.target.checked)} 
                  disabled={isDisabled}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs font-bold leading-none">
                  Confirmer la visite (Rapport envoyé au ministère)
                </span>
             </label>

             <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
              >
                {isDisabled ? 'Fermer' : 'Annuler'}
              </button>
              {!isDisabled && (
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2E75B6] text-white rounded-lg hover:bg-[#1F3864] transition-colors"
                >
                  <Save size={14} /> {isEdit ? 'Enregistrer les modifications' : 'Enregistrer la visite'}
                </button>
              )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
