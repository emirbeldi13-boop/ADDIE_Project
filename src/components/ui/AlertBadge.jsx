export function AlertBadge({ count, priority = 'haute' }) {
  if (!count) return null;
  const map = {
    haute: 'bg-red-600 text-white',
    moyenne: 'bg-orange-500 text-white',
    basse: 'bg-yellow-400 text-gray-800',
  };
  return (
    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${map[priority] || map.haute}`}>
      {count}
    </span>
  );
}

export function PriorityIcon({ priority }) {
  const map = {
    haute: { icon: '🔴', label: 'Haute priorité' },
    moyenne: { icon: '🟠', label: 'Priorité moyenne' },
    basse: { icon: '🟡', label: 'Basse priorité' },
  };
  const { icon, label } = map[priority] || map.haute;
  return <span title={label}>{icon}</span>;
}
