/**
 * useDataStore — Central admin data store for PedagoTrack
 *
 * Strategy:
 *  - JSON files = seed / initial data (read-only source)
 *  - localStorage = admin overrides (add, edit, delete)
 *  - Merged result = what the app consumes
 *
 * localStorage keys (full list):
 *  pedagotrack_ens_edits          : { [ID]: partialRecord }
 *  pedagotrack_ens_added          : [ ...fullRecords ]
 *  pedagotrack_ens_deleted        : [ ...IDs ]
 *  pedagotrack_sessions_edits     : { [ID Session]: partial }
 *  pedagotrack_formations         : { F1: {...}, F2: {...}, F3: {...} }
 *  pedagotrack_competences        : { C1: label, ... }
 *  pedagotrack_crefocs            : { Kef: {...}, ... }
 *  pedagotrack_visits             : { [ensId]: [visitRecord, ...] }
 *  pedagotrack_overrides          : { [ensId]: { reason, reasonText, timestamp, active } }
 *  pedagotrack_availability       : { [ensId]: { declared, status, validatedAt, justification } }
 *  pedagotrack_audit_trail        : [ auditEntry, ... ]
 *  pedagotrack_temporal_coeffs    : [1.0, 0.6, 0.3, 0.1]
 *  pedagotrack_group_weights      : { autopos: 0.40, obs: 0.60 }
 *  pedagotrack_global_criteria    : [{ id, label, direction, weight, disabled }, ...]
 *  pedagotrack_formation_filter   : 'F1'|'F2'|'F3'|''
 *  pedagotrack_needs_decision     : { theme, competencies, comment, timestamp, validated }
 *  pedagotrack_needs_weights      : { deficit, studentImpact, feasibility }
 *  pedagotrack_autopos_manual     : { [ensId]: [ { scores, date, recordedAt } ] }
 *  pedagotrack_kp_edits          : { [`${ensId}_${formationId}`]: { level: 1|2|3, ...data } }
 */

import { useState, useCallback, useMemo } from 'react';
import { FORMATIONS as FORMATIONS_DEFAULT, COMPETENCES_RCET as COMPETENCES_DEFAULT } from '../constants/formations';
import { CATALOGUE_FORMATIONS } from '../constants/catalogue';
import {
  computeTemporalScore,
  computeVisitScore,
  computeAvgAutopos,
  computeGroupBScore,
  computeGlobalScoreTenured,
  normalizeToFive,
} from '../utils/scoreCalculator';
import { parseDate } from '../utils/dateUtils';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const CREFOC_LOGISTICS_DEFAULT = {
  internet: false,
  sonorisation: false,
  multiprises: false,
  papeterie: false,
  eau: false,
  pmr: false,
  tableau: true,
  interactif: false,
  videoproj: true,
  tv: false,
  clim: true,
  photocopieuse: false
};

const CREFOCS_DEFAULT = {
  Kef: {
    nom: 'CREFOC Kef',
    lieu: 'Salle pédagogique CRES Kef',
    contact: 'M. Mansour (Directeur)',
    adresse: 'Avenue Habib Bourguiba, Kef',
    note: 'Equipement complet',
    confirmed: true,
    places: 25,
    logistics: { ...CREFOC_LOGISTICS_DEFAULT, internet: true, interactif: true, multiprises: true }
  },
  Béja: {
    nom: 'CREFOC Béja',
    lieu: 'Lycée Pilote Béja',
    contact: 'Mme. Amel',
    adresse: 'Cité Olympique, Béja',
    note: 'Tableau blanc uniquement',
    confirmed: false,
    places: 20,
    logistics: { ...CREFOC_LOGISTICS_DEFAULT, internet: false, multiprises: true }
  },
  Jendouba: {
    nom: 'CREFOC Jendouba',
    lieu: 'CRES Jendouba',
    contact: 'Direction Régionale',
    adresse: 'Jendouba Centre',
    note: 'Connexion instable',
    confirmed: false,
    places: 18,
    logistics: { ...CREFOC_LOGISTICS_DEFAULT, internet: true, sonorisation: true }
  },
};

// §2.7 — 5 criteria for tenured global score
export const GLOBAL_CRITERIA_DEFAULT = [
  {
    id: 'autopos',
    label: 'Autopositionnement moyen (compétences ciblées)',
    direction: 'inversed',
    weight: 0.25,
    disabled: false,
  },
  {
    id: 'obs_temporal',
    label: 'Score observation temporel (§1.2)',
    direction: 'inversed',
    weight: 0.30,
    disabled: false,
  },
  {
    id: 'note_visite',
    label: "Note d'inspection /20",
    direction: 'inversed',
    weight: 0.20,
    disabled: false,
  },
  {
    id: 'delai_visite',
    label: 'Délai depuis dernière visite (mois)',
    direction: 'direct',
    weight: 0.20,
    disabled: false,
  },
  {
    id: 'anciennete',
    label: 'Ancienneté (années)',
    direction: 'direct',
    weight: 0.05,
    disabled: false,
  },
];

// §1.2 — temporal coefficients (most recent → oldest)
export const TEMPORAL_COEFFICIENTS_DEFAULT = [1.0, 0.6, 0.3, 0.1];

// §2.6 — Group B / formation score weights
export const GROUP_WEIGHTS_DEFAULT = { autopos: 0.40, obs: 0.60, direction: 'inversed' };

// §2.7 — targeted competencies per formation (Merging root families + sub-modules)
const FORMATION_TARGETS = {
  ...Object.fromEntries(Object.values(FORMATIONS_DEFAULT).map(f => [f.id, f.targetedComps])),
  ...Object.fromEntries(Object.values(CATALOGUE_FORMATIONS).map(f => [f.id, f.targetedComps]))
};
const DEFAULT_TARGETS = ["RC2", "RC3", "RC4", "RC5", "RC7"]; // Compétences socles par défaut

// Override reason options (§2.2)
export const OVERRIDE_REASONS = [
  'Cas pédagogique urgent',
  'Demande hiérarchique',
  'Rattrapage cycle précédent',
  'Fragilité professionnelle identifiée',
  'Cas spécial',
];

// ─── localStorage helpers ──────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Legacy date parse helper (replaced by unified parseDate in utils)
function parseDateWrapper(str) {
  return parseDate(str) || new Date(0);
}

/**
 * Business Logic: Calculate ARE date (J+42)
 * Returns DD/MM/YYYY format
 */
function calculateAREDate(sessionDateStr) {
  const d = parseDate(sessionDateStr);
  if (!d) return '—';
  const areDate = new Date(d);
  areDate.setDate(areDate.getDate() + 42);
  return `${String(areDate.getDate()).padStart(2, '0')}/${String(areDate.getMonth() + 1).padStart(2, '0')}/${areDate.getFullYear()}`;
}

// ─── Build min/max map for normalization across all tenured teachers ───────────
function buildMinMaxMap(titulaires, allVisits, autoData, temporalCoeffs, globalTargetedComps) {
  function vals(fn) {
    return titulaires.map(fn).filter(v => v !== null && v !== undefined && !isNaN(v));
  }

  const autoposVals = vals(e => computeAvgAutopos(autoData, e['ID'], globalTargetedComps));
  const obsVals = vals(e => {
    const visits = allVisits[e['ID']] || [];
    return computeTemporalScore(visits, temporalCoeffs);
  });
  const noteVals = vals(e => {
    const n = parseFloat(e['Note dernière visite /20']);
    return isNaN(n) ? null : n;
  });
  const delaiVals = vals(e => {
    const d = parseFloat(e['Délai depuis visite (mois)']);
    return isNaN(d) ? null : d;
  });
  const ancVals = vals(e => {
    const a = parseFloat(e['Ancienneté (ans)']);
    return isNaN(a) ? null : a;
  });

  function mm(arr) {
    if (!arr.length) return { min: 0, max: 5 };
    return { min: Math.min(...arr), max: Math.max(...arr) };
  }

  return {
    autopos: mm(autoposVals),
    obs_temporal: mm(obsVals),
    note_visite: mm(noteVals),
    delai_visite: mm(delaiVals),
    anciennete: mm(ancVals),
  };
}

