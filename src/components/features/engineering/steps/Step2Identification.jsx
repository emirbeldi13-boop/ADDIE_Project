import * as React from 'react';
import { Users, Grid, Sparkles, BrainCircuit, Settings2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export function Step2Identification({ 
  segmentation, 
  aiPersonas, 
  participants, 
  store, 
  formation, 
  session 
}) {
  const [showSettings, setShowSettings] = React.useState(false);
  
  const getHeatmapColor = (score, cid) => {
    const target = session?.targetScores?.[cid] || formation?.targetScores?.[cid] || 4.0;
    const high = (store.riskThresholds?.high || 70) / 100 * target;
    const med = (store.riskThresholds?.medium || 40) / 100 * target;
    if (score < med) return 'bg-red-50 border-red-100 text-red-600';
    if (score < high) return 'bg-amber-50 border-amber-100 text-amber-600';
    return 'bg-emerald-50 border-emerald-100 text-emerald-600';
  };

  const getClusterBadge = (cluster) => {
      if (cluster === 'expert') return <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-600 uppercase">Expert</span>;
      if (cluster === 'low') return <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-red-100 text-red-600 uppercase">À Risque</span>;
      return <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-amber-100 text-amber-600 uppercase">Intermédiaire</span>;
  };

  // On ne cible QUE les compétences du module pour l'affichage de la Heatmap
  const targetComps = (formation?.targetedComps && formation.targetedComps.length > 0)
    ? formation.targetedComps
    : Object.keys(store.competences);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-right-6 duration-700">
      {/* ⚙️ Threshold Settings Toggle */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#1F3864]/5 rounded-2xl">
            <Users size={20} className="text-[#1F3864]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#1F3864] uppercase tracking-tighter">Répartition de la Cohorte</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Segmentation prédictive basée sur les données d'entrée</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
            showSettings ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
          }`}
        >
          <Settings2 size={14} /> 
          Seuils d'Alerte
          {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showSettings && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-8 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} /> Seuil de Maîtrise (Expert)
                </label>
                <span className="text-sm font-black text-indigo-600">{store.riskThresholds?.high || 70}%</span>
              </div>
              <input 
                type="range" min="50" max="95" step="5"
                value={store.riskThresholds?.high || 70}
                onChange={(e) => store.updateRiskThresholds({ high: parseInt(e.target.value) })}
                className="w-full accent-indigo-600"
              />
              <p className="text-[8px] font-bold text-indigo-400/70 uppercase">Score minimum pour être considéré comme moniteur potentiel.</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle size={14} /> Seuil de Remédiation (À Risque)
                </label>
                <span className="text-sm font-black text-red-600">{store.riskThresholds?.medium || 40}%</span>
              </div>
              <input 
                type="range" min="10" max="60" step="5"
                value={store.riskThresholds?.medium || 40}
                onChange={(e) => store.updateRiskThresholds({ medium: parseInt(e.target.value) })}
                className="w-full accent-red-600"
              />
              <p className="text-[8px] font-bold text-red-400/70 uppercase">Score en dessous duquel une intervention est prioritaire.</p>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Experts (Mentors)', count: segmentation.experts, color: 'emerald', desc: 'Ressources pour le groupe' },
          { label: 'Intermédiaires', count: segmentation.inter, color: 'amber', desc: 'Zone de développement' },
          { label: 'À Risque', count: segmentation.low, color: 'red', desc: 'Remédiation requise' }
        ].map(c => (
          <div key={c.label} className={`bg-white border-2 border-${c.color}-100 rounded-[32px] p-6 text-center space-y-4 shadow-sm relative overflow-hidden group`}>
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${c.color}-50 rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700`} />
            <h4 className={`text-[10px] font-black text-${c.color}-600 uppercase tracking-widest relative z-10`}>{c.label}</h4>
            <p className={`text-5xl font-black text-${c.color}-500 relative z-10`}>{c.count}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest relative z-10">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* AI Personas / Portrait */}
      {aiPersonas && (
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <BrainCircuit size={120} />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Sparkles size={20} className="text-yellow-300" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-widest italic">Analyse Prédictive de la Cohorte</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Portrait Statistique</p>
                <p className="text-sm font-medium leading-relaxed opacity-90">{aiPersonas.portrait}</p>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest">Recommandations Stratégiques</p>
                <ul className="space-y-2">
                  {aiPersonas.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] font-bold">
                      <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full mt-1.5 shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
