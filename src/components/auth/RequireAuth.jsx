import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function RequireAuth({ role = null, children }) {
  const { isAuthenticated, loading, profile, profileLoading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && profileLoading && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3 text-[#1F3864]">
          <div className="w-5 h-5 border-2 border-[#1F3864] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Chargement…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profile && profile.is_active === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6">
        <div className="max-w-md w-full bg-white rounded-[32px] p-8 shadow-lg border border-slate-200 text-center">
          <h1 className="text-xl font-black italic text-[#991B1B] mb-2">Compte désactivé</h1>
          <p className="text-sm text-slate-600">
            Votre compte a été désactivé. Veuillez contacter l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  if (role === 'super_admin' && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children ?? <Outlet />;
}
