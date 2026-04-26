import { useMemo } from 'react';
import enseignantsRaw from '../data/Enseignants.json';
import sessionsRaw from '../data/Sessions.json';
import satisfactionRaw from '../data/Satisfaction.json';
import acquisRaw from '../data/Acquis.json';
import transfertRaw from '../data/Transfert.json';
import triangulationRaw from '../data/Triangulation.json';
import observationsRaw from '../data/Observations.json';
import autopositionnementRaw from '../data/Autopositionnement.json';
import tableauDeBordRaw from '../data/Tableau_de_Bord.json';

function clean(data) {
  return data.filter(row => Object.values(row).some(v => v !== null && v !== undefined && v !== ''));
}

// Seed data (immutable, from JSON files)
export const SEED_ENSEIGNANTS = clean(enseignantsRaw);
export const SEED_SESSIONS = clean(sessionsRaw);
export const SEED_AUTOPOS = clean(autopositionnementRaw);

export function useData() {
  return useMemo(() => ({
    satisfaction: clean(satisfactionRaw),
    acquis: clean(acquisRaw),
    transfert: clean(transfertRaw),
    triangulation: clean(triangulationRaw),
    observations: clean(observationsRaw),
    autopositionnement: clean(autopositionnementRaw),
    tableauDeBord: clean(tableauDeBordRaw),
    loadedAt: new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }),
  }), []);
}
