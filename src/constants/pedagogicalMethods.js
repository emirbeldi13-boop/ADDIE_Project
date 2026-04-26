import { 
  Users, 
  MessageSquare, 
  Search, 
  Settings, 
  Cpu, 
  Lightbulb, 
  Presentation,
  PlayCircle,
  FileEdit
} from 'lucide-react';

export const PEDAGOGICAL_METHODS = {
  EXPOSITIF: {
    id: 'EXPOSITIF',
    label: 'Expositif / Transmissif',
    description: 'Transmission descendante de savoirs. Idéal pour introduire des concepts théoriques.',
    icon: Presentation,
    color: 'blue',
    classes: { bg: 'bg-blue-50', text: 'text-blue-600', bgLight: 'bg-blue-50/30', textLight: 'text-blue-500/70', border: 'border-blue-100', ring: 'ring-blue-200' }
  },
  DEMONSTRATIF: {
    id: 'DEMONSTRATIF',
    label: 'Démonstratif',
    description: 'Le formateur montre, les stagiaires observent puis reproduisent.',
    icon: PlayCircle,
    color: 'indigo',
    classes: { bg: 'bg-indigo-50', text: 'text-indigo-600', bgLight: 'bg-indigo-50/30', textLight: 'text-indigo-500/70', border: 'border-indigo-100', ring: 'ring-indigo-200' }
  },
  INTERROGATIF: {
    id: 'INTERROGATIF',
    label: 'Interrogatif (Maïeutique)',
    description: 'Questionnement guidé pour faire émerger les connaissances par les apprenants.',
    icon: MessageSquare,
    color: 'purple',
    classes: { bg: 'bg-purple-50', text: 'text-purple-600', bgLight: 'bg-purple-50/30', textLight: 'text-purple-500/70', border: 'border-purple-100', ring: 'ring-purple-200' }
  },
  DECOUVERTE: {
    id: 'DECOUVERTE',
    label: 'Découverte / Heuristique',
    description: 'Apprentissage par l\'exploration et la résolution de problèmes par soi-même.',
    icon: Search,
    color: 'orange',
    classes: { bg: 'bg-orange-50', text: 'text-orange-600', bgLight: 'bg-orange-50/30', textLight: 'text-orange-500/70', border: 'border-orange-100', ring: 'ring-orange-200' }
  },
  APPLICATIF: {
    id: 'APPLICATIF',
    label: 'Applicatif',
    description: 'Mise en pratique immédiate par des exercices ou études de cas.',
    icon: FileEdit,
    color: 'emerald',
    classes: { bg: 'bg-emerald-50', text: 'text-emerald-600', bgLight: 'bg-emerald-50/30', textLight: 'text-emerald-500/70', border: 'border-emerald-100', ring: 'ring-emerald-200' }
  },
  COLLABORATIF: {
    id: 'COLLABORATIF',
    label: 'Collaboratif / Atelier',
    description: 'Travail en sous-groupes, co-construction et intelligence collective.',
    icon: Users,
    color: 'cyan',
    classes: { bg: 'bg-cyan-50', text: 'text-cyan-600', bgLight: 'bg-cyan-50/30', textLight: 'text-cyan-500/70', border: 'border-cyan-100', ring: 'ring-cyan-200' }
  }
};

export const METHOD_LIST = Object.values(PEDAGOGICAL_METHODS);

export const RESOURCE_TYPES = {
  PRESENTATION: {
    id: 'PRESENTATION',
    label: 'Support Projection',
    icon: Presentation,
    color: 'blue',
    classes: { bg: 'bg-blue-50', text: 'text-blue-600' }
  },
  GUIDE: {
    id: 'GUIDE',
    label: 'Guide Animateur',
    icon: Settings,
    color: 'slate',
    classes: { bg: 'bg-slate-50', text: 'text-slate-600' }
  },
  EXERCISE: {
    id: 'EXERCISE',
    label: 'Fiche Exercice',
    icon: FileEdit,
    color: 'emerald',
    classes: { bg: 'bg-emerald-50', text: 'text-emerald-600' }
  },
  QUIZ: {
    id: 'QUIZ',
    label: 'Évaluation / Quiz',
    icon: Lightbulb,
    color: 'orange',
    classes: { bg: 'bg-orange-50', text: 'text-orange-600' }
  },
  VIDEO: {
    id: 'VIDEO',
    label: 'Capsule Vidéo',
    icon: PlayCircle,
    color: 'red',
    classes: { bg: 'bg-red-50', text: 'text-red-600' }
  },
  OTHER: {
    id: 'OTHER',
    label: 'Autre Ressource',
    icon: Search,
    color: 'gray',
    classes: { bg: 'bg-gray-50', text: 'text-gray-600' }
  }
};
