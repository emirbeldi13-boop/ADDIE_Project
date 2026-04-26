/**
 * Score calculation utilities for PedagoTrack
 * Implements §1.1, §1.2, §2.5–§2.8, §3.1 from the specification
 */

import { parseFRDate } from './dateUtils';

// ─── Legacy UI helpers (preserved) ───────────────────────────────────────────

export function getRecommandationClass(recommandation) {
  switch (recommandation) {
    case 'Prioritaire': return 'bg-red-100 text-red-800 border border-red-200';
    case 'Sélectionnable': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case "Liste d'attente": return 'bg-gray-100 text-gray-600 border border-gray-200';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function getNoteClass(note) {
  if (note === null || note === undefined || note === '—') return '';
  const n = parseFloat(note);
  if (n >= 16) return 'exceptional';
  if (n >= 14) return 'good';
  if (n >= 12) return 'average';
  return 'low';
}

export function isExceptional(note) {
  if (!note || note === '—') return false;
  return parseFloat(note) >= 16;
}

export function getDelaiClass(delai) {
  if (delai === null || delai === '—') return '';
  const d = parseInt(delai);
  if (d > 72) return 'text-red-600 font-semibold';
  if (d > 48) return 'text-orange-500';
  return 'text-green-700';
}

export function getSatisfactionClass(score) {
  const s = parseFloat(score);
  if (s >= 4.0) return 'text-green-700';
  if (s >= 3.0) return 'text-yellow-600';
  return 'text-red-600';
}

export function getProgressionClass(delta) {
  const d = parseFloat(delta);
  if (d >= 1.5) return 'text-green-700';
  if (d >= 0.8) return 'text-yellow-600';
  return 'text-red-600';
}

export function getTransfertStatutClass(statut) {
  switch (statut) {
    case 'Effectif': return 'bg-green-100 text-green-800';
    case 'Partiel': return 'bg-yellow-100 text-yellow-800';
    case 'Insuffisant': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export function computeOPPRate(acquis, formation, opId) {
  const filtered = acquis.filter(a => a['Formation'] === formation);
  if (!filtered.length) return null;
  const atteints = filtered.filter(a => a[`${opId} atteint?`] === 'Oui').length;
  return Math.round((atteints / filtered.length) * 100);
}

export function computeAvgSatisfaction(satisfaction, formation, circo) {
  let data = satisfaction;
  if (formation) data = data.filter(s => s['Formation'] === formation);
  if (circo) data = data.filter(s => s['Circo'] === circo);
  if (!data.length) return null;
  const total = data.reduce((sum, s) => sum + (parseFloat(s['Score global /5']) || 0), 0);
  return (total / data.length).toFixed(2);
}

export function computeAvgProgression(acquis, formation) {
  let data = acquis;
  if (formation) data = data.filter(a => a['Formation'] === formation);
  if (!data.length) return null;
  const total = data.reduce((sum, a) => sum + (parseFloat(a['Delta progression']) || 0), 0);
  return (total / data.length).toFixed(2);
}

// ─── §5.2 Visit note validation (.0 or .5 only, ≥16 = exceptional) ─────────────

export function validateVisitNote(noteStr) {
  if (noteStr === '' || noteStr === null || noteStr === undefined || noteStr === '—') {
    return { valid: true, value: null };
  }
  const n = parseFloat(noteStr);
  if (isNaN(n)) return { valid: false, error: 'Valeur numérique requise' };
  if (n < 0 || n > 20) return { valid: false, error: 'Note entre 0 et 20' };
  const decimal = Math.round((n % 1) * 10) / 10;
  if (decimal !== 0 && decimal !== 0.5) {
    return { valid: false, error: 'Seules les décimales .0 et .5 sont valides (ex: 12.0, 14.5, 16.0)' };
  }
  return { valid: true, value: n, exceptional: n >= 16 };
}

// ─── §1.1 Single visit score ──────────────────────────────────────────────────
// scores: { C1: 3, C2: null, ... }  — null = not filled
// weights: { C1: 15, C2: 25, ... } — raw integer or decimal weights; auto-normalize

export function computeVisitScore(scores, weights, filter) {
  const allComps = (filter && filter.length > 0) ? filter : Object.keys(scores);
  const filled = allComps.filter(c => {
    const v = scores[c];
    return v !== null && v !== undefined && !isNaN(parseFloat(v));
  });
  if (!filled.length) return { score: null, partial: false, missing: [] };

  const missing = allComps.filter(c => !filled.includes(c));
  const partial = missing.length > 0;

  // Sum weights of filled competencies only
  const totalW = filled.reduce((s, c) => s + (parseFloat(weights?.[c]) || 1), 0);
  if (totalW === 0) return { score: null, partial, missing };

  const weightedSum = filled.reduce((s, c) => {
    return s + parseFloat(scores[c]) * ((parseFloat(weights?.[c]) || 1) / totalW);
  }, 0);

  return {
    score: parseFloat(weightedSum.toFixed(3)),
    partial,
    missing,
  };
}

// ─── §1.2 Temporal weighted score across multiple visits ───────────────────────
// visitScores: [{ visitScore: number, date: 'DD/MM/YYYY' }, ...]
// coefficients: [1.0, 0.6, 0.3, 0.1]  (most-recent first)

export function computeTemporalScore(visitScores, coefficients) {
  if (!visitScores || visitScores.length === 0) return null;
  const coeffs = coefficients || [1.0, 0.6, 0.3, 0.1];

  // Sort newest first
  const sorted = [...visitScores]
    .filter(v => v.visitScore !== null && v.visitScore !== undefined && !isNaN(v.visitScore))
    .sort((a, b) => (parseFRDate(b.date) || new Date(0)) - (parseFRDate(a.date) || new Date(0)));

  if (!sorted.length) return null;

  let weightedSum = 0, totalCoeff = 0;
  sorted.forEach((v, i) => {
    const coeff = i < coeffs.length ? coeffs[i] : coeffs[coeffs.length - 1];
    weightedSum += v.visitScore * coeff;
    totalCoeff += coeff;
  });
  return parseFloat((weightedSum / totalCoeff).toFixed(3));
}

// ─── Normalize a value to [0, 5] range ─────────────────────────────────────────

export function normalizeToFive(value, min, max) {
  if (value === null || value === undefined || isNaN(value)) return null;
  if (max <= min) return 2.5;
  return parseFloat(Math.min(5, Math.max(0, ((value - min) / (max - min)) * 5)).toFixed(3));
}

// ─── Average autopositionnement score on specific competencies ──────────────────
// autoData: full autopositionnement array from JSON
// ensId: teacher ID
// competencies: ['C2', 'C3', 'C4'] or null = all

export function computeAvgAutopos(autoData, ensId, competencies) {
  const filtered = autoData.filter(a => {
    const matchEns = a['ID Enseignant'] === ensId;
    const matchComp = !competencies || competencies.length === 0 || competencies.includes(a['Compétence']);
    return matchEns && matchComp;
  });
  if (!filtered.length) return null;
  const sum = filtered.reduce((s, a) => s + (parseFloat(a['Score (1-5)']) || 0), 0);
  return parseFloat((sum / filtered.length).toFixed(3));
}

// ─── §2.5 Group A score (unvisited trainees) ───────────────────────────────────
// Returns avg autopos on targeted competencies

export function computeGroupAScore(autoData, ensId, targetedComps) {
  return computeAvgAutopos(autoData, ensId, targetedComps || ['C2', 'C3', 'C4']);
}

// ─── §2.6 Group B score (visited trainees) ─────────────────────────────────────
// groupBScore = autopos × 0.40 + temporal_obs × 0.60 (configurable)

export function computeGroupBScore(autoposScore, temporalObsScore, weights) {
  const wa = weights?.autopos ?? 0.40;
  const wo = weights?.obs ?? 0.60;
  const total = wa + wo;
  const waNorm = wa / total;
  const woNorm = wo / total;

  if (autoposScore === null && temporalObsScore === null) return null;
  if (autoposScore === null) return parseFloat(temporalObsScore.toFixed(3));
  if (temporalObsScore === null) return parseFloat(autoposScore.toFixed(3));
  return parseFloat((autoposScore * waNorm + temporalObsScore * woNorm).toFixed(3));
}

// ─── §2.8 Formation-specific score ────────────────────────────────────────────
// Same formula as Group B but on formation-targeted competencies

export function computeFormationScore(autoposScore, obsScore, weights) {
  return computeGroupBScore(autoposScore, obsScore, weights);
}

// ─── §2.7 Global score for tenured teachers ───────────────────────────────────
// rawValues: { autopos, obs_temporal, note_visite, delai_visite, anciennete }
// criteria: [{ id, label, direction, weight, disabled }]
// minMaxMap: { autopos: {min, max}, ... } — computed across all tenured teachers

export function computeGlobalScoreTenured(rawValues, criteria, minMaxMap) {
  const active = criteria.filter(c => !c.disabled);
  if (!active.length) return { score: null, partial: false, missing: [] };

  let weightedSum = 0;
  let totalWeightUsed = 0;
  const totalWeightConfigured = active.reduce((s, c) => s + c.weight, 0);
  const missing = [];

  for (const c of active) {
    const raw = rawValues[c.id];
    if (raw === null || raw === undefined || isNaN(raw)) {
      missing.push(c.label || c.id);
      continue;
    }
    const mm = minMaxMap[c.id] || { min: 0, max: 5 };
    let norm = normalizeToFive(raw, mm.min, mm.max);
    if (norm === null) { missing.push(c.label || c.id); continue; }

    // Apply direction: 'inversed' means low raw value → high urgency
    if (c.direction === 'inversed') norm = 5 - norm;

    weightedSum += norm * c.weight;
    totalWeightUsed += c.weight;
  }

  if (totalWeightUsed === 0) return { score: null, partial: true, missing };

  // Re-normalize to account for missing criteria: scale to what was configured
  const score = parseFloat((weightedSum / totalWeightConfigured * (totalWeightConfigured / totalWeightUsed)).toFixed(3));

  return {
    score,
    partial: missing.length > 0,
    missing,
  };
}

// ─── §3.1 Needs analysis — deficit calculation ────────────────────────────────
// targetLevel: default 4.0
// actualAvg: average score for that competency across all teachers

export function computeDeficit(actualAvg, targetLevel) {
  if (actualAvg === null || isNaN(actualAvg)) return null;
  return parseFloat((targetLevel - actualAvg).toFixed(3));
}

// themeRelevanceScore = deficit×0.40 + studentImpact×0.35 + feasibility×0.25
export function computeThemeRelevance(deficit, studentImpact, feasibility, weights) {
  const wd = weights?.deficit ?? 0.40;
  const wi = weights?.studentImpact ?? 0.35;
  const wf = weights?.feasibility ?? 0.25;
  const total = wd + wi + wf;
  const vals = [
    [deficit ?? 0, wd],
    [studentImpact ?? 0, wi],
    [feasibility ?? 0, wf],
  ];
  return parseFloat(vals.reduce((s, [v, w]) => s + v * (w / total), 0).toFixed(3));
}
