import { NavLink } from 'react-router-dom';
import { Home, Users, Calendar, BarChart2, Bell, Settings, X, Compass, ShieldCheck, LogOut } from 'lucide-react';
import { AlertBadge } from '../ui/AlertBadge';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/', icon: Home, label: "Vue d'ensemble", exact: true },
  { path: '/tableaux-de-bord', icon: BarChart2, label: 'Tableau de Bord' },
  { path: '/enseignants', icon: Users, label: 'Base Enseignants' },
  { path: '/sessions', icon: Calendar, label: 'Planning des Sessions' },
  { path: '/ingenierie', icon: Compass, label: 'Portail Stratégique & ADDIE' },
  { path: '/alertes', icon: Bell, label: 'Alertes & Suivi', alertCount: true },
  { path: '/parametres', icon: Settings, label: 'Paramètres' },
];

export function Sidebar({ alertCount = 0, open, onClose }) {
  const { user, profile, isSuperAdmin, signOut } = useAuth();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 min-h-screen bg-[#1F3864] text-white flex flex-col shadow-xl flex-shrink-0
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo / Title */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#2E75B6] rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                PT
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight">PedagoTrack</h1>
                <p className="text-xs text-blue-300">Cycle Italien 2026-2027</p>
              </div>
            </div>
            {/* Close button — mobile only */}
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Fermer le menu"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-xs font-bold ring-2 ring-white/20">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider leading-none mb-1">
                {isSuperAdmin ? 'Super Admin' : 'Inspecteur'}
              </p>
              <p className="text-xs font-medium truncate text-white leading-tight">
                {profile?.full_name || user?.email?.split('@')[0] || 'Utilisateur'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ path, icon: Icon, label, exact, alertCount: showAlert }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={exact}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-[#2E75B6] text-white font-semibold shadow-inner'
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={17} className="flex-shrink-0" />
                  <span className="flex-1 leading-tight">{label}</span>
                  {showAlert && alertCount > 0 && (
                    <AlertBadge count={alertCount} priority="haute" />
                  )}
                </NavLink>
              </li>
            ))}

            {isSuperAdmin && (
              <li className="pt-2 mt-2 border-t border-white/10">
                <p className="px-3 mb-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">Administration</p>
                <NavLink
                  to="/admin/users"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-[#2E75B6] text-white font-semibold'
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <ShieldCheck size={17} className="flex-shrink-0" />
                  <span className="flex-1 leading-tight">Utilisateurs</span>
                </NavLink>
              </li>
            )}
          </ul>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-all duration-150 group"
          >
            <LogOut size={17} className="group-hover:translate-x-0.5 transition-transform" />
            <span className="font-medium">Déconnexion</span>
          </button>
          
          <div className="mt-4 px-2 text-[10px] text-blue-400/60 leading-tight">
            <p>© 2026 PedagoTrack</p>
            <p>Production Environment v3.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
