import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { useData, SEED_ENSEIGNANTS, SEED_SESSIONS, SEED_AUTOPOS } from './hooks/useData';
import { useDataStore } from './hooks/useDataStore';
import { useAlerts } from './hooks/useAlerts';
import { AccueilPage } from './pages/AccueilPage';
import { EnseignantsPage } from './pages/EnseignantsPage';
import { SessionsPage } from './pages/SessionsPage';
import { TableauxDeBordPage } from './pages/TableauxDeBordPage';
import { AlertesPage } from './pages/AlertesPage';
import { ParametresPage } from './pages/ParametresPage';
import { IngenieriePage } from './pages/IngenieriePage';

export default function App() {
  // Static data (satisfaction, acquis, transfert, observations, etc.)
  const staticData = useData();

  // Dynamic store (enseignants, sessions, formations, compétences — all editable)
  const store = useDataStore(SEED_ENSEIGNANTS, SEED_SESSIONS, SEED_AUTOPOS);

  // Full data object passed to all pages
  const { satisfaction, acquis, transfert } = store.getMergedKirkpatrick(
    staticData.satisfaction,
    staticData.acquis,
    staticData.transfert
  );

  const data = {
    ...staticData,
    satisfaction,
    acquis,
    transfert,
    enseignants: store.enseignants,
    sessions: store.sessions,
    crefocs: store.crefocs,
    formations: store.formations,
  };

  const alertsHook = useAlerts(data);
  const alertCount = alertsHook.activeAlerts.length;
  const commonProps = {
    alertCount,
    loadedAt: staticData.loadedAt,
    store,
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
        <Sidebar
          alertCount={alertCount}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-auto min-w-0">
          <Routes>
            <Route path="/" element={
              <AccueilPage data={data} alerts={alertsHook.activeAlerts} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/enseignants" element={
              <EnseignantsPage data={data} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/enseignants/:id" element={
              <EnseignantsPage data={data} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/sessions" element={
              <SessionsPage data={data} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/tableaux-de-bord" element={
              <TableauxDeBordPage data={data} alerts={alertsHook.activeAlerts} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/tableaux-de-bord" element={
              <TableauxDeBordPage data={data} alerts={alertsHook.activeAlerts} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/alertes" element={
              <AlertesPage data={data} alertsHook={alertsHook} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/parametres" element={
              <ParametresPage data={data} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
            <Route path="/ingenierie" element={
              <IngenieriePage data={data} {...commonProps}
                onMenuOpen={() => setSidebarOpen(true)} />
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
