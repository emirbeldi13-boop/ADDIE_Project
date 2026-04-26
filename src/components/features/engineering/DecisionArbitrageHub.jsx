import React, { useState, useMemo } from 'react';
import { Target, Zap, Rocket, Search, Filter, ArrowRight, CheckCircle2, AlertTriangle, Sparkles, BookOpen, Settings2 } from 'lucide-react';
import { ReferentialEditModal } from './ReferentialEditModal';

export function DecisionArbitrageHub({ 
  store, 
  formations, 
  quickWins, 
  hybridOps, 
  onOpenSession,
  participants 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormation, setSelectedFormation] = useState(null);
  const [filterFamily, setFilterFamily] = useState('Tous');
  const [editingMaster, setEditingMaster] = useState(null);

  // ─── CATALOGUE LOGIC ───
  const families = ['Tous', ...new Set(formations.map(f => f.family))];
  
  const filteredFormations = useMemo(() => {
    return formations.filter(f => {
      const matchesSearch = (f.libelle || f.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFamily = filterFamily === 'Tous' || f.family === filterFamily;
      return matchesSearch && matchesFamily;
    });
  }, [formations, searchTerm, filterFamily]);

  // ─── SIMULATION ENGINE ───
  const selectionMetrics = useMemo(() => {
    if (!selectedFormation) return null;
    
    // Exact logic from matrix/hub
    const targeted = selectedFormation.targetedComps || ['RC1'];
    const teacherAverages = participants.map(p => {
        const compScores = targeted.map(rcId => {
          const auto = p.scores?.[rcId] || 3;
          const obs = p.temporalObsScore;
          return obs !== null ? (obs * 0.6 + auto * 0.4) : auto;
        });
        return compScores.reduce((a, b) => a + b, 0) / compScores.length;
    });
    const avgTerritory = teacherAverages.reduce((a, b) => a + b, 0) / (teacherAverages.length || 1);
    const impact = Math.min(100, Math.max(0, 5 - avgTerritory) * 20);
    
    // Find if it's a Quick Win
    const isQuickWin = quickWins.some(qw => qw.id === selectedFormation.id);
    
    // Calculate Effort (Replicating Matrix Logic)
    const stdDev = (vals) => {
      if (!vals || vals.length === 0) return 0;
      const m = vals.reduce((a, b) => a + b) / vals.length;
      return Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - m, 2), 0) / vals.length);
    };
    const pedagogicalEffort = teacherAverages.length > 0 ? (stdDev(teacherAverages) * 20) : 10;
    
    // 2. Logistics & Deployment
    const activeCrifoKey = Object.keys(store.crefocs).find(k => k.includes(store.selectedCircos?.[0])) || 'Kef';
    const activeLogistics = store.crefocs[activeCrifoKey]?.logistics || {};
    
    const reqMap = {
       'internet': 'internet',
       'projecteur': 'videoproj',
       'micro': 'sonorisation',
       'audio': 'sonorisation',
       'tablettes': 'interactif'
    };

    const specificRequirements = selectedFormation.requirements || [];
    const universalRequirements = ['tableau', 'photocopieuse', 'videoproj'];
    const allRequirements = [...new Set([...universalRequirements, ...specificRequirements])];
    
    let logisticsGap = 0;
    allRequirements.forEach(req => {
       const key = reqMap[req] || req;
       if (!activeLogistics[key]) {
          logisticsGap += 10; 
       }
    });

    const deploymentEffort = Math.min(40, (participants.length / 15) * 5); 
    const baseEffort = 20;

    const totalEffort = Math.round(baseEffort + pedagogicalEffort + deploymentEffort + logisticsGap);
    
    return { 
      impact, 
      effort: totalEffort,
      isQuickWin, 
      targetedCount: targeted.length,
      logisticsGap
    };
  }, [selectedFormation, participants, quickWins, store.crefocs, store.selectedCircos]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
      
      {/* 🧩 LEFT: RECOMMENDATIONS & DISCOVERY */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-[40px] p-6 border border-gray-100 shadow-sm space-y-6">
           <h4 className="text-[10px] font-black uppercase text-[#1F3864] flex items-center gap-2">
             <Sparkles size={14} className="text-amber-500" /> Suggestions de l'IA
           </h4>

           {/* Quick Wins */}
           <div className="space-y-3">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Priorités Matrice</p>
              <div className="space-y-2">
                 {quickWins.slice(0, 3).map(qw => (
                   <div 
                     key={qw.id} 
                     onClick={() => setSelectedFormation(qw)}
                     className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                       selectedFormation?.id === qw.id ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-100' : 'bg-gray-50 border-gray-100 hover:border-indigo-200'
                     }`}
                   >
                     <div className="flex justify-between items-start gap-2">
                        <p className="text-[10px] font-black text-[#1F3864] leading-tight">{qw.libelle || qw.title}</p>
                        <Zap size={12} className="text-amber-500 shrink-0" />
                     </div>
                     <span className="text-[8px] font-bold text-indigo-500 mt-1 block uppercase">Quick Win Matrice</span>
                   </div>
                 ))}
              </div>
           </div>

           {/* Hybrid Ops */}
           <div className="space-y-3 pt-4 border-t border-gray-100">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Opportunités de Fusion</p>
              <div className="space-y-2">
                 {hybridOps.map((op) => (
                   <div 
                    key={`hybrid-${op.source.id}-${op.target.id}`} 
                    onClick={() => setSelectedFormation(op.source)}
                    className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl cursor-pointer hover:shadow-md transition-all"
                   >
                      <p className="text-[9px] font-black text-amber-800">{op.source.libelle} + {op.target.libelle}</p>
                      <div className="flex items-center gap-2 mt-2">
                         <Rocket size={10} className="text-amber-500" />
                         <span className="text-[8px] font-black text-amber-600 uppercase">Potentiel Hybride : {Math.round(op.score * 100)}%</span>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* 📚 MIDDLE: FULL CATALOGUE */}
      <div className="lg:col-span-5 space-y-4">
        <div className="flex items-center gap-4 bg-white rounded-[32px] px-6 py-3 border border-gray-100 shadow-sm">
           <Search size={16} className="text-gray-400" />
           <input 
             type="text" 
             placeholder="Rechercher une formation à votre guise..."
             className="flex-1 text-sm font-medium bg-transparent outline-none text-[#1F3864]"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
           <div className="flex gap-1 overflow-x-auto scrollbar-hide max-w-[200px]">
              {families.map(f => (
                <button 
                  key={f} 
                  onClick={() => setFilterFamily(f)}
                  className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all whitespace-nowrap ${
                    filterFamily === f ? 'bg-[#1F3864] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
           {filteredFormations.map(f => (
              <div 
                key={f.id}
                onClick={() => setSelectedFormation(f)}
                className={`p-4 rounded-[28px] border transition-all cursor-pointer group flex items-center justify-between relative ${
                  selectedFormation?.id === f.id ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-xl' : 'bg-white border-gray-100 hover:border-indigo-300'
                }`}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); setEditingMaster(f); }}
                  className={`absolute top-3 right-10 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                    selectedFormation?.id === f.id ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-gray-400'
                  }`}
                  title="Modifier le Master"
                >
                  <Settings2 size={12} />
                </button>
                <div className="flex items-center gap-4">
                   <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                     selectedFormation?.id === f.id ? 'bg-white/10' : 'bg-gray-100'
                   }`}>
                      <BookOpen size={14} className={selectedFormation?.id === f.id ? 'text-white' : 'text-gray-400'} />
                   </div>
                   <div className="min-w-0 flex-1">
                      <p className={`text-[10px] font-black uppercase truncate ${selectedFormation?.id === f.id ? 'text-white' : 'text-[#1F3864]'}`}>
                        {f.libelle || f.title}
                      </p>
                      <span className={`text-[8px] font-bold uppercase tracking-widest ${selectedFormation?.id === f.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {f.family} • {f.duration}h
                      </span>
                      {f.requirements && f.requirements.length > 0 && (
                        <div className="flex gap-2 mt-1 opacity-60">
                           {f.requirements.map(req => (
                             <span key={req} className={`text-[7px] font-black uppercase px-1 rounded border ${selectedFormation?.id === f.id ? 'border-white/20 text-white' : 'border-gray-200 text-gray-500'}`}>
                                {req}
                             </span>
                           ))}
                        </div>
                      )}
                   </div>
                </div>
                {selectedFormation?.id === f.id && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
              </div>
           ))}
        </div>
      </div>

      {/* 🚀 RIGHT: DECISION & ACTION */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden flex flex-col h-full">
           <div className="p-6 space-y-6 flex-1">
              <h4 className="text-[10px] font-black uppercase text-[#1F3864] flex items-center gap-2">
                <Target size={14} className="text-[#1F3864]" /> Résumé de l'Arbitrage
              </h4>

              {selectedFormation ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                   <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-black text-gray-400 uppercase">
                          {selectedFormation.id}
                        </span>
                      </div>
                      <p className="text-[12px] font-black text-[#1F3864] leading-tight">{selectedFormation.libelle || selectedFormation.title}</p>
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                         <p className="text-[8px] font-black text-emerald-600 uppercase">Impact Prévu</p>
                         <p className="text-xl font-black text-emerald-700">+{Math.round(selectionMetrics.impact)}%</p>
                      </div>
                      <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
                         <p className="text-[8px] font-black text-indigo-600 uppercase">Effort Estimé</p>
                         <p className="text-xl font-black text-indigo-700">
                            {selectionMetrics.effort}
                            <span className="text-[10px] ml-0.5">pts</span>
                         </p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Facteurs de Validation</p>
                      <div className="space-y-2">
                         <div className="flex items-center gap-3">
                            <CheckCircle2 size={12} className={selectionMetrics.impact > 50 ? "text-emerald-500" : "text-gray-300"} />
                            <span className="text-[9px] font-bold text-gray-600">Objectif de réduction atteint</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <CheckCircle2 size={12} className={selectionMetrics.isQuickWin ? "text-emerald-500" : "text-gray-300"} />
                            <span className="text-[9px] font-bold text-gray-600">Alignement Matrice Stratégique</span>
                         </div>
                         <div className="flex items-center gap-3">
                            <CheckCircle2 size={12} className={selectionMetrics.logisticsGap === 0 ? "text-emerald-500" : "text-amber-500"} />
                            <div className="flex flex-col">
                               <span className="text-[9px] font-bold text-gray-600">
                                  {selectionMetrics.logisticsGap === 0 ? "Logistique compatible" : "Déficit matériel détecté"}
                               </span>
                               {selectionMetrics.logisticsGap > 0 && (
                                  <span className="text-[7px] font-black text-amber-600 uppercase">Ajustement Effort : +{selectionMetrics.logisticsGap}pts</span>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* EXISTING SESSIONS LIST */}
                   {(() => {
                      const existingSessions = store.sessions.filter(s => 
                        s.formationId === selectedFormation.id || s['ID Formation'] === selectedFormation.id
                      );
                      if (existingSessions.length === 0) return null;
                      return (
                        <div className="space-y-3 pt-4 border-t border-gray-100">
                           <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                               Sessions déjà actives
                               <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[7px] font-black">{existingSessions.length}</span>
                           </p>
                           <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                              {existingSessions.map(sess => (
                                <div key={sess.id || sess['ID Session']} 
                                     onClick={() => onOpenSession(selectedFormation.id, sess.id || sess['ID Session'])}
                                     className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                                   <div className="min-w-0">
                                      <p className="text-[10px] font-black text-[#1F3864] truncate leading-none">{sess['Lieu'] || 'Instance localisée'}</p>
                                      <div className="flex items-center gap-2 mt-1.5">
                                         <div className="w-1 h-1 rounded-full bg-blue-400" />
                                         <p className="text-[7px] font-bold text-gray-400 uppercase">{sess['Statut'] || 'Analyse en cours'}</p>
                                      </div>
                                   </div>
                                   <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                      <ArrowRight size={10} className="text-gray-400 group-hover:text-blue-600" />
                                   </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      );
                   })()}

                   {!selectionMetrics.isQuickWin && selectionMetrics.impact < 50 && (
                     <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                        <p className="text-[8px] font-medium text-amber-700 leading-relaxed italic">
                          "Ce module n'est pas préconisé par l'IA. Son impact territorial pourrait être limité."
                        </p>
                     </div>
                   )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
                   <Target size={40} className="text-[#1F3864]" />
                   <p className="text-[10px] font-black uppercase text-[#1F3864]">Veuillez sélectionner<br/>une formation</p>
                </div>
              )}
           </div>

           <div className="p-6 bg-gray-50 border-t border-gray-100">
              <button 
                disabled={!selectedFormation}
                onClick={() => onOpenSession(selectedFormation.id)}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 transition-all ${
                  selectedFormation ? 'bg-[#1F3864] text-white shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                 <span className="text-[11px] font-black uppercase tracking-widest">Valider & Lancer ADDIE</span>
                 <ArrowRight size={16} />
              </button>
           </div>
        </div>
      </div>

      <ReferentialEditModal 
        isOpen={!!editingMaster}
        item={editingMaster}
        referential={store.referential}
        onSave={(data) => {
          store.updateFormation(editingMaster.id, data);
          setEditingMaster(null);
        }}
        onClose={() => setEditingMaster(null)}
      />
    </div>
  );
}
