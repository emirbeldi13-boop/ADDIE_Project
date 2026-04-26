import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, Clock, ArrowRight, AlertOctagon, AlertTriangle, Info,
  EyeOff, Undo2, Sparkles, Filter, Search
} from 'lucide-react';
import { EmptyState } from '../../ui/EmptyState';

const TYPE_META = {
  blocking: { icon: AlertOctagon, label: 'Bloquant', ring: 'ring-red-200', dot: 'bg-red-500', chip: 'bg-red-50 text-red-700', rail: 'from-red-500 to-red-700' },
  warning: { icon: AlertTriangle, label: 'Avertissement', ring: 'ring-orange-200', dot: 'bg-orange-500', chip: 'bg-orange-50 text-orange-700', rail: 'from-orange-400 to-orange-600' },
  info: { icon: Info, label: 'Information', ring: 'ring-amber-200', dot: 'bg-amber-400', chip: 'bg-amber-50 text-amber-700', rail: 'from-amber-300 to-amber-500' },
};

const SOURCE_LABEL = {
  enseignants: 'Enseignants',
  sessions: 'Sessions',
  formations: 'Formations',
  crefocs: 'CREFOC',
  acquis: 'Acquis (N2)',
  satisfaction: 'Satisfaction (N1)',
  transfert: 'Transfert (N3)',
};

const PRIORITY_ORDER = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
const TYPE_ORDER = { blocking: 0, warning: 1, info: 2 };

function Freshness({ iso }) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  const label = mins < 1 ? 'à l\'instant' : mins < 60 ? `il y a ${mins} min` : `il y a ${Math.round(mins / 60)} h`;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
      <Clock size={10} /> {label}
    </span>
  );
}

