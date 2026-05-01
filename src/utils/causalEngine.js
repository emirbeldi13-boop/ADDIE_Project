import { CAUSAL_MAP } from '../constants/causalMap.js';

/**
 * CAUSAL ENGINE
 * Implementation of the RCET Causal Diagnostic Logic
 */

/**
 * Modules catalogue dont les targetedComps incluent rootRc ; IPF du module prioritaire (IPF max).
 */
export function resolveCatalogFormationForRc(rootRcId, referentialMap) {
  const modules = Object.values(referentialMap || {}).filter(
    (m) => m && typeof m === 'object' && Array.isArray(m.targetedComps) && m.targetedComps.includes(rootRcId)
  );
  if (!modules.length) return { formation: null, alternatives: [], ipf: 3 };
  
  // Sort by IPF descending
  const sorted = [...modules].sort((a, b) => (b.ipf ?? 0) - (a.ipf ?? 0));
  
  return { 
    formation: sorted[0], 
    alternatives: sorted.slice(1, 3), // Get next top 2
    topThree: sorted.slice(0, 3),
    ipf: sorted[0]?.ipf ?? 3 
  };
}

/**
 * Remonte toutes les branches déficitaires : union des racines terminales (chemins multiples).
 */
export function collectTerminalRoots(rcId, scores, threshold = 2.5, referential = {}) {
  const roots = new Set();

  const descend = (id) => {
    const comp = CAUSAL_MAP[id];
    const cur = scores[id] ?? 0;
    const target = referential[id]?.targetScore || 4.0;
    const gap = target - cur;

    if (!comp) {
      if (gap >= threshold) roots.add(id);
      return;
    }
    if (gap < threshold) return;

    if (comp.prerequisites.length === 0) {
      roots.add(id);
      return;
    }

    const deficient = comp.prerequisites.filter((prId) => {
      const prTarget = referential[prId]?.targetScore || 4.0;
      const prGap = prTarget - (scores[prId] ?? 0);
      return prGap >= threshold;
    });

    if (deficient.length === 0) {
      roots.add(id);
      return;
    }

    deficient.forEach((prId) => descend(prId));
  };

  descend(rcId);
  return Array.from(roots);
}

/** Distribution A/B/C pour un ensemble d'enseignants */
export function summarizeReliabilityABC(participants) {
  const dist = { A: 0, B: 0, C: 0 };
  participants.forEach((p) => {
    const r = getDataReliability(p);
    dist[r.level]++;
  });
  const n = participants.length || 1;
  return {
    dist,
    pct: {
      A: Math.round((dist.A / n) * 100),
      B: Math.round((dist.B / n) * 100),
      C: Math.round((dist.C / n) * 100),
    },
    missingFourSources: participants.filter((p) => getDataReliability(p).count < 4).length,
  };
}

/** Compensations selon CS (prompt § Étape 4) */
export function buildDebtCompensationPlan(debtLevel, csScore, unsatisfiedPrereqs, symptomLabels) {
  const prereqLabel = unsatisfiedPrereqs?.length
    ? unsatisfiedPrereqs.join(', ')
    : 'les prérequis';

  let reservePct = 20;
  let transferInsufficientPct = Math.round((1 - csScore) * 100);
  if (debtLevel === 'light') reservePct = 15;
  else if (debtLevel === 'severe') reservePct = 35;
  else if (debtLevel === 'blocking') reservePct = 50;

  transferInsufficientPct = Math.min(95, Math.max(15, transferInsufficientPct));

  const m2Criterion = `Critère d'alerte à M+2 : si taux de réalisation PAP sur la cible < 50%, confirmer la dette (${prereqLabel}) et planifier une intervention prioritaire au trimestre suivant.`;

  return {
    reservePct,
    transferInsufficientPct,
    m2Criterion,
    riskLine: `Probabilité de transfert insuffisant estimée à ~${transferInsufficientPct}% (CS = ${csScore?.toFixed(1)}, données agrégées). Ce risque est probabiliste, pas une certitude.`,
    remedLine: `Réserver ~${reservePct}% du temps de session pour consolider ${prereqLabel} avant la cible ; renforcer l'ARE à M+2 sur ces RC ; orienter les observations post-formation prioritairement vers ${prereqLabel}.`,
    survLine: m2Criterion,
  };
}

