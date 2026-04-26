import { useState } from 'react';
import { Plus, Sparkles, Trash2, Info } from 'lucide-react';

const PRIORITY_OPTIONS = [
  { id: 'haute', label: 'Haute', dot: 'bg-red-500', color: '#922B21' },
  { id: 'moyenne', label: 'Moyenne', dot: 'bg-orange-500', color: '#C55A11' },
  { id: 'basse', label: 'Basse', dot: 'bg-amber-400', color: '#D97706' },
];

export function AlertePersonnalisee({ customAlerts, onAdd, onRemove }) {
  const [form, setForm] = useState({ nom: '', condition: '', message: '', priority: 'moyenne' });

  function submit(e) {
    e.preventDefault();
    if (!form.nom.trim() || !form.message.trim()) return;
    const preset = PRIORITY_OPTIONS.find(p => p.id === form.priority);
    onAdd({
      ...form,
      active: true,
      color: preset?.color || '#C55A11',
    });
    setForm({ nom: '', condition: '', message: '', priority: 'moyenne' });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4 flex items-start gap-3">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-50 ring-1 ring-purple-200 text-purple-700">
          <Info size={18} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-600">Rappels manuels</p>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">
            Ces rappels ne sont pas évalués automatiquement. Ils servent de pense-bête pour l'inspecteur
            — à côté du moteur d'alertes basé sur les conditions.
          </p>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-[#2E75B6]" />
          <h3 className="text-sm font-bold text-[#1F3864]">Créer un rappel</h3>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-1.5">Nom *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 focus:border-[#2E75B6]/30"
              value={form.nom}
              onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
              placeholder="Ex : Enseignant sans PAP validé"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-1.5">Contexte / condition</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 focus:border-[#2E75B6]/30"
              value={form.condition}
              onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
              placeholder="Ex : Vérifier le statut PAP de cet enseignant"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-1.5">Message *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 focus:border-[#2E75B6]/30"
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Message affiché quand l'alerte est déclenchée"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500 mb-1.5">Priorité</label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setForm(f => ({ ...f, priority: p.id }))}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.priority === p.id
                      ? 'border-[#2E75B6]/40 bg-[#2E75B6]/5 text-[#1F3864] shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${p.dot}`} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-[#1F3864] to-[#2E75B6] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
          >
            <Plus size={14} /> Créer le rappel
          </button>
        </form>
      </div>

      {customAlerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 px-1">
            Rappels créés · {customAlerts.length}
          </p>
          {customAlerts.map(a => {
            const preset = PRIORITY_OPTIONS.find(p => p.id === a.priority);
            return (
              <div
                key={a.id}
                className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4 flex items-center gap-3"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${preset?.dot || 'bg-gray-400'}`}
                  style={preset ? undefined : { backgroundColor: a.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1F3864] truncate">{a.nom}</p>
                  <p className="text-xs text-gray-500 truncate">{a.message}</p>
                </div>
                {onRemove && (
                  <button
                    onClick={() => onRemove(a.id)}
                    className="flex-shrink-0 flex items-center gap-1 text-[11px] text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
