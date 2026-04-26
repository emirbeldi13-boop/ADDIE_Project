import { useState } from 'react';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import { DashboardCycle } from '../components/features/dashboard/DashboardCycle';
import { DashboardFormation } from '../components/features/dashboard/DashboardFormation';
import { FORMATION_COLORS, COLORS } from '../constants/colors';

export function TableauxDeBordPage({ data, alerts, alertCount, loadedAt, onMenuOpen, store }) {
  const [tab, setTab] = useState('cycle');

  const formations = store?.formations || {};
  const formationIds = Object.keys(formations);

  const tabs = [
    { id: 'cycle', label: 'Cycle complet', color: COLORS.navy },
    ...formationIds.map(fId => ({
      id: fId,
      label: `${fId} — ${formations[fId]?.court || formations[fId]?.libelle || fId}`,
      color: formations[fId]?.color || FORMATION_COLORS[fId] || COLORS.blue,
    })),
  ];

  return (
    <div>
      <Header
        title="Tableaux de Bord"
        subtitle="4 niveaux Kirkpatrick · ADDIE Macro + 3 ADDIE Micro"
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
      />
      <Breadcrumb />

      {/* Sub-tabs — scrollable on mobile */}
      <div className="px-4 md:px-6 pt-4 border-b border-gray-100 bg-white">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 md:px-4 py-2.5 text-xs md:text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
                tab === t.id ? 'border-current' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
              style={{
                color: tab === t.id ? t.color : undefined,
                borderColor: tab === t.id ? t.color : 'transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">
        {tab === 'cycle' && <DashboardCycle data={data} alerts={alerts} store={store} />}
        {tab !== 'cycle' && (
          <DashboardFormation formation={tab} data={data} store={store} />
        )}
      </div>
    </div>
  );
}