function AlertCard({ alert, onTreat, onAcknowledge, onUnacknowledge, isTreating, onStartTreat, onCancelTreat, note, setNote, onSubmitTreat }) {
  const meta = TYPE_META[alert.type] || TYPE_META.info;
  const Icon = meta.icon;
  const isAcked = alert.state === 'acknowledged';

  return (
    <div className={`relative bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl overflow-hidden transition-all ${isAcked ? 'opacity-70' : ''}`}>
      {/* Left color rail */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${meta.rail}`} />

      <div className="p-4 md:p-5 pl-5 md:pl-6">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${meta.chip} ring-1 ${meta.ring}`}>
            <Icon size={18} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-[#1F3864] text-sm md:text-base">{alert.nom}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${meta.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} /> {meta.label}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                {alert.alertId}
              </span>
              {alert.source && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 ring-1 ring-gray-200">
                  {SOURCE_LABEL[alert.source] || alert.source}
                </span>
              )}
              {isAcked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200 px-2 py-0.5 rounded-full">
                  <EyeOff size={10} /> Acquittée
                </span>
              )}
            </div>

            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{alert.message}</p>
            {alert.detail && <p className="text-xs text-gray-500 mt-1">{alert.detail}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {alert.enseignant && (
                <Link
                  to={`/enseignants/${alert.enseignantId}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#2E75B6] bg-[#2E75B6]/5 hover:bg-[#2E75B6]/10 px-2.5 py-1 rounded-lg transition-colors"
                >
                  👤 {alert.enseignant}
                </Link>
              )}
              {alert.formation && (
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg ring-1 ring-gray-100">
                  {alert.formation}
                </span>
              )}
              {alert.circo && (
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg ring-1 ring-gray-100">
                  {alert.circo}
                </span>
              )}
              {alert.op && (
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg ring-1 ring-gray-100">
                  {alert.op}
                </span>
              )}
              {alert.sessionId && (
                <span className="text-[10px] font-semibold text-gray-600 bg-gray-50 px-2 py-1 rounded-lg ring-1 ring-gray-100">
                  {alert.sessionId}
                </span>
              )}
              <Freshness iso={alert.computedAt} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {alert.actionLink && (
              <Link
                to={alert.actionLink.path}
                className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-gradient-to-br from-[#1F3864] to-[#2E75B6] text-white rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                {alert.actionLink.label} <ArrowRight size={13} />
              </Link>
            )}
            <div className="flex gap-1.5">
              {isAcked ? (
                <button
                  onClick={() => onUnacknowledge(alert)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-white text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Undo2 size={12} /> Réactiver
                </button>
              ) : (
                <button
                  onClick={() => onAcknowledge(alert)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-white text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <EyeOff size={12} /> Acquitter
                </button>
              )}
              <button
                onClick={onStartTreat}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                <CheckCircle size={12} /> Résoudre
              </button>
            </div>
          </div>
        </div>

        {isTreating && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-2">
              Note de résolution (obligatoire)
            </p>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/30 focus:border-[#2E75B6]/30 bg-white"
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Décrivez l'action entreprise…"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={onSubmitTreat}
                disabled={!note.trim()}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
              >
                Confirmer la résolution
              </button>
              <button
                onClick={onCancelTreat}
                className="px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupHeader({ title, count, accent }) {
  return (
    <div className="flex items-center gap-2 mt-2 mb-2">
      <span className={`inline-block w-1 h-5 rounded-full ${accent || 'bg-gradient-to-b from-[#1F3864] to-[#2E75B6]'}`} />
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-600">
        {title}
      </h3>
      <span className="text-[10px] font-black text-gray-400 tabular-nums">· {count}</span>
    </div>
  );
}

const GROUP_BY_OPTIONS = [
  { id: 'type', label: 'Gravité' },
  { id: 'formation', label: 'Formation' },
  { id: 'circo', label: 'Circonscription' },
  { id: 'source', label: 'Source' },
  { id: 'none', label: 'Aucun' },
];

export function AlertesList({
  activeAlerts,
  treatedAlerts,
  customAlerts = [],
  onTreat,
  onAcknowledge,
  onUnacknowledge,
  onReopen,
}) {
  const [lifecycle, setLifecycle] = useState('active');
  const [groupBy, setGroupBy] = useState('type');
  const [search, setSearch] = useState('');
  const [treatingKey, setTreatingKey] = useState(null);
  const [note, setNote] = useState('');

  const liveAlerts = useMemo(() => {
    return [...(activeAlerts || [])].sort((a, b) => {
      const t = (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9);
      if (t !== 0) return t;
      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    });
  }, [activeAlerts]);

  const filtered = useMemo(() => {
    if (!search.trim()) return liveAlerts;
    const q = search.toLowerCase();
    return liveAlerts.filter(a => {
      return (
        (a.nom || '').toLowerCase().includes(q) ||
        (a.message || '').toLowerCase().includes(q) ||
        (a.detail || '').toLowerCase().includes(q) ||
        (a.enseignant || '').toLowerCase().includes(q) ||
        (a.formation || '').toLowerCase().includes(q) ||
        (a.circo || '').toLowerCase().includes(q) ||
        (a.alertId || '').toLowerCase().includes(q)
      );
    });
  }, [liveAlerts, search]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [['Toutes les alertes', filtered]];
    const buckets = new Map();
    filtered.forEach(a => {
      let key;
      if (groupBy === 'type') key = TYPE_META[a.type]?.label || 'Autre';
      else if (groupBy === 'formation') key = a.formation || 'Transverse';
      else if (groupBy === 'circo') key = a.circo || 'Toutes circonscriptions';
      else if (groupBy === 'source') key = SOURCE_LABEL[a.source] || a.source || 'Autre';
      else key = 'Autre';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(a);
    });
    // Keep type grouping in severity order
    if (groupBy === 'type') {
      const order = ['Bloquant', 'Avertissement', 'Information'];
      return order.filter(k => buckets.has(k)).map(k => [k, buckets.get(k)]);
    }
    return Array.from(buckets.entries());
  }, [filtered, groupBy]);

  function startTreat(alert) {
    setTreatingKey(alertKeyFor(alert));
    setNote('');
  }
  function cancelTreat() {
    setTreatingKey(null);
    setNote('');
  }
  function submitTreat(alert) {
    if (!note.trim()) return;
    onTreat(alert, note);
    cancelTreat();
  }

  return (
    <div className="space-y-4">
      {/* Lifecycle switcher */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-gray-100/80 backdrop-blur-sm rounded-xl p-1">
          {[
            { id: 'active', label: 'Actives', count: liveAlerts.length },
            { id: 'treated', label: 'Résolues', count: treatedAlerts.length },
            { id: 'custom', label: 'Rappels', count: customAlerts.length },
          ].map(lc => (
            <button
              key={lc.id}
              onClick={() => setLifecycle(lc.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                lifecycle === lc.id
                  ? 'bg-white shadow text-[#1F3864]'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {lc.label}
              <span className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded ${
                lifecycle === lc.id ? 'bg-[#2E75B6]/10 text-[#2E75B6]' : 'bg-gray-200/60 text-gray-500'
              }`}>
                {lc.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {lifecycle === 'active' && (
        <>
          {/* Filter bar */}
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-3 flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher une alerte, enseignant, formation…"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#2E75B6]/30 focus:ring-4 focus:ring-[#2E75B6]/5 transition-all outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
              <Filter size={13} className="text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Grouper</span>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-700 outline-none cursor-pointer"
              >
                {GROUP_BY_OPTIONS.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-8">
              <EmptyState icon="✅" title="Aucune alerte active" description="Tous les signaux sont au vert." />
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([label, items]) => (
                <div key={label}>
                  <GroupHeader
                    title={label}
                    count={items.length}
                    accent={
                      groupBy === 'type'
                        ? (label === 'Bloquant' ? 'bg-gradient-to-b from-red-500 to-red-700'
                          : label === 'Avertissement' ? 'bg-gradient-to-b from-orange-400 to-orange-600'
                          : 'bg-gradient-to-b from-amber-300 to-amber-500')
                        : undefined
                    }
                  />
                  <div className="space-y-3">
                    {items.map(alert => {
                      const key = alertKeyFor(alert);
                      return (
                        <AlertCard
                          key={key}
                          alert={alert}
                          onAcknowledge={onAcknowledge}
                          onUnacknowledge={onUnacknowledge}
                          isTreating={treatingKey === key}
                          onStartTreat={() => startTreat(alert)}
                          onCancelTreat={cancelTreat}
                          note={note}
                          setNote={setNote}
                          onSubmitTreat={() => submitTreat(alert)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {lifecycle === 'treated' && (
        <>
          {treatedAlerts.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-8">
              <EmptyState icon="📋" title="Historique vide" description="Les alertes résolues apparaîtront ici." />
            </div>
          ) : (
            <div className="space-y-3">
              {[...treatedAlerts].reverse().map((item, i) => (
                <div key={item.key || i} className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700">
                      <CheckCircle size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#1F3864] text-sm">{item.alert?.nom}</p>
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                          {item.alert?.alertId}
                        </span>
                      </div>
                      {item.alert?.detail && <p className="text-xs text-gray-500 mt-0.5">{item.alert.detail}</p>}
                      <div className="mt-2 bg-emerald-50/80 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-800">
                        <span className="font-semibold">Note : </span>{item.note}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">
                        Résolue le {new Date(item.treatedAt).toLocaleDateString('fr-FR')}
                        {' à '}
                        {new Date(item.treatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {onReopen && (
                      <button
                        onClick={() => onReopen(item.key)}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Undo2 size={12} /> Rouvrir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {lifecycle === 'custom' && (
        <>
          {customAlerts.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-8">
              <EmptyState icon="✨" title="Aucun rappel personnalisé" description="Créez-en un depuis l'onglet « Rappels personnalisés »." />
            </div>
          ) : (
            <div className="space-y-3">
              {customAlerts.map(a => (
                <div key={a.id} className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50 ring-1 ring-purple-200 text-purple-700">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1F3864] text-sm">{a.nom}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.message}</p>
                      {a.condition && <p className="text-[10px] text-gray-400 mt-1 italic">{a.condition}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function alertKeyFor(alert) {
  return `${alert.alertId}-${alert.enseignantId || ''}-${alert.formation || ''}-${alert.op || ''}-${alert.circo || ''}-${alert.sessionId || ''}`;
}
