import * as React from 'react';
import { ShieldCheck, ShieldAlert, AlertCircle } from 'lucide-react';
import { LOGISTICS_LABELS } from '../constants/logistics';

export function useSessionInsights({ displaySession, formation, store, selectedCircos = ['National'] }) {
  // ... (participants and other insights same as before, I will focus on logistics)
  // participants logic (lines 5-11)
  const participants = React.useMemo(() => {
    if (!displaySession || !displaySession.inscrits || displaySession.inscrits.length === 0) {
      if (selectedCircos.includes('National')) return store.enseignants;
      return store.enseignants.filter(e => selectedCircos.includes(e.Circonscription));
    }
    return store.enseignants.filter(e => displaySession.inscrits.includes(e.ID));
  }, [displaySession, store.enseignants, selectedCircos]);

  const isTerritorialMode = !displaySession?.inscrits || displaySession.inscrits.length === 0;

  // ... (skillsInsight logic)
  const skillsInsight = React.useMemo(() => {
    if (participants.length === 0) return null;
    const allRCs = Object.keys(store.competences);
    const comps = formation?.targetedComps || allRCs;
    const wObs = store.groupWeights?.obs ?? 0.60;
    const wAuto = store.groupWeights?.autopos ?? 0.40;
    const stats = comps.map(compId => {
      const groupMixedScores = participants.map(p => {
        const auto = p.scores?.[compId] || p.avgAutoposScore || 3;
        const obs = p.temporalObsScore;
        if (obs === null) return auto;
        return (obs * wObs) + (auto * wAuto);
      });
      const groupAvg = groupMixedScores.length > 0 ? (groupMixedScores.reduce((a, b) => a + b, 0) / participants.length) : 0;
      const withObs = participants.filter(p => p.temporalObsScore !== null).length;
      const evidencePct = participants.length > 0 ? Math.round((withObs / participants.length) * 100) : 0;
      const targetScore = displaySession?.targetScores?.[compId] || formation?.targetScores?.[compId] || 4.0;
      const gapPct = targetScore > 0 ? Math.round(((groupAvg - targetScore) / targetScore) * 100) : 0;
      return { id: compId, label: store.competences[compId] || compId, groupAvg: Math.round(groupAvg * 10) / 10, targetScore: Math.round(targetScore * 10) / 10, gapPct, evidencePct, isVerified: evidencePct >= 50, isWeakPoint: gapPct < 0 };
    });
    const primaryGap = [...stats].sort((a, b) => a.gapPct - b.gapPct)[0];
    const evidenceLabel = primaryGap?.isVerified ? "Déficit observé (confirmé par inspection)" : "Besoin ressenti (auto-déclaré)";
    return { stats, summary: primaryGap && primaryGap.gapPct < 0 ? `${evidenceLabel} : Le groupe est à ${Math.abs(primaryGap.gapPct)}% sous l'objectif de maîtrise (${primaryGap.targetScore}) sur la compétence ${primaryGap.label}.` : `Objectifs atteints : Le groupe dépasse la cible de maîtrise fixée pour ce programme.` };
  }, [formation, displaySession, participants, store.competences, store.groupWeights]);

  // ... (seniorityInsight logic)
  const seniorityInsight = React.useMemo(() => {
    if (participants.length === 0) return null;
    const stagiaires = participants.filter(p => p.Statut === 'Stagiaire').length;
    const titulaires = participants.length - stagiaires;
    const stagiairePct = Math.round((stagiaires / participants.length) * 100);
    return { stagiaires, titulaires, stagiairePct, summary: `Profil : ${stagiairePct}% de Stagiaires. ${stagiairePct > 70 ? 'Besoin de guidage méthodologique fort.' : 'Groupe aux profils mixtes.'}` };
  }, [participants]);

  // Pillar 3 Insight: Logistics (UPDATED)
  const logisticsInsight = React.useMemo(() => {
    if (!displaySession || !formation) return null;
    
    // Find CREFOC by Lieu name
    const crefoc = Object.values(store.crefocs).find(c => c.nom === displaySession.Lieu);
    if (!crefoc) return null;

    const techReqs = formation.techRequirements || [];
    const availableLog = crefoc.logistics || {};

    const requiredEquipments = techReqs.map(key => ({
      key,
      label: LOGISTICS_LABELS[key]?.label || key,
      icon: LOGISTICS_LABELS[key]?.icon || AlertCircle,
      isAvailable: !!availableLog[key]
    }));

    const missingEquipments = requiredEquipments.filter(e => !e.isAvailable);
    const metCount = requiredEquipments.length - missingEquipments.length;
    const materialScore = techReqs.length > 0 ? Math.round((metCount / techReqs.length) * 100) : 100;

    const inscritsCount = displaySession.inscrits?.length || 0;
    const capacity = crefoc.places || 20;
    const isOverCapacity = inscritsCount > capacity;
    
    // Calcul de la note de capacité (100% si OK, chute de 15 points par personne en trop)
    const capacityScore = isOverCapacity ? Math.max(0, 100 - (inscritsCount - capacity) * 15) : 100;

    // Score final : 60% matériel, 40% capacité
    const conformityScore = Math.round((materialScore * 0.6) + (capacityScore * 0.4));

    return {
      lieu: crefoc.nom,
      requiredEquipments,
      missingEquipments,
      conformityScore,
      capacity,
      inscritsCount,
      isOverCapacity,
      summary: `Infrastructures : ${crefoc.nom}. Conformité : ${conformityScore}%. ${missingEquipments.length > 0 ? `Manque : ${missingEquipments.map(e => e.label).join(', ')}.` : 'Tout équipement présent.'}`
    };
  }, [displaySession, formation, store.crefocs]);

  // NEW: Predictive KPIs
  const predictiveInsight = React.useMemo(() => {
    if (!skillsInsight || !seniorityInsight || participants.length === 0) return null;

    // 1. Reliability Score (Average evidence %)
    const reliabilityScore = Math.round(
      skillsInsight.stats.reduce((acc, s) => acc + s.evidencePct, 0) / skillsInsight.stats.length
    );

    // 2. Criticality Score (Weights: 70% Gap, 30% Stagiaire ratio)
    const primaryGap = [...skillsInsight.stats].sort((a, b) => a.gapPct - b.gapPct)[0];
    const gapSeverity = Math.min(100, Math.abs(Math.min(0, primaryGap?.gapPct || 0)) * 2);
    const criticalityScore = Math.round((gapSeverity * 0.7) + (seniorityInsight.stagiairePct * 0.3));

    // 3. Heterogeneity Score
    const teacherAvgs = participants.map(p => {
        const comps = formation?.targetedComps || Object.keys(store.competences);
        const scores = comps.map(cid => {
            const auto = p.scores?.[cid] || p.avgAutoposScore || 3;
            const obs = p.temporalObsScore;
            return obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
        });
        return scores.length > 0 ? scores.reduce((a,b) => a+b, 0) / scores.length : 3;
    });
    const max = Math.max(...teacherAvgs);
    const min = Math.min(...teacherAvgs);
    const heterogeneityScore = Math.round(((max - min) / 4) * 100);

    const highThresh = store.riskThresholds?.high || 70;
    const medThresh = store.riskThresholds?.medium || 40;

    return {
      reliabilityScore,
      criticalityScore,
      heterogeneityScore,
      status: criticalityScore > highThresh ? 'HAUTE CRITICITÉ' : criticalityScore > medThresh ? 'SENSIBLE' : 'OPTIMAL'
    };
  }, [skillsInsight, seniorityInsight, participants, formation, store.riskThresholds]);

  // Triangulation Index: % of participants with BOTH auto-pos AND inspector observations
  const triangulationIndex = React.useMemo(() => {
    if (participants.length === 0) return 0;
    const withBoth = participants.filter(p => 
      (p.avgAutoposScore != null && p.avgAutoposScore > 0) && 
      (p.temporalObsScore !== null)
    ).length;
    return Math.round((withBoth / participants.length) * 100);
  }, [participants]);

  return {
    participants,
    isTerritorialMode,
    skillsInsight,
    seniorityInsight,
    logisticsInsight,
    predictiveInsight,
    triangulationIndex
  };
}