/**
 * Fusion de chaînes : écart <15%, même niveau carte OU même famille catalogue, faisabilité session (durée catalogue si présente).
 */
export function evaluateFusionPair(a, b) {
  const denom = Math.max(a.scoreCausal, b.scoreCausal, 1e-6);
  const gapRatio = Math.abs(a.scoreCausal - b.scoreCausal) / denom;
  const scoresClose = gapRatio < 0.15;

  const levelA = CAUSAL_MAP[a.rootId]?.level;
  const levelB = CAUSAL_MAP[b.rootId]?.level;
  const sameCartLevel = levelA !== undefined && levelA === levelB;

  const famA = a.formation?.family ?? '';
  const famB = b.formation?.family ?? '';
  const sameFamily = famA && famB && famA === famB;

  const durA = parseFloat(String(a.formation?.duration ?? '').replace(',', '.')) || 5;
  const durB = parseFloat(String(b.formation?.duration ?? '').replace(',', '.')) || 5;
  const feasibilitySession = durA <= 5.5 && durB <= 5.5 && durA + durB <= 10;

  const fusionEligible = scoresClose && (sameCartLevel || sameFamily) && feasibilitySession;

  return {
    fusionEligible,
    scoresClose,
    sameCartLevel,
    sameFamily,
    feasibilitySession,
    gapRatio,
  };
}

export function findFusionSuggestions(processingOrder) {
  const out = [];
  for (let i = 0; i < processingOrder.length; i++) {
    for (let j = i + 1; j < processingOrder.length; j++) {
      const evalPair = evaluateFusionPair(processingOrder[i], processingOrder[j]);
      if (evalPair.fusionEligible || evalPair.scoresClose) {
        out.push({ i, j, a: processingOrder[i], b: processingOrder[j], ...evalPair });
      }
    }
  }
  return out;
}

export const getCausalRoot = (rcId, scores, threshold = 2.5, referential = {}) => {
  const comp = CAUSAL_MAP[rcId];
  if (!comp) return { id: rcId, score: scores[rcId] || 0 };

  const currentScore = scores[rcId] || 0;
  const target = referential[rcId]?.targetScore || 4.0;
  const currentGap = target - currentScore;

  // Rule: If current gap is below threshold, the chain stops here.
  if (currentGap < threshold) {
    return null;
  }

  // If no prerequisites, this is a level 0 root.
  if (comp.prerequisites.length === 0) {
    return { id: rcId, score: currentScore, isAbsoluteRoot: true };
  }

  // Find the most deficient prerequisite (highest gap)
  let worstPrereq = null;
  let maxGap = -1;

  for (const prId of comp.prerequisites) {
    const prScore = scores[prId] || 0;
    const prTarget = referential[prId]?.targetScore || 4.0;
    const prGap = prTarget - prScore;

    if (prGap >= threshold && prGap > maxGap) {
      maxGap = prGap;
      worstPrereq = prId;
    }
  }

  // If all prerequisites are satisfied, the target itself is the root of its chain.
  if (!worstPrereq) {
    return { id: rcId, score: currentScore };
  }

  // Recursive call to find the root of the worst prerequisite.
  return getCausalRoot(worstPrereq, scores, threshold, referential);
};

/**
 * Propagates downstream (recursively) to find all unique RCs blocked by a root.
 */
export const getBlockedRCs = (rootId) => {
  const blocked = new Set();
  
  const propagate = (id) => {
    const comp = CAUSAL_MAP[id];
    if (!comp) return;
    
    comp.dependents.forEach(depId => {
      if (!blocked.has(depId)) {
        blocked.add(depId);
        propagate(depId);
      }
    });
  };
  
  propagate(rootId);
  return Array.from(blocked);
};

/**
 * PHASE 3: CS Adjustment based on Prerequisite Robustness
 */
export const getRobustnessMultiplier = (robustnessLevel) => {
  switch (robustnessLevel) {
    case 'robust': return 1.0;
    case 'probable': return 0.9;
    case 'preliminary': return 0.7;
    case 'insufficient': return 0.5;
    default: return 1.0;
  }
};

/**
 * Calculates the Causal Score with Robustness Adjustment
 */
