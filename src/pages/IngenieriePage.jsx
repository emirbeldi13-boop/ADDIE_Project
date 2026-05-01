import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTerritorialDiagnostics } from '../hooks/useTerritorialDiagnostics';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { FormationDetailView } from '../components/features/engineering/FormationDetailView';
import { TerritorialPortal } from '../components/features/engineering/TerritorialPortal';
import { AnalysisWorkflowPortal } from '../components/features/engineering/workflow/AnalysisWorkflowPortal';
import { Workflow, LayoutDashboard } from 'lucide-react';

export function IngenieriePage({ data, store, alertCount, loadedAt, onMenuOpen }) {
  const location = useLocation();
  const [drillDown, setDrillDown] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('addie_ingenierie_mode') || 'workflow';
  });

  useEffect(() => {
    localStorage.setItem('addie_ingenierie_mode', viewMode);
  }, [viewMode]);

  // --- TERRITORIAL STATES ---
  const [selectedCircos, setSelectedCircos] = useState(() => {
    const saved = localStorage.getItem('addie_selected_circos');
    return saved ? JSON.parse(saved) : ['National'];
  });

  const [selectedRCs, setSelectedRCs] = useState(() => {
    const saved = localStorage.getItem('addie_selected_rcs');
    if (saved) return JSON.parse(saved);
    return Object.keys(store.competences || {});
  });

  // Persist states to localStorage
  useEffect(() => {
    localStorage.setItem('addie_selected_circos', JSON.stringify(selectedCircos));
  }, [selectedCircos]);

  useEffect(() => {
    localStorage.setItem('addie_selected_rcs', JSON.stringify(selectedRCs));
  }, [selectedRCs]);

  // Après hydratation Supabase, les compétences peuvent passer de {} à un objet plein : resynchroniser la sélection RC
  useEffect(() => {
    const keys = Object.keys(store.competences || {});
    if (keys.length === 0) return;
    
    setSelectedRCs((prev) => {
      // Avoid infinite loops by checking if the selection actually needs to change
      const isSameLength = prev.length === keys.length;
      const allExist = isSameLength && prev.every(rc => keys.includes(rc));
      
      if (allExist) return prev; // Return exact same reference to prevent re-render
      
      if (prev.length === 0) return keys;
      const kept = prev.filter((rc) => keys.includes(rc));
      return kept.length ? kept : keys;
    });
  }, [store.competences]); // Only fire if the object reference changes

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

  // --- DIAGNOSTIC ENGINE (Custom Hook) ---
  const {
    participants,
    advancedStats,
    recommendedFormations,
    topUrgencyRC,
    tacticalIGE,
    demandIntensity,
    triangulationIndex
  } = useTerritorialDiagnostics(store, selectedCircos, selectedRCs);

  const handleOpenSession = (formationId, sessionId) => {
    if (!sessionId) {
      const formation = store.referential[formationId] || store.formations[formationId];
      
      // OPTIMIZATION: Better default location selection
      let targetCirco = selectedCircos[0];
      if (targetCirco === 'National') {
        // Find the region with highest urgency for this formation
        const targeted = formation?.targetedComps || [];
        const regions = Object.keys(store.crefocs);
        let bestCirco = regions[0] || 'Kef';
        let maxUrgency = -1;

        regions.forEach(circo => {
          const circoData = advancedStats.circosData[circo];
          if (circoData) {
            const urgency = circoData.urgencyData
              .filter(d => targeted.includes(d.id))
              .reduce((acc, d) => acc + d.urgency, 0);
            if (urgency > maxUrgency) {
              maxUrgency = urgency;
              bestCirco = circo;
            }
          }
        });
        targetCirco = bestCirco;
      }

      // Filter participants who actually need this formation (below target)
      const targetedComps = formation?.targetedComps || [];
      const relevantParticipants = participants.filter(p => {
        if (targetCirco !== 'National' && p.Circonscription !== targetCirco) return false;
        return targetedComps.some(rcId => (p.realityScores?.[rcId] ?? 3) < (store.referential?.[rcId]?.targetScore || 4.0));
      });

      const newSessionId = store.addSession({
        Formation: formationId,
        'Titre formation': formation?.libelle || formation?.title || 'Nouvelle Session',
        'Statut': 'Analyse',
        'Lieu': store.crefocs[targetCirco]?.nom || targetCirco,
        'Circonscription': targetCirco,
        inscrits: relevantParticipants.slice(0, 30).map((p) => p['ID']).filter(Boolean),
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
      
      {/* ── Mode Toggle ── */}
      <div className="px-4 md:px-8 max-w-[1800px] mx-auto pt-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('workflow')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'workflow' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Workflow size={14} />
              Workflow Décisionnel
            </button>
            <button
              onClick={() => setViewMode('legacy')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                viewMode === 'legacy' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutDashboard size={14} />
              Vue Classique
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-[1800px] mx-auto">
        {viewMode === 'workflow' ? (
          <AnalysisWorkflowPortal
            store={store}
            selectedCircos={selectedCircos}
            setSelectedCircos={setSelectedCircos}
            selectedRCs={selectedRCs}
            setSelectedRCs={setSelectedRCs}
            participants={participants}
            advancedStats={advancedStats}
            recommendedFormations={recommendedFormations}
            topUrgencyRC={topUrgencyRC}
            tacticalIGE={tacticalIGE}
            onOpenSession={handleOpenSession}
          />
        ) : (
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
        )}
      </div>
    </div>
  );
}
