import { useMemo, useState } from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, Activity, Bell, Settings2, Sparkles } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { AlertesList } from '../components/features/alertes/AlertesList';
import { AlerteConfig } from '../components/features/alertes/AlerteConfig';
import { AlertePersonnalisee } from '../components/features/alertes/AlertePersonnalisee';

const TABS = [
  { id: 'list', label: 'Flux temps réel', icon: Activity },
  { id: 'config', label: 'Configuration', icon: Settings2 },
  { id: 'custom', label: 'Rappels personnalisés', icon: Sparkles },
];

function KpiCard({ icon, label, value, tone }) {
  const Icon = icon;
  const toneMap = {
    blocking: { text: 'text-red-700', chip: 'bg-red-50 text-red-700 ring-1 ring-red-200', glow: 'from-red-400/20 to-red-600/10' },
    warning: { text: 'text-orange-700', chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', glow: 'from-orange-300/20 to-orange-500/10' },
    info: { text: 'text-amber-700', chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', glow: 'from-amber-300/20 to-amber-500/10' },
    ok: { text: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', glow: 'from-emerald-300/20 to-emerald-500/10' },
  };
  const t = toneMap[tone] || toneMap.info;
  return (
    <div className="relative bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4 overflow-hidden">
      <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${t.glow} rounded-full blur-2xl`} />
      <div className="relative flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${t.chip}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{label}</p>
          <p className={`text-2xl font-extrabold tabular-nums ${t.text}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

export function AlertesPage({ data, alertsHook, alertCount, loadedAt, onMenuOpen, store }) {
  const [tab, setTab] = useState('list');

  const kpis = useMemo(() => {
    const all = alertsHook.activeAlerts || [];
    const blocking = all.filter(a => a.type === 'blocking').length;
    const warning = all.filter(a => a.type === 'warning').length;
    const info = all.filter(a => a.type === 'info').length;
    const acknowledged = all.filter(a => a.state === 'acknowledged').length;
    return { total: all.length, blocking, warning, info, acknowledged };
  }, [alertsHook.activeAlerts]);

  return (
    <div>
      <Header
        title="Alertes & Suivi"
        subtitle="Monitoring temps réel · Détection · Aide à la décision"
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
      />
      <Breadcrumb />

      <div className="p-4 md:p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiCard icon={Bell} label="Actives" value={kpis.total} tone={kpis.total ? 'warning' : 'ok'} />
          <KpiCard icon={AlertOctagon} label="Bloquantes" value={kpis.blocking} tone="blocking" />
          <KpiCard icon={AlertTriangle} label="Avertissements" value={kpis.warning} tone="warning" />
          <KpiCard icon={Info} label="Informations" value={kpis.info} tone="info" />
          <KpiCard icon={CheckCircle2} label="Acquittées" value={kpis.acknowledged} tone="ok" />
        </div>

        {/* Tab switcher */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-1.5">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    active
                      ? 'bg-gradient-to-br from-[#1F3864] to-[#2E75B6] text-white shadow-lg'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                  }`}
                >
                  <Icon size={14} />
                  {t.label}
                  {t.id === 'list' && kpis.total > 0 && (
                    <span className={`ml-1 min-w-[1.25rem] text-center text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                    }`}>
                      {kpis.total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel */}
        {tab === 'list' && (
          <AlertesList
            activeAlerts={alertsHook.activeAlerts}
            treatedAlerts={alertsHook.treatedAlerts}
            customAlerts={alertsHook.customAlerts}
            onTreat={alertsHook.treatAlert}
            onAcknowledge={alertsHook.acknowledgeAlert}
            onUnacknowledge={alertsHook.unacknowledgeAlert}
            onReopen={alertsHook.reopenAlert}
            store={store}
            data={data}
          />
        )}
        {tab === 'config' && (
          <AlerteConfig
            config={alertsHook.config}
            onUpdate={alertsHook.updateConfig}
            onReset={alertsHook.resetConfig}
          />
        )}
        {tab === 'custom' && (
          <AlertePersonnalisee
            customAlerts={alertsHook.customAlerts}
            onAdd={alertsHook.addCustomAlert}
            onRemove={alertsHook.removeCustomAlert}
          />
        )}
      </div>
    </div>
  );
}