export const calculateCausalScore = (rootId, rootScore, blockedCount, ipf = 1, robustnessLevel = 'robust') => {
  const deficit = Math.max(0, 5 - rootScore);
  const multiplier = getRobustnessMultiplier(robustnessLevel);
  const baseScore = deficit * (blockedCount || 1) * ipf;
  return {
    score: baseScore * multiplier,
    baseScore,
    multiplier,
    robustnessLevel
  };
};

/**
 * Measures Pedagogical Debt:
 * Returns a value between 0 (blocking) and 1 (null debt).
 */
export const calculatePedagogicalDebt = (targetId, scores, threshold = 2.5, referential = {}) => {
  const comp = CAUSAL_MAP[targetId];
  if (!comp || comp.prerequisites.length === 0) {
    return { score: 1.0, level: 'null', unsatisfied: [] };
  }

  const unsatisfied = comp.prerequisites.filter(prId => {
    const prTarget = referential[prId]?.targetScore || 4.0;
    const prGap = prTarget - (scores[prId] || 0);
    return prGap >= threshold;
  });

  if (unsatisfied.length === 0) return { score: 1.0, level: 'null', unsatisfied: [] };

  const avgPrereqScore = unsatisfied.reduce((acc, prId) => acc + (scores[prId] || 0), 0) / unsatisfied.length;
  const avgTarget = unsatisfied.reduce((acc, prId) => acc + (referential[prId]?.targetScore || 4.0), 0) / unsatisfied.length;
  const avgGap = avgTarget - avgPrereqScore;

  if (avgGap > threshold * 1.5) return { score: 0.0, level: 'blocking', unsatisfied };
  if (avgGap > threshold * 1.2) return { score: 0.4, level: 'severe', unsatisfied };
  return { score: 0.7, level: 'light', unsatisfied };
};

/**
 * Reliability Weighting (Source Counting)
 */
export const getDataReliability = (teacher) => {
  let sources = 0;
  // Source 1: Autopositionnement
  if (teacher.avgAutoposScore != null) sources++;
  // Source 2: Observation directe (Inspecteur)
  if (teacher.temporalObsScore != null || teacher.hasVisit) sources++;

  if (sources >= 2) return { level: 'A', label: 'Élevé', confidence: 'Fiable', count: sources };
  if (sources >= 1) return { level: 'B', label: 'Modéré', confidence: 'Probable', count: sources };
  return { level: 'C', label: 'Indicatif', confidence: 'Incertain', count: sources };
};

/**
 * PHASE 2: Calculate Robustness Index (4 levels)
 */
export const calculateRobustnessIndex = (participants, totalInCirco) => {
  const sampleSize = participants.length;
  const quorum = totalInCirco > 0 ? (sampleSize / totalInCirco) : 0;
  
  // Calculate source distribution for transparency
  const sourceDist = { auto: 0, obs: 0 };
  participants.forEach(p => {
    if (p.avgAutoposScore != null) sourceDist.auto++;
    if (p.temporalObsScore != null || p.hasVisit) sourceDist.obs++;
  });

  const avgSources = participants.length > 0 
    ? (sourceDist.auto + sourceDist.obs) / participants.length 
    : 0;
  
  const sourcePercentages = {
    auto: Math.round((sourceDist.auto / sampleSize) * 100) || 0,
    obs: Math.round((sourceDist.obs / sampleSize) * 100) || 0,
  };

  if (quorum < 0.30) {
    return { level: 'insufficient', label: 'Insuffisant', color: '#E74C3C', icon: 'AlertCircle', quorum, avgSources, sourcePercentages };
  }
  
  if (quorum >= 0.60 && avgSources >= 1.5) {
    return { level: 'robust', label: 'Robuste', color: '#27AE60', icon: 'ShieldCheck', quorum, avgSources, sourcePercentages };
  }
  
  if (quorum >= 0.30 && avgSources >= 1.2) {
    return { level: 'probable', label: 'Probable', color: '#F1C40F', icon: 'CheckCircle', quorum, avgSources, sourcePercentages };
  }
  
  return { level: 'preliminary', label: 'Préliminaire', color: '#E67E22', icon: 'Activity', quorum, avgSources, sourcePercentages };
};
