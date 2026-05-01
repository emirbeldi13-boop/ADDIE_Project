export const CAUSAL_MAP = {
  RC1: {
    label: "Éthique & Responsabilité",
    prerequisites: [],
    dependents: ["RC10"],
    level: 0,
    role: "Ancrage déontologique"
  },
  RC2: {
    label: "Savoirs Disciplinaires",
    prerequisites: [],
    dependents: ["RC3", "RC5"],
    level: 0,
    role: "Matière première de la transposition"
  },
  RC4: {
    label: "Langues d'Enseignement",
    prerequisites: [],
    dependents: ["RC3"],
    level: 0,
    role: "Vecteur de communication pédagogique"
  },
  RC3: {
    label: "Maîtriser la didactique disciplinaire",
    prerequisites: ["RC2", "RC4"],
    dependents: ["RC5", "RC6", "RC12"],
    level: 1,
    logic: "On ne transpose pas ce qu'on ne maîtrise pas."
  },
  RC5: {
    label: "Conception & Planification",
    prerequisites: ["RC2", "RC3"],
    dependents: ["RC6", "RC7", "RC8"],
    level: 1,
    logic: "Concevoir suppose de maîtriser contenus et démarches."
  },
  RC6: {
    label: "Mise en œuvre Pédagogique",
    prerequisites: ["RC3", "RC5"],
    dependents: ["RC9", "RC12"],
    level: 2,
    logic: "Exécution de ce qui a été conçu selon la didactique."
  },
  RC7: {
    label: "Évaluation des Apprentissages",
    prerequisites: ["RC5", "RC6"],
    dependents: ["RC8", "RC9", "RC11"],
    level: 2,
    logic: "Évaluation des objectifs à travers les situations."
  },
  RC8: {
    label: "Gestion de la Progression",
    prerequisites: ["RC5", "RC7"],
    dependents: ["RC9"],
    level: 2,
    logic: "Suppose planification et données d'évaluation."
  },
  RC9: {
    label: "Prise en compte de la diversité",
    prerequisites: ["RC6", "RC7", "RC8"],
    dependents: [],
    level: 3,
    logic: "Différencier suppose maîtriser modalités, profils et progression."
  },
  RC10: {
    label: "Coopération & Partenariat",
    prerequisites: ["RC1"],
    dependents: [],
    level: 4,
    logic: "S'ancre dans une posture éthique."
  },
  RC11: {
    label: "Développement Professionnel",
    prerequisites: ["RC5", "RC6", "RC7"],
    dependents: [],
    level: 4,
    logic: "Réflexivité sur ses pratiques."
  },
  RC12: {
    label: "Technologies Numériques",
    prerequisites: ["RC3", "RC6"],
    dependents: [],
    level: 4,
    logic: "Outil de mise en œuvre contextualisé."
  }
};
