/**
 * GlobalScoreCriteria — §2.7 Global Score for Tenured Teachers
 * 5 configurable criteria with direction (direct/inversed) and weight sliders.
 * Re-exported as Ponderations for backward compat with ParametresPage.
 */
import { RotateCcw, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { GLOBAL_CRITERIA_DEFAULT } from '../../../hooks/useDataStore';

function DirectionToggle({ direction, onChange }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => onChange('inversed')}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          direction === 'inversed'
            ? 'bg-red-100 text-red-700'
            : 'bg-white text-gray-400 hover:bg-gray-50'
        }`}
        title="Inversé — score bas = priorité haute (ex: note faible → à visiter en priorité)"
      >
        <TrendingDown size={12} /> Inversé
      </button>
      <button
        onClick={() => onChange('direct')}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          direction === 'direct'
            ? 'bg-green-100 text-green-700'
            : 'bg-white text-gray-400 hover:bg-gray-50'
        }`}
        title="Direct — valeur haute = priorité haute (ex: long délai = urgent)"
      >
        <TrendingUp size={12} /> Direct
      </button>
    </div>
  );
}

export function Ponderations({
  globalCriteria,
  updateGlobalCriterion,
  resetGlobalCriteria,
  globalTargetedComps,
  competences,
}) {
  const criteria = globalCriteria || GLOBAL_CRITERIA_DEFAULT;
  const active = criteria.filter(c => !c.disabled);
  const totalW = active.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);
  const isValid = Math.abs(totalW - 1.0) < 0.02;

  // Build a dynamic label for the autopos criterion
  const autoposLabel = (() => {
    const comps = globalTargetedComps;
    if (!comps || comps.length === 0) return 'Autopositionnement moyen (aucune compétence)';
    const names = comps.map(code =>
      competences?.[code] ? `${code}` : code
    );
    return `Autopositionnement moyen — ${names.join(', ')}`;
  })();

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <div className="flex items-start gap-2">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Score global titulaires — §2.7</p>
            <p className="text-xs mt-1 text-blue-700">
              Chaque critère est normalisé sur [0–5] par rapport à l'ensemble des titulaires, puis
              pondéré et orienté. <strong>Inversé</strong> = valeur basse → urgence haute (ex. note faible).
              <strong className="ml-1">Direct</strong> = valeur haute → urgence haute (ex. long délai).
              Toute modification recalcule les rangs instantanément.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#1F3864]">Critères de score global (titulaires)</h3>
            <p className="text-xs text-gray-400 mt-0.5">Poids en % · Direction · Activer/désactiver</p>
          </div>
          <button
            onClick={resetGlobalCriteria}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors hover:bg-gray-50"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>

        <div className="space-y-5">
          {criteria.map((c) => {
            const displayLabel = c.id === 'autopos' ? autoposLabel : c.label;
            return (
              <div
                key={c.id}
                className={`border rounded-xl p-4 transition-all ${
                  c.disabled ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Enable/disable toggle */}
                    <button
                      onClick={() => updateGlobalCriterion(c.id, { disabled: !c.disabled })}
                      className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                        c.disabled ? 'bg-gray-200' : 'bg-[#2E75B6]'
                      }`}
                      title={c.disabled ? 'Activer ce critère' : 'Désactiver ce critère'}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        c.disabled ? 'translate-x-0.5' : 'translate-x-5'
                      }`} />
                    </button>
                    <span className={`text-sm font-medium leading-snug ${c.disabled ? 'text-gray-400' : 'text-[#1F3864]'}`}>
                      {displayLabel}
                    </span>
                  </div>
                  <DirectionToggle
                    direction={c.direction}
                    onChange={(dir) => updateGlobalCriterion(c.id, { direction: dir })}
                  />
                </div>

                {!c.disabled && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Poids</span>
                      <span className="font-bold text-[#1F3864] bg-blue-50 px-2 py-0.5 rounded">
                        {(c.weight * 100).toFixed(0)}%
                        {totalW > 0 && (
                          <span className="text-gray-400 ml-1">
                            (effectif : {((c.weight / totalW) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.60}
                      step={0.01}
                      value={c.weight}
                      onChange={e => updateGlobalCriterion(c.id, { weight: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#2E75B6]"
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>0%</span>
                      <span>60%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total indicator */}
        <div className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-colors ${
          isValid ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-orange-50 text-orange-700 border border-orange-100'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${
            isValid ? 'bg-green-500' : 'bg-orange-500'
          }`}>
            {isValid ? '✓' : '~'}
          </div>
          <div>
            <p>Total configuré : {(totalW * 100).toFixed(0)}%</p>
            {!isValid && (
              <p className="text-xs opacity-80 mt-0.5">
                Les poids sont auto-normalisés au calcul — vous n'avez pas à forcer 100%.
              </p>
            )}
            {isValid && <p className="text-xs opacity-70 mt-0.5">Poids valides — recalcul instantané actif</p>}
          </div>
        </div>
      </div>

      {/* Scoring formula reminder */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Formule appliquée</h4>
        <code className="text-xs text-gray-700 block leading-relaxed">
          Pour chaque critère actif :<br />
          &nbsp;1. Normaliser valeur → [0–5] par rapport aux min/max de tous les titulaires<br />
          &nbsp;2. Appliquer direction : Inversé → 5 − valeur_normalisée<br />
          &nbsp;3. Multiplier par poids<br />
          global_score = Σ(valeur_orientée × poids) / Σ(poids_utilisés)
        </code>
      </div>
    </div>
  );
}
