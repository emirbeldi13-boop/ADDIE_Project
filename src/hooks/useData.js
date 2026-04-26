import { useState, useEffect } from 'react';
import * as db from '../lib/db';

export function useData() {
  const [data, setData] = useState({
    satisfaction: [],
    acquis: [],
    transfert: [],
    triangulation: [],
    observations: [],
    autopositionnement: [],
    tableauDeBord: [],
    loadedAt: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function load() {
      try {
        const [
          satisfaction,
          acquis,
          transfert,
          triangulation,
          observations,
          autopositionnement,
        ] = await Promise.all([
          db.fetchSatisfaction(),
          db.fetchAcquis(),
          db.fetchTransfert(),
          db.fetchTriangulation(),
          db.fetchObservations(),
          db.fetchAutopositionnement(),
        ]);

        setData({
          satisfaction,
          acquis,
          transfert,
          triangulation,
          observations,
          autopositionnement,
          tableauDeBord: [], 
          loadedAt: new Date().toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }),
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error('[useData] failed to load:', err);
        setData(prev => ({ ...prev, loading: false, error: err.message }));
      }
    }
    load();
  }, []);

  return data;
}
