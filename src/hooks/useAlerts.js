import { useState, useEffect, useMemo, useCallback } from 'react';
import { ALERTS_CONFIG_DEFAULT } from '../constants/formations';
import { computeAlerts } from '../utils/alertsEngine';

const STORAGE_KEY = 'pedagotrack_alerts_config';
const TREATED_KEY = 'pedagotrack_alerts_treated';
const CUSTOM_KEY = 'pedagotrack_alerts_custom';
const ACKED_KEY = 'pedagotrack_alerts_acked';

function loadJSON(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function mergeConfig(saved) {
  if (!Array.isArray(saved)) return ALERTS_CONFIG_DEFAULT;
  // Ensure newly added alerts (A11-A14 etc.) appear even if a prior config is persisted
  const savedIds = new Set(saved.map(a => a.id));
  const missing = ALERTS_CONFIG_DEFAULT.filter(a => !savedIds.has(a.id));
  return [...saved, ...missing];
}

export function alertKey(alert) {
  return `${alert.alertId}-${alert.enseignantId || ''}-${alert.formation || ''}-${alert.op || ''}-${alert.circo || ''}-${alert.sessionId || ''}`;
}

export function useAlerts(data) {
  const [config, setConfig] = useState(() => mergeConfig(loadJSON(STORAGE_KEY, ALERTS_CONFIG_DEFAULT)));
  const [treated, setTreated] = useState(() => loadJSON(TREATED_KEY, []));
  const [acknowledged, setAcknowledged] = useState(() => loadJSON(ACKED_KEY, []));
  const [customAlerts, setCustomAlerts] = useState(() => loadJSON(CUSTOM_KEY, []));

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(TREATED_KEY, JSON.stringify(treated));
  }, [treated]);

  useEffect(() => {
    localStorage.setItem(ACKED_KEY, JSON.stringify(acknowledged));
  }, [acknowledged]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customAlerts));
  }, [customAlerts]);

  const allAlerts = useMemo(() => {
    if (!data || !data.enseignants) return [];
    return computeAlerts(config, data);
  }, [config, data]);

  const treatedKeySet = useMemo(() => new Set(treated.map(t => t.key)), [treated]);
  const ackedMap = useMemo(() => {
    const m = new Map();
    acknowledged.forEach(a => m.set(a.key, a));
    return m;
  }, [acknowledged]);

  // Drop keys from acked state once their condition no longer fires (auto-resolve)
  useEffect(() => {
    if (!acknowledged.length) return;
    const activeKeys = new Set(allAlerts.map(alertKey));
    if (acknowledged.some(a => !activeKeys.has(a.key))) {
      setAcknowledged(prev => prev.filter(a => activeKeys.has(a.key)));
    }
  }, [allAlerts, acknowledged]);

  const activeAlerts = useMemo(() => {
    return allAlerts
      .filter(a => !treatedKeySet.has(alertKey(a)))
      .map(a => {
        const k = alertKey(a);
        const acked = ackedMap.get(k);
        return acked ? { ...a, acknowledgedAt: acked.acknowledgedAt, state: 'acknowledged' } : { ...a, state: 'active' };
      });
  }, [allAlerts, treatedKeySet, ackedMap]);

  const acknowledgeAlert = useCallback((alert) => {
    const key = alertKey(alert);
    setAcknowledged(prev => {
      if (prev.some(a => a.key === key)) return prev;
      return [...prev, { key, acknowledgedAt: new Date().toISOString() }];
    });
  }, []);

  const unacknowledgeAlert = useCallback((alert) => {
    const key = alertKey(alert);
    setAcknowledged(prev => prev.filter(a => a.key !== key));
  }, []);

  const treatAlert = useCallback((alert, note) => {
    const key = alertKey(alert);
    setTreated(prev => [...prev, {
      key,
      treatedAt: new Date().toISOString(),
      note,
      alert,
    }]);
    setAcknowledged(prev => prev.filter(a => a.key !== key));
  }, []);

  const reopenAlert = useCallback((key) => {
    setTreated(prev => prev.filter(t => t.key !== key));
  }, []);

  const updateConfig = useCallback((id, changes) => {
    setConfig(prev => prev.map(a => a.id === id ? { ...a, ...changes } : a));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig(ALERTS_CONFIG_DEFAULT);
  }, []);

  const addCustomAlert = useCallback((alert) => {
    setCustomAlerts(prev => [...prev, { ...alert, id: `CA${Date.now()}`, createdAt: new Date().toISOString() }]);
  }, []);

  const removeCustomAlert = useCallback((id) => {
    setCustomAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  return {
    config,
    activeAlerts,
    treatedAlerts: treated,
    acknowledgedAlerts: acknowledged,
    customAlerts,
    updateConfig,
    resetConfig,
    treatAlert,
    reopenAlert,
    acknowledgeAlert,
    unacknowledgeAlert,
    addCustomAlert,
    removeCustomAlert,
  };
}
