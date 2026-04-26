import { useMemo } from 'react';
import { RotateCcw, Zap, Power } from 'lucide-react';

const TYPE_OF_PRIORITY = {
  critique: { label: 'Bloquant', chip: 'bg-red-50 text-red-700 ring-red-200' },
  haute: { label: 'Avertissement', chip: 'bg-orange-50 text-orange-700 ring-orange-200' },
  moyenne: { label: 'Avertissement', chip: 'bg-orange-50 text-orange-700 ring-orange-200' },
  basse: { label: 'Information', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
};

export function AlerteConfig({ config, onUpdate, onReset }) {
  const stats = useMemo(() => ({
    total: config.length,
    active: config.filter(a => a.active).length,
    paused: config.filter(a => !a.active).length,
  }), [config]);

  return (
    <div className="space-y-4">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Configuration du moteur</p>
          <h3 className="text-sm md:text-base font-bold text-[#1F3864] mt-1">
            {stats.total} règles d'alerte · {stats.active} actives · {stats.paused} en pause
          </h3>
        </div>
        <button
          onClick={onReset}
          className="self-start sm:self-auto flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-lg px-3 py-2 transition-colors"
        >
          <RotateCcw size={13} /> Réinitialiser aux valeurs par défaut
        </button>
      </div>

      <div className="space-y-3">
        {config.map(alert => {
          const typeMeta = TYPE_OF_PRIORITY[alert.priority] || TYPE_OF_PRIORITY.moyenne;
          return (
            <div
              key={alert.id}
              className={`relative bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4 md:p-5 transition-all ${
                alert.active ? '' : 'opacity-60'
              }`}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: alert.color }} />
              <div className="pl-3 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      {alert.id}
                    </span>
                    <p className="font-bold text-[#1F3864] text-sm">{alert.nom}</p>
                    <span className={`text-[10px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ring-1 ${typeMeta.chip}`}>
                      {typeMeta.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 font-mono">{alert.condition}</p>
                </div>
                <label className={`inline-flex items-center gap-2 cursor-pointer flex-shrink-0 px-2.5 py-1.5 rounded-lg border transition-colors ${
                  alert.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}>
                  <input
                    type="checkbox"
                    checked={alert.active}
                    onChange={e => onUpdate(alert.id, { active: e.target.checked })}
                    className="sr-only"
                  />
                  {alert.active ? <Zap size={12} /> : <Power size={12} />}
                  <span className="text-[10px] font-black uppercase tracking-[0.15em]">
                    {alert.active ? 'Active' : 'En pause'}
                  </span>
                </label>
              </div>

              {alert.seuil !== null && alert.seuil !== undefined && alert.seuilMin !== undefined && (
                <div className="mt-4 pl-3">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-1.5">
                    <span>Seuil de déclenchement</span>
                    <span className="text-[#1F3864] text-sm font-extrabold tabular-nums">{alert.seuil}</span>
                  </div>
                  <input
                    type="range"
                    min={alert.seuilMin}
                    max={alert.seuilMax}
                    step={alert.id === 'A4' || alert.id === 'A8' ? 0.1 : 1}
                    value={alert.seuil}
                    onChange={e => onUpdate(alert.id, { seuil: parseFloat(e.target.value) })}
                    className="w-full accent-[#2E75B6]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-0.5 tabular-nums">
                    <span>{alert.seuilMin}</span>
                    <span>{alert.seuilMax}</span>
                  </div>
                </div>
              )}

              <div className="mt-3 pl-3">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-1.5">Message affiché</p>
                <input
                  type="text"
                  value={alert.message}
                  onChange={e => onUpdate(alert.id, { message: e.target.value })}
                  className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 focus:border-[#2E75B6]/30 bg-white text-gray-700"
                  placeholder="Message de l'alerte…"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
