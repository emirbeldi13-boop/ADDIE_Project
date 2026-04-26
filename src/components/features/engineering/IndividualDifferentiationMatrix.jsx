import * as React from 'react';
import { Grid, Info, User, Target as TargetIcon, Zap, Activity, Users, ArrowUpRight, TrendingDown } from 'lucide-react';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Cell 
} from 'recharts';

export function IndividualDifferentiationMatrix({ 
  segmentation, 
  store, 
  formation, 
  session 
}) {
  const targetComps = (formation?.targetedComps && formation.targetedComps.length > 0)
    ? formation.targetedComps
    : [];

  const chartData = React.useMemo(() => {
    if (!segmentation?.list) return [];
    return segmentation.list.map(p => {
      const scores = targetComps.map(cid => p.scores?.[cid.replace('RC', 'C')] || p.scores?.[cid] || 3);
      const avgScore = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
      const target = 4.0; // Standard target
      const gap = Math.max(0, target - avgScore);
      
      return {
        id: p.ID,
        name: p.Nom,
        x: Math.round(avgScore * 10) / 10,
        y: Math.round(gap * 10) / 10,
        z: 100,
        cluster: p.cluster || (gap > 1 ? 'low' : gap < 0.3 ? 'expert' : 'inter')
      };
    });
  }, [segmentation.list, targetComps]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-white/10 min-w-[180px] backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/30">
              {data.name.charAt(0)}
            </div>
            <div className="flex flex-col">
               <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">{data.name}</p>
               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Participant ID: {data.id}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Maîtrise</span>
               <span className="text-xs font-black text-emerald-400">{data.x}/5</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Écart (Gap)</span>
               <span className="text-xs font-black text-rose-400">{data.y} pts</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (targetComps.length === 0) {
    return (
      <div className="bg-[#F8FAFC] rounded-[48px] p-12 border border-slate-200/60 shadow-sm flex flex-col items-center justify-center text-center h-full space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300">
           <Info size={32} strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Configuration Manquante</p>
          <p className="text-sm font-bold text-slate-300 max-w-xs leading-relaxed italic">Sélectionnez des compétences cibles pour activer la matrice de dispersion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] rounded-[48px] p-10 border border-slate-200/60 shadow-2xl h-full flex flex-col overflow-hidden group">
      <style>{`
        .mono-label { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
        @keyframes glow-red {
          0%, 100% { filter: drop-shadow(0 0 5px rgba(225, 29, 72, 0.4)); }
          50% { filter: drop-shadow(0 0 15px rgba(225, 29, 72, 0.8)); }
        }
        .glow-red { animation: glow-red 2s infinite; }
      `}</style>

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10 pb-6 border-b border-slate-200/60">
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full w-fit">
             <Activity size={12} className="text-indigo-600" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Individual Analytics</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter leading-none flex items-center gap-2">
            Dispersion <span className="text-slate-400 font-light">Performance / Effort</span>
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Cartographie des besoins de différenciation par participant.
          </p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all hover:border-rose-200">
              <div className="w-2 h-2 rounded-full bg-[#E11D48] glow-red" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Alerte Critique</span>
           </div>
        </div>
      </div>

      {/* --- CHART --- */}
      <div className="flex-1 min-h-[350px] relative bg-white p-6 rounded-[32px] border border-slate-200 shadow-inner group-hover:shadow-md transition-shadow">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 0 }}>
            <CartesianGrid strokeDasharray="1 4" stroke="#e2e8f0" vertical={true} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Score" 
              domain={[0, 5]} 
              tick={{fontSize: 9, fill: '#94a3b8', className: 'mono-label font-bold'}}
              label={{ value: "Niveau de Maîtrise (%) →", position: 'insideBottom', offset: -25, fontSize: 9, fill: '#94a3b8', fontWeight: '900', className: 'uppercase tracking-[0.1em]' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Gap" 
              domain={[0, 3]} 
              tick={{fontSize: 9, fill: '#94a3b8', className: 'mono-label font-bold'}}
              label={{ value: "Indice d'Effort (Gap) →", angle: -90, position: 'insideLeft', offset: 15, fontSize: 9, fill: '#94a3b8', fontWeight: '900', className: 'uppercase tracking-[0.1em]' }}
            />
            <ZAxis type="number" dataKey="z" range={[150, 400]} />
            
            {/* 🌈 Quadrants optimized */}
            <ReferenceArea x1={0} x2={2.5} y1={1.5} y2={3} fill="#E11D48" fillOpacity={0.03} label={{ value: "RISQUE CRITIQUE", position: 'insideTopLeft', fill: '#E11D48', fontSize: 8, fontWeight: '900', className: 'uppercase tracking-widest opacity-40' }} />
            <ReferenceArea x1={3.5} x2={5} y1={0} y2={0.8} fill="#10B981" fillOpacity={0.03} label={{ value: "POTENTIEL EXPERT", position: 'insideBottomRight', fill: '#10B981', fontSize: 8, fontWeight: '900', className: 'uppercase tracking-widest opacity-40' }} />
            
            <ReferenceLine x={2.5} stroke="#cbd5e1" strokeDasharray="4 4" />
            <ReferenceLine y={1.5} stroke="#cbd5e1" strokeDasharray="4 4" />

            <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#94a3b8' }} />
            
            <Scatter 
              name="Participants" 
              data={chartData} 
              shape={(props) => {
                const { cx, cy, payload } = props;
                const isCritical = payload.cluster === 'low';
                const isExpert = payload.cluster === 'expert';
                const color = isCritical ? '#E11D48' : isExpert ? '#10B981' : '#6366f1';
                return (
                  <g className="transition-all duration-500">
                    <circle 
                      cx={cx} cy={cy} r={7} 
                      fill={color} 
                      className={`shadow-xl cursor-pointer ${isCritical ? 'glow-red' : ''}`}
                      stroke="white"
                      strokeWidth={2}
                    />
                    <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.1} className="animate-pulse" />
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* --- FOOTER SUMMARY --- */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center group/card transition-all hover:-translate-y-1">
             <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
                <TrendingDown size={16} />
             </div>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Cibles Prioritaires</span>
             <p className="text-2xl font-black text-slate-900">{chartData.filter(d => d.cluster === 'low').length}</p>
             <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(chartData.filter(d => d.cluster === 'low').length / (chartData.length || 1)) * 100}%` }} />
             </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center group/card transition-all hover:-translate-y-1">
             <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
                <Users size={16} />
             </div>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">En Consolidation</span>
             <p className="text-2xl font-black text-slate-900">{chartData.filter(d => d.cluster === 'inter').length}</p>
             <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(chartData.filter(d => d.cluster === 'inter').length / (chartData.length || 1)) * 100}%` }} />
             </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center group/card transition-all hover:-translate-y-1">
             <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
                <ArrowUpRight size={16} />
             </div>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Ressources Internes</span>
             <p className="text-2xl font-black text-slate-900">{chartData.filter(d => d.cluster === 'expert').length}</p>
             <div className="w-full h-1 bg-slate-50 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(chartData.filter(d => d.cluster === 'expert').length / (chartData.length || 1)) * 100}%` }} />
             </div>
          </div>
      </div>
    </div>
  );
}
