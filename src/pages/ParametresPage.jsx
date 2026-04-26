import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { Ponderations } from '../components/features/parametres/Ponderations';
import { CrefocsManager } from '../components/features/parametres/CrefocsManager';
import { FormationsManager } from '../components/features/parametres/FormationsManager';
import { CompetencesManager } from '../components/features/parametres/CompetencesManager';
import { downloadCSV, downloadJSON } from '../utils/exportHelpers';
import {
  Download, GraduationCap, Award, MapPin,
  Database, HelpCircle, Clock, BarChart2, BookOpen, Users,
  RotateCcw, ChevronDown, Plus, AlertCircle,
} from 'lucide-react';
import { GLOSSAIRE, KIRKPATRICK_LEVELS } from '../constants/formations';
import { TEMPORAL_COEFFICIENTS_DEFAULT } from '../hooks/useDataStore';

const TABS = [
  { id: 'ponderations', label: 'Pondérations',   icon: BarChart2 },
  { id: 'availability', label: 'Disponibilités', icon: Users },
  { id: 'crefoc',       label: 'CREFOC',          icon: MapPin },
  { id: 'formations',   label: 'Formations',      icon: GraduationCap },
  { id: 'competences',  label: 'Compétences',     icon: Award },
  { id: 'export',       label: 'Export',           icon: Database },
  { id: 'glossaire',    label: 'Glossaire',        icon: HelpCircle },
];

// ─── Shared: inline add-competence mini-form ──────────────────────────────────
function AddCompetenceInline({ onAdd }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  function submit(e) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    const l = label.trim();
    if (!c) { setError('Code requis'); return; }
    if (!l) { setError('Libellé requis'); return; }
    onAdd(c, l);
    setCode(''); setLabel(''); setError('');
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 mt-4 pt-4 border-t border-gray-100 flex-wrap">
      <div>
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Code</label>
        <input
          value={code}
          onChange={e => { setCode(e.target.value); setError(''); }}
          placeholder="C8"
          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20"
        />
      </div>
      <div className="flex-1 min-w-40">
        <label className="block text-[10px] font-semibold text-gray-400 uppercase mb-1">Libellé</label>
        <input
          value={label}
          onChange={e => { setLabel(e.target.value); setError(''); }}
          placeholder="Ex : Différenciation pédagogique"
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20"
        />
      </div>
      <button
        type="submit"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2E75B6] text-white text-xs rounded-lg hover:bg-[#1F3864] transition-colors"
      >
        <Plus size={12} /> Ajouter
      </button>
      {error && <p className="w-full text-xs text-red-500 mt-1">{error}</p>}
    </form>
  );
}

// ─── Temporal Coefficients Panel ─────────────────────────────────────────────
function TemporalPanel({ temporalCoeffs, updateTemporalCoeffs, resetTemporalCoeffs }) {
  const labels = ['Visite N (plus récente)', 'Visite N-1', 'Visite N-2', 'Visites plus anciennes'];

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold">Coefficients temporels — §1.2</p>
        <p className="text-xs mt-1 text-blue-700">
          Pondèrent les visites par ancienneté : la plus récente a le plus de poids.
          <br />
          <code className="bg-blue-100 px-1 rounded">
            score_final = Σ(score_visite × coeff) / Σ(coeffs)
          </code>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1F3864]">Coefficients (plus récent → plus ancien)</h3>
          <button
            onClick={resetTemporalCoeffs}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
          >
            <RotateCcw size={12} /> Réinitialiser
          </button>
        </div>
        {temporalCoeffs.map((coeff, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span className="font-medium">
                {labels[i] || `Visite N-${i} (ancienne)`}
              </span>
              <span className="font-bold text-[#1F3864] bg-blue-50 px-2 py-0.5 rounded">
                ×{coeff.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={coeff}
              onChange={e => {
                const next = [...temporalCoeffs];
                next[i] = parseFloat(e.target.value);
                updateTemporalCoeffs(next);
              }}
              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#2E75B6]"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>×0.0</span>
              <span>×1.0</span>
            </div>
          </div>
        ))}
        <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          Défaut : {TEMPORAL_COEFFICIENTS_DEFAULT.join(' → ')}
        </div>
      </div>
    </div>
  );
}