// ─── Priority engine — builds enriched records with group/score/rank ───────────
function buildPriorityList(
  list,
  autoData,
  allVisits,
  overrides,
  availability,
  temporalCoeffs,
  groupWeights,
  globalCriteria,
  formationFilter,
  formationTargetsOverride,
  globalTargetedComps,
  autoposManual,
  crefocs // added to respect seats
) {
  const directTargets = formationFilter ? (formationTargetsOverride?.[formationFilter] || FORMATION_TARGETS[formationFilter]) : null;
  const isUnconfiguredFormation = formationFilter && (!directTargets || directTargets.length === 0);

  const targetedComps = formationFilter
    ? (directTargets || globalTargetedComps)
    : globalTargetedComps;

  // Merge manual autopos into seed data for calculations — OVERWRITE seed with manual
  const manualMap = {};
  Object.entries(autoposManual || {}).forEach(([ensId, entries]) => {
    const latest = entries[0];
    if (latest) {
      Object.entries(latest.scores).forEach(([comp, score]) => {
        if (score !== null) {
          manualMap[`${ensId}_${comp}`] = score;
        }
      });
    }
  });

  const mergedAutoData = autoData.map(a => {
    const key = `${a['ID Enseignant']}_${a['Compétence']}`;
    if (manualMap[key] !== undefined) {
      return { ...a, 'Score (1-5)': manualMap[key], 'Moment': 'Manual Update' };
    }
    return a;
  });

  const scoringDirection = groupWeights?.direction || 'inversed';

  // Also add any manual scores that don't exist in seed data
  Object.entries(manualMap).forEach(([key, score]) => {
    const [ensId, comp] = key.split('_');
    const exists = autoData.some(a => a['ID Enseignant'] === ensId && a['Compétence'] === comp);
    if (!exists) {
      mergedAutoData.push({
        'ID Enseignant': ensId,
        'Compétence': comp,
        'Score (1-5)': score,
        'Moment': 'Manual Update'
      });
    }
  });

  // Pre-index scores for each teacher for faster enrichment
  const scoresByEns = {};
  mergedAutoData.forEach(a => {
    const ensId = a['ID Enseignant'];
    if (!scoresByEns[ensId]) scoresByEns[ensId] = {};
    scoresByEns[ensId][a['Compétence']] = a['Score (1-5)'];
  });

  // Separate titulaires for normalization
  const titulaires = list.filter(e => e['Statut'] !== 'Stagiaire');
  const minMaxMap = buildMinMaxMap(titulaires, allVisits, mergedAutoData, temporalCoeffs, globalTargetedComps);

  // Enrich each teacher with priority data
  const enriched = list.map(ens => {
    const id = ens['ID'];
    const visits = allVisits[id] || [];
    const avail = availability[id] || null;

    // §2.1 — Unavailability (Per-formation)
    let availabilityStatus = 'available';
    if (avail) {
      if (formationFilter && avail[formationFilter]) {
        const fa = avail[formationFilter];
        if (fa.declared && fa.status === 'pending') availabilityStatus = 'pending';
        else if (fa.declared && fa.status === 'validated') availabilityStatus = 'unavailable';
        else if (fa.declared && fa.status === 'rejected') availabilityStatus = 'available';
      } else if (!formationFilter) {
        // Global view: aggregate
        const statuses = Object.values(avail).map(a => a?.status);
        if (statuses.includes('pending')) availabilityStatus = 'pending';
        else if (statuses.includes('validated')) availabilityStatus = 'unavailable';
      }
    }

    // §2.2 — Override (Support for multi-formation scopes)
    const override = overrides[id];
    const isOverridden = override?.active === true && (
      !formationFilter || // In global view, any active override shows as ⭐
      (override.scopes ?? []).includes('GLOBAL') || 
      (override.scopes ?? []).includes(formationFilter)
    );

    // Filter soft-deleted visits before any scoring
    const activeVisits = visits.filter(v => !v.deleted);

    // DYNAMIC SYNC: Last visit info from store (overrides seed data)
    const officialVisits = activeVisits.filter(v => v.visitType === 'official' && v.date);
    const sortedOfficial = [...officialVisits].sort((a, b) => parseDate(b.date) - parseDate(a.date));
    const latestOfficial = sortedOfficial[0];

    const today = new Date();
    const effectiveDate = latestOfficial ? latestOfficial.date : ens['Date dernière visite'];
    const effectiveNote = latestOfficial ? (latestOfficial.note20 ?? '—') : ens['Note dernière visite /20'];
    const effectiveObserver = latestOfficial ? (latestOfficial.observer ?? '—') : ens['Observateur'];

    let effectiveDelay = ens['Délai depuis visite (mois)'];
    if (effectiveDate && effectiveDate !== '—') {
      const d = parseDate(effectiveDate);
      if (d && !isNaN(d)) {
        // Dynamic calc in months
        effectiveDelay = (today.getFullYear() - d.getFullYear()) * 12 + (today.getMonth() - d.getMonth());
        if (effectiveDelay < 0) effectiveDelay = 0;
      }
    }

    // Temporal observation score (§1.2) — only non-deleted visits
    // We re-evaluate the score of each visit based on targetedComps if provided
    const visitsWithCustomScores = activeVisits.map(v => {
      if (targetedComps && targetedComps.length > 0) {
        const { score } = computeVisitScore(v.scores, {}, targetedComps);
        return { ...v, visitScore: score };
      }
      return { ...v, visitScore: v.visitScore || v.globalScore }; // Fallback to global
    });

    const temporalObsScore = computeTemporalScore(visitsWithCustomScores, temporalCoeffs);

    // Has at least one recorded visit (new visits store OR old data)
    const hasVisit = activeVisits.length > 0 || (effectiveDate && effectiveDate !== '—');

    // Autopositionnement on targeted competencies (using merged data)
    const avgAutoposScore = computeAvgAutopos(mergedAutoData, id, targetedComps);

    // UNIFIED URGENCY LOGIC
    let rawUrgencyScore = 0;

    // Compute score depending on group
    const isTrainee = ens['Statut'] === 'Stagiaire' || ens['Statut'] === 'Titulaire (en attente)';
    let priorityGroup, priorityScore, scoreInfo;

    if (availabilityStatus === 'unavailable') {
      priorityGroup = 'unavailable';
      priorityScore = 99;
      scoreInfo = null;
    } else if (isOverridden) {
      priorityGroup = 'override';
      priorityScore = -1; // always top
      scoreInfo = { score: null };
    } else if (isTrainee && !hasVisit) {
      // §2.5 — Group A: unvisited trainees
      priorityGroup = 'group-a';
      // Calculate Urgency
      const ability = avgAutoposScore ?? 5;
      rawUrgencyScore = scoringDirection === 'inversed' ? (5 - ability) : ability;
      
      priorityScore = 5 - rawUrgencyScore; // Sort key (0 is top)
      scoreInfo = { score: avgAutoposScore, rawUrgencyScore, type: 'group-a' };
    } else if (isTrainee && hasVisit) {
      // §2.6 — Group B: visited trainees
      const groupBScore = computeGroupBScore(avgAutoposScore, temporalObsScore, groupWeights);
      priorityGroup = 'group-b';
      
      // Calculate Urgency
      const ability = groupBScore ?? 5;
      rawUrgencyScore = scoringDirection === 'inversed' ? (5 - ability) : ability;

      priorityScore = 5 - rawUrgencyScore;
      scoreInfo = { score: groupBScore, rawUrgencyScore, type: 'group-b' };
    } else {
      // §2.7 — Tenured teachers
      const rawVals = {
        autopos: avgAutoposScore,
        obs_temporal: temporalObsScore,
        note_visite: effectiveNote !== '—' ? parseFloat(effectiveNote) : null,
        delai_visite: effectiveDelay !== '—' && effectiveDelay !== null ? parseFloat(effectiveDelay) : null,
        anciennete: ens['Ancienneté (ans)'] !== '—' ? parseFloat(ens['Ancienneté (ans)']) : null,
      };
      const result = computeGlobalScoreTenured(rawVals, globalCriteria, minMaxMap);
      priorityGroup = 'tenured';
      
      rawUrgencyScore = result.score || 0;
      priorityScore = 5 - rawUrgencyScore;
      scoreInfo = { ...result, rawUrgencyScore };
    }

    // Formation-specific score override (§2.8) — when filter is active
    let formationScore = null;
    if (formationFilter) {
      const obsOnTargeted = computeAvgAutopos(mergedAutoData, id, targetedComps);
      formationScore = computeGroupBScore(obsOnTargeted, temporalObsScore, groupWeights);
    }

    return {
      ...ens,
      // Overwrite static fields with dynamic ones for reactivity
      'Date dernière visite': effectiveDate,
      'Note dernière visite /20': effectiveNote,
      'Observateur': effectiveObserver,
      'Délai depuis visite (mois)': effectiveDelay,
      _isVisitEdited: !!latestOfficial,

      // New computed fields
      priorityGroup,
      priorityScore,
      scoreInfo,
      temporalObsScore,
      avgAutoposScore,
      hasVisit,
      visitCount: activeVisits.length,
      formationScore,
      availabilityStatus,
      isOverridden,
      overrideInfo: isOverridden ? override : null,
      scores: scoresByEns[id] || {},
    };
  });

  // ─── Sorting (§2.4) ────────────────────────────────────────────────────────
  // 1. Override (⭐) always top
  // 2. Group A (🔴) sorted by priorityScore ASC (lowest = most urgent)
  // 3. Group B (🟠) sorted by priorityScore ASC
  // 4. Tenured (⬜) sorted by priorityScore ASC
  // 5. Unavailable at bottom (or excluded from active list)

  const groupOrder = { 'override': 0, 'group-a': 1, 'group-b': 2, 'tenured': 3, 'unavailable': 4 };

  const sorted = [...enriched].sort((a, b) => {
    const ga = groupOrder[a.priorityGroup] ?? 5;
    const gb = groupOrder[b.priorityGroup] ?? 5;
    if (ga !== gb) return ga - gb;
    // Within group: ascending by priorityScore (lower = more urgent)
    const sa = a.priorityScore ?? 99;
    const sb = b.priorityScore ?? 99;
    return sa - sb;
  });

  // Assign priorityRank
  let rankCounter = 1;
  const result = sorted.map(e => {
    if (e.priorityGroup === 'unavailable') return { ...e, priorityRank: null };
    return { ...e, priorityRank: rankCounter++ };
  });

  // Also recompute per-circo rank for backward compat
  const circos = ['Kef', 'Béja', 'Jendouba'];
  circos.forEach(c => {
    const inCirco = result.filter(r => r['Circonscription'] === c && r.priorityGroup !== 'unavailable');
    inCirco.forEach((e, i) => {
      const idx = result.findIndex(r => r['ID'] === e['ID']);
      result[idx] = { ...result[idx], 'Rang circumscription': i + 1 };
    });
  });

  // Assign legacy recommandation
  result.forEach((e, i) => {
    let reco = 'À surveiller';
    if (e.priorityGroup === 'group-a') reco = 'Priorité Haute';
    if (e.priorityGroup === 'group-b') reco = 'Accompagnement';
    if (e.priorityGroup === 'tenured') reco = 'Maintenance';
    result[i] = { ...result[i], 'Recommandation': reco };
  });

  // §2.3 — Filter by CREFOC capacity if formation filter is active
  let finalResult = result;
  if (formationFilter) {
    const circoSeats = Object.fromEntries(
      Object.entries(crefocs).map(([circo, cfg]) => [circo, cfg.places || 20])
    );
    const circoCounts = {};
    finalResult = result.map(ens => {
      const circo = ens['Circonscription'];
      const isAvailable = ens.priorityGroup !== 'unavailable';
      if (isAvailable) {
        circoCounts[circo] = (circoCounts[circo] || 0) + 1;
      }
      const isSelected = isAvailable && circoCounts[circo] <= (circoSeats[circo] || 20);
      return { ...ens, isSelectedInCreFoc: isSelected };
    });
  }

  return {
    list: finalResult,
    isUnconfigured: isUnconfiguredFormation
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDataStore(seedEnseignants, seedSessions, seedAutopos = []) {
  // ── Enseignants base state ─────────────────────────────────────────────────
  const [ensEdits, setEnsEdits] = useState(() => load('pedagotrack_ens_edits', {}));
  const [ensAdded, setEnsAdded] = useState(() => load('pedagotrack_ens_added', []));
  const [ensDeleted, setEnsDeleted] = useState(() => load('pedagotrack_ens_deleted', []));
  const [ensHistory, setEnsHistory] = useState(() => load('pedagotrack_ens_history', {}));

  // ── Sessions state ─────────────────────────────────────────────────────────
  const [sessEdits, setSessEdits] = useState(() => load('pedagotrack_sessions_edits', {}));
  const [sessAdded, setSessAdded] = useState(() => load('pedagotrack_sess_added', []));
  const [sessDeleted, setSessDeleted] = useState(() => load('pedagotrack_sess_deleted', []));

  // ── Reference data ─────────────────────────────────────────────────────────
  const [formations, setFormations] = useState(() => {
    const loaded = load('pedagotrack_formations', null);
    const baseFormations = { ...FORMATIONS_DEFAULT, ...CATALOGUE_FORMATIONS };
    
    if (!loaded) return baseFormations;

    const merged = { ...baseFormations };
    let hasOrphans = false;
    
    Object.keys(loaded).forEach(k => {
      const current = loaded[k];
      const base = baseFormations[k];
      
      if (!base) {
        // If it's not in our official catalog or root families, it's an orphan/typo
        hasOrphans = true;
        return; // Skip this key (effectively deleting it)
      }

      const isLegacy = current.libelle?.includes('Scénarisation') || current.libelle?.includes('Différenciation');
      const isRootFamily = k.length <= 2; 
      
      if (isLegacy || isRootFamily) {
        merged[k] = {
          ...base,
          ...(isLegacy ? {} : current), 
          targetedComps: base.targetedComps || current.targetedComps || []
        };
      } else {
        merged[k] = {
          ...base,
          ...current,
          targetedComps: current.targetedComps || base.targetedComps || []
        };
      }
    });

    // If we removed something, we should ideally trigger a save, 
    // but returning merged is enough for the current session.
    return merged;
  });
  const [competences, setCompetences] = useState(() => {
    const loaded = load('pedagotrack_competences', null);
    // Migration forcée : si les anciennes compétences sont détectées, on bascule sur le RCET
    if (loaded && (loaded.C1 || loaded.C2)) {
      return COMPETENCES_DEFAULT;
    }
    return loaded || COMPETENCES_DEFAULT;
  });
  const [crefocs, setCrefocs] = useState(() => {
    const loaded = load('pedagotrack_crefocs', null);
    if (!loaded) return CREFOCS_DEFAULT;

    // Use loaded keys as the source of truth (respects deletions)
    // Use loaded keys as the source of truth
    const merged = { ...CREFOCS_DEFAULT };
    Object.keys(loaded).forEach(k => {
      merged[k] = loaded[k];
    });
    return merged;
  });
  const [globalTargetedComps, setGlobalTargetedComps] = useState(() => {
    const loaded = load('pedagotrack_global_targets', null);
    // Migration forcée pour les cibles globales
    if (loaded && loaded.some(c => c.startsWith('C'))) {
      return Object.keys(COMPETENCES_DEFAULT);
    }
    return loaded || Object.keys(COMPETENCES_DEFAULT);
  });

  // ── §1.2 New visits store (per-competency scoring) ─────────────────────────
  const [visits, setVisits] = useState(() => load('pedagotrack_visits', {}));

  // ── §2.2 Inspector overrides ───────────────────────────────────────────────
  const [overrides, setOverrides] = useState(() => load('pedagotrack_overrides', {}));

  // ── §2.1 Availability declarations ────────────────────────────────────────
  const [availability, setAvailability] = useState(() => load('pedagotrack_availability', {}));

  // ── §5.4 Audit trail ──────────────────────────────────────────────────────
  const [auditTrail, setAuditTrail] = useState(() => load('pedagotrack_audit_trail', []));

  // ── §1.2 Temporal coefficients ─────────────────────────────────────────────
  const [temporalCoeffs, setTemporalCoeffs] = useState(() =>
    load('pedagotrack_temporal_coeffs', TEMPORAL_COEFFICIENTS_DEFAULT)
  );

  // ── §2.6 Group score weights ───────────────────────────────────────────────
  const [groupWeights, setGroupWeights] = useState(() =>
    load('pedagotrack_group_weights', GROUP_WEIGHTS_DEFAULT)
  );

  // ── §2.7 Global score criteria ─────────────────────────────────────────────
  const [globalCriteria, setGlobalCriteria] = useState(() =>
    load('pedagotrack_global_criteria', GLOBAL_CRITERIA_DEFAULT)
  );

  // ── §2.8 Active formation filter ──────────────────────────────────────────
  const [formationFilter, setFormationFilterState] = useState(() =>
    load('pedagotrack_formation_filter', '')
  );

  // ── §3.1 Needs analysis decision ──────────────────────────────────────────
  const [needsDecision, setNeedsDecision] = useState(() =>
    load('pedagotrack_needs_decision', null)
  );
  const [needsWeights, setNeedsWeights] = useState(() =>
    load('pedagotrack_needs_weights', { deficit: 0.40, studentImpact: 0.35, feasibility: 0.25 })
  );

  const [riskThresholds, setRiskThresholds] = useState(() =>
    load('pedagotrack_risk_thresholds', { high: 70, medium: 40, urgency: 2.5 })
  );

  const [strategicMode, setStrategicMode] = useState(() => load('pedagotrack_strategic_mode', false));

  const [autoposManual, setAutoposManual] = useState(() => load('pedagotrack_autopos_manual', {}));

  // ── Kirkpatrick Dynamic Evaluations ───────────────────────────────────────
  const [kpEdits, setKpEdits] = useState(() => load('pedagotrack_kp_edits', {}));

  // ── Referential (Global Catalogue) ─────────────────────────────────────────
  const [referential, setReferential] = useState(() => {
    const loaded = load('pedagotrack_referential', null);
    if (!loaded) return CATALOGUE_FORMATIONS;
    
    // Merge or replace
    const merged = { ...CATALOGUE_FORMATIONS };
    Object.keys(loaded).forEach(k => {
      merged[k] = loaded[k];
    });
    return merged;
  });

  // ── Merged sessions ────────────────────────────────────────────────────────
  const sessions = useMemo(() => {
    // 1. Base sessions (from seed data) - Filtered by deletion with ID hardening
    const base = seedSessions
      .filter(s => {
        const id = s['ID Session'];
        return !sessDeleted.some(deletedId => String(deletedId).trim() === String(id).trim());
      })
      .map(s => {
        const edits = sessEdits[s['ID Session']];
        if (!edits) return s;
        
        const mergedCdc = (s.cdc || edits.cdc) ? {
          ...(s.cdc || {}),
          ...(edits.cdc || {})
        } : undefined;

        return { ...s, ...edits, cdc: mergedCdc, _isEdited: true };
      });
    
    // 2. Added sessions (manual) - Also apply Any edits
    const added = sessAdded.map(s => {
      const edits = sessEdits[s['ID Session']];
      if (!edits) return { ...s, _isEdited: true };

      const mergedCdc = (s.cdc || edits.cdc) ? {
        ...(s.cdc || {}),
        ...(edits.cdc || {})
      } : undefined;

      return { ...s, ...edits, cdc: mergedCdc, _isEdited: true };
    });

    return [...base, ...added];
  }, [seedSessions, sessEdits, sessDeleted, sessAdded]);

  // ── Merged enseignants (with priority computation) ─────────────────────────
  const priorityData = useMemo(() => {
    // Apply edits/adds/deletes
    const base = seedEnseignants
      .filter(e => !ensDeleted.includes(e['ID']))
      .map(e => {
        const edits = ensEdits[e['ID']];
        return edits ? { ...e, ...edits } : e;
      });

    const withAdded = [...base, ...ensAdded];

    // Build priority list with all new logic
    return buildPriorityList(
      withAdded,
      seedAutopos,
      visits,
      overrides,
      availability,
      temporalCoeffs,
      groupWeights,
      globalCriteria,
      formationFilter,
      Object.fromEntries(Object.values(formations).map(f => [
        f.id,
        f.targetedComps?.length
          ? f.targetedComps
          : [(f.competence || '').split(' ')[0]].filter(Boolean),
      ])),
      globalTargetedComps,
      autoposManual,
      crefocs
    );
  }, [
    seedEnseignants, ensEdits, ensAdded, ensDeleted,
    seedAutopos, visits, overrides, availability,
    temporalCoeffs, groupWeights, globalCriteria, formationFilter,
    formations, globalTargetedComps, autoposManual, crefocs
  ]);

  const enseignants = priorityData.list;
  const isUnconfiguredFormation = priorityData.isUnconfigured;

  // ── Kirkpatrick Merged Data (N1-N2-N3) ────────────────────────────────────
  // We pass seed data here to merge with manual overrides.
  // Rule: Only show evaluations if a session exists for that teacher/formation.
  const getMergedKirkpatrick = useCallback((satis = [], acqs = [], trans = []) => {
    const isValid = (ensId, fId) => {
      if (!sessions || !ensId || !fId) return false;
      return sessions.some(s => s['Formation'] === fId && s.inscrits?.includes(ensId));
    };

    const satisfaction = satis
      .filter(s => isValid(s['ID Ens'], s['Formation']))
      .map(s => {
        const key = `${s['ID Ens']}_${s['Formation']}_N1`;
        return kpEdits[key] ? { ...s, ...kpEdits[key], _isEdited: true } : s;
      });

    const acquis = acqs
      .filter(a => isValid(a['ID Ens'], a['Formation']))
      .map(a => {
        const key = `${a['ID Ens']}_${a['Formation']}_N2`;
        return kpEdits[key] ? { ...a, ...kpEdits[key], _isEdited: true } : a;
      });

    const transfert = trans
      .filter(t => isValid(t['ID Ens'], t['Formation']))
      .map(t => {
        const key = `${t['ID Ens']}_${t['Formation']}_N3`;
        return kpEdits[key] ? { ...t, ...kpEdits[key], _isEdited: true } : t;
      });

    // Handle new entries created entirely in the store (not in JSON)
    Object.entries(kpEdits).forEach(([key, value]) => {
      const [ensId, fId, level] = key.split('_');
      if (!isValid(ensId, fId)) return; // Skip if no session confirmed

      if (level === 'N1' && !satis.some(s => s['ID Ens'] == ensId && s['Formation'] === fId)) {
        satisfaction.push({ 'ID Ens': ensId, 'Formation': fId, ...value, _isEdited: true });
      }
      if (level === 'N2' && !acqs.some(a => a['ID Ens'] == ensId && a['Formation'] === fId)) {
        acquis.push({ 'ID Ens': ensId, 'Formation': fId, ...value, _isEdited: true });
      }
      if (level === 'N3' && !trans.some(t => t['ID Ens'] == ensId && t['Formation'] === fId)) {
        transfert.push({ 'ID Ens': ensId, 'Formation': fId, ...value, _isEdited: true });
      }
    });

    return { satisfaction, acquis, transfert };
  }, [kpEdits, sessions]);

  // ── §4 Audit trail helper ──────────────────────────────────────────────────
  const addAuditEntry = useCallback((type, ensId, data) => {
    const entry = {
      id: `AUD_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      ensId,
      timestamp: new Date().toISOString(),
      data,
    };
    setAuditTrail(prev => {
      const next = [entry, ...prev];
      save('pedagotrack_audit_trail', next);
      return next;
    });
    return entry;
  }, []);

  // ── §1.1 / §1.2 Visit operations ──────────────────────────────────────────
  const addVisit = useCallback((ensId, visitData) => {
    // visitData: { date, observer, scores: {C1..C7: number|null}, weights: {C1..C7: 0-100},
    //             visitScore, note20, appreciation, visitType: 'official'|'informal' }
    const newVisit = {
      id: `VIS_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...visitData,
      recordedAt: new Date().toISOString(),
    };

    // Batch: prepare all changes before writing
    const nextVisits = { ...visits, [ensId]: [newVisit, ...(visits[ensId] || [])] };
    const legacyUpdates = visitData.date ? {
      'Date dernière visite': visitData.date,
      'Note dernière visite /20': visitData.note20 ?? '—',
      'Observateur': visitData.observer ?? '—',
    } : null;
    const nextEdits = legacyUpdates
      ? { ...ensEdits, [ensId]: { ...(ensEdits[ensId] || {}), ...legacyUpdates } }
      : ensEdits;

    // Write both stores atomically
    save('pedagotrack_visits', nextVisits);
    if (legacyUpdates) save('pedagotrack_ens_edits', nextEdits);

    // Update React state
    setVisits(nextVisits);
    if (legacyUpdates) setEnsEdits(nextEdits);

    // § AUTO STATUS PROMOTION
    const currentEns = enseignants.find(e => e['ID'] === ensId);
    if (currentEns && currentEns['Statut'] === 'Stagiaire' && visitData.note20 !== undefined && visitData.note20 !== null) {
      const promotionUpdates = { 'Statut': 'Titulaire (en attente)' };
      setEnsEdits(prev => {
        const next = { ...prev, [ensId]: { ...(prev[ensId] || {}), ...nextEdits[ensId], ...promotionUpdates } };
        save('pedagotrack_ens_edits', next);
        return next;
      });
      addAuditEntry('titularisation_recommended', ensId, { note: visitData.note20 });
    }

    addAuditEntry('visit_added', ensId, newVisit);
    return newVisit;
  }, [visits, ensEdits, addAuditEntry]);

  const deleteVisit = useCallback((ensId, visitId, reason) => {
    setVisits(prev => {
      const ensVisits = prev[ensId] || [];
      const next = {
        ...prev,
        [ensId]: ensVisits.map(v =>
          v.id === visitId
            ? { ...v, deleted: true, deletedAt: new Date().toISOString(), deleteReason: reason || '' }
            : v
        ),
      };
      save('pedagotrack_visits', next);
      addAuditEntry('visit_deleted', ensId, { visitId, reason });
      return next;
    });
  }, [addAuditEntry]);

  const restoreVisit = useCallback((ensId, visitId) => {
    setVisits(prev => {
      const ensVisits = prev[ensId] || [];
      const next = {
        ...prev,
        [ensId]: ensVisits.map(v =>
          v.id === visitId
            ? { ...v, deleted: false, deletedAt: null, deleteReason: '' }
            : v
        ),
      };
      save('pedagotrack_visits', next);
      addAuditEntry('visit_restored', ensId, { visitId });
      return next;
    });
  }, [addAuditEntry]);

  const updateVisit = useCallback((ensId, visitId, updatedData) => {
    const ensVisits = visits[ensId] || [];
    const visitIndex = ensVisits.findIndex(v => v.id === visitId);
    if (visitIndex === -1) return;

    const oldVisit = ensVisits[visitIndex];
    if (oldVisit.finalized) {
      console.warn("Attempted to edit a finalized visit.");
      return;
    }

    const updatedVisit = {
      ...oldVisit,
      ...updatedData,
      updatedAt: new Date().toISOString()
    };

    const nextEnsVisits = [...ensVisits];
    nextEnsVisits[visitIndex] = updatedVisit;
    const nextVisits = { ...visits, [ensId]: nextEnsVisits };

    // Profile synchronization logic
    const officialVisits = nextEnsVisits.filter(v => !v.deleted && v.visitType === 'official');
    let nextEdits = ensEdits;

    if (officialVisits.length > 0) {
      const sorted = [...officialVisits].sort((a, b) => {
        const da = a.date.split('/').reverse().join('');
        const db = b.date.split('/').reverse().join('');
        return db.localeCompare(da);
      });
      const latest = sorted[0];
      
      const legacyUpdates = {
        'Date dernière visite': latest.date,
        'Note dernière visite /20': latest.note20 ?? '—',
        'Observateur': latest.observer ?? '—',
      };
      nextEdits = { ...ensEdits, [ensId]: { ...(ensEdits[ensId] || {}), ...legacyUpdates } };
    }

    // Persist and Update State
    save('pedagotrack_visits', nextVisits);
    setVisits(nextVisits);
    if (nextEdits !== ensEdits) {
      save('pedagotrack_ens_edits', nextEdits);
      setEnsEdits(nextEdits);
    }

    addAuditEntry('visit_updated', ensId, { visitId, changes: updatedData });
    return updatedVisit;
  }, [visits, ensEdits, addAuditEntry]);

  // ── §2.2 Override operations ───────────────────────────────────────────────
  const setOverride = useCallback((ensId, reason, reasonText, scopes = ['GLOBAL']) => {
    setOverrides(prev => {
      const next = { 
        ...prev, 
        [ensId]: { 
          active: true, 
          reason, 
          reasonText, 
          scopes, // array of formation IDs or ['GLOBAL']
          timestamp: new Date().toISOString() 
        } 
      };
      save('pedagotrack_overrides', next);
      return next;
    });
    addAuditEntry('override_set', ensId, { reason, scopes });
  }, [addAuditEntry]);

  const removeOverride = useCallback((ensId) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[ensId];
      save('pedagotrack_overrides', next);
      return next;
    });
    addAuditEntry('override_removed', ensId, { timestamp: new Date().toISOString() });
  }, [addAuditEntry]);

  // ── §2.1 Availability operations ──────────────────────────────────────────
  const declareUnavailability = useCallback((ensId, fcode, justification) => {
    const entry = {
      declared: true,
      status: 'pending',
      declaredAt: new Date().toISOString(),
      justification: justification || '',
      validatedAt: null,
    };
    setAvailability(prev => {
      const teacherAvail = prev[ensId] || {};
      const next = { ...prev, [ensId]: { ...teacherAvail, [fcode]: entry } };
      save('pedagotrack_availability', next);
      return next;
    });
    addAuditEntry('unavailability_declared', ensId, { entry, formation: fcode });
  }, [addAuditEntry]);

  const validateAvailability = useCallback((ensId, fcode, decision, justification) => {
    // decision: 'validated' (accept unavailability) | 'rejected' (reject = teacher stays available)
    setAvailability(prev => {
      const teacherAvail = prev[ensId] || {};
      const current = teacherAvail[fcode] || {};
      const nextClass = {
        ...current,
        status: decision,
        validatedAt: new Date().toISOString(),
        validationJustification: justification || '',
      };
      const nextTeacherAvail = { ...teacherAvail, [fcode]: nextClass };
      const next = { ...prev, [ensId]: nextTeacherAvail };
      save('pedagotrack_availability', next);
      addAuditEntry('availability_validated', ensId, { decision, justification, timestamp: nextClass.validatedAt, formation: fcode });
      return next;
    });
  }, [addAuditEntry]);

  const clearAvailability = useCallback((ensId, fcode) => {
    setAvailability(prev => {
      const next = { ...prev };
      if (!next[ensId]) return prev;
      if (fcode) {
        const nextTeacherAvail = { ...next[ensId] };
        delete nextTeacherAvail[fcode];
        if (Object.keys(nextTeacherAvail).length > 0) {
          next[ensId] = nextTeacherAvail;
        } else {
          delete next[ensId];
        }
      } else {
        delete next[ensId]; // fallback clear all if needed
      }
      save('pedagotrack_availability', next);
      return next;
    });
  }, []);

  // ── §1.2 Temporal coefficients settings ───────────────────────────────────
  const updateTemporalCoeffs = useCallback((coeffs) => {
    setTemporalCoeffs(coeffs);
    save('pedagotrack_temporal_coeffs', coeffs);
  }, []);

  const resetTemporalCoeffs = useCallback(() => {
    setTemporalCoeffs(TEMPORAL_COEFFICIENTS_DEFAULT);
    save('pedagotrack_temporal_coeffs', TEMPORAL_COEFFICIENTS_DEFAULT);
  }, []);

  // ── §2.6 Group weights settings ─────────────────────────────────────────────
  const updateGroupWeights = useCallback((weights) => {
    setGroupWeights(weights);
    save('pedagotrack_group_weights', weights);
  }, []);

  // ── §2.7 Global criteria settings ─────────────────────────────────────────
  const updateGlobalCriterion = useCallback((id, changes) => {
    setGlobalCriteria(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...changes } : c);
      // Auto-normalize weights
      const totalW = next.filter(c => !c.disabled).reduce((s, c) => s + c.weight, 0);
      // (we keep raw weights; normalization happens in computeGlobalScoreTenured)
      save('pedagotrack_global_criteria', next);
      return next;
    });
  }, []);

  const resetGlobalCriteria = useCallback(() => {
    setGlobalCriteria(GLOBAL_CRITERIA_DEFAULT);
    save('pedagotrack_global_criteria', GLOBAL_CRITERIA_DEFAULT);
  }, []);

  // ── §2.8 Formation filter ──────────────────────────────────────────────────
  const setFormationFilter = useCallback((filter) => {
    setFormationFilterState(filter);
    save('pedagotrack_formation_filter', filter);
  }, []);

  // ── §3.3 Needs analysis validation ────────────────────────────────────────
  const validateNeedsTheme = useCallback((theme, competencies, comment) => {
    const decision = {
      theme,
      competencies,
      comment: comment || '',
      timestamp: new Date().toISOString(),
      validated: true,
      validatedBy: 'Mohamed Amir Beldi',
    };
    setNeedsDecision(decision);
    save('pedagotrack_needs_decision', decision);
    addAuditEntry('needs_theme_validated', null, decision);
  }, [addAuditEntry]);

  const updateNeedsWeights = useCallback((weights) => {
    setNeedsWeights(weights);
    save('pedagotrack_needs_weights', weights);
  }, []);

  // ── Enseignants CRUD ───────────────────────────────────────────────────────
  const updateEnseignant = useCallback((id, changes) => {
    setEnsEdits(prev => {
      const next = { ...prev, [id]: { ...(prev[id] || {}), ...changes } };
      save('pedagotrack_ens_edits', next);
      return next;
    });

    // Legacy history archiving
    if (changes['Date dernière visite'] || changes['Note dernière visite /20'] || changes["Verbatim d'observation"]) {
      setEnsHistory(prev => {
        const h = prev[id] || [];
        const date = changes['Date dernière visite'] || '—';
        const existingIdx = h.findIndex(entry => entry.date === date && date !== '—');
        const newEntry = {
          id: existingIdx >= 0 ? h[existingIdx].id : `HIST_${Date.now()}`,
          date,
          note: changes['Note dernière visite /20'] || '—',
          observateur: changes['Observateur'] || '—',
          verbatim: changes["Verbatim d'observation"] || '',
          statut: changes['Statut'] || 'Titulaire',
          recordedAt: new Date().toISOString(),
        };
        let nextHistory;
        if (existingIdx >= 0) {
          nextHistory = [...h];
          nextHistory[existingIdx] = { ...nextHistory[existingIdx], ...newEntry };
        } else if (date !== '—') {
          nextHistory = [newEntry, ...h];
        } else {
          nextHistory = h;
        }
        const nextAll = { ...prev, [id]: nextHistory };
        save('pedagotrack_ens_history', nextAll);
        return nextAll;
      });
    }

    // §2.1 — Sync "Dispo FX" with the per-formation availability system
    const formationCodes = Object.keys(formations || {});
    formationCodes.forEach(fcode => {
      const field = `Dispo ${fcode}`;
      if (changes[field] !== undefined) {
        const newDispo = changes[field];
        setAvailability(prev => {
          const teacherAvail = prev[id] || {};
          let nextTeacherAvail = { ...teacherAvail };

          if (newDispo === 'Non') {
            nextTeacherAvail[fcode] = {
              declared: true,
              status: 'validated',
              declaredAt: new Date().toISOString(),
              justification: 'Modifié depuis la fiche enseignant',
              validatedAt: new Date().toISOString(),
              validationJustification: 'Validation automatique (modification inspecteur)',
            };
            addAuditEntry('unavailability_declared', id, { source: 'edit_modal', status: 'validated', formation: fcode });
          } else if (newDispo === 'En attente') {
            nextTeacherAvail[fcode] = {
              declared: true,
              status: 'pending',
              declaredAt: new Date().toISOString(),
              justification: 'Modifié depuis la fiche enseignant',
              validatedAt: null,
            };
            addAuditEntry('unavailability_declared', id, { source: 'edit_modal', status: 'pending', formation: fcode });
          } else if (newDispo === 'Oui') {
            delete nextTeacherAvail[fcode];
          }

          // If teacher is available for all formations, we can optionally remove them from the store completely
          // or just leave them with an empty object. Let's clean up empty objects.
          const next = { ...prev };
          if (Object.keys(nextTeacherAvail).length > 0) {
            next[id] = nextTeacherAvail;
          } else {
            delete next[id];
          }
          save('pedagotrack_availability', next);
          return next;
        });
      }
    });
  }, [addAuditEntry]);

  const addEnseignant = useCallback((record) => {
    const newId = `ENS${String(Date.now()).slice(-5)}`;
    const full = {
      'ID': newId,
      'Sexe': 'M',
      'Niveaux': '3ème et 4ème secondaire',
      'Année stage': '—',
      'Ancienneté (ans)': '—',
      'Effectif moy.': '',
      'Note dernière visite /20': '—',
      'Date dernière visite': '—',
      'Délai depuis visite (mois)': '—',
      'Observateur': '—',
      'Dispo. confirmée': 'Oui',
      ...record,
      'ID': newId,
    };
    setEnsAdded(prev => {
      const next = [...prev, full];
      save('pedagotrack_ens_added', next);
      return next;
    });
    return newId;
  }, []);

  const deleteEnseignant = useCallback((id) => {
    setEnsAdded(prev => {
      const next = prev.filter(e => e['ID'] !== id);
      save('pedagotrack_ens_added', next);
      return next;
    });
    if (seedEnseignants.some(e => e['ID'] === id)) {
      setEnsDeleted(prev => {
        const next = [...new Set([...prev, id])];
        save('pedagotrack_ens_deleted', next);
        return next;
      });
    }
  }, [seedEnseignants]);

  const restoreEnseignant = useCallback((id) => {
    setEnsDeleted(prev => {
      const next = prev.filter(x => x !== id);
      save('pedagotrack_ens_deleted', next);
      return next;
    });
    addAuditEntry('enseignant_restored', id, { timestamp: new Date().toISOString() });
  }, [addAuditEntry]);

  const resetEnseignantEdits = useCallback((id) => {
    setEnsEdits(prev => {
      const next = { ...prev };
      delete next[id];
      save('pedagotrack_ens_edits', next);
      return next;
    });
  }, []);

  const addSession = useCallback((record) => {
    const newId = `SESS${String(Date.now()).slice(-4)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const formationId = record.formationId || record['ID Formation'];
    const catalogItem = Object.values(CATALOGUE_FORMATIONS).find(f => f.id === formationId);
    
    const full = {
      'ID Session': newId,
      'Statut': 'Planifiée',
      'Nb inscrits': 0,
      'inscrits': [], 
      'Durée (h)': '4 à 5 heures',
      'logistics': {
         ...(catalogItem?.requirements || []).reduce((acc, req) => ({ ...acc, [req]: true }), {}),
         crefocId: 'Kef'
      },
      ...record,
      'ID Session': newId,
      'Date ARE (J+42 approx.)': record['Date (Samedi)'] ? calculateAREDate(record['Date (Samedi)']) : '—'
    };
    setSessAdded(prev => {
      const next = [...prev, full];
      save('pedagotrack_sess_added', next);
      return next;
    });
    addAuditEntry('session_added', newId, { title: full['Titre formation'] });
    return newId;
  }, [addAuditEntry]);

  const deleteSession = useCallback((id) => {
    setSessAdded(prev => {
      const next = prev.filter(s => s['ID Session'] !== id);
      save('pedagotrack_sess_added', next);
      return next;
    });
    if (seedSessions.some(s => s['ID Session'] === id)) {
      setSessDeleted(prev => {
        const next = [...new Set([...prev, id])];
        save('pedagotrack_sess_deleted', next);
        return next;
      });
    }
    addAuditEntry('session_deleted', id, {});
  }, [seedSessions, addAuditEntry]);

  const updateSession = useCallback((sessionId, changes) => {
    setSessEdits(prev => {
      const existingEdit = prev[sessionId] || {};
      const nextChanges = { ...changes };
      
      // Deep merge CDC into existing edits if provided
      if (changes.cdc) {
        nextChanges.cdc = {
          ...(existingEdit.cdc || {}),
          ...changes.cdc
        };
        addAuditEntry('addie_analysis_update', sessionId, { fields: Object.keys(changes.cdc) });
      }

      // Auto-update ARE if session date changes
      if (changes['Date (Samedi)']) {
        const areDate = calculateAREDate(changes['Date (Samedi)']);
        nextChanges['Date ARE (J+42 approx.)'] = areDate;
        // Legacy fields for compat
        nextChanges['Date ARE (J+10/11 approx.)'] = areDate; 
        nextChanges['Date ARE (Action-Recherche-Eval.)'] = areDate; 
      }

      if (changes.inscrits) {
        nextChanges['Nb inscrits'] = changes.inscrits.length;
      }

      if (changes.modules) {
        addAuditEntry('design_sequence_update', sessionId, { count: changes.modules.length });
      }

      const next = { ...prev, [sessionId]: { ...existingEdit, ...nextChanges } };
      save('pedagotrack_sessions_edits', next);
      return next;
    });
  }, [addAuditEntry]);

  const saveAutopositionnement = useCallback((ensId, scores) => {
    const entry = {
      id: `AP_${Date.now()}`,
      scores,
      recordedAt: new Date().toISOString(),
    };
    setAutoposManual(prev => {
      const h = prev[ensId] || [];
      const next = { ...prev, [ensId]: [entry, ...h] };
      save('pedagotrack_autopos_manual', next);
      return next;
    });
    addAuditEntry('autopositionnement_recorded', ensId, entry);
  }, [addAuditEntry]);

  const deleteAutopositionnement = useCallback((ensId, entryId) => {
    setAutoposManual(prev => {
      const h = prev[ensId] || [];
      const next = { ...prev, [ensId]: h.filter(e => e.id !== entryId) };
      save('pedagotrack_autopos_manual', next);
      return next;
    });
    addAuditEntry('autopositionnement_deleted', ensId, { entryId });
  }, [addAuditEntry]);

  // ── Kirkpatrick Operations ────────────────────────────────────────────────
  const updateKirkpatrick = useCallback((ensId, formationId, level, data) => {
    // level: 'N1', 'N2', or 'N3'
    const key = `${ensId}_${formationId}_${level}`;
    setKpEdits(prev => {
      const next = { ...prev, [key]: { ...(prev[key] || {}), ...data } };
      save('pedagotrack_kp_edits', next);
      return next;
    });
    addAuditEntry('kirkpatrick_updated', ensId, { formationId, level, data });
  }, [addAuditEntry]);

  const resetKirkpatrick = useCallback((ensId, formationId, level) => {
    const key = `${ensId}_${formationId}_${level}`;
    setKpEdits(prev => {
      const next = { ...prev };
      delete next[key];
      save('pedagotrack_kp_edits', next);
      return next;
    });
    addAuditEntry('kirkpatrick_reset', ensId, { formationId, level });
  }, [addAuditEntry]);

  // ── Formations CRUD ────────────────────────────────────────────────────────
  const addFormation = useCallback((formation) => {
    setFormations(prev => {
      const id = formation.id || `F${Object.keys(prev).length + 1}`;
      const next = { ...prev, [id]: { ...formation, id, objectifs: formation.objectifs || [], status: 'En attente' } };
      save('pedagotrack_formations', next);
      return next;
    });
  }, []);

  const deleteFormation = useCallback((id) => {
    setFormations(prev => {
      const next = { ...prev };
      delete next[id];
      save('pedagotrack_formations', next);
      return next;
    });
  }, []);
  const updateFormation = useCallback((formationId, changes) => {
    setFormations(prev => {
      const existing = prev[formationId] || {};
      const nextChanges = { ...changes };

      // Deep merge CDC for Master Design
      if (changes.cdc) {
        nextChanges.cdc = {
          ...(existing.cdc || {}),
          ...changes.cdc
        };
        addAuditEntry('formation_master_analysis_update', formationId, { fields: Object.keys(changes.cdc) });
      }

      if (changes.modules) {
        addAuditEntry('formation_master_design_update', formationId, { count: changes.modules.length });
      }

      const next = { ...prev, [formationId]: { ...existing, ...nextChanges } };
      save('pedagotrack_formations', next);
      return next;
    });
  }, [addAuditEntry]);

  const updateTargetScore = useCallback((formationId, compId, score) => {
    setFormations(prev => {
      const form = prev[formationId];
      const nextTargets = { ...(form.targetScores || {}), [compId]: score };
      const next = { ...prev, [formationId]: { ...form, targetScores: nextTargets } };
      save('pedagotrack_formations', next);
      return next;
    });
  }, []);

  const updateObjectif = useCallback((formationId, opIndex, changes) => {
    setFormations(prev => {
      const form = prev[formationId];
      const newObjectifs = form.objectifs.map((op, i) => i === opIndex ? { ...op, ...changes } : op);
      const next = { ...prev, [formationId]: { ...form, objectifs: newObjectifs } };
      save('pedagotrack_formations', next);
      return next;
    });
  }, []);

  const addObjectif = useCallback((formationId, libelle) => {
    setFormations(prev => {
      const form = prev[formationId];
      const id = `OP${form.objectifs.length + 1}`;
      const newObjectifs = [...form.objectifs, { id, libelle }];
      const next = { ...prev, [formationId]: { ...form, objectifs: newObjectifs } };
      save('pedagotrack_formations', next);
      return next;
    });
  }, []);

  const deleteObjectif = useCallback((formationId, opIndex) => {
    setFormations(prev => {
      const form = prev[formationId];
      const newObjectifs = form.objectifs.filter((_, i) => i !== opIndex);
      const next = { ...prev, [formationId]: { ...form, objectifs: newObjectifs } };
      save('pedagotrack_formations', next);
      return next;
    });
  }, []);

  const updateCompetence = useCallback((code, label) => {
    setCompetences(prev => {
      const next = { ...prev, [code]: label };
      save('pedagotrack_competences', next);
      return next;
    });
  }, []);

  const addCompetence = useCallback((code, label) => {
    setCompetences(prev => {
      const next = { ...prev, [code]: label };
      save('pedagotrack_competences', next);
      return next;
    });
    setGlobalTargetedComps(prev => {
      if (prev.includes(code)) return prev;
      const next = [...prev, code];
      save('pedagotrack_global_targets', next);
      return next;
    });
  }, []);

  const deleteCompetence = useCallback((code) => {
    setCompetences(prev => {
      const next = { ...prev };
      delete next[code];
      save('pedagotrack_competences', next);
      return next;
    });
    setGlobalTargetedComps(prev => {
      const next = prev.filter(c => c !== code);
      save('pedagotrack_global_targets', next);
      return next;
    });
  }, []);

  const updateGlobalTargetedComps = useCallback((comps) => {
    setGlobalTargetedComps(comps);
    save('pedagotrack_global_targets', comps);
  }, []);

  const updateRiskThresholds = useCallback((newThresholds) => {
    setRiskThresholds(prev => {
      const next = { ...prev, ...newThresholds };
      save('pedagotrack_risk_thresholds', next);
      return next;
    });
  }, []);

  // ── Crefocs CRUD ───────────────────────────────────────────────────────────
  const updateCrefoc = useCallback((circo, field, value) => {
    setCrefocs(prev => {
      const next = { ...prev, [circo]: { ...prev[circo], [field]: value } };
      save('pedagotrack_crefocs', next);
      return next;
    });
  }, []);

  const saveAllCrefocs = useCallback((data) => {
    setCrefocs(data);
    save('pedagotrack_crefocs', data);
  }, []);

  const addCrefoc = useCallback((circo, data) => {
    setCrefocs(prev => {
      const next = { ...prev, [circo]: { ...data, confirmed: false, logistics: CREFOC_LOGISTICS_DEFAULT, places: 20 } };
      save('pedagotrack_crefocs', next);
      return next;
    });
  }, []);

  const deleteCrefoc = useCallback((circo) => {
    setCrefocs(prev => {
      const next = { ...prev };
      delete next[circo];
      save('pedagotrack_crefocs', next);
      return next;
    });
  }, []);

  // ── Reset all data ─────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    [
      'pedagotrack_ens_edits', 'pedagotrack_ens_added', 'pedagotrack_ens_deleted',
      'pedagotrack_sessions_edits', 'pedagotrack_sess_added', 'pedagotrack_sess_deleted',
      'pedagotrack_formations', 'pedagotrack_competences',
      'pedagotrack_crefocs', 'pedagotrack_ens_history',
      'pedagotrack_visits', 'pedagotrack_overrides', 'pedagotrack_availability',
      'pedagotrack_audit_trail', 'pedagotrack_temporal_coeffs', 'pedagotrack_group_weights',
      'pedagotrack_global_criteria', 'pedagotrack_formation_filter',
      'pedagotrack_needs_decision', 'pedagotrack_needs_weights',
    ].forEach(k => localStorage.removeItem(k));
    setEnsEdits({}); setEnsAdded([]); setEnsDeleted([]); setEnsHistory({});
    setSessEdits({}); setSessAdded([]); setSessDeleted([]);
    setFormations(FORMATIONS_DEFAULT); setCompetences(COMPETENCES_DEFAULT); setCrefocs(CREFOCS_DEFAULT);
    setVisits({}); setOverrides({}); setAvailability({}); setAuditTrail([]);
    setTemporalCoeffs(TEMPORAL_COEFFICIENTS_DEFAULT);
    setGroupWeights(GROUP_WEIGHTS_DEFAULT);
    setGlobalCriteria(GLOBAL_CRITERIA_DEFAULT);
    setFormationFilterState('');
    setNeedsDecision(null);
    setNeedsWeights({ deficit: 0.40, studentImpact: 0.35, feasibility: 0.25 });
  }, []);

  // ── Stats for admin banner ─────────────────────────────────────────────────
  const pendingChanges = useMemo(() => ({
    enseignants: Object.keys(ensEdits).length + ensAdded.length + ensDeleted.length,
    sessions: Object.keys(sessEdits).length,
    formations: 0,
    overrides: Object.values(overrides).filter(o => o.active).length,
    pendingAvailability: Object.values(availability).filter(a => a.status === 'pending').length,
  }), [ensEdits, ensAdded, ensDeleted, sessEdits, overrides, availability]);


  const getPriorityList = useCallback((fId) => {
    // Collect all data needed by engine
    const base = seedEnseignants
      .filter(e => !ensDeleted.includes(e['ID']))
      .map(e => {
        const edits = ensEdits[e['ID']];
        return edits ? { ...e, ...edits } : e;
      });
    const withAdded = [...base, ...ensAdded];

    return buildPriorityList(
      withAdded,
      seedAutopos,
      visits,
      overrides,
      availability,
      temporalCoeffs,
      groupWeights,
      globalCriteria,
      fId,
      Object.fromEntries(Object.values(formations).map(f => [
        f.id,
        f.targetedComps?.length ? f.targetedComps : [(f.competence || '').split(' ')[0]].filter(Boolean),
      ])),
      globalTargetedComps,
      autoposManual,
      crefocs
    );
  }, [
    seedEnseignants, ensEdits, ensAdded, ensDeleted,
    seedAutopos, visits, overrides, availability,
    temporalCoeffs, groupWeights, globalCriteria,
    formations, globalTargetedComps, autoposManual, crefocs
  ]);

  const getSmartSet = useCallback((fId, circo) => {
    if (!fId || !circo) return [];
    
    // Use the engine to get priority list for this formation
    const { list } = getPriorityList(fId);
    const capacity = crefocs[circo]?.places || 20;

    // Strictly home circo + available + sorted by rank
    return list
      .filter(e => e['Circonscription'] === circo && e.availabilityStatus !== 'unavailable')
      .slice(0, capacity)
      .map(e => e['ID']);
  }, [getPriorityList, crefocs]);

  return {
    // Data
    enseignants,
    isUnconfiguredFormation,
    sessions,
    formations,
    competences,

    // Enseignants ops
    updateEnseignant,
    addEnseignant,
    deleteEnseignant,
    restoreEnseignant,
    confirmTitularisation: (ensId) => {
      updateEnseignant(ensId, { 'Statut': 'Titulaire' });
      addAuditEntry('titularisation_confirmed', ensId, {});
    },
    ensDeleted,
    resetEnseignantEdits,
    ensHistory,

    // Sessions ops
    updateSession,
    addSession,
    deleteSession,

    // Crefocs ops
    crefocs,
    updateCrefoc,
    addCrefoc,
    deleteCrefoc,
    saveAllCrefocs,

    // Formations / competences ops
    updateFormation,
    addFormation,
    deleteFormation,
    updateTargetScore,
    updateObjectif,
    addObjectif,
    deleteObjectif,
    updateCompetence,
    addCompetence,
    deleteCompetence,
    globalTargetedComps,
    updateGlobalTargetedComps,

    // Referential (Global Catalogue)
    referential,
    addReferentialItem: (item) => {
      setReferential(prev => {
        const next = { ...prev, [item.id]: item };
        save('pedagotrack_referential', next);
        return next;
      });
    },
    updateReferentialItem: (id, partial) => {
      setReferential(prev => {
        const next = { ...prev, [id]: { ...prev[id], ...partial } };
        save('pedagotrack_referential', next);
        return next;
      });
    },
    deleteReferentialItem: (id) => {
      setReferential(prev => {
        const next = { ...prev };
        delete next[id];
        save('pedagotrack_referential', next);
        return next;
      });
    },

    // Autopos ops
    autoposManual,
    saveAutopositionnement,
    deleteAutopositionnement,

    // §1.1/§1.2 Visit ops
    visits,
    addVisit,
    updateVisit,
    deleteVisit,
    restoreVisit,

    // §2.2 Override ops
    overrides,
    setOverride,
    removeOverride,

    // §2.1 Availability ops
    availability,
    declareUnavailability,
    validateAvailability,
    clearAvailability,

    // §5.4 Audit trail
    auditTrail,
    addAuditEntry,

    // Settings
    temporalCoeffs,
    updateTemporalCoeffs,
    resetTemporalCoeffs,
    groupWeights,
    updateGroupWeights,
    globalCriteria,
    updateGlobalCriterion,
    resetGlobalCriteria,

    // §2.8 Formation filter
    formationFilter,
    setFormationFilter,

    // Priority Engine helper
    getPriorityList,
    getSmartSet,

    // §3.1/§3.3 Needs analysis
    needsDecision,
    validateNeedsTheme,
    needsWeights,
    updateNeedsWeights,
    riskThresholds,
    updateRiskThresholds,
    strategicMode,
    updateStrategicMode: (val) => {
      setStrategicMode(val);
      save('pedagotrack_strategic_mode', val);
    },

    // Kirkpatrick
    kpEdits,
    getMergedKirkpatrick,
    updateKirkpatrick,
    resetKirkpatrick,

    // Meta
    resetAll,
    pendingChanges,
    hasEdits: pendingChanges.enseignants + pendingChanges.sessions > 0,
  };
}
