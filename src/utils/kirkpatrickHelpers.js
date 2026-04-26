/**
 * Helpers for Kirkpatrick Evaluation Framework
 */

/**
 * Calculates the N2 Learning (Acquis) score.
 * Formula: Post-test - Pre-test (normalized to 5)
 * Returns null if data is missing.
 */
export function calculateN2Delta(pre, post) {
  if (pre === null || pre === undefined || post === null || post === undefined) {
    return null;
  }
  const delta = parseFloat(post) - parseFloat(pre);
  return parseFloat(delta.toFixed(2));
}

/**
 * Determines the PAP score and its source for Level 3.
 * Prioritizes 'Observation' over 'Auto-assessment'.
 */
export function getN3PAPInfo(obsScore, autoScore) {
  if (obsScore !== null && obsScore !== undefined) {
    return { score: obsScore, source: 'Observation directe' };
  }
  if (autoScore !== null && autoScore !== undefined) {
    return { score: autoScore, source: 'Auto-évaluation' };
  }
  return { score: null, source: null };
}

/**
 * Formats a score for display, handling the "données indisponibles" case.
 */
export function formatKPScore(score, missingReason = null) {
  if (score === null || score === undefined) {
    return missingReason ? `Données indisponibles (${missingReason})` : 'Données indisponibles';
  }
  return `${parseFloat(score).toFixed(2)}/5`;
}
