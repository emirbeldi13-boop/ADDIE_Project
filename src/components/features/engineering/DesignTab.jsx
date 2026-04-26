import React, { useMemo } from 'react';
import { Layout, Plus, Clock, Target, Edit3, Trash2, Shapes, ChevronUp, ChevronDown, CheckCircle, BarChart3 } from 'lucide-react';
import { PEDAGOGICAL_METHODS } from '../../../constants/pedagogicalMethods';

export function DesignTab({ session, handleAddModule, handleEditModule, handleDeleteModule, handleUpdate }) {

  // ─── P1 FIX: Memoized objective parsing (shared single parse) ───
  const parsedObjectifs = useMemo(() => {
    try {
      const objs = JSON.parse(session.cdc?.objectifs || '[]');
      return Array.isArray(objs) ? objs : [];
    } catch (e) { return []; }
  }, [session.cdc?.objectifs]);

  const modules = session.modules || [];
  const totalDuration = modules.reduce((acc, m) => acc + (m.duration || 0), 0);

  // ─── P2: Method diversity stats ───
  const methodStats = useMemo(() => {
    const counts = {};
    modules.forEach(m => {
      const key = m.method || 'APPLICATIF';
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [modules]);

  // ─── P2: Objective coverage ───
  const objectiveCoverage = useMemo(() => {
    const coveredIndices = new Set();
    modules.forEach(m => {
      (m.linkedObjectives || []).forEach(idx => coveredIndices.add(idx));
    });
    return { covered: coveredIndices.size, total: parsedObjectifs.length };
  }, [modules, parsedObjectifs]);

  // ─── Fix F: Move module up/down ───
  const handleMoveModule = (index, direction) => {
    if (!handleUpdate) return;
    const next = [...modules];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    handleUpdate({ modules: next });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-8">
      {/* ─── Compact Header ─── */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Layout size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#1F3864] italic uppercase tracking-tighter">Séquençage Session</h2>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Étape 2 : Design des activités d'apprentissage</p>
            </div>
        </div>

        <div className="flex items-center gap-6">
            {/* ─── P2: Time allocation bar ─── */}
            {modules.length > 0 && (
              <div className="hidden md:flex flex-col items-end gap-1.5 min-w-[160px]">
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-gray-300" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Durée totale</span>
                  <span className="text-sm font-black text-[#1F3864]">{totalDuration}<span className="text-gray-300 text-xs ml-0.5">min</span></span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  {modules.map((m, i) => {
                    const method = PEDAGOGICAL_METHODS[m.method] || PEDAGOGICAL_METHODS.APPLICATIF;
                    const pct = totalDuration > 0 ? ((m.duration || 0) / totalDuration) * 100 : 0;
                    return <div key={m.id || i} className={`h-full ${method.classes.bg} ${method.classes.text}`} style={{ width: `${pct}%` }} title={`${m.title}: ${m.duration || 0} min`} />;
                  })}
                </div>
              </div>
            )}
            <button 
              onClick={handleAddModule}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Ajouter un Module
            </button>
        </div>
      </div>

      {/* ─── P2: Quick Stats (replaces static Tips when modules exist) ─── */}
      {modules.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Objective Coverage */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Target size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Couverture Objectifs</p>
              <p className="text-lg font-black text-[#1F3864]">
                {objectiveCoverage.covered}<span className="text-gray-300 text-sm">/{objectiveCoverage.total}</span>
                <span className="text-[9px] ml-2 font-bold text-gray-400">adressés</span>
              </p>
            </div>
          </div>

          {/* Method Diversity */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Diversité Pédagogique</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PEDAGOGICAL_METHODS).map(([key, method]) => {
                const count = methodStats[key] || 0;
                return (
                  <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter transition-all ${count > 0 ? `${method.classes.bg} ${method.classes.text}` : 'bg-gray-50 text-gray-300'}`}>
                    <method.icon size={10} /> {count > 0 ? `${method.label.split(' ')[0]} (${count})` : method.label.split(' ')[0]}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Average Duration */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <BarChart3 size={18} />
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Durée Moyenne</p>
              <p className="text-lg font-black text-[#1F3864]">
                {modules.length > 0 ? Math.round(totalDuration / modules.length) : 0}
                <span className="text-gray-300 text-sm ml-0.5">min/module</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modules Timeline ─── */}
      <div className="relative space-y-4">
        {/* The Timeline Line */}
        {modules.length > 1 && (
          <div className="absolute left-[40px] top-10 bottom-10 w-1 bg-gradient-to-b from-blue-100 via-indigo-50 to-transparent rounded-full hidden md:block" />
        )}

        {modules.map((m, i) => {
            const method = PEDAGOGICAL_METHODS[m.method] || PEDAGOGICAL_METHODS.APPLICATIF;
            const linkedObjs = (m.linkedObjectives || []).map(idx => parsedObjectifs[idx]).filter(Boolean);

            return (
              <div key={m.id} className="relative flex flex-col md:flex-row gap-6 group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 80}ms` }}>
                
                {/* Time/Order Marker */}
                <div className="hidden md:flex flex-col items-center gap-2 w-20 relative z-10">
                    <div className={`w-12 h-12 bg-white border-4 rounded-2xl flex items-center justify-center font-black text-[#1F3864] shadow-md group-hover:shadow-lg transition-all ${method.classes.border}`}>
                      {i + 1}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-gray-300 uppercase">
                      <Clock size={10} /> {m.duration || 0}'
                    </div>
                    {/* ─── Fix F: Move buttons ─── */}
                    <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleMoveModule(i, -1)} 
                        disabled={i === 0}
                        className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title="Monter"
                      ><ChevronUp size={12} /></button>
                      <button 
                        onClick={() => handleMoveModule(i, 1)} 
                        disabled={i === modules.length - 1}
                        className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                        title="Descendre"
                      ><ChevronDown size={12} /></button>
                    </div>
                </div>

                {/* Module Card */}
                <div className="flex-1 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 group-hover:border-blue-100 hover:shadow-lg transition-all flex flex-col lg:flex-row justify-between gap-6 relative overflow-hidden">
                    <div className={`absolute top-0 right-0 w-32 h-32 ${method.classes.bgLight} rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                    
                    <div className="space-y-4 relative z-10 flex-1">
                      <div className="flex items-center gap-3">
                          <div className={`p-2.5 ${method.classes.bg} ${method.classes.text} rounded-xl`}>
                            <method.icon size={18} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-[#1F3864] italic">{m.title}</h4>
                            <p className={`text-[9px] font-black ${method.classes.textLight} uppercase tracking-widest`}>{method.label}</p>
                          </div>
                      </div>

                      <p className="text-sm font-bold text-gray-500 leading-relaxed max-w-2xl line-clamp-2">
                          {m.activities || "Aucune activité décrite."}
                      </p>

                      {linkedObjs.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {linkedObjs.map((obj, oi) => (
                              <div 
                                key={oi} 
                                className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-tighter flex items-center gap-1.5 max-w-[200px]"
                                title={obj.text}
                              >
                                <Target size={10} className="flex-shrink-0" /> 
                                <span className="truncate">{obj.text?.substring(0, 40)}{obj.text?.length > 40 ? '...' : ''}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 relative z-10 shrink-0">
                      <button 
                        onClick={() => handleEditModule(m)}
                        className="w-12 h-12 bg-gray-50 text-gray-400 rounded-xl flex items-center justify-center hover:bg-[#1F3864] hover:text-white hover:scale-105 transition-all shadow-sm"
                      >
                          <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteModule(m.id)}
                        className="w-12 h-12 bg-gray-50 text-gray-300 rounded-xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 hover:scale-105 transition-all shadow-sm"
                      >
                          <Trash2 size={18} />
                      </button>
                    </div>
                </div>
              </div>
            );
        })}

        {modules.length === 0 && (
            <div className="py-24 text-center bg-white/50 border-4 border-dashed border-gray-100 rounded-[48px] space-y-6">
              <div className="w-20 h-20 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mx-auto opacity-50">
                  <Shapes size={40} />
              </div>
              <div className="space-y-2">
                  <p className="text-xl font-black text-[#1F3864]/30 uppercase tracking-tighter italic">Séquence vide</p>
                  <p className="text-xs font-bold text-gray-300">Commencez par ajouter votre premier module pédagogique.</p>
              </div>
              <button 
                onClick={handleAddModule}
                className="px-8 py-4 bg-white border-2 border-blue-50 text-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm"
              >
                Créer le Module Initial
              </button>
            </div>
        )}
      </div>

      {/* ─── Tips (only shown when no modules) ─── */}
      {modules.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
              { icon: Target, title: "Alignement SMART", desc: "Chaque module doit contribuer directement à l'un de vos objectifs d'analyse." },
              { icon: CheckCircle, title: "Variété Pédagogique", desc: "Alternez entre méthodes actives et démonstratives pour maintenir l'engagement." },
              { icon: Layout, title: "Focus Livrable", desc: "Pensez au support de formation qui sera développé à l'étape suivante." }
          ].map((tip, ti) => (
              <div key={ti} className="bg-white/40 p-6 rounded-[32px] border border-white hover:bg-white/80 transition-all space-y-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                    <tip.icon size={18} />
                </div>
                <h5 className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest">{tip.title}</h5>
                <p className="text-[11px] font-bold text-gray-400 leading-relaxed">{tip.desc}</p>
              </div>
          ))}
        </div>
      )}
    </div>
  );
}
