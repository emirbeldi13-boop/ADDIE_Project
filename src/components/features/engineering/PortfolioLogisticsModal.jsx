import { X, Calendar, MapPin, Clock, Briefcase, BarChart3, ArrowRight } from 'lucide-react';
import { RCET_LABELS } from '../../../constants/competences';

export function PortfolioLogisticsModal({ isOpen, onClose, formations, store, onConfirm }) {
  if (!isOpen) return null;

  const formationList = Object.values(formations);
  const totalHours = formationList.length * 5; // Simplified: 5h per session
  
  // Aggregate targeted competencies to show global impact
  const globalImpact = {};
  formationList.forEach(f => {
    (f.targetedComps || []).forEach(rc => {
      globalImpact[rc] = (globalImpact[rc] || 0) + 1;
    });
  });

  const sortedImpact = Object.entries(globalImpact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-[#1F3864]/60 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#F8FAFC] w-full max-w-5xl rounded-[48px] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-10 bg-white border-b border-gray-100 flex items-center justify-between relative">
          <div className="space-y-1">
            <h3 className="text-2xl font-black text-[#1F3864] italic uppercase tracking-tighter flex items-center gap-3">
              <BarChart3 className="text-blue-500" /> Plan de Formation Logistique
            </h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Récapitulatif consolidé de votre sélection portfolio</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 transition-all border border-transparent hover:border-gray-100">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
          
          {/* Global KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Volume Horaire Total</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center"><Clock size={20} /></div>
                <span className="text-2xl font-black text-[#1F3864]">{totalHours}h <span className="text-xs font-bold text-gray-400">est.</span></span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Modules à Déployer</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Briefcase size={20} /></div>
                <span className="text-2xl font-black text-[#1F3864]">{formationList.length} <span className="text-xs font-bold text-gray-400">unités</span></span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Circonscription</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><MapPin size={20} /></div>
                <span className="text-2xl font-black text-[#1F3864] uppercase tracking-tighter italic">Kef <span className="text-xs font-bold text-gray-400">(CREFOC)</span></span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Code</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Formation</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Compétences Cibles</th>
                  <th className="p-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Durée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {formationList.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="p-6"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{f.id}</span></td>
                    <td className="p-6">
                      <div className="space-y-1">
                        <p className="text-xs font-black text-[#1F3864] italic uppercase">{f.libelle}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{f.family}</p>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-wrap gap-1">
                        {(f.targetedComps || []).map(rc => (
                          <span key={rc} title={RCET_LABELS[rc]} className="text-[8px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md cursor-help">{rc}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-6 text-right font-black text-[#1F3864] text-xs">5.0h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 bg-[#1F3864] rounded-[40px] text-white space-y-6 shadow-xl relative overflow-hidden group">
              <BarChart3 size={100} className="absolute -right-4 -bottom-4 text-white/5 group-hover:scale-110 transition-transform duration-700" />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Impact Territorial Estimé</p>
                <h4 className="text-lg font-black italic uppercase tracking-tighter">Réduction des Déficits</h4>
              </div>
              <div className="space-y-4 relative">
                {sortedImpact.map(([rc, count]) => (
                  <div key={rc} className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-blue-100">{RCET_LABELS[rc]}</span>
                      <span className="text-white">+{count * 15}% d'amélioration</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(count * 20, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 bg-emerald-50 rounded-[40px] border border-emerald-100 space-y-6">
              <div className="flex items-center gap-3 text-emerald-600">
                <Calendar size={24} />
                <h4 className="text-lg font-black italic uppercase tracking-tighter">Prochaines Étapes</h4>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Génération des sessions ADDIE", val: "Automatique" },
                  { label: "Notification des CREFOCs", val: "Prêt" },
                  { label: "Ouverture des inscriptions", val: "En attente" }
                ].map(step => (
                  <div key={step.label} className="flex justify-between items-center p-4 bg-white/50 rounded-2xl border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-800/60 uppercase tracking-widest">{step.label}</span>
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase">{step.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 bg-white border-t border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="px-8 py-4 text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest transition-all">
            Retour au Catalogue
          </button>
          <button 
            onClick={onConfirm}
            className="flex items-center gap-3 px-10 py-5 bg-[#1F3864] text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:scale-105 transition-all shadow-2xl shadow-blue-900/20">
            Confirmer & Lancer le Design <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
