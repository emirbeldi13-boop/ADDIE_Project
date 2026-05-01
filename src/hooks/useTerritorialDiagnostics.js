import { useMemo } from 'react';

/**
 * Custom hook to handle complex territorial diagnostic calculations.
 */
export function useTerritorialDiagnostics(store, selectedCircos, selectedRCs) {
  
  // 1. Filtered Participants based on selected regions
  const participants = useMemo(() => {
    let result;
    if (selectedCircos.includes('National')) {
      result = store.enseignants;
    } else {
      result = store.enseignants.filter(e => selectedCircos.includes(e.Circonscription));
    }
    return result;
  }, [selectedCircos, store.enseignants]);

  // 2. Advanced Stats (IGE per Circo)
  const advancedStats = useMemo(() => {
    const circosToProcess = selectedCircos.includes('National') 
      ? ['National', ...Object.keys(store.crefocs)] 
      : selectedCircos;

    const circosData = {};
    
    circosToProcess.forEach(circo => {
      const teachers = circo === 'National' 
        ? store.enseignants 
        : store.enseignants.filter(e => e.Circonscription === circo);
      
      if (teachers.length === 0) return;

      const urgencyData = Object.keys(store.competences).map(rcId => {
        const scores = teachers.map(p => p.realityScores?.[rcId] ?? 3);
        const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
        const target = store.referential?.[rcId]?.targetScore || 4.0; 
        const urgency = Math.max(0, target - avg);
        const impact = Math.round((teachers.filter(p => (p.realityScores?.[rcId] ?? 3) < target).length / teachers.length) * 100);
        
        return { 
          id: rcId, 
          name: store.competences[rcId]?.split(' — ')[0] || rcId,
          urgency: Math.round(urgency * 10) / 10,
          impact,
          gap: (urgency * 10) + 10,
          circo
        };
      });

      const avgIge = (urgencyData.reduce((acc, d) => acc + d.urgency, 0) / urgencyData.length).toFixed(1);
      
      const teacherAvgs = teachers.map(p => {
        const s = Object.keys(store.competences).map(rc => p.scores?.[rc] || 3);
        return s.reduce((a,b) => a+b,0) / s.length;
      });
      const mean = teacherAvgs.reduce((a,b) => a+b,0) / teacherAvgs.length;
      const variance = teacherAvgs.reduce((a,b) => a + Math.pow(b - mean, 2), 0) / teacherAvgs.length;
      const ch = Math.round((Math.sqrt(variance) / (mean || 1)) * 100);

      circosData[circo] = { ige: avgIge, ch, urgencyData };
    });

    return { circosData };
  }, [selectedCircos, store.enseignants, store.competences, store.referential, store.crefocs]);

  // 3. Recommended Formations (AI suggestions)
  const recommendedFormations = useMemo(() => {
    const list = Object.values(store.referential)
      .filter(f => f.id.includes('.'))
      .map(f => {
        const targeted = f.targetedComps || [];
        if (targeted.length === 0) return { ...f, impact: 0, ipt: 0 };

        // Calculate Territorial Precision Metrics
        const metrics = targeted.map(rcId => {
          const scores = participants.map(p => p.realityScores?.[rcId] ?? 3);
          const target = store.referential?.[rcId]?.targetScore || 4.0;
          
          const belowTarget = scores.filter(s => s < target);
          const prevalence = (belowTarget.length / (scores.length || 1)) * 100;
          
          const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
          const gap = Math.max(0, target - avgScore);
          const normalizedGap = Math.min(100, gap * 25); // 1.0 gap = 25pts, 4.0 gap = 100pts

          // Heterogeneity (Coefficient of Variation)
          const mean = avgScore || 1;
          const variance = scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length || 1);
          const cv = (Math.sqrt(variance) / mean) * 100;

          return { prevalence, normalizedGap, cv };
        });

        // Aggregate metrics across targeted RCs
        const avgPrevalence = metrics.reduce((acc, m) => acc + m.prevalence, 0) / metrics.length;
        const avgGap = metrics.reduce((acc, m) => acc + m.normalizedGap, 0) / metrics.length;
        const avgCv = metrics.reduce((acc, m) => acc + m.cv, 0) / metrics.length;

        // Territorial Impact Score (Weighted average of Prevalence, Gap, and Heterogeneity)
        const territorialImpact = (avgPrevalence * 0.5) + (avgGap * 0.4) + (Math.min(10, avgCv) * 1.0);
        const finalImpact = Math.min(100, Math.round(territorialImpact));
        
        const strategicWeight = (f.ipf || 0) * 20;
        const ipt = store.strategicMode 
          ? Math.round(finalImpact * 0.7 + strategicWeight * 0.3)
          : Math.round(finalImpact);

        return { ...f, impact: finalImpact, ipt };
      });

    return list.sort((a, b) => b.ipt - a.ipt);
  }, [participants, store.referential, store.strategicMode]);

  // 4. Pure Terrain Urgency (The "Critical Need" label)
  const circosForUrgencyKpis = useMemo(() => {
    const data = advancedStats?.circosData;
    if (!data) return [];
    if (selectedCircos.includes('National')) {
      return data.National ? ['National'] : Object.keys(data);
    }
    return selectedCircos.filter((c) => data[c]);
  }, [advancedStats, selectedCircos]);

  const topUrgencyRC = useMemo(() => {
    if (!advancedStats?.circosData || circosForUrgencyKpis.length === 0) return null;

    const rcTotals = {};
    circosForUrgencyKpis.forEach((circoKey) => {
      const block = advancedStats.circosData[circoKey];
      (block?.urgencyData || []).forEach((d) => {
        if (!rcTotals[d.id]) rcTotals[d.id] = { id: d.id, sum: 0, count: 0, name: d.name };
        rcTotals[d.id].sum += d.urgency;
        rcTotals[d.id].count++;
      });
    });

    const sorted = Object.values(rcTotals)
      .map((t) => ({ id: t.id, urgency: t.sum / t.count, name: t.name }))
      .filter((t) => selectedRCs.includes(t.id))
      .sort((a, b) => b.urgency - a.urgency);

    return sorted[0];
  }, [advancedStats, selectedRCs, circosForUrgencyKpis]);

  const tacticalIGE = useMemo(() => {
    if (selectedRCs.length === 0) return "0.0";
    if (!advancedStats?.circosData || circosForUrgencyKpis.length === 0) return "0.0";

    let totalSum = 0;
    let totalCount = 0;

    circosForUrgencyKpis.forEach((circoKey) => {
      const block = advancedStats.circosData[circoKey];
      (block?.urgencyData || []).forEach((d) => {
        if (selectedRCs.includes(d.id)) {
          totalSum += d.urgency;
          totalCount++;
        }
      });
    });

    return totalCount > 0 ? (totalSum / totalCount).toFixed(2) : "0.0";
  }, [advancedStats, selectedRCs, circosForUrgencyKpis]);

  const demandIntensity = useMemo(() => {
    if (participants.length === 0 || selectedRCs.length === 0) return 0;
    const concerned = participants.filter(p => {
      return selectedRCs.some(rcId => {
        const score = p.realityScores?.[rcId] ?? 3;
        const target = store.referential?.[rcId]?.targetScore || 4.0;
        return score < target;
      });
    });
    return Math.round((concerned.length / participants.length) * 100);
  }, [participants, selectedRCs, store.referential]);

  const triangulationIndex = useMemo(() => {
    if (participants.length === 0) return 0;
    const withBoth = participants.filter(p => 
      (p.avgAutoposScore != null && p.avgAutoposScore > 0) && 
      (p.temporalObsScore !== null)
    ).length;
    return Math.round((withBoth / participants.length) * 100);
  }, [participants]);

  return {
    participants,
    advancedStats,
    recommendedFormations,
    topUrgencyRC,
    tacticalIGE,
    demandIntensity,
    triangulationIndex
  };
}