// ─── Formation Weights Panel ───────────────────────────────────────────────────
function FormationWeightsPanel({ groupWeights, updateGroupWeights }) {
  const wa = groupWeights?.autopos ?? 0.40;
  const wo = groupWeights?.obs ?? 0.60;
  const total = wa + wo;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold">Poids Groupe B & Score Formation — §2.6 / §2.8</p>
        <p className="text-xs mt-1 text-blue-700">
          Appliqués aux stagiaires visités (Groupe B) et aux scores formation-specific.
          <br />
          <code className="bg-blue-100 px-1 rounded">
            score = autopos × {(wa * 100 / total).toFixed(0)}% + obs_temporel × {(wo * 100 / total).toFixed(0)}%
          </code>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-6">
        <h3 className="text-sm font-semibold text-[#1F3864]">Réglages Stagiaires (Groupe A/B)</h3>
        
        <div className="space-y-4">
          <label className="block text-xs font-medium text-gray-700">Pondération autopos / observation</label>
          {[
            { key: 'autopos', label: 'Autopositionnement', val: wa },
            { key: 'obs', label: 'Score observation temporel (§1.2)', val: wo },
          ].map(({ key, label, val }) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span className="font-medium">{label}</span>
                <span className="font-bold text-[#1F3864] bg-blue-50 px-2 py-0.5 rounded">
                  {((val / total) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={val}
                onChange={e => {
                  const newVal = parseFloat(e.target.value);
                  const updates = key === 'autopos' 
                    ? { autopos: newVal, obs: 1 - newVal } 
                    : { autopos: 1 - newVal, obs: newVal };
                  updateGroupWeights({ ...groupWeights, ...updates });
                }}
                className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#2E75B6]"
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="block text-xs font-semibold text-[#1F3864]">Sens du score (Urgence)</label>
              <p className="text-[10px] text-gray-500">Définit comment la capacité influe sur la priorité</p>
            </div>
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => updateGroupWeights({ ...groupWeights, direction: 'inversed' })}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  groupWeights?.direction === 'inversed' ? 'bg-white text-[#2E75B6] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Inversé
              </button>
              <button
                onClick={() => updateGroupWeights({ ...groupWeights, direction: 'direct' })}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                  groupWeights?.direction === 'direct' ? 'bg-white text-[#2E75B6] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Direct
              </button>
            </div>
          </div>
          <div className="bg-gray-50 p-2 rounded-lg text-[10px] text-gray-600 italic">
            {groupWeights?.direction === 'inversed' 
              ? "⚠ Mode Inversé : Une faible note de compétence génère une HAUTE priorité (Urgence)."
              : "⭐ Mode Direct : Une note de compétence élevée génère une HAUTE priorité (Ex: sélection d'élite)."}
          </div>
        </div>

        <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
          Défaut : 40% autopos / 60% obs / Sens Inversé
        </div>
      </div>
    </div>
  );
}

// ─── Availability Management Panel ─────────────────────────────────────────────
function AvailabilityPanel({ enseignants, store }) {
  const [justifications, setJustifications] = useState({});

  const pending = [];
  const unavailable = [];

  enseignants.forEach(ens => {
    const avail = store.availability[ens['ID']];
    if (!avail) return;
    Object.entries(avail).forEach(([fcode, entry]) => {
      if (entry.declared) {
        if (entry.status === 'pending') pending.push({ ens, fcode, entry });
        else if (entry.status === 'validated') unavailable.push({ ens, fcode, entry });
      }
    });
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-sm text-yellow-800">
        <p className="font-semibold">Gestion des indisponibilités par formation — §2.1</p>
        <p className="text-xs mt-1 text-yellow-700">
          Les enseignants déclarant une indisponibilité pour une formation spécifique sont exclus de sa liste de priorisation.
          L'inspecteur doit valider ou rejeter chaque déclaration. Chaque décision est horodatée et archivée.
        </p>
      </div>

      {pending.length === 0 && unavailable.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
          Aucune déclaration d'indisponibilité enregistrée
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <h3 className="text-sm font-semibold text-yellow-700 flex items-center gap-2">
                <AlertCircle size={15} /> En attente de validation ({pending.length})
              </h3>
              {pending.map(({ ens, fcode, entry }) => {
                const key = `${ens['ID']}_${fcode}`;
                return (
                  <div key={key} className="border border-yellow-100 rounded-xl p-4 bg-yellow-50/50 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[#1F3864]">
                          {ens['Prénom']} {ens['Nom']} <span className="text-gray-500 font-normal">({fcode})</span>
                        </p>
                        <p className="text-xs text-gray-500">{ens['Nom du Lycée']} · {ens['Circonscription']}</p>
                        {entry.justification && (
                          <p className="text-xs text-gray-600 mt-1 italic">
                            Motif : "{entry.justification}"
                          </p>
                        )}
                      </div>
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                        En attente
                      </span>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Justification inspecteur (optionnel)"
                        value={justifications[key] || ''}
                        onChange={e => setJustifications(j => ({ ...j, [key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => store.validateAvailability(ens['ID'], fcode, 'validated', justifications[key] || '')}
                        className="flex-1 px-3 py-2 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        ✓ Valider indisponibilité (exclure)
                      </button>
                      <button
                        onClick={() => store.validateAvailability(ens['ID'], fcode, 'rejected', justifications[key] || '')}
                        className="flex-1 px-3 py-2 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        ✗ Rejeter (maintenir disponible)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unavailable.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h3 className="text-sm font-semibold text-red-700">Non disponibles validés ({unavailable.length})</h3>
              {unavailable.map(({ ens, fcode }) => (
                <div key={`${ens['ID']}_${fcode}`} className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {ens['Prénom']} {ens['Nom']} <span className="text-gray-400 font-normal">({fcode})</span>
                    </p>
                    <p className="text-xs text-gray-400">{ens['Nom du Lycée']} · {ens['Circonscription']}</p>
                  </div>
                  <button
                    onClick={() => store.clearAvailability(ens['ID'], fcode)}
                    className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                  >
                    Rétablir
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export function ParametresPage({ data, alertCount, loadedAt, onMenuOpen, store }) {
  const [tab, setTab] = useState('ponderations');

  return (
    <div>
      <Header
        title="Configuration & Référentiels"
        subtitle="Pondérations, temporalité, disponibilités, formations, compétences"
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
      />
      <Breadcrumb />

      <div className="px-4 md:px-6 pt-4 border-b border-gray-100 bg-white">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 md:px-5 py-3 text-xs md:text-sm font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-2 flex-shrink-0 ${
                tab === t.id
                  ? 'border-[#2E75B6] text-[#2E75B6] bg-blue-50/50'
                  : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {tab === 'ponderations' && (
          <div className="space-y-4">
            {/* Section 1: Score Global */}
            <details open className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors rounded-xl">
                <ChevronDown size={16} className="text-gray-400 transition-transform details-open:rotate-180 flex-shrink-0" />
                <BarChart2 size={16} className="text-[#2E75B6] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1F3864]">Score global titulaires — §2.7</p>
                  <p className="text-xs text-gray-400">5 critères pondérés avec direction direct/inversé</p>
                </div>
              </summary>
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <Ponderations
                  globalCriteria={store.globalCriteria}
                  updateGlobalCriterion={store.updateGlobalCriterion}
                  resetGlobalCriteria={store.resetGlobalCriteria}
                  globalTargetedComps={store.globalTargetedComps}
                  competences={store.competences}
                />
              </div>
            </details>

            {/* Section 1.5: Compétences Autopositionnement Global */}
            <details className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors rounded-xl">
                <ChevronDown size={16} className="text-gray-400 transition-transform details-open:rotate-180 flex-shrink-0" />
                <BookOpen size={16} className="text-[#2E75B6] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1F3864]">Autopositionnement global (Score A)</p>
                  <p className="text-xs text-gray-400">Compétences incluses dans le calcul de la moyenne globale</p>
                </div>
              </summary>
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <div className="space-y-3 max-w-2xl">
                  <p className="text-sm text-gray-600 mb-4">
                    Sélectionnez les compétences du référentiel qui seront utilisées pour calculer la note moyenne
                    d'autopositionnement (Groupe A et base Titulaires).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(store.competences).map(([code, label]) => {
                      const isChecked = store.globalTargetedComps.includes(code);
                      return (
                        <label key={code} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/50 border-[#2E75B6]/30' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...store.globalTargetedComps, code]
                                : store.globalTargetedComps.filter(c => c !== code);
                              store.updateGlobalTargetedComps(next);
                            }}
                            className="mt-1 flex-shrink-0 accent-[#2E75B6]"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{code}</p>
                            <p className="text-xs text-gray-500 leading-tight">{label}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  {store.globalTargetedComps.length === 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-xs text-red-700 animate-pulse">
                      <AlertCircle size={14} className="mt-0.5" />
                      <div>
                        <strong>Attention :</strong> Aucune compétence n'est sélectionnée. 
                        Le système utilisera <strong>toutes</strong> les compétences pour le calcul automatique (Mode sécurité).
                      </div>
                    </div>
                  )}

                  {/* Inline add-competence */}
                  <AddCompetenceInline
                    onAdd={(code, label) => {
                      store.addCompetence(code, label);
                      // Auto-check the new competence
                      if (!store.globalTargetedComps.includes(code)) {
                        store.updateGlobalTargetedComps([...store.globalTargetedComps, code]);
                      }
                    }}
                  />
                </div>
              </div>
            </details>

            {/* Section 2: Formation Weights */}
            <details className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors rounded-xl">
                <ChevronDown size={16} className="text-gray-400 transition-transform details-open:rotate-180 flex-shrink-0" />
                <BookOpen size={16} className="text-[#2E75B6] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1F3864]">Poids stagiaires visités — §2.6 / §2.8</p>
                  <p className="text-xs text-gray-400">Autopos vs. observation pour Groupe B</p>
                </div>
              </summary>
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <FormationWeightsPanel
                  groupWeights={store.groupWeights}
                  updateGroupWeights={store.updateGroupWeights}
                />
              </div>
            </details>

            {/* Section 3: Temporal Coefficients */}
            <details className="bg-white rounded-xl border border-gray-100 shadow-sm">
              <summary className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors rounded-xl">
                <ChevronDown size={16} className="text-gray-400 transition-transform details-open:rotate-180 flex-shrink-0" />
                <Clock size={16} className="text-[#2E75B6] flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#1F3864]">Coefficients temporels — §1.2</p>
                  <p className="text-xs text-gray-400">Pondération par ancienneté des visites</p>
                </div>
              </summary>
              <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                <TemporalPanel
                  temporalCoeffs={store.temporalCoeffs}
                  updateTemporalCoeffs={store.updateTemporalCoeffs}
                  resetTemporalCoeffs={store.resetTemporalCoeffs}
                />
              </div>
            </details>
          </div>
        )}
        {tab === 'availability' && (
          <AvailabilityPanel
            enseignants={data.enseignants}
            store={store}
          />
        )}
        {tab === 'crefoc' && (
          <CrefocsManager
            crefocs={store.crefocs}
            updateCrefoc={store.updateCrefoc}
            saveAllCrefocs={store.saveAllCrefocs}
          />
        )}
        {tab === 'formations' && (
          <FormationsManager
            formations={store.formations}
            competences={store.competences}
            updateFormation={store.updateFormation}
            addFormation={store.addFormation}
            deleteFormation={store.deleteFormation}
            updateObjectif={store.updateObjectif}
            addObjectif={store.addObjectif}
            deleteObjectif={store.deleteObjectif}
            addCompetence={store.addCompetence}
          />
        )}
        {tab === 'competences' && (
          <CompetencesManager
            competences={store.competences}
            updateCompetence={store.updateCompetence}
            addCompetence={store.addCompetence}
            deleteCompetence={store.deleteCompetence}
          />
        )}
        {tab === 'export' && (
          <div className="space-y-6 max-w-xl">
            {/* Full backup/restore */}
            <div>
              <h3 className="text-sm font-semibold text-[#1F3864] mb-2">Sauvegarde complète</h3>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-800 mb-3">
                <p className="font-semibold">Protection contre la perte de données</p>
                <p className="mt-1 text-blue-700">
                  Toutes les modifications admin (visites, surclassements, paramètres, etc.) sont stockées
                  dans le navigateur. Exportez régulièrement une sauvegarde pour éviter toute perte.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const keys = Object.keys(localStorage).filter(k => k.startsWith('pedagotrack_'));
                    const backup = {};
                    keys.forEach(k => { try { backup[k] = JSON.parse(localStorage.getItem(k)); } catch { backup[k] = localStorage.getItem(k); } });
                    backup._meta = { exportedAt: new Date().toISOString(), version: '1.0', keys: keys.length };
                    downloadJSON(backup, `pedagotrack_backup_${new Date().toISOString().slice(0,10)}.json`);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#2E75B6] text-white rounded-lg text-sm hover:bg-[#1F3864] transition-colors"
                >
                  <Download size={14} /> Exporter sauvegarde complète
                </button>
                <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-[#2E75B6] transition-colors cursor-pointer">
                  <RotateCcw size={14} className="text-[#2E75B6] flex-shrink-0" />
                  <span className="truncate">Importer une sauvegarde</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target.result);
                          if (!data._meta) { alert('Fichier de sauvegarde invalide'); return; }
                          const confirmed = window.confirm(
                            `Restaurer la sauvegarde du ${new Date(data._meta.exportedAt).toLocaleDateString('fr-FR')} ?\n` +
                            `${data._meta.keys} clés de données seront restaurées.\n\n` +
                            `⚠ Cela remplacera toutes les données actuelles.`
                          );
                          if (!confirmed) return;
                          Object.entries(data).forEach(([k, v]) => {
                            if (k === '_meta') return;
                            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
                          });
                          window.location.reload();
                        } catch (err) {
                          alert('Erreur de lecture du fichier : ' + err.message);
                        }
                      };
                      reader.readAsText(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Individual exports */}
            <div>
              <h3 className="text-sm font-semibold text-[#1F3864] mb-2">Export individuel</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Enseignants (CSV)', action: () => downloadCSV(data.enseignants, 'enseignants.csv') },
                  { label: 'Enseignants (JSON)', action: () => downloadJSON(data.enseignants, 'enseignants.json') },
                  { label: 'Sessions (CSV)', action: () => downloadCSV(data.sessions, 'sessions.csv') },
                  { label: 'Satisfaction N1 (CSV)', action: () => downloadCSV(data.satisfaction, 'satisfaction_n1.csv') },
                  { label: 'Acquis N2 (CSV)', action: () => downloadCSV(data.acquis, 'acquis_n2.csv') },
                  { label: 'Transfert N3 (CSV)', action: () => downloadCSV(data.transfert, 'transfert_n3.csv') },
                  { label: 'Triangulation besoins (CSV)', action: () => downloadCSV(data.triangulation, 'triangulation.csv') },
                  {
                    label: 'Journal d\'audit (JSON)',
                    action: () => downloadJSON(store.auditTrail, 'journal_audit.json'),
                  },
                ].map(({ label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-[#2E75B6] transition-colors"
                  >
                    <Download size={14} className="text-[#2E75B6] flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Données chargées le {loadedAt} · {data.enseignants.length} enseignants · {data.sessions.length} sessions
              </p>
            </div>

            {/* Corbeille — deleted teachers restore */}
            {store.ensDeleted && store.ensDeleted.length > 0 && (
              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-[#1F3864] mb-2">Corbeille — Enseignants supprimés</h3>
                <div className="space-y-2">
                  {store.ensDeleted.map(id => (
                    <div key={id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
                      <div>
                        <span className="text-sm font-mono text-gray-600">{id}</span>
                      </div>
                      <button
                        onClick={() => store.restoreEnseignant(id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        <RotateCcw size={12} /> Restaurer
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{store.ensDeleted.length} enseignant(s) supprimé(s) — cliquez sur Restaurer pour les récupérer</p>
              </div>
            )}

            {/* Danger zone */}
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-red-600 mb-2">Zone dangereuse</h3>
              <button
                onClick={() => {
                  if (window.confirm('⚠ Réinitialiser TOUTES les données admin ?\n\nCette action supprime toutes les modifications, visites, surclassements et paramètres.\n\nConseil : Exportez une sauvegarde d\'abord.')) {
                    store.resetAll();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <RotateCcw size={14} /> Réinitialiser toutes les données admin
              </button>
              <p className="text-xs text-gray-400 mt-1">Supprime toutes les modifications, visites, surclassements et paramètres sauvegardés.</p>
            </div>
          </div>
        )}
        {tab === 'glossaire' && (
          <div className="space-y-6 max-w-2xl">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs sm:text-sm text-amber-800">
              <strong>Règle UX non négociable :</strong> Aucune abréviation seule dans l'interface. Tout code est accompagné de son libellé complet ou d'un tooltip (délai : 300ms).
            </div>
            {[
              { title: 'Formations', items: Object.entries(store.formations).map(([k, v]) => [k, v.libelle]) },
              { title: 'Compétences RCET', items: Object.entries(store.competences) },
              { title: 'Niveaux Kirkpatrick', items: Object.entries(KIRKPATRICK_LEVELS) },
              { title: 'Autres abréviations', items: Object.entries(GLOSSAIRE) },
            ].map(({ title, items }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h4 className="text-sm font-semibold text-[#1F3864] mb-3">{title}</h4>
                <dl className="space-y-2">
                  {items.map(([code, label]) => (
                    <div key={code} className="flex gap-2 sm:gap-3 text-xs sm:text-sm">
                      <dt className="font-mono font-semibold text-[#2E75B6] w-14 sm:w-20 flex-shrink-0">{code}</dt>
                      <dd className="text-gray-600">{label}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
