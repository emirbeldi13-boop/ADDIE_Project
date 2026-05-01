/**
 * SCRIPT DE SIMULATION CAUSALE
 * 
 * Ce script génère des données de visites fictives pour peupler les RC8-RC12
 * et tester la remontée des chaînes causales.
 */

export const DEMO_VISITS = [
  {
    id: "SIM_VIS_001",
    ensId: "ENS_001", // Mohamed Amine (souvent ID 1 dans les seeds)
    date: "15/04/2026",
    visitType: "official",
    observer: "M. Beldi (Simulation)",
    note20: 12.5,
    scores: {
      RC8: 2.0,  // Faiblesse en Gestion de progression
      RC9: 1.5,  // Faiblesse en Diversité (Symptôme de RC8)
      RC12: 2.5  // Faiblesse en Numérique
    },
    visitScore: 2.0,
    recordedAt: new Date().toISOString()
  },
  {
    id: "SIM_VIS_002",
    ensId: "ENS_002", 
    date: "16/04/2026",
    visitType: "official",
    observer: "M. Beldi (Simulation)",
    note20: 11.0,
    scores: {
      RC8: 2.5,
      RC9: 2.0,
      RC11: 1.5  // Faiblesse en Dév. Pro
    },
    visitScore: 1.8,
    recordedAt: new Date().toISOString()
  },
  {
    id: "SIM_VIS_003",
    ensId: "ENS_003",
    date: "17/04/2026",
    visitType: "official",
    observer: "M. Beldi (Simulation)",
    note20: 14.0,
    scores: {
      RC10: 2.0, // Faiblesse en Coopération
      RC12: 1.8  // Faiblesse en Numérique
    },
    visitScore: 1.9,
    recordedAt: new Date().toISOString()
  }
];
