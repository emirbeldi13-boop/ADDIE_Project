import React from 'react';
import { 
  Target, AlertCircle, ShieldCheck, Users, 
  ChevronRight, ArrowRight, Settings, Sliders, Sparkles, Activity
} from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, 
  ResponsiveContainer, Tooltip as RechartsTooltip, LabelList
} from 'recharts';
import { EngineeringCatalogue } from '../EngineeringCatalogue';

export function Step1Territorial({ 
  advancedStats, 
  triangulationIndex, 
  store, 
  showTargets, 
  setShowTargets, 
  formation, 
  session, 
  handleUpdate,
  selectedRCs,
  setSelectedRCs,
  recommendedFormations,
  onOpenSession,
  isTerritorialMode
}) {
  
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-xl border border-gray-100 shadow-xl">
          <p className="text-[10px] font-black text-[#1F3864] uppercase mb-1">{data.name}</p>
          <p className="text-[9px] font-bold text-gray-500">Impact : <span className="text-red-500">{data.impact}% du groupe</span></p>
          <p className="text-[9px] font-bold text-gray-500">Urgence : <span className="text-amber-500">{data.urgency} (IGE pondéré)</span></p>
        </div>
      );
    }
    return null;
  };

  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-left-6 duration-700">
      {/* KPIs Section - Cockpit Cockpit */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { 
            label: 'Gravité (IGE)', 
            value: advancedStats?.ige || '0.0', 
            sub: 'Urgence Pédagogique', 
            icon: AlertCircle,
            pct: (parseFloat(advancedStats?.ige || 0) / 5) * 100,
            type: 'bad-if-high'
          },
          { 
            label: 'Données (IPT)', 
            value: `${Math.round(recommendedFormations[0]?.ipt || 0)}%`, 
            sub: 'Priorité Terrain', 
            icon: Activity,
            pct: recommendedFormations[0]?.ipt || 0,
            type: 'bad-if-high'
          },
          { 
            label: 'Besoin Critique', 
            value: recommendedFormations[0]?.targetedComps?.[0] || '—', 
            sub: 'Compétence Prioritaire', 
            icon: Target,
            pct: recommendedFormations[0]?.ipt || 0,
            type: 'bad-if-high'
          },
          { 
            label: 'Triangulation', 
            value: `${triangulationIndex || 0}%`, 
            sub: 'Fiabilité', 
            icon: ShieldCheck,
            pct: triangulationIndex || 0,
            type: 'good-if-high'
          },
          { 
            label: 'Hétérogénéité (CH)', 
            value: `${advancedStats?.ch || '0'}%`, 
            sub: 'Différenciation', 
            icon: Users,
            pct: parseFloat(advancedStats?.ch || 0),
            type: 'bad-if-high'
          },
        ].map((stat, i) => {
          const high = store.riskThresholds?.high || 70;
          const med = store.riskThresholds?.medium || 40;
          let colorClass = 'text-emerald-600';
          let bgClass = 'bg-emerald-50';

          if (stat.type === 'bad-if-high') {
            if (stat.pct > high) { colorClass = 'text-red-600'; bgClass = 'bg-red-50'; }
            else if (stat.pct > med) { colorClass = 'text-amber-600'; bgClass = 'bg-amber-50'; }
          } else {
            if (stat.pct < med) { colorClass = 'text-red-600'; bgClass = 'bg-red-50'; }
            else if (stat.pct < high) { colorClass = 'text-amber-600'; bgClass = 'bg-amber-50'; }
          }

          return (
            <div key={i} className="bg-white p-4 rounded-[24px] border border-gray-100 shadow-sm space-y-2 group transition-all hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-xl ${bgClass} ${colorClass} transition-colors duration-500`}>
                  <stat.icon size={16} />
                </div>
                <span className={`text-xl font-black ${colorClass} transition-colors duration-500`}>{stat.value}</span>
              </div>
              <div>
                <p className="text-[9px] font-black text-[#1F3864] uppercase tracking-wider line-clamp-1">{stat.label}</p>
                <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">{stat.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Eisenhower Matrix Section */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[#1F3864] italic uppercase tracking-tighter flex items-center gap-2">
              <Target size={18} className="text-amber-500" /> Matrice d'Eisenhower Pédagogique
            </h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Priorisation par Urgence (IGE) et Impact (% Stagiaires en difficulté).</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-2xl transition-all ${
                showSettings ? 'bg-[#1F3864] text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
              title="Réglages des seuils analytiques"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={() => setShowTargets(!showTargets)}
              className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                showTargets ? 'bg-amber-500 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
              }`}
            >
              {showTargets ? 'Fermer Cibles' : 'Ajuster Cibles'}
            </button>
          </div>
        </div>

        {/* Analytic Settings Panel */}
        {showSettings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 p-8 bg-gray-50 rounded-[32px] border border-gray-100 animate-in slide-in-from-top-4 duration-300">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest">Seuil Alerte Critique (Rouge)</label>
                <span className="text-xs font-black text-red-600">{store.riskThresholds?.high || 70}%</span>
              </div>
              <input 
                type="range" min="50" max="90" step="5"
                value={store.riskThresholds?.high || 70}
                onChange={(e) => store.updateRiskThresholds({ high: parseInt(e.target.value) })}
                className="w-full accent-red-500"
              />
              <p className="text-[9px] text-gray-400 font-medium italic">Définit le niveau à partir duquel l'urgence est considérée comme critique.</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest">Seuil Alerte Intermédiaire (Orange)</label>
                <span className="text-xs font-black text-amber-600">{store.riskThresholds?.medium || 40}%</span>
              </div>
              <input 
                type="range" min="10" max="50" step="5"
                value={store.riskThresholds?.medium || 40}
                onChange={(e) => store.updateRiskThresholds({ medium: parseInt(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <p className="text-[9px] text-gray-400 font-medium italic">Définit le niveau de vigilance pour les besoins émergents.</p>
            </div>
          </div>
        )}

        {showTargets && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 p-6 bg-amber-50/50 rounded-3xl border border-amber-100 animate-in slide-in-from-top-4 duration-300">
            {Object.keys(store.competences).map(cid => (
              <div key={cid} className="bg-white p-4 rounded-2xl border border-amber-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#1F3864] truncate w-32">{store.competences[cid] || cid}</span>
                  <span className="text-xs font-black text-amber-500">{session?.targetScores?.[cid] || formation?.targetScores?.[cid] || 4.0}</span>
                </div>
                <input 
                  type="range" min="0" max="5" step="0.5"
                  value={session?.targetScores?.[cid] || formation?.targetScores?.[cid] || 4.0}
                  onChange={(e) => {
                    const newTargets = { ...(session?.targetScores || formation?.targetScores || {}), [cid]: parseFloat(e.target.value) };
                    handleUpdate({ targetScores: newTargets });
                  }}
                  className="w-full accent-amber-500"
                />
              </div>
            ))}
          </div>
        )}
        
        <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
           {Object.keys(store.competences).map(cid => {
             const isSelected = selectedRCs.includes(cid);
             return (
               <div key={cid} className="relative group/btn">
                 <button 
                   onClick={() => {
                     if (isSelected) setSelectedRCs(selectedRCs.filter(id => id !== cid));
                     else setSelectedRCs([...selectedRCs, cid]);
                   }}
                   className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border ${
                     isSelected 
                       ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md scale-105' 
                       : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                   }`}
                 >
                   {cid.replace('RC', 'RC ')}
                 </button>
                 
                 {/* Tooltip Premium */}
                 <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-[#1F3864] text-white text-[8px] font-bold rounded-lg opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-300 z-[100] shadow-xl pointer-events-none text-center italic">
                    {store.competences[cid]}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1F3864]" />
                 </div>
               </div>
             );
           })}
           <div className="w-px h-6 bg-gray-200 mx-2 self-center" />
           <button 
             onClick={() => setSelectedRCs(Object.keys(store.competences))}
             className="text-[8px] font-black text-[#1F3864] uppercase underline decoration-2 underline-offset-4 hover:text-blue-600"
           >
             Tout activer
           </button>
        </div>

        <div className="h-[400px] w-full bg-gray-50/50 rounded-3xl p-4 border border-gray-100 relative">
          <div className="absolute top-[20px] left-[65px] right-[20px] bottom-[55px] flex">
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-red-50/50 rounded-tl-xl flex items-center justify-center opacity-40"><span className="text-[9px] font-black text-red-300 uppercase tracking-widest rotate-[-45deg]">Priorité Absolue</span></div>
              <div className="flex-1 bg-amber-50/50 rounded-bl-xl flex items-center justify-center opacity-40"><span className="text-[9px] font-black text-amber-300 uppercase tracking-widest rotate-[-45deg]">Ciblé</span></div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 bg-orange-50/50 rounded-tr-xl flex items-center justify-center opacity-40"><span className="text-[9px] font-black text-orange-300 uppercase tracking-widest rotate-[-45deg]">Systémique</span></div>
              <div className="flex-1 bg-emerald-50/50 rounded-br-xl flex items-center justify-center opacity-40"><span className="text-[9px] font-black text-emerald-300 uppercase tracking-widest rotate-[-45deg]">Acquis</span></div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" dataKey="impact" name="Impact" unit="%" domain={[0, 100]} tick={{fontSize: 10, fill: '#94a3b8'}} label={{ value: "Impact (% Apprenants)", position: 'insideBottom', offset: -10, fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
              <YAxis type="number" dataKey="urgency" name="Urgence" domain={[0, 'dataMax + 1']} tick={{fontSize: 10, fill: '#94a3b8'}} label={{ value: "Urgence (IGE)", angle: -90, position: 'insideLeft', fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
              <ZAxis type="number" dataKey="gap" range={[100, 500]} name="Gap" />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Compétences" data={advancedStats?.urgencyData || []} fill="#ef4444" fillOpacity={0.7} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recommended Modules Catalogue (Integrated Step 1) */}
      <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-1000 delay-300">
        <div className="bg-white rounded-[40px] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-8">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <Sparkles className="text-blue-600" size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-[#1F3864] italic uppercase tracking-tighter">Décision Stratégique : Choix du Module</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              Sur la base de votre diagnostic ci-dessus, l'IA a classé les programmes par score de pertinence (**IPT**). 
              Sélectionnez le module pour passer au profilage de la cohorte.
            </p>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-md rounded-[40px] p-2 border border-white shadow-xl">
          <EngineeringCatalogue 
            store={store}
            formations={recommendedFormations}
            onOpenSession={onOpenSession}
            isTerritorialMode={isTerritorialMode}
          />
        </div>
      </div>
    </div>
  );
}
