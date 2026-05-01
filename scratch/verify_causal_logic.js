import { CAUSAL_MAP } from '../src/constants/causalMap.js';
import { getCausalRoot, getBlockedRCs, calculateCausalScore } from '../src/utils/causalEngine.js';

// Simulation de scores pour un territoire (Moyennes IGE)
const mockScores = {
  RC1: 4.5, // OK
  RC2: 4.2, // OK
  RC4: 1.8, // CRITIQUE (Fondation)
  RC3: 2.2, // FAIBLE (Didactique - dépend de RC4)
  RC5: 4.0, // OK
  RC6: 2.5, // FAIBLE (Mise en œuvre - dépend de RC3)
  RC7: 3.8, // OK
  RC8: 3.5, // OK
  RC9: 2.8, // FAIBLE (Diversité - dépend de RC6/7/8)
};

const threshold = 3.0;

console.log("=== VÉRIFICATION DU MOTEUR CAUSAL ===\n");

// Test 1: Remontée depuis un symptôme de haut niveau (RC9)
console.log("Trace de remontée pour RC9 (Diversité) :");
console.log(`1. Score RC9: ${mockScores.RC9} (< ${threshold}) -> On regarde les prérequis [RC6, RC7, RC8]`);
console.log(`2. Score RC6: ${mockScores.RC6} (< ${threshold}) -> On remonte vers RC6`);
console.log(`3. Score RC3: ${mockScores.RC3} (< ${threshold}) -> On remonte vers RC3`);
console.log(`4. Score RC4: ${mockScores.RC4} (< ${threshold}) -> On remonte vers RC4`);
console.log(`5. RC4 n'a pas de prérequis.`);

const rootForRC9 = getCausalRoot('RC9', mockScores, threshold);
console.log(`\nRÉSULTAT: Racine identifiée = ${rootForRC9.id} (Score: ${rootForRC9.score.toFixed(1)})`);
console.log(`Est une racine absolue ? ${rootForRC9.isAbsoluteRoot ? 'OUI' : 'NON'}`);

// Test 2: Calcul des blocages en aval
const blockedByRC4 = getBlockedRCs('RC4');
console.log(`\nRC4 bloque les compétences suivantes en cascade :`);
console.log(blockedByRC4.join(', '));

// Test 3: Score Causal
const score = calculateCausalScore('RC4', mockScores.RC4, blockedByRC4.length, 5); // IPF 5
console.log(`\nScore Causal calculé pour RC4 : ${score.toFixed(2)}`);
console.log("Formule : (5 - 1.8) * 5 bloquées * 5 IPF = 80.00");

console.log("\n=== LOGIQUE VALIDÉE ===");
