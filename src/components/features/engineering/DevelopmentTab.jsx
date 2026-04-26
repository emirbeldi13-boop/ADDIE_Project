import { useState } from 'react';
import { 
  Plus, Layout, FileVideo, 
  Presentation, Settings, FileEdit,
  Lightbulb, Search, Activity, 
  ExternalLink, Trash2, Edit3,
  Clock, CheckCircle2, AlertCircle,
  Shapes, Wand2
} from 'lucide-react';
import { RESOURCE_TYPES } from '../../../constants/pedagogicalMethods';
import { ResourceEditModal } from './ResourceEditModal';

export function DevelopmentTab({ session, handleUpdate, store }) {
  const [editingResource, setEditingResource] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const resources = session?.cdc?.resources || [];

  const handleSaveResource = (resource) => {
    console.log('DevelopmentTab: Saving resource', resource);
    const existing = resources.find(r => r.id === resource.id);
    let next;
    if (existing) {
      next = resources.map(r => r.id === resource.id ? resource : r);
    } else {
      next = [...resources, resource];
    }
    
    console.log('DevelopmentTab: New resources list', next);
    handleUpdate({ 
      cdc: { 
        ...session.cdc, 
        resources: next 
      } 
    });
    setIsAdding(false);
    setEditingResource(null);
  };

  const handleDeleteResource = (id) => {
    const next = resources.filter(r => r.id !== id);
    handleUpdate({ cdc: { resources: next } });
  };

  // Maturity calculation
  const totalCount = resources.length;
  const finishedCount = resources.filter(r => r.status === 'FINAL').length;
  const reviewCount = resources.filter(r => r.status === 'REVUE').length;
  const maturityPct = totalCount === 0 ? 0 : Math.round(((finishedCount * 1 + reviewCount * 0.5) / totalCount) * 100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-12">
      
      {/* Header & Stats Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 border border-white shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-[28px] flex items-center justify-center shadow-inner">
            <Activity size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#1F3864] italic uppercase tracking-tighter">Production de Ressources</h2>
            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">Étape 3 : Développement des livrables pédagogiques</p>
          </div>
        </div>

        <div className="flex items-center gap-12 w-full lg:w-auto">
          {/* Maturity Indicator */}
          <div className="flex-1 lg:w-64 space-y-3">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-slate-400">Maturité Production</span>
                <span className={maturityPct === 100 ? 'text-emerald-500' : 'text-slate-600'}>{maturityPct}%</span>
             </div>
             <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-white">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${maturityPct === 100 ? 'bg-emerald-500' : 'bg-slate-500'}`} 
                  style={{ width: `${maturityPct}%` }} 
                />
             </div>
          </div>

          <button 
            onClick={() => setIsAdding(true)}
            className="px-10 py-5 bg-[#1F3864] text-white rounded-[28px] font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 whitespace-nowrap"
          >
            <Plus size={20} /> Nouveau Livrable
          </button>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {resources.map((res, i) => {
          const typeInfo = RESOURCE_TYPES[res.type] || RESOURCE_TYPES.OTHER;
          const isDone = res.status === 'FINAL';
          const isRevue = res.status === 'REVUE';

          return (
            <div 
              key={res.id} 
              className="bg-white p-8 rounded-[48px] shadow-sm border border-gray-100 hover:shadow-2xl hover:border-blue-100 transition-all group flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-8">
                <div className={`p-4 bg-${typeInfo.color}-50 text-${typeInfo.color}-600 rounded-[24px]`}>
                   <typeInfo.icon size={24} />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${isDone ? 'bg-emerald-50 text-emerald-600' : isRevue ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                   {res.status === 'BROUILLON' ? 'Brouillon' : isRevue ? 'En Revue' : 'Finalisé'}
                </div>
              </div>

              <div className="space-y-3 flex-1">
                <h3 className="text-xl font-black text-[#1F3864] italic leading-tight group-hover:text-blue-600 transition-colors">{res.title}</h3>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{typeInfo.label}</p>
                <p className="text-xs font-bold text-gray-400 line-clamp-3 leading-relaxed">
                  {res.description || "Aucune description de contenu."}
                </p>
              </div>

              {/* Footer details */}
              <div className="mt-8 pt-8 border-t border-gray-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {(res.linkedModules || []).slice(0, 3).map((modId, idx) => (
                    <div key={idx} className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-400" title="Module lié">
                      M{idx+1}
                    </div>
                  ))}
                  {(res.linkedModules || []).length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-slate-50 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-300">
                      +{(res.linkedModules || []).length - 3}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                   {res.deliverableUrl && (
                     <a href={res.deliverableUrl} target="_blank" rel="noopener noreferrer" className="p-3 text-gray-300 hover:text-blue-500 transition-colors">
                        <ExternalLink size={18} />
                     </a>
                   )}
                   <button 
                     onClick={() => setEditingResource(res)} 
                     className="p-3 text-gray-300 hover:text-[#1F3864] transition-colors"
                   >
                      <Edit3 size={18} />
                   </button>
                </div>
              </div>
            </div>
          );
        })}

        {resources.length === 0 && (
          <div className="lg:col-span-3 py-32 text-center bg-white/50 border-4 border-dashed border-gray-100 rounded-[60px] space-y-6">
            <div className="w-24 h-24 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mx-auto opacity-50">
                <Shapes size={48} />
            </div>
            <div className="space-y-2">
                <p className="text-xl font-black text-[#1F3864]/30 uppercase tracking-tighter italic">Phase de Production</p>
                <p className="text-xs font-bold text-gray-300">Aucun livrable n'a encore été créé pour cette session.</p>
            </div>
            <button 
              onClick={() => setIsAdding(true)}
              className="px-8 py-4 bg-white border-2 border-slate-50 text-slate-500 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
                Initier un Support
            </button>
          </div>
        )}
      </div>

      {/* Tips Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#1F3864] p-10 rounded-[48px] text-white space-y-4 shadow-xl">
           <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Wand2 size={24} className="text-indigo-300" />
           </div>
           <h4 className="text-xs font-black uppercase tracking-widest">Conseil de l'Expert AI</h4>
           <p className="text-sm font-bold text-indigo-100/70 leading-relaxed italic">"N'oubliez pas d'inclure des fiches d'évaluation immédiate pour vos modules applicatifs."</p>
        </div>

        <div className="bg-white/40 p-10 rounded-[48px] border border-white space-y-4">
           <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
              <CheckCircle2 size={24} />
           </div>
           <h4 className="text-xs font-black text-[#1F3864] uppercase tracking-widest">Contrôle Qualité</h4>
           <p className="text-sm font-bold text-gray-400 leading-relaxed">Les supports de présentation doivent respecter la charte d'accessibilité visuelle.</p>
        </div>

        <div className="bg-white/40 p-10 rounded-[48px] border border-white space-y-4">
           <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
              <Clock size={24} />
           </div>
           <h4 className="text-xs font-black text-[#1F3864] uppercase tracking-widest">Deadline Production</h4>
           <p className="text-sm font-bold text-gray-400 leading-relaxed">Visez une maturité de 100% au moins 3 jours avant la date de la session.</p>
        </div>
      </div>

      {/* Modals */}
      {(isAdding || editingResource) && (
        <ResourceEditModal 
          resource={editingResource}
          session={session}
          onSave={handleSaveResource}
          onClose={() => { setIsAdding(false); setEditingResource(null); }}
          onDelete={editingResource ? () => handleDeleteResource(editingResource.id) : null}
        />
      )}
    </div>
  );
}
