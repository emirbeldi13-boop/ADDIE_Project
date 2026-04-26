export const CATALOGUE_FORMATIONS = {
  // Famille 1 — Maîtrise linguistique et disciplinaire
  "F1.1": {
    id: "F1.1",
    libelle: "Perfectionnement de la compétence orale en italien",
    targetedComps: ["RC4"],
    ipf: 5,
    requirements: ["internet", "micro"],
    prerequisites: [],
    family: "Linguistique"
  },
  "F1.2": {
    id: "F1.2",
    libelle: "Perfectionnement de la compétence écrite en italien",
    targetedComps: ["RC4"],
    ipf: 5,
    requirements: ["internet", "projecteur"],
    prerequisites: [],
    family: "Linguistique"
  },
  "F1.3": {
    id: "F1.3",
    libelle: "Linguistique contrastive italien / français / arabe",
    targetedComps: ["RC2", "RC4"],
    ipf: 3,
    requirements: ["projecteur"],
    prerequisites: ["F1.1", "F1.2"], // F1.1 OU F1.2 selon prompt (on gérera la logique OU dans le moteur)
    family: "Linguistique"
  },
  "F1.4": {
    id: "F1.4",
    libelle: "Sociolinguistique de l'italien contemporain",
    targetedComps: ["RC2"],
    ipf: 2,
    requirements: ["projecteur"],
    prerequisites: ["F1.1", "F1.2"],
    family: "Linguistique"
  },
  "F1.5": {
    id: "F1.5",
    libelle: "Stylistique et analyse textuelle en italien",
    targetedComps: ["RC2", "RC3"],
    ipf: 3,
    requirements: ["internet", "tablettes"],
    prerequisites: ["F1.2", "F2.5"],
    family: "Linguistique"
  },
  "F1.6": {
    id: "F1.6",
    libelle: "Préparation aux certifications CILS / CELI / PLIDA",
    targetedComps: ["RC4"],
    ipf: 3,
    requirements: ["internet", "projecteur"],
    prerequisites: ["F1.1", "F1.2"],
    family: "Linguistique"
  },

  // Famille 2 — Didactique disciplinaire
  "F2.1": {
    id: "F2.1",
    libelle: "Didactique de l'ILE — approche communicative et actionnelle",
    targetedComps: ["RC3", "RC5"],
    ipf: 5,
    requirements: ["projecteur"],
    prerequisites: [],
    isPivot: true,
    family: "Didactique"
  },
  "F2.2": {
    id: "F2.2",
    libelle: "CECRL en pratique — descripteurs, niveaux, auto-évaluation",
    targetedComps: ["RC3", "RC7"],
    ipf: 5,
    requirements: ["projecteur"],
    prerequisites: ["F2.1"],
    family: "Didactique"
  },
  "F2.3": {
    id: "F2.3",
    libelle: "Didactique de la grammaire en contexte communicatif",
    targetedComps: ["RC3", "RC6"],
    ipf: 4,
    requirements: ["projecteur"],
    prerequisites: ["F2.1"],
    family: "Didactique"
  },
  "F2.4": {
    id: "F2.4",
    libelle: "Didactique de la phonétique et de la prononciation",
    targetedComps: ["RC3", "RC6"],
    ipf: 3,
    requirements: ["micro", "casques"],
    prerequisites: ["F1.1", "F2.1"],
    family: "Didactique"
  },
  "F2.5": {
    id: "F2.5",
    libelle: "Développement des compétences réceptives — CO et CE",
    targetedComps: ["RC3", "RC6"],
    ipf: 4,
    requirements: ["internet", "projecteur"],
    prerequisites: ["F2.1"],
    family: "Didactique"
  },
  "F2.6": {
    id: "F2.6",
    libelle: "Développement des compétences productives — EO et EE",
    targetedComps: ["RC3", "RC6"],
    ipf: 4,
    requirements: ["internet", "micro"],
    prerequisites: ["F2.1", "F2.5"],
    family: "Didactique"
  },
  "F2.7": {
    id: "F2.7",
    libelle: "Didactique du vocabulaire et de la sémantique",
    targetedComps: ["RC3", "RC6"],
    ipf: 3,
    requirements: ["projecteur", "tablettes"],
    prerequisites: ["F2.1", "F2.5"],
    family: "Didactique"
  },
  "F2.8": {
    id: "F2.8",
    libelle: "Cinéma et documents authentiques en classe d'italien",
    targetedComps: ["RC3", "RC6"],
    ipf: 3,
    prerequisites: ["F2.1", "F2.5", "F3.1"],
    family: "Didactique"
  },

  // Famille 3 — Ingénierie pédagogique
  "F3.1": {
    id: "F3.1",
    libelle: "Scénarisation pédagogique — conception de séquences",
    targetedComps: ["RC5", "RC8"],
    ipf: 5,
    prerequisites: [],
    isPivot: true,
    family: "Ingénierie"
  },
  "F3.2": {
    id: "F3.2",
    libelle: "Programmation annuelle et progressions cohérentes",
    targetedComps: ["RC5", "RC8"],
    ipf: 5,
    prerequisites: ["F3.1"],
    family: "Ingénierie"
  },
  "F3.3": {
    id: "F3.3",
    libelle: "Pédagogie par projets et tâches complexes",
    targetedComps: ["RC5", "RC6"],
    ipf: 4,
    prerequisites: ["F3.1", "F2.1", "F2.2"],
    family: "Ingénierie"
  },
  "F3.4": {
    id: "F3.4",
    libelle: "Gestion de la classe de langue",
    targetedComps: ["RC6", "RC8"],
    ipf: 4,
    prerequisites: ["F3.1"],
    family: "Ingénierie"
  },
  "F3.5": {
    id: "F3.5",
    libelle: "Psychologie de l'apprentissage des langues",
    targetedComps: ["RC6", "RC9"],
    ipf: 3,
    prerequisites: ["F2.1", "F3.1"],
    family: "Ingénierie"
  },
  "F3.6": {
    id: "F3.6",
    libelle: "Pédagogie positive et climat de classe",
    targetedComps: ["RC6", "RC9"],
    ipf: 3,
    prerequisites: ["F3.4"],
    family: "Ingénierie"
  },

  // Famille 4 — Évaluation
  "F4.1": {
    id: "F4.1",
    libelle: "Évaluation formative intégrée à la séquence",
    targetedComps: ["RC7", "RC8"],
    ipf: 5,
    prerequisites: ["F3.1"],
    family: "Évaluation"
  },
  "F4.2": {
    id: "F4.2",
    libelle: "Construction de grilles critériées en italien",
    targetedComps: ["RC7"],
    ipf: 5,
    prerequisites: ["F4.1", "F2.2"],
    family: "Évaluation"
  },
  "F4.3": {
    id: "F4.3",
    libelle: "Évaluation des compétences selon le CECRL",
    targetedComps: ["RC7", "RC3"],
    ipf: 4,
    prerequisites: ["F2.2", "F4.1", "F4.2"],
    family: "Évaluation"
  },
  "F4.4": {
    id: "F4.4",
    libelle: "Feedback correctif et régulation pédagogique",
    targetedComps: ["RC7", "RC8"],
    ipf: 4,
    prerequisites: ["F4.1", "F3.1"],
    family: "Évaluation"
  },
  "F4.5": {
    id: "F4.5",
    libelle: "Auto-évaluation et co-évaluation entre élèves",
    targetedComps: ["RC7", "RC9"],
    ipf: 3,
    prerequisites: ["F4.1", "F4.2", "F3.6"],
    family: "Évaluation"
  },

  // Famille 5 — Différenciation et inclusion
  "F5.1": {
    id: "F5.1",
    libelle: "Différenciation pédagogique en classe d'italien hétérogène",
    targetedComps: ["RC9", "RC5"],
    ipf: 5,
    prerequisites: ["F3.1", "F4.1"],
    family: "Inclusion"
  },
  "F5.2": {
    id: "F5.2",
    libelle: "Accompagnement des élèves en difficulté en langue",
    targetedComps: ["RC9", "RC7"],
    ipf: 5,
    prerequisites: ["F5.1", "F4.4"],
    family: "Inclusion"
  },
  "F5.3": {
    id: "F5.3",
    libelle: "Remédiation et parcours de soutien en italien",
    targetedComps: ["RC9", "RC8"],
    ipf: 4,
    prerequisites: ["F5.1", "F5.2", "F4.2"],
    family: "Inclusion"
  },
  "F5.4": {
    id: "F5.4",
    libelle: "Élèves à besoins spécifiques — adaptations en classe de langue",
    targetedComps: ["RC9", "RC6"],
    ipf: 3,
    prerequisites: ["F5.1", "F3.5"],
    family: "Inclusion"
  },
  "F5.5": {
    id: "F5.5",
    libelle: "Interculturalité et compétence plurilingue",
    targetedComps: ["RC9", "RC1"],
    ipf: 3,
    prerequisites: ["F2.1", "F1.3"],
    family: "Inclusion"
  },

  // Famille 6 — Numérique
  "F6.1": {
    id: "F6.1",
    libelle: "TICE en classe d'italien — outils et plateformes",
    targetedComps: ["RC12", "RC6"],
    ipf: 4,
    prerequisites: ["F3.1"],
    family: "Numérique"
  },
  "F6.2": {
    id: "F6.2",
    libelle: "Création de ressources numériques pour l'italien",
    targetedComps: ["RC12", "RC5"],
    ipf: 4,
    prerequisites: ["F6.1", "F3.1"],
    family: "Numérique"
  },
  "F6.3": {
    id: "F6.3",
    libelle: "Intelligence artificielle et enseignement des langues",
    targetedComps: ["RC12", "RC3"],
    ipf: 3,
    prerequisites: ["F6.1", "F2.1"],
    family: "Numérique"
  },
  "F6.4": {
    id: "F6.4",
    libelle: "Projets eTwinning et échanges en ligne",
    targetedComps: ["RC12", "RC10"],
    ipf: 2,
    prerequisites: ["F6.1", "F3.3"],
    family: "Numérique"
  },
  "F6.5": {
    id: "F6.5",
    libelle: "Laboratoire de langues et outils audio",
    targetedComps: ["RC12", "RC6"],
    ipf: 3,
    prerequisites: ["F1.1", "F2.4"],
    family: "Numérique"
  },

  // Famille 7 — Développement pro
  "F7.1": {
    id: "F7.1",
    libelle: "Analyse de pratiques et posture réflexive",
    targetedComps: ["RC11", "RC5"],
    ipf: 5,
    prerequisites: ["F3.1", "F4.1"], // Simplifié: au moins une formation de F4
    family: "Professionnel"
  },
  "F7.2": {
    id: "F7.2",
    libelle: "Recherche-action en didactique de l'italien",
    targetedComps: ["RC11"],
    ipf: 3,
    prerequisites: ["F7.1", "F3.1", "F4.1"],
    family: "Professionnel"
  },
  "F7.3": {
    id: "F7.3",
    libelle: "Travail collaboratif et communautés de pratiques",
    targetedComps: ["RC10", "RC11"],
    ipf: 3,
    prerequisites: ["F7.1"],
    family: "Professionnel"
  },
  "F7.4": {
    id: "F7.4",
    libelle: "Éthique professionnelle et déontologie de l'enseignant",
    targetedComps: ["RC1"],
    ipf: 4,
    prerequisites: [],
    family: "Professionnel"
  },
  "F7.5": {
    id: "F7.5",
    libelle: "Communication avec les familles et partenaires",
    targetedComps: ["RC10", "RC1"],
    ipf: 2,
    prerequisites: ["F7.4"],
    family: "Professionnel"
  }
};
