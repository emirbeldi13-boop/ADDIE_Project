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

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { useAuth } from './useAuth';
import * as db from '../lib/db';

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
      // TRIANGULATED REALITY SCORES per RC
      realityScores: globalTargetedComps.reduce((acc, code) => {
        const auto = (scoresByEns[id] || {})[code];
        const visitsWithComp = activeVisits.filter(v => v.scores && v.scores[code] !== null && v.scores[code] !== undefined);
        const obs = computeTemporalScore(visitsWithComp.map(v => ({ ...v, score: v.scores[code] })), temporalCoeffs);
        
        acc[code] = obs !== null ? (obs * 0.6 + (auto ?? 3) * 0.4) : (auto ?? 3);
        return acc;
      }, {})
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
export function useDataStore() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // ── Enseignants base state ─────────────────────────────────────────────────
  const [enseignantsRaw, setEnseignantsRaw] = useState([]);
  const [ensDeleted, setEnsDeleted] = useState([]); // Still useful for UI filtering if needed
  const [ensHistory, setEnsHistory] = useState({});

  // ── Sessions state ─────────────────────────────────────────────────────────
  const [sessionsRaw, setSessionsRaw] = useState([]);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [formations, setFormations] = useState(FORMATIONS_DEFAULT);
  const [competences, setCompetences] = useState(COMPETENCES_DEFAULT);
  const [crefocs, setCrefocs] = useState(CREFOCS_DEFAULT);
  const [globalTargetedComps, setGlobalTargetedComps] = useState(Object.keys(COMPETENCES_DEFAULT));

  // ── §1.2 New visits store (per-competency scoring) ─────────────────────────
  const [visits, setVisits] = useState({});

  // ── §2.2 Inspector overrides ───────────────────────────────────────────────
  const [overrides, setOverrides] = useState({});

  // ── §2.1 Availability declarations ────────────────────────────────────────
  const [availability, setAvailability] = useState({});

  // ── §5.4 Audit trail ──────────────────────────────────────────────────────
  const [auditTrail, setAuditTrail] = useState([]);

  // ── §1.2 Temporal coefficients ─────────────────────────────────────────────
  const [temporalCoeffs, setTemporalCoeffs] = useState(TEMPORAL_COEFFICIENTS_DEFAULT);

  // ── §2.6 Group score weights ───────────────────────────────────────────────
  const [groupWeights, setGroupWeights] = useState(GROUP_WEIGHTS_DEFAULT);

  // ── §2.7 Global score criteria ─────────────────────────────────────────────
  const [globalCriteria, setGlobalCriteria] = useState(GLOBAL_CRITERIA_DEFAULT);

  // ── §2.8 Active formation filter ──────────────────────────────────────────
  const [formationFilter, setFormationFilterState] = useState('');

  // ── §3.1 Needs analysis decision ──────────────────────────────────────────
  const [needsDecision, setNeedsDecision] = useState(null);
  const [needsWeights, setNeedsWeights] = useState({ deficit: 0.40, studentImpact: 0.35, feasibility: 0.25 });

  const [riskThresholds, setRiskThresholds] = useState({ high: 70, medium: 40, urgency: 2.5 });

  const [strategicMode, setStrategicMode] = useState(false);

  const [autoposManual, setAutoposManual] = useState({});

  // ── Kirkpatrick Dynamic Evaluations ───────────────────────────────────────
  const [kpEdits, setKpEdits] = useState({});

  // ── Referential (Global Catalogue) ─────────────────────────────────────────
  const [referential, setReferential] = useState(CATALOGUE_FORMATIONS);

  // ── Hydration ──────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [
        ens, sess, forms, comps, crf,
        vst, ovr, avl, apm, kpe,
        ref, aud, settings, autoposSeed
      ] = await Promise.all([
        db.fetchEnseignants(),
        db.fetchSessions(),
        db.fetchFormations(),
        db.fetchCompetences(),
        db.fetchCrefocs(),
        db.fetchVisits(),
        db.fetchOverrides(),
        db.fetchAvailability(),
        db.fetchAutoposManual(),
        db.fetchKirkpatrickEdits(),
        db.fetchReferential(),
        db.fetchAuditTrail(),
        db.fetchUserSettings(),
        db.fetchAutopositionnement()
      ]);

      setEnseignantsRaw(ens);
      setSessionsRaw(sess);
      if (Object.keys(forms).length) setFormations(forms);
      if (Object.keys(comps).length) setCompetences(comps);
      if (Object.keys(crf).length) setCrefocs(crf);
      
      setVisits(vst);
      setOverrides(ovr);
      setAvailability(avl);
      setAutoposManual(apm);
      setKpEdits(kpe);
      if (Object.keys(ref).length) setReferential(ref);
      setAuditTrail(aud);

      // Settings
      if (settings.pedagotrack_temporal_coeffs) setTemporalCoeffs(settings.pedagotrack_temporal_coeffs);
      if (settings.pedagotrack_group_weights) setGroupWeights(settings.pedagotrack_group_weights);
      if (settings.pedagotrack_global_criteria) setGlobalCriteria(settings.pedagotrack_global_criteria);
      if (settings.pedagotrack_global_targets) setGlobalTargetedComps(settings.pedagotrack_global_targets);
      if (settings.pedagotrack_formation_filter) setFormationFilterState(settings.pedagotrack_formation_filter);
      if (settings.pedagotrack_needs_decision) setNeedsDecision(settings.pedagotrack_needs_decision);
      if (settings.pedagotrack_needs_weights) setNeedsWeights(settings.pedagotrack_needs_weights);
      if (settings.pedagotrack_risk_thresholds) setRiskThresholds(settings.pedagotrack_risk_thresholds);
      if (settings.pedagotrack_strategic_mode !== undefined) setStrategicMode(settings.pedagotrack_strategic_mode);

      // Note: seedAutopos is still needed for calculations
      // We can either store it in state or use it directly in useMemo.
      // For now, let's store it.
      setSeedAutopos(autoposSeed);

    } catch (err) {
      console.error('[useDataStore] refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const [seedAutopos, setSeedAutopos] = useState([]);

  // ── Merged sessions ────────────────────────────────────────────────────────
  const sessions = useMemo(() => {
    return sessionsRaw;
  }, [sessionsRaw]);

  // ── Merged enseignants (with priority computation) ─────────────────────────
  const priorityData = useMemo(() => {
    // Build priority list with all logic using raw data from DB
    return buildPriorityList(
      enseignantsRaw,
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
    enseignantsRaw, seedAutopos, visits, overrides, availability,
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
  const addAuditEntry = useCallback(async (type, ensId, data) => {
    const entry = {
      id: `AUD_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      ensId,
      timestamp: new Date().toISOString(),
      data,
    };
    await db.insertAuditEntry(entry, user.id);
    setAuditTrail(prev => [entry, ...prev]);
    return entry;
  }, [user]);

  // ── §1.1 / §1.2 Visit operations ──────────────────────────────────────────
  const addVisit = useCallback(async (ensId, visitData) => {
    const newVisit = {
      id: `VIS_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...visitData,
      recordedAt: new Date().toISOString(),
    };

    await db.upsertVisit(newVisit, user.id, ensId);
    
    // Refresh local state
    const vst = await db.fetchVisits();
    setVisits(vst);

    // § AUTO STATUS PROMOTION
    const currentEns = enseignants.find(e => e['ID'] === ensId);
    if (currentEns && currentEns['Statut'] === 'Stagiaire' && visitData.note20 !== undefined && visitData.note20 !== null) {
      const promotionUpdates = { 'Statut': 'Titulaire (en attente)' };
      await db.upsertEnseignant({ ...currentEns, ...promotionUpdates }, user.id);
      setEnseignantsRaw(prev => prev.map(e => e['ID'] === ensId ? { ...e, ...promotionUpdates } : e));
      addAuditEntry('titularisation_recommended', ensId, { note: visitData.note20 });
    }

    addAuditEntry('visit_added', ensId, newVisit);
    return newVisit;
  }, [user, enseignants, addAuditEntry]);

  const deleteVisit = useCallback(async (ensId, visitId, reason) => {
    const ensVisits = visits[ensId] || [];
    const visit = ensVisits.find(v => v.id === visitId);
    if (!visit) return;

    const updatedVisit = { ...visit, deleted: true, deletedAt: new Date().toISOString(), deleteReason: reason || '' };
    await db.upsertVisit(updatedVisit, user.id, ensId);
    
    setVisits(prev => ({
      ...prev,
      [ensId]: (prev[ensId] || []).map(v => v.id === visitId ? updatedVisit : v)
    }));
    addAuditEntry('visit_deleted', ensId, { visitId, reason });
  }, [user, visits, addAuditEntry]);

  const restoreVisit = useCallback(async (ensId, visitId) => {
    const ensVisits = visits[ensId] || [];
    const visit = ensVisits.find(v => v.id === visitId);
    if (!visit) return;

    const updatedVisit = { ...visit, deleted: false, deletedAt: null, deleteReason: '' };
    await db.upsertVisit(updatedVisit, user.id, ensId);
    
    setVisits(prev => ({
      ...prev,
      [ensId]: (prev[ensId] || []).map(v => v.id === visitId ? updatedVisit : v)
    }));
    addAuditEntry('visit_restored', ensId, { visitId });
  }, [user, visits, addAuditEntry]);

  const updateVisit = useCallback(async (ensId, visitId, updatedData) => {
    const ensVisits = visits[ensId] || [];
    const oldVisit = ensVisits.find(v => v.id === visitId);
    if (!oldVisit) return;

    const updatedVisit = { ...oldVisit, ...updatedData, updatedAt: new Date().toISOString() };
    await db.upsertVisit(updatedVisit, user.id, ensId);
    
    setVisits(prev => ({
      ...prev,
      [ensId]: (prev[ensId] || []).map(v => v.id === visitId ? updatedVisit : v)
    }));
    addAuditEntry('visit_updated', ensId, { visitId, changes: updatedData });
    return updatedVisit;
  }, [user, visits, addAuditEntry]);

  // ── §2.2 Override operations ───────────────────────────────────────────────
  const setOverride = useCallback(async (ensId, reason, reasonText, scopes = ['GLOBAL']) => {
    const entry = { active: true, reason, reasonText, scopes, timestamp: new Date().toISOString() };
    await db.upsertOverride(entry, user.id, ensId);
    setOverrides(prev => ({ ...prev, [ensId]: entry }));
    addAuditEntry('override_set', ensId, { reason, scopes });
  }, [user, addAuditEntry]);

  const removeOverride = useCallback(async (ensId) => {
    await db.deleteOverrideDB(ensId);
    setOverrides(prev => {
      const next = { ...prev };
      delete next[ensId];
      return next;
    });
    addAuditEntry('override_removed', ensId, { timestamp: new Date().toISOString() });
  }, [addAuditEntry]);

  // ── §2.1 Availability operations ──────────────────────────────────────────
  const declareUnavailability = useCallback(async (ensId, fcode, justification) => {
    const entry = {
      declared: true,
      status: 'pending',
      declaredAt: new Date().toISOString(),
      justification: justification || '',
      validatedAt: null,
    };
    await db.upsertAvailability(entry, user.id, ensId, fcode);
    setAvailability(prev => {
      const teacherAvail = prev[ensId] || {};
      return { ...prev, [ensId]: { ...teacherAvail, [fcode]: entry } };
    });
    addAuditEntry('unavailability_declared', ensId, { entry, formation: fcode });
  }, [user, addAuditEntry]);

  const validateAvailability = useCallback(async (ensId, fcode, decision, justification) => {
    const teacherAvail = availability[ensId] || {};
    const current = teacherAvail[fcode] || {};
    const nextClass = {
      ...current,
      status: decision,
      validatedAt: new Date().toISOString(),
      validationJustification: justification || '',
    };
    await db.upsertAvailability(nextClass, user.id, ensId, fcode);
    setAvailability(prev => {
      const ta = prev[ensId] || {};
      return { ...prev, [ensId]: { ...ta, [fcode]: nextClass } };
    });
    addAuditEntry('availability_validated', ensId, { decision, justification, timestamp: nextClass.validatedAt, formation: fcode });
  }, [user, availability, addAuditEntry]);

  const clearAvailability = useCallback(async (ensId, fcode) => {
    if (fcode) {
      await db.deleteAvailabilityDB(ensId, fcode);
    }
    const avl = await db.fetchAvailability();
    setAvailability(avl);
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
  const validateNeedsTheme = useCallback(
    async (theme, competencies, comment) => {
      const decision = {
        theme,
        competencies,
        comment: comment || '',
        timestamp: new Date().toISOString(),
        validated: true,
        validatedBy: 'Mohamed Amir Beldi',
      };
      setNeedsDecision(decision);
      if (user?.id) {
        await db.upsertUserSetting('pedagotrack_needs_decision', decision, user.id);
      }
      await addAuditEntry('needs_theme_validated', null, decision);
      return decision;
    },
    [user, addAuditEntry]
  );

  const updateNeedsWeights = useCallback(
    async (weights) => {
      setNeedsWeights(weights);
      if (user?.id) {
        await db.upsertUserSetting('pedagotrack_needs_weights', weights, user.id);
      }
    },
    [user]
  );

  // ── Enseignants CRUD ───────────────────────────────────────────────────────
  const updateEnseignant = useCallback(async (id, changes) => {
    const ens = enseignantsRaw.find(e => e['ID'] === id);
    if (!ens) return;
    const updated = { ...ens, ...changes };
    await db.upsertEnseignant(updated, user.id);
    setEnseignantsRaw(prev => prev.map(e => e['ID'] === id ? updated : e));
    addAuditEntry('enseignant_updated', id, { changes });
  }, [user, enseignantsRaw, addAuditEntry]);

  const addEnseignant = useCallback(async (record) => {
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
    };
    await db.upsertEnseignant(full, user.id);
    setEnseignantsRaw(prev => [...prev, full]);
    addAuditEntry('enseignant_added', newId, { name: `${full['Prénom']} ${full['Nom']}` });
    return newId;
  }, [user, addAuditEntry]);

  const deleteEnseignant = useCallback(async (id) => {
    await db.deleteEnseignantDB(id);
    setEnseignantsRaw(prev => prev.filter(e => e['ID'] !== id));
    addAuditEntry('enseignant_deleted', id, {});
  }, [addAuditEntry]);

  const restoreEnseignant = useCallback(async (id) => {
    // Soft delete not really used in DB yet, but could be a field
    addAuditEntry('enseignant_restored', id, { timestamp: new Date().toISOString() });
  }, [addAuditEntry]);

  const resetEnseignantEdits = useCallback(() => {
    // No-op in DB model
  }, []);

  const addSession = useCallback(async (record) => {
    const newId = `SESS${String(Date.now()).slice(-4)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    const full = {
      'ID Session': newId,
      'Statut': 'Planifiée',
      'Nb inscrits': 0,
      'inscrits': [],
      'Durée (h)': '4 à 5 heures',
      ...record,
      'Date ARE (J+42 approx.)': record['Date (Samedi)'] ? calculateAREDate(record['Date (Samedi)']) : '—'
    };
    await db.upsertSession(full, user.id);
    setSessionsRaw(prev => [...prev, full]);
    addAuditEntry('session_added', newId, { title: full['Titre formation'] });
    return newId;
  }, [user, addAuditEntry]);

  const deleteSession = useCallback(async (id) => {
    await db.deleteSessionDB(id);
    setSessionsRaw(prev => prev.filter(s => s['ID Session'] !== id));
    addAuditEntry('session_deleted', id, {});
  }, [addAuditEntry]);

  const updateSession = useCallback(async (sessionId, changes) => {
    const sess = sessionsRaw.find(s => s['ID Session'] === sessionId);
    if (!sess) return;
    const updated = { ...sess, ...changes };
    if (changes['Date (Samedi)']) {
      updated['Date ARE (J+42 approx.)'] = calculateAREDate(changes['Date (Samedi)']);
    }
    await db.upsertSession(updated, user.id);
    setSessionsRaw(prev => prev.map(s => s['ID Session'] === sessionId ? updated : s));
    addAuditEntry('session_updated', sessionId, { changes });
  }, [user, sessionsRaw, addAuditEntry]);

  const saveAutopositionnement = useCallback(async (ensId, scores) => {
    const entry = {
      id: `AP_${Date.now()}`,
      scores,
      date: new Date().toISOString().split('T')[0],
      recordedAt: new Date().toISOString(),
    };
    await db.insertAutoposManual(entry, user.id, ensId);
    setAutoposManual(prev => {
      const h = prev[ensId] || [];
      return { ...prev, [ensId]: [entry, ...h] };
    });
    addAuditEntry('autopositionnement_recorded', ensId, entry);
  }, [user, addAuditEntry]);

  const deleteAutopositionnement = useCallback(async (ensId, entryId) => {
    await db.deleteAutoposManualDB(entryId);
    setAutoposManual(prev => {
      const h = prev[ensId] || [];
      return { ...prev, [ensId]: h.filter(e => e.id !== entryId) };
    });
    addAuditEntry('autopositionnement_deleted', ensId, { entryId });
  }, [addAuditEntry]);

  // ── Kirkpatrick Operations ────────────────────────────────────────────────
  const updateKirkpatrick = useCallback(async (ensId, formationId, level, data) => {
    await db.upsertKirkpatrickEdit(ensId, formationId, level, data, user.id);
    setKpEdits(prev => ({
      ...prev,
      [`${ensId}_${formationId}_${level}`]: { ...(prev[`${ensId}_${formationId}_${level}`] || {}), ...data }
    }));
    addAuditEntry('kirkpatrick_updated', ensId, { formationId, level, data });
  }, [user, addAuditEntry]);

  const resetKirkpatrick = useCallback(async (ensId, formationId, level) => {
    await db.deleteKirkpatrickEdit(ensId, formationId, level);
    setKpEdits(prev => {
      const next = { ...prev };
      delete next[`${ensId}_${formationId}_${level}`];
      return next;
    });
    addAuditEntry('kirkpatrick_reset', ensId, { formationId, level });
  }, [addAuditEntry]);

  // ── Formations CRUD ────────────────────────────────────────────────────────
  const addFormation = useCallback(async (formation) => {
    const id = formation.id || `F${Object.keys(formations).length + 1}`;
    const full = { ...formation, id, objectifs: formation.objectifs || [], status: 'En attente' };
    await db.upsertFormation(full, user.id);
    setFormations(prev => ({ ...prev, [id]: full }));
  }, [user, formations]);

  const deleteFormation = useCallback(async (id) => {
    await db.deleteFormationDB(id);
    setFormations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const updateFormation = useCallback(async (formationId, changes) => {
    const existing = formations[formationId] || {};
    const updated = { ...existing, ...changes };
    await db.upsertFormation(updated, user.id);
    setFormations(prev => ({ ...prev, [formationId]: updated }));
    addAuditEntry('formation_updated', formationId, { changes });
  }, [user, formations, addAuditEntry]);

  const updateCompetence = useCallback(async (code, label) => {
    await db.upsertCompetence(code, label, user.id);
    setCompetences(prev => ({ ...prev, [code]: label }));
  }, [user]);

  const addCompetence = useCallback(async (code, label) => {
    await db.upsertCompetence(code, label, user.id);
    setCompetences(prev => ({ ...prev, [code]: label }));
    setGlobalTargetedComps(prev => [...new Set([...prev, code])]);
  }, [user]);

  const deleteCompetence = useCallback(async (code) => {
    await db.deleteCompetenceDB(code);
    setCompetences(prev => {
      const next = { ...prev };
      delete next[code];
      return next;
    });
    setGlobalTargetedComps(prev => prev.filter(c => c !== code));
  }, []);

  const updateGlobalTargetedComps = useCallback(async (comps) => {
    await db.upsertUserSetting('pedagotrack_global_targets', comps, user.id);
    setGlobalTargetedComps(comps);
  }, [user]);

  const updateRiskThresholds = useCallback(async (newThresholds) => {
    const next = { ...riskThresholds, ...newThresholds };
    await db.upsertUserSetting('pedagotrack_risk_thresholds', next, user.id);
    setRiskThresholds(next);
  }, [user, riskThresholds]);

  // ── Crefocs CRUD ───────────────────────────────────────────────────────────
  const updateCrefoc = useCallback(async (circo, field, value) => {
    const next = { ...crefocs[circo], [field]: value };
    await db.upsertCrefoc(circo, next, user.id);
    setCrefocs(prev => ({ ...prev, [circo]: next }));
  }, [user, crefocs]);

  const addCrefoc = useCallback(async (circo, data) => {
    const next = { ...data, confirmed: false, logistics: CREFOC_LOGISTICS_DEFAULT, places: 20 };
    await db.upsertCrefoc(circo, next, user.id);
    setCrefocs(prev => ({ ...prev, [circo]: next }));
  }, [user]);

  const deleteCrefoc = useCallback(async (circo) => {
    await db.deleteCrefocDB(circo);
    setCrefocs(prev => {
      const next = { ...prev };
      delete next[circo];
      return next;
    });
  }, []);

  // ── Stats for admin banner ─────────────────────────────────────────────────
  const pendingChanges = useMemo(() => ({
    enseignants: 0,
    sessions: 0,
    formations: 0,
    overrides: Object.values(overrides).filter(o => o.active).length,
    pendingAvailability: Object.values(availability).flatMap(Object.values).filter(a => a.status === 'pending').length,
  }), [overrides, availability]);

  const getPriorityList = useCallback((fId) => {
    return buildPriorityList(
      enseignantsRaw,
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
    enseignantsRaw, seedAutopos, visits, overrides, availability,
    temporalCoeffs, groupWeights, globalCriteria,
    formations, globalTargetedComps, autoposManual, crefocs
  ]);

  const getSmartSet = useCallback((fId, circo) => {
    if (!fId || !circo) return [];
    const { list } = getPriorityList(fId);
    const capacity = crefocs[circo]?.places || 20;
    return list
      .filter(e => e['Circonscription'] === circo && e.availabilityStatus !== 'unavailable')
      .slice(0, capacity)
      .map(e => e['ID']);
  }, [getPriorityList, crefocs]);

  return {
    // Meta
    loading,
    refresh,

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
    confirmTitularisation: async (ensId) => {
      await updateEnseignant(ensId, { 'Statut': 'Titulaire' });
      addAuditEntry('titularisation_confirmed', ensId, {});
    },
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

    // Formations / competences ops
    updateFormation,
    addFormation,
    deleteFormation,
    updateCompetence,
    addCompetence,
    deleteCompetence,
    globalTargetedComps,
    updateGlobalTargetedComps,

    // Referential (Global Catalogue)
    referential,
    addReferentialItem: async (item) => {
      await db.upsertReferential(item, user.id);
      setReferential(prev => ({ ...prev, [item.id]: item }));
    },
    updateReferentialItem: async (id, partial) => {
      const next = { ...referential[id], ...partial, id };
      await db.upsertReferential(next, user.id);
      setReferential(prev => ({ ...prev, [id]: next }));
    },
    deleteReferentialItem: async (id) => {
      await db.deleteReferentialDB(id);
      setReferential(prev => {
        const next = { ...prev };
        delete next[id];
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
    updateStrategicMode: async (val) => {
      await db.upsertUserSetting('pedagotrack_strategic_mode', val, user.id);
      setStrategicMode(val);
    },

    // Kirkpatrick
    kpEdits,
    getMergedKirkpatrick,
    updateKirkpatrick,
    resetKirkpatrick,

    // Meta
    pendingChanges,
    hasEdits: pendingChanges.enseignants + pendingChanges.sessions > 0,
  };
}
