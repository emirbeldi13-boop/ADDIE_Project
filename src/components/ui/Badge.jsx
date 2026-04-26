import { GLOSSAIRE } from '../../constants/formations';
import { Clock } from 'lucide-react';

/**
 * Badge component - always shows full label or tooltip per UX rule (no abbreviation alone)
 */
export function Badge({ code, label, variant = 'default', className = '', tooltip }) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    navy: 'bg-[#1F3864] text-white',
    teal: 'bg-[#0E6655] text-white',
    violet: 'bg-[#4A235A] text-white',
    exceptional: 'bg-yellow-50 text-yellow-800 border border-yellow-300',
  };

  const resolvedTooltip = tooltip || (code && GLOSSAIRE[code]);
  const display = label || (code ? `${code} — ${GLOSSAIRE[code] || code}` : '');

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}
      title={resolvedTooltip}
    >
      {display}
    </span>
  );
}

export function RecommandationBadge({ value }) {
  const map = {
    'Prioritaire': { variant: 'red', label: 'Prioritaire' },
    'Sélectionnable': { variant: 'yellow', label: 'Sélectionnable' },
    "Liste d'attente": { variant: 'default', label: "Liste d'attente" },
  };
  const cfg = map[value] || { variant: 'default', label: value };
  return <Badge label={cfg.label} variant={cfg.variant} />;
}

export function StatutBadge({ value }) {
  if (value === 'Titulaire (en attente)') {
    return <Badge label={value} variant="yellow" className="border border-yellow-300" />;
  }
  const variant = value === 'Stagiaire' ? 'orange' : 'blue';
  return <Badge label={value} variant={variant} />;
}

export function FormationBadge({ formation }) {
  const map = {
    F1: { variant: 'blue', label: 'F1 — Scénarisation pédagogique' },
    F2: { variant: 'green', label: 'F2 — Évaluation des apprentissages' },
    F3: { variant: 'orange', label: 'F3 — Différenciation pédagogique' },
  };
  const cfg = map[formation] || { variant: 'default', label: formation };
  return <Badge label={cfg.label} variant={cfg.variant} />;
}

export function CircoBadge({ circo }) {
  const map = {
    'Kef': { bg: '#0E6655', label: 'Kef' },
    'Béja': { bg: '#2E75B6', label: 'Béja' },
    'Jendouba': { bg: '#4A235A', label: 'Jendouba' },
  };
  const cfg = map[circo] || { bg: '#6B7280', label: circo };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

export function ExceptionalBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-800 border border-yellow-300">
      ⭐ Exceptionnel
    </span>
  );
}

// §2.4 — Priority group badge (⭐/🔴/🟠/⬜)
export function PriorityGroupBadge({ group }) {
  const map = {
    'override':    { icon: '⭐', label: 'Priorité abs.', cls: 'bg-purple-100 text-purple-700' },
    'group-a':     { icon: '🔴', label: 'Groupe A',      cls: 'bg-red-100 text-red-700' },
    'group-b':     { icon: '🟠', label: 'Groupe B',      cls: 'bg-orange-100 text-orange-700' },
    'tenured':     { icon: '⬜', label: 'Titulaire',     cls: 'bg-blue-50 text-blue-700' },
    'unavailable': { icon: '🚫', label: 'Indisponible',  cls: 'bg-gray-100 text-gray-500' },
  };
  const cfg = map[group] || { icon: '?', label: group, cls: 'bg-gray-100 text-gray-500' };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}
      title={
        group === 'override'    ? 'Priorité absolue — décision inspecteur (§2.2)' :
        group === 'group-a'     ? 'Groupe A — Stagiaire non visité (§2.5) — score estimé uniquement' :
        group === 'group-b'     ? 'Groupe B — Stagiaire visité (§2.6)' :
        group === 'tenured'     ? 'Titulaire — score global §2.7' :
        group === 'unavailable' ? 'Indisponible — exclu des listes de priorisation (§2.1)' : ''
      }
    >
      <span>{cfg.icon}</span> {cfg.label}
    </span>
  );
}

// §1.3 — Estimated score badge (score derived from autopositioning only)
export function EstimatedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 italic"
      title="Score Estimé — dérivé de l'auto-positionnement uniquement. Fiabilité limitée — visite à programmer."
    >
      📊 Estimé
    </span>
  );
}

// §2.1 — Availability badge
export function AvailabilityBadge({ status }) {
  if (status === 'available') return null;
  if (status === 'pending') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"
        title="Déclaration d'indisponibilité en attente de validation inspecteur"
      >
        <Clock size={10} /> En attente
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
      title="Indisponible — exclu des listes de priorisation (validé par l'inspecteur)"
    >
      🚫 Indisponible
    </span>
  );
}

export function ScoreObservationBadge({ method }) {
  if (method === 'Observé' || method === 'Observé directement') {
    return (
      <span className="text-xs text-gray-600" title="Score issu d'une observation directe officielle">
        👁 Observé
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-400 italic" title="Score estimé depuis la note historique et l'ancienneté">
      📊 Estimé
    </span>
  );
}
