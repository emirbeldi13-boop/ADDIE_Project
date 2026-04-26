/**
 * formationMatcher.js
 * Logic for matching teachers to sessions and validating CREFOC readiness.
 */

/**
 * Analyzes a session's compatibility with its venue (CREFOC)
 * @param {Object} formation - Formation definition
 * @param {Object} crefoc - CREFOC definition
 * @returns {Object} { canHost: boolean, missing: string[], score: number }
 */
export function analyzeVenueReadiness(formation, crefoc) {
  const reqs = formation?.techRequirements || [];
  const logistics = crefoc?.logistics || {};
  
  const missing = reqs.filter(r => !logistics[r]);
  const score = reqs.length === 0 ? 100 : Math.round(((reqs.length - missing.length) / reqs.length) * 100);
  
  return {
    canHost: missing.length === 0,
    missing,
    score
  };
}

/**
 * Calculates a match score for a teacher vs a formation
 * @param {Object} teacher - Enriched teacher record from buildPriorityList
 * @param {string} formationId - F1, F2, F3...
 * @returns {number} 0-100 (Higher = more suitable/urgent)
 */
export function calculateTeacherMatchScore(teacher, formationId) {
  // If teacher is unavailable, score is 0
  if (teacher.availabilityStatus === 'unavailable') return 0;
  
  // We prioritize teachers based on their priorityRank (which already considers competence gaps)
  // Higher rank (1 is top) = higher score
  const rank = teacher.priorityRank || 999;
  
  // Base score from rank
  let score = Math.max(0, 100 - (rank * 2));
  
  // Bonus if they have a specific override
  if (teacher.isOverridden) score += 20;
  
  // Multiplier for trainees
  if (teacher.priorityGroup === 'group-a' || teacher.priorityGroup === 'group-b') {
    score *= 1.2;
  }
  
  return Math.min(100, Math.round(score));
}
