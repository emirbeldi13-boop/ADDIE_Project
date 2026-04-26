import { CATALOGUE_FORMATIONS } from './catalogue';
export const FORMATIONS = {
  F1: {
    id: 'F1',
    libelle: 'F1 — Linguistique et Culture',
    court: 'Linguistique',
    family: 'Linguistique et Culture',
    competence: 'RC4 — Maîtriser la langue d\'enseignement',
    targetedComps: ['RC4'],
    color: '#2E75B6',
  },
  F2: {
    id: 'F2',
    libelle: 'F2 — Didactique de l\'Italien',
    court: 'Didactique',
    family: 'Didactique de l\'Italien',
    competence: 'RC3 — Maîtriser la didactique disciplinaire',
    targetedComps: ['RC3'],
    color: '#375623',
  },
  F3: {
    id: 'F3',
    libelle: 'F3 — Conception et Gestion',
    court: 'Conception',
    family: 'Conception et Gestion',
    competence: 'RC5 — Concevoir et planifier',
    targetedComps: ['RC5'],
    color: '#C55A11',
  },
  F4: {
    id: 'F4',
    libelle: 'F4 — Évaluation et Remédiation',
    family: 'Évaluation et Remédiation',
    targetedComps: ['RC7'],
    color: '#7030A0',
  },
  F5: {
    id: 'F5',
    libelle: 'F5 — Différenciation et Inclusion',
    family: 'Différenciation et Inclusion',
    targetedComps: ['RC9'],
    color: '#833C0C',
  },
  F6: {
    id: 'F6',
    libelle: 'F6 — Numérique et Innovation',
    family: 'Numérique et Innovation',
    targetedComps: ['RC12'],
    color: '#1F3864',
  },
  F7: {
    id: 'F7',
    libelle: 'F7 — Professionnalisme et Posture',
    family: 'Professionnalisme et Posture',
    targetedComps: ['RC11'],
    color: '#535353',
  }
};

export const COMPETENCES_RCET = {
  RC1: "RC1 — Agir de façon éthique et responsable dans l'exercice de ses fonctions",
  RC2: "RC2 — Maîtriser les savoirs disciplinaires et la culture générale",
  RC3: "RC3 — Maîtriser la didactique disciplinaire",
  RC4: "RC4 — Maîtriser la langue d'enseignement et les langues de travail",
  RC5: "RC5 — Concevoir et planifier des situations d'apprentissage",
  RC6: "RC6 — Mettre en œuvre des situations d'apprentissage",
  RC7: "RC7 — Évaluer les apprentissages des élèves",
  RC8: "RC8 — Gérer la progression des apprentissages",
  RC9: "RC9 — Prendre en compte la diversité des élèves et leurs besoins",
  RC10: "RC10 — Travailler en équipe et coopérer avec les partenaires de l'école",
  RC11: "RC11 — S'engager dans une démarche de développement professionnel continu",
  RC12: "RC12 — Intégrer les technologies numériques dans sa pratique professionnelle",
};

export const KIRKPATRICK_LEVELS = {
  N1: 'Niveau 1 — Satisfaction (questionnaire à chaud en fin de session)',
  N2: "Niveau 2 — Acquis (production évaluée le jour J + rétention J+30)",
  N3: "Niveau 3 — Transfert en situation (ARE à M+2, suivi PAP)",
  N4: "Niveau 4 — Effets sur les apprentissages des élèves (observation de classe)",
};

// ─── §6.1 Fixed Calendar 2026–2027 ───────────────────────────────────────────
// J+42 ≈ 6 weeks after each session date

