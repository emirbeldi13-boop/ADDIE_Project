import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { useData } from './hooks/useData';
import { useDataStore } from './hooks/useDataStore';
import { useAlerts } from './hooks/useAlerts';
import { AuthProvider } from './components/auth/AuthProvider';
import { RequireAuth } from './components/auth/RequireAuth';
import { LoginPage } from './pages/LoginPage';
import { SetPasswordPage } from './pages/SetPasswordPage';
import { AccueilPage } from './pages/AccueilPage';
import { EnseignantsPage } from './pages/EnseignantsPage';
import { SessionsPage } from './pages/SessionsPage';
import { TableauxDeBordPage } from './pages/TableauxDeBordPage';
import { AlertesPage } from './pages/AlertesPage';
import { ParametresPage } from './pages/ParametresPage';
import { IngenieriePage } from './pages/IngenieriePage';
import { UserManagementPage } from './pages/admin/UserManagementPage';

function AppShell() {
  const staticData = useData();
  const store = useDataStore();

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
  const commonProps = { alertCount, loadedAt: staticData.loadedAt, store };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const onMenuOpen = () => setSidebarOpen(true);

  if (staticData.loading || store.loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0F172A]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#0223C6]/20 border-t-[#0223C6] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-[#0223C6] rounded-full animate-pulse"></div>
          </div>
        </div>
        <h2 className="mt-6 text-white font-medium tracking-tight">Initialisation de l'espace production</h2>
        <p className="mt-2 text-slate-400 text-sm">Chargement des données Supabase...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <Sidebar
        alertCount={alertCount}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-auto min-w-0">
        <Routes>
          <Route
            path="/"
            element={
              <AccueilPage
                data={data}
                alerts={alertsHook.activeAlerts}
                {...commonProps}
                onMenuOpen={onMenuOpen}
              />
            }
          />
          <Route
            path="/enseignants"
            element={<EnseignantsPage data={data} {...commonProps} onMenuOpen={onMenuOpen} />}
          />
          <Route
            path="/enseignants/:id"
            element={<EnseignantsPage data={data} {...commonProps} onMenuOpen={onMenuOpen} />}
          />
          <Route
            path="/sessions"
            element={<SessionsPage data={data} {...commonProps} onMenuOpen={onMenuOpen} />}
          />
          <Route
            path="/tableaux-de-bord"
            element={
              <TableauxDeBordPage
                data={data}
                alerts={alertsHook.activeAlerts}
                {...commonProps}
                onMenuOpen={onMenuOpen}
              />
            }
          />
          <Route
            path="/alertes"
            element={
              <AlertesPage
                data={data}
                alertsHook={alertsHook}
                {...commonProps}
                onMenuOpen={onMenuOpen}
              />
            }
          />
          <Route
            path="/parametres"
            element={<ParametresPage data={data} {...commonProps} onMenuOpen={onMenuOpen} />}
          />
          <Route
            path="/ingenierie"
            element={<IngenieriePage data={data} {...commonProps} onMenuOpen={onMenuOpen} />}
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth role="super_admin">
                <UserManagementPage {...commonProps} onMenuOpen={onMenuOpen} />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
