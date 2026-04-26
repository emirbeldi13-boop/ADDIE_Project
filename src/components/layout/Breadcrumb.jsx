import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS = {
  '': 'Accueil',
  'enseignants': 'Enseignants',
  'sessions': 'Sessions',
  'tableaux-de-bord': 'Tableaux de Bord',
  'alertes': 'Alertes',
  'parametres': 'Paramètres',
};

export function Breadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-xs text-gray-400 px-4 md:px-6 py-2 bg-gray-50 border-b border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
      <Link to="/" className="hover:text-[#2E75B6] transition-colors flex-shrink-0">Accueil</Link>
      {parts.map((part, i) => {
        const label = ROUTE_LABELS[part] || (part.startsWith('ENS') ? part : part);
        const isCurrent = i === parts.length - 1;
        return (
          <span key={i} className="flex items-center gap-1 flex-shrink-0">
            <ChevronRight size={12} className="flex-shrink-0" />
            {isCurrent ? (
              <span className="text-[#1F3864] font-medium max-w-[140px] truncate">{label}</span>
            ) : (
              <Link
                to={`/${parts.slice(0, i + 1).join('/')}`}
                className="hover:text-[#2E75B6] max-w-[140px] truncate"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