function addDays(dateStr, days) {
  const [d, m, y] = dateStr.split('/').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

const CALENDAR_RAW = [
  { formation: 'F1', district: 'Kef',      date: '07/11/2026' },
  { formation: 'F1', district: 'Béja',     date: '14/11/2026' },
  { formation: 'F1', district: 'Jendouba', date: '21/11/2026' },
  { formation: 'F2', district: 'Kef',      date: '06/02/2027' },
  { formation: 'F2', district: 'Béja',     date: '13/02/2027' },
  { formation: 'F2', district: 'Jendouba', date: '20/02/2027' },
  { formation: 'F3', district: 'Kef',      date: '17/04/2027' },
  { formation: 'F3', district: 'Béja',     date: '24/04/2027' },
  { formation: 'F3', district: 'Jendouba', date: '08/05/2027' },
];

export const SESSION_CALENDAR = CALENDAR_RAW.map(s => ({
  ...s,
  horaire: '08:00–13:00',
  duree: '4–5 heures',
  areDate: addDays(s.date, 42), // §6.2 ARE ≈ J+42
}));

// §6.2 — ARE (Atelier de Retour d'Expérience) at J+42
export const ARE_OFFSET_DAYS = 42;

export const GLOSSAIRE = {
  PAP: "Plan d'Action Personnel",
  ARE: "Atelier de Retour d'Expérience",
  DCO: 'Démarche Contractuelle par Objectifs',
  RCET: 'Référentiel de Compétences des Enseignants Tunisiens',
  ADDIE: 'Analyse – Design – Développement – Implémentation – Évaluation',
  CREFOC: "Centre Régional de Formation Continue des Cadres de l'Éducation",
  T0: 'Mesure initiale (avant le cycle de formation)',
};

export const ALERTS_CONFIG_DEFAULT = [
  {
    id: 'A1',
    priority: 'haute',
    color: '#922B21',
    nom: 'Délai visite dépassé',
    condition: 'delai_visite > 72',
    seuil: 72,
    seuilMin: 12,
    seuilMax: 120,
    message: "Visite d'inspection à programmer en priorité",
    active: true,
  },
  {
    id: 'A2',
    priority: 'moyenne',
    color: '#C55A11',
    nom: 'Participant prioritaire non sélectionné',
    condition: 'rang_circo <= 5 absent session',
    seuil: 5,
    seuilMin: 1,
    seuilMax: 10,
    message: 'Enseignant fortement recommandé non inscrit',
    active: true,
  },
  {
    id: 'A3',
    priority: 'moyenne',
    color: '#C55A11',
    nom: 'Objectif pédagogique non atteint',
    condition: 'taux_atteinte_opp < 50',
    seuil: 50,
    seuilMin: 20,
    seuilMax: 80,
    message: 'Remédiation recommandée pour [NOM OPP]',
    active: true,
  },
  {
    id: 'A4',
    priority: 'moyenne',
    color: '#C55A11',
    nom: 'Satisfaction critique',
    condition: 'score_satisfaction < 3.0',
    seuil: 3.0,
    seuilMin: 1.0,
    seuilMax: 5.0,
    message: 'Satisfaction insuffisante pour [Formation] à [Circo.]',
    active: true,
  },
  {
    id: 'A5',
    priority: 'haute',
    color: '#922B21',
    nom: 'Absence de transfert',
    condition: "alerte_zero_transfert = 'ALERTE'",
    seuil: null,
    message: 'Aucun PAP réalisé — contact conseiller pédagogique',
    active: true,
  },
  {
    id: 'A6',
    priority: 'basse',
    color: '#D97706',
    nom: 'Remplissage bas de session',
    condition: 'nb_inscrits / capacité_crefoc < 60',
    seuil: 60,
    seuilMin: 30,
    seuilMax: 95,
    message: 'Taux de remplissage faible pour [Session]',
    active: true,
  },
  {
    id: 'A7',
    priority: 'basse',
    color: '#D97706',
    nom: 'Déséquilibre du groupe',
    condition: 'ratio_stagiaires < 60 ou > 90',
    seuilMin: 60,
    seuilMax: 90,
    message: 'Composition du groupe déséquilibrée pour [Session]',
    active: true,
  },
  {
    id: 'A8',
    priority: 'moyenne',
    color: '#C55A11',
    nom: 'Progression insuffisante',
    condition: 'delta_moyen < 0.8',
    seuil: 0.8,
    seuilMin: 0.3,
    seuilMax: 2.0,
    message: 'Progression faible — revoir le design de [Formation]',
    active: true,
  },
  {
    id: 'A9',
    priority: 'critique',
    color: '#E74C3C',
    nom: 'Incohérence Logistique',
    condition: 'Readiness Score < 100% sur session confirmée',
    seuil: 100,
    message: 'Déficit technique identifié pour la session [Session] au centre [Lieu]',
    active: true,
  },
  {
    id: 'A10',
    priority: 'haute',
    color: '#D35400',
    nom: 'Exclusion Prioritaire',
    condition: 'TOP 3 prioritaires non inscrits à la session de leur circo',
    seuil: 3,
    message: "Enseignant prioritaire [NOM] absent de la formation [Formation] à [Circo]",
    active: true,
  },
  {
    id: 'A11',
    priority: 'critique',
    color: '#B91C1C',
    nom: 'Formation sans objectifs',
    condition: 'formation.objectifs.length === 0',
    seuil: null,
    message: 'La formation [Formation] n\'a aucun objectif pédagogique configuré',
    active: true,
  },
  {
    id: 'A12',
    priority: 'haute',
    color: '#922B21',
    nom: 'Formation sans session planifiée',
    condition: 'aucune session pour la formation',
    seuil: null,
    message: 'Aucune session planifiée pour la formation [Formation]',
    active: true,
  },
  {
    id: 'A13',
    priority: 'haute',
    color: '#922B21',
    nom: 'Session incomplète',
    condition: 'session confirmée sans lieu ou formateur',
    seuil: null,
    message: 'Session [Session] incomplète — lieu ou formateur manquant',
    active: true,
  },
  {
    id: 'A14',
    priority: 'moyenne',
    color: '#C55A11',
    nom: 'CREFOC non configuré',
    condition: 'crefoc sans capacité ou logistique',
    seuil: null,
    message: 'CREFOC de [Circo] — informations manquantes',
    active: true,
  },
];
