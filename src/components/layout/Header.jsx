import { Bell, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertBadge } from '../ui/AlertBadge';

export function Header({ title, subtitle, alertCount = 0, loadedAt, actions, onMenuOpen }) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuOpen}
        className="md:hidden flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-base md:text-lg font-semibold text-[#1F3864] truncate">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">{subtitle}</p>}
      </div>

      {/* Actions — hide on mobile except bell */}
      {actions && (
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}

      {/* Bell icon */}
      <Link
        to="/alertes"
        className="relative flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
        title="Alertes actives"
      >
        <Bell size={18} className="text-gray-500" />
        {alertCount > 0 && (
          <span className="absolute -top-1 -right-1">
            <AlertBadge count={alertCount} priority="haute" />
          </span>
        )}
      </Link>

      {/* Mobile actions (view toggles etc.) — shown below title on mobile */}
      {actions && (
        <div className="md:hidden flex-shrink-0">
          {actions}
        </div>
      )}

      {/* Freshness indicator */}
      {loadedAt && (
        <div className="hidden lg:block absolute bottom-0 right-4 text-[10px] text-gray-300 pb-0.5">
          Données chargées le {loadedAt}
        </div>
      )}
    </header>
  );
}
