import * as React from 'react';

export function useSessionInheritance(store, initialFormationId = '', initialSessionId = '') {
  const allSessions = store.sessions || [];
  const formationsList = Object.values(store.formations);
  
  const [selectedFormationId, setSelectedFormationId] = React.useState(initialFormationId || formationsList[0]?.id || '');
  const [selectedSessionId, setSelectedSessionId] = React.useState(initialSessionId || '');

  // --- Dynamic Filtering ---
  const filteredSessions = React.useMemo(() => {
    return allSessions.filter(s => {
      const fId = s.formationId || s.Formation || s['ID Formation'];
      return fId === selectedFormationId;
    });
  }, [allSessions, selectedFormationId]);

  // Only clear session if it no longer exists in filtered list
  React.useEffect(() => {
    if (selectedSessionId && filteredSessions.length > 0) {
      const exists = filteredSessions.some(s => (s.id || s['ID Session']) === selectedSessionId);
      if (!exists) setSelectedSessionId('');
    }
  }, [selectedFormationId, filteredSessions, selectedSessionId]);

  const session = allSessions.find(s => (s.id || s['ID Session']) === selectedSessionId) || null;
  const formation = store.formations[selectedFormationId] || null;
  
  const isMasterMode = !selectedSessionId;
  
  const displaySession = React.useMemo(() => {
    if (!formation) return { cdc: {}, modules: [], targetScores: {} };
    
    // Start with master data
    let mergedCdc = { ...(formation.cdc || {}) };
    let mergedModules = [...(formation.modules || [])];
    let mergedTargetScores = { ...(formation.targetScores || {}) };

    // If a session is active, merge its specific deltas
    if (session) {
      mergedCdc = { ...mergedCdc, ...(session.cdc || {}) };
      if (session.modules && session.modules.length > 0) {
        mergedModules = session.modules;
      }
      mergedTargetScores = { ...mergedTargetScores, ...(session.targetScores || {}) };
    }

    return {
      ...(session || {}),
      'ID Session': session?.id || session?.['ID Session'] || 'MASTER_TEMPLATE',
      'Titre formation': session?.['Titre formation'] || session?.title || formation?.libelle || '',
      inscrits: session?.inscrits || formation?.inscrits || [],
      cdc: mergedCdc,
      modules: mergedModules,
      targetScores: mergedTargetScores,
      _isMaster: !session
    };
  }, [session, formation]);

  // --- HELPER: Normalize Venue/Circo Name ---
  const normalizeCirco = (str) => {
    if (!str) return 'National';
    const s = str.toLowerCase();
    if (s.includes('kef')) return 'Kef';
    if (s.includes('béja') || s.includes('beja')) return 'Béja';
    if (s.includes('jendouba')) return 'Jendouba';
    return str;
  };

  const currentCirco = React.useMemo(() => normalizeCirco(displaySession?.Lieu || displaySession?.Circonscription), [displaySession]);

  return {
    selectedFormationId,
    setSelectedFormationId,
    selectedSessionId,
    setSelectedSessionId,
    formationsList,
    filteredSessions,
    session,
    formation,
    displaySession,
    isMasterMode,
    currentCirco
  };
}
