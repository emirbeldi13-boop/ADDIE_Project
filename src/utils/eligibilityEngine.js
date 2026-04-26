/**
 * Moteur d'Éligibilité et de Sélection ADDIE STUDIO
 * Basé sur la logique proposée par M. Amir Beldi
 */

/**
 * Calcule le déficit pour une compétence donnée.
 * Déficit (RC_i) = Niveau souhaité (4.0) - Score réel moyen
 * @param {number} avgScore - Moyenne des scores observés/autopositionnés
 * @returns {number} Le déficit (min 0)
 */
export const calculateDeficit = (avgScore) => {
  const TARGET_LEVEL = 4.0;
  return Math.max(0, TARGET_LEVEL - avgScore);
};

/**
 * Détermine le niveau de criticité d'un déficit
 */
export const getDeficitStatus = (deficit) => {
  if (deficit > 2.0) return 'critique';
  if (deficit >= 1.0) return 'significatif';
  if (deficit > 0) return 'faible';
  return 'acquis';
};

/**
 * Calcule l'Indice de Priorité Terrain (IPT)
 * Mesure à quel point les compétences ciblées par une formation sont déficitaires dans le groupe.
 * IPT = Moyenne des déficits des RC ciblées * Taux de couverture
 * @param {string[]} targetedComps - Liste des codes RC ciblées (ex: ["RC3", "RC5"])
 * @param {Object} groupStats - Statistiques du groupe par RC { RC1: { deficit, coverage }, ... }
 */
export const calculateIPT = (targetedComps, groupStats) => {
  if (!targetedComps || targetedComps.length === 0) return 0;
  
  let totalDeficit = 0;
  let totalCoverage = 0;
  
  targetedComps.forEach(rcId => {
    const stat = groupStats[rcId] || { deficit: 0, coverage: 100 };
    totalDeficit += stat.deficit || 0;
    totalCoverage += stat.coverage || 100;
  });
  
  const avgDeficit = totalDeficit / targetedComps.length;
  const avgCoverage = totalCoverage / targetedComps.length;
  
  // Normalisation : 100% = Déficit maximal (4.0)
  // On pondère par la couverture
  const baseIPT = (avgDeficit / 4.0) * 100;
  return baseIPT * (avgCoverage / 100);
};

/**
 * Calcule le Coefficient de Séquençage (CS)
 * @param {Object} formation - La formation du catalogue
 * @param {string[]} completedFormations - Liste des IDs de formations déjà réalisées par le groupe
 */
export const calculateCS = (formation, completedFormations = []) => {
  const { id, prerequisites } = formation;
  
  if (!prerequisites || prerequisites.length === 0) return 1.0;
  
  // Logique spéciale pour les OR (ex: F1.3 nécessite F1.1 OU F1.2)
  if (id === "F1.3") {
    return completedFormations.includes("F1.1") || completedFormations.includes("F1.2") ? 1.0 : 0.4;
  }

  // Logique générale : tous les prérequis doivent être présents
  const satisfiedCount = prerequisites.filter(p => completedFormations.includes(p)).length;
  
  if (satisfiedCount === prerequisites.length) return 1.0;
  if (satisfiedCount > 0) return 0.7;
  return 0.4;
};

/**
 * Calcule le score d'éligibilité final
 * Score final = (IPF × IPT) × CS
 */
export const calculateEligibilityScore = (ipf, ipt, cs) => {
  return (ipf * ipt) * cs;
};

/**
 * Recommande un statut basé sur le score final
 */
export const getRecommendationLabel = (score) => {
  if (score > 150) return "Fortement recommandée";
  if (score > 100) return "Recommandée";
  if (score > 50) return "Pertinente";
  return "À envisager plus tard";
};

/**
 * Triangulation des besoins
 * Un besoin est confirmé s'il est identifié par au moins 2 sources.
 * Sources possibles: autopos, observation, transfert, documentaire
 */
export const getTriangulationLevel = (sourcesCount) => {
  if (sourcesCount >= 3) return { label: "Prioritaire absolu", color: "text-red-600", bg: "bg-red-50", count: sourcesCount };
  if (sourcesCount === 2) return { label: "Confirmé", color: "text-amber-600", bg: "bg-amber-50", count: sourcesCount };
  if (sourcesCount === 1) return { label: "À surveiller", color: "text-blue-600", bg: "bg-blue-50", count: sourcesCount };
  return { label: "Non identifié", color: "text-gray-400", bg: "bg-gray-50", count: 0 };
};
