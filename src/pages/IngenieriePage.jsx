import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { FormationDetailView } from '../components/features/engineering/FormationDetailView';
import { TerritorialPortal } from '../components/features/engineering/TerritorialPortal';

export function IngenieriePage({ data, store, alertCount, loadedAt, onMenuOpen }) {
  const location = useLocation();
  const [drillDown, setDrillDown] = useState(null);

  // --- TERRITORIAL STATES ---
  const [selectedCircos, setSelectedCircos] = useState(['National']);
  const [selectedRCs, setSelectedRCs] = useState(Object.keys(store.competences));

  // Handle Deep Linking from Sessions Page
  useEffect(() => {
    if (location.state?.formationId) {
      setDrillDown({ 
        formationId: location.state.formationId, 
        sessionId: location.state.sessionId 
      });
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // --- DIAGNOSTIC ENGINE ---

  // 1. Filtered Participants
  const participants = useMemo(() => {
    if (selectedCircos.includes('National')) return store.enseignants;
    return store.enseignants.filter(e => selectedCircos.includes(e.Circonscription));
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
        const scores = teachers.map(p => {
          const auto = p.scores?.[rcId] || 3;
          const obs = p.temporalObsScore;
          return obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
        });
        const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
        const target = store.referential?.[rcId]?.targetScore || 4.0;
        const urgency = Math.max(0, target - avg);
        const impact = Math.round((teachers.filter(p => (p.scores?.[rcId] || 3) < target).length / teachers.length) * 100);
        
        return { 
          id: rcId, 
          name: store.competences[rcId]?.split(' — ')[0] || rcId,
          urgency: Math.round(urgency * 10) / 10,
          impact,
          gap: (urgency * 10) + 10, // Added for bubble size
          circo
        };
      });

      const avgIge = (urgencyData.reduce((acc, d) => acc + d.urgency, 0) / urgencyData.length).toFixed(1);
      
      // Heterogeneity (CH) within the circo
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
    const list = Object.values(store.formations)
      .filter(f => f.id.includes('.'))
      .map(f => {
      const targeted = f.targetedComps || [];
      const teacherAverages = participants.map(p => {
        const compScores = targeted.map(rcId => {
          const auto = p.scores?.[rcId] || 3;
          const obs = p.temporalObsScore;
          return obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
        });
        return compScores.length > 0 ? (compScores.reduce((a, b) => a + b, 0) / compScores.length) : 3;
      });
      const avgTerritory = teacherAverages.reduce((a, b) => a + b, 0) / (teacherAverages.length || 1);
      const impact = Math.min(100, Math.max(0, 5 - avgTerritory) * 20);
      
      // IPT (Intensity of Territorial Priority) - Hybrid if strategic mode is ON
      // We scale ipf (1-5) to 0-100 for consistent weighting
      const strategicWeight = (f.ipf || 0) * 20;
      const ipt = store.strategicMode 
        ? Math.round(impact * 0.8 + strategicWeight * 0.2)
        : Math.round(impact);

      return { ...f, impact, ipt };
    });

    return list.sort((a, b) => b.ipt - a.ipt);
  }, [participants, store.formations, store.strategicMode]);

  // 4. Pure Terrain Urgency (The "Critical Need" label) - Filtered by selection
  const topUrgencyRC = useMemo(() => {
    const circos = Object.values(advancedStats.circosData);
    if (circos.length === 0) return null;
    
    const rcTotals = {};
    circos.forEach(c => {
      (c.urgencyData || []).forEach(d => {
        if (!rcTotals[d.id]) rcTotals[d.id] = { id: d.id, sum: 0, count: 0, name: d.name };
        rcTotals[d.id].sum += d.urgency;
        rcTotals[d.id].count++;
      });
    });

    const sorted = Object.values(rcTotals)
      .map(t => ({ id: t.id, urgency: t.sum / t.count, name: t.name }))
      .filter(t => selectedRCs.includes(t.id))
      .sort((a, b) => b.urgency - a.urgency);
      
    return sorted[0];
  }, [advancedStats, selectedRCs]);

  // 4b. Tactical IGE (Average of urgency on selected RCs)
  const tacticalIGE = useMemo(() => {
    if (selectedRCs.length === 0) return "0.0";
    const circos = Object.values(advancedStats.circosData);
    if (circos.length === 0) return "0.0";
    
    let totalSum = 0;
    let totalCount = 0;
    
    circos.forEach(c => {
      (c.urgencyData || []).forEach(d => {
        if (selectedRCs.includes(d.id)) {
          totalSum += d.urgency;
          totalCount++;
        }
      });
    });
    
    return totalCount > 0 ? (totalSum / totalCount).toFixed(2) : "0.0";
  }, [advancedStats, selectedRCs]);

  // 5. Volume de Besoin (Masse critique) - Réactif aux filtres RC
  const demandIntensity = useMemo(() => {
    if (participants.length === 0 || selectedRCs.length === 0) return 0;
    const concerned = participants.filter(p => {
      // Is this teacher below target on at least one of the SELECTED RCs?
      return selectedRCs.some(rcId => {
        const auto = p.scores?.[rcId] || 3;
        const obs = p.temporalObsScore;
        const score = obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
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

  const handleOpenSession = (formationId, sessionId) => {
    if (!sessionId) {
      const formation = store.referential[formationId] || store.formations[formationId];
      const newSessionId = store.addSession({
        formationId,
        'Titre formation': formation?.libelle || formation?.title || 'Nouvelle Session',
        'Statut': 'Analyse',
        'Lieu': selectedCircos[0] === 'National' ? 'Kef' : selectedCircos[0],
        'Circonscription': selectedCircos[0] === 'National' ? 'Kef' : selectedCircos[0],
        inscrits: participants.slice(0, 20).map(p => p.ID), // Smart pre-fill
        currentStep: 1,
        cdc: formation?.cdc || {}
      });
      setDrillDown({ formationId, sessionId: newSessionId });
    } else {
      setDrillDown({ formationId, sessionId });
    }
  };

  if (drillDown) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          <FormationDetailView 
            formationId={drillDown.formationId} 
            initialSessionId={drillDown.sessionId}
            store={store}
            onBack={() => setDrillDown(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header 
        title="Ingénierie Stratégique" 
        subtitle="Pilotage territorial et Design ADDIE"
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
      />
      <Breadcrumb />
      
      <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
         <TerritorialPortal 
            store={store} 
            selectedCircos={selectedCircos}
            setSelectedCircos={setSelectedCircos}
            selectedRCs={selectedRCs}
            setSelectedRCs={setSelectedRCs}
            participants={participants}
            advancedStats={advancedStats}
            recommendedFormations={recommendedFormations}
            triangulationIndex={triangulationIndex}
            onOpenSession={handleOpenSession} 
            topUrgencyRC={topUrgencyRC}
            demandIntensity={demandIntensity}
            tacticalIGE={tacticalIGE}
         />
      </div>
    </div>
  );
}
