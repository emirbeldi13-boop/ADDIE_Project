import React from 'react';
import { 
  BookOpen, Calendar, Plus, Target, ArrowRight, MapPin, 
  Users, Layers, Clock, CheckCircle, AlertCircle, Zap
} from 'lucide-react';

export function CataloguePillar({ store, onOpenFormation }) {
  const formations = Object.values(store.formations);

  const handleCreateNewFormation = () => {
    const newId = `F${formations.length + 1}`;
    store.addFormation({
      id: newId,
      libelle: "Nouveau Programme Pédagogique",
      trimestre: "T1",
      status: "En attente",
      color: "#2E75B6",
      targetedComps: [],
      techRequirements: [],
      Circonscription: ""
    });
    onOpenFormation(newId);
  };

  // Compute readiness for each formation
  const getReadiness = (f) => {
    const sessions = store.sessions.filter(s => s.Formation === f.id);
    const participants = sessions.reduce((a, s) => a + (s.inscrits?.length || 0), 0);
    const checks = [
      !!f.libelle && f.libelle !== 'Nouveau Programme Pédagogique',
      (f.targetedComps?.length || 0) > 0,
      (f.modules?.length || 0) > 0,
      sessions.length > 0,
      participants > 0,
      (f.techRequirements?.length || 0) > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const TRIMESTRE_LABELS = { T1: 'Nov 2026', T2: 'Fév 2027', T3: 'Mars-Mai 2027', Annuel: 'Annuel' };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between bg-white/80 backdrop-blur-xl p-8 rounded-[40px] border border-white shadow-2xl gap-6">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center shadow-inner">
            <BookOpen size={28} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1F3864]">Catalogue de Formations</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {formations.length} programme{formations.length > 1 ? 's' : ''} · Portefeuille académique
            </p>
          </div>
        </div>
        <button onClick={handleCreateNewFormation}
          className="flex items-center gap-2 px-8 py-4 bg-[#1F3864] text-white rounded-3xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
          <Plus size={16} /> Nouveau Programme
        </button>
      </div>

      {/* Grid of Process Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {formations.map((f) => {
          const sessions = store.sessions.filter(s => s.Formation === f.id);
          const participants = sessions.reduce((a, s) => a + (s.inscrits?.length || 0), 0);
          const modulesCount = f.modules?.length || 0;
          const competencesCount = f.targetedComps?.length || 0;
          const readiness = getReadiness(f);
          const color = f.color || '#2E75B6';

          return (
            <button
              key={f.id}
              onClick={() => onOpenFormation(f.id)}
              className="group relative flex flex-col bg-white rounded-[24px] border border-gray-100 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden text-left"
              style={{ '--card-color': color }}
            >
              {/* Top accent */}
              <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

              <div className="p-5 flex-grow space-y-4">
                
                {/* Row 1: ID + Trimestre + Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-white px-2.5 py-1 rounded-lg" style={{ backgroundColor: color }}>
                      {f.id}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                      <Clock size={9} /> {TRIMESTRE_LABELS[f.trimestre] || f.trimestre}
                    </span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${
                    f.status === 'Confirmée' ? 'bg-emerald-500' :
                    f.status === 'En attente' ? 'bg-amber-400' : 
                    f.status === 'Annulée' ? 'bg-red-400' : 'bg-gray-300'
                  }`} title={f.status || 'Brouillon'} />
                </div>

                {/* Row 2: Title */}
                <h4 className="text-[15px] font-black text-[#1F3864] leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                  {f.libelle}
                </h4>

                {/* Row 3: Circo */}
                <div className="flex items-center gap-1.5">
                  <MapPin size={10} className="text-gray-300" />
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                    {f.Circonscription || 'National'}
                  </span>
                </div>

                {/* Row 4: Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Maturité</span>
                    <span className={`text-[9px] font-black ${readiness >= 80 ? 'text-emerald-600' : readiness >= 50 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {readiness}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${readiness}%`, 
                        backgroundColor: readiness >= 80 ? '#10b981' : readiness >= 50 ? '#f59e0b' : '#d1d5db' 
                      }} 
                    />
                  </div>
                </div>

                {/* Row 5: Micro-KPIs */}
                <div className="grid grid-cols-4 gap-1 pt-3 border-t border-gray-50">
                  {[
                    { icon: Layers, value: modulesCount, label: 'Mod.' },
                    { icon: Calendar, value: sessions.length, label: 'Sess.' },
                    { icon: Users, value: participants, label: 'Part.' },
                    { icon: Target, value: competencesCount, label: 'Cib.' },
                  ].map((kpi, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5 py-1">
                      <kpi.icon size={12} className="text-gray-300" />
                      <span className="text-sm font-black text-[#1F3864]">{kpi.value}</span>
                      <span className="text-[7px] font-bold text-gray-400 uppercase">{kpi.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hover Arrow Indicator */}
              <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110" style={{ backgroundColor: `${color}15` }}>
                <ArrowRight size={14} style={{ color }} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          );
        })}

        {/* "New" ghost card */}
        <button 
          onClick={handleCreateNewFormation}
          className="flex flex-col items-center justify-center gap-4 min-h-[250px] bg-gray-50/50 backdrop-blur-sm rounded-[24px] border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
        >
          <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-300 group-hover:text-blue-500 group-hover:shadow-md transition-all">
            <Plus size={24} />
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-gray-400 group-hover:text-[#1F3864] uppercase tracking-widest transition-colors">Nouveau Programme</p>
            <p className="text-[9px] font-bold text-gray-300 mt-1">Créer une formation</p>
          </div>
        </button>
      </div>

      {/* Empty State */}
      {formations.length === 0 && (
        <div className="py-32 text-center bg-white/50 border-4 border-dashed border-gray-100 rounded-[60px] space-y-6">
          <BookOpen size={64} className="text-gray-300 mx-auto opacity-50" />
          <div className="space-y-2">
            <p className="text-2xl font-black text-[#1F3864]/40 uppercase tracking-tighter italic">Aucun programme créé</p>
            <p className="text-sm font-bold text-gray-400">Cliquez sur "Nouveau Programme" pour commencer</p>
          </div>
        </div>
      )}
    </div>
  );
}
