import React from 'react';
import { 
  Calendar, Users, Target, Compass, BookOpen, 
  CheckCircle, AlertCircle, TrendingUp, BarChart
} from 'lucide-react';

export function FormationDashboard({ formation, filteredSessions, store, displaySession }) {
  if (!formation) return null;

  const totalParticipants = filteredSessions.reduce((acc, s) => acc + (s.inscrits?.length || 0), 0);
  const modulesCount = displaySession?.modules?.length || 0;
  const competencesCount = formation.targetedComps?.length || 0;
  const logisticsCount = formation.techRequirements?.length || 0;

  // Readiness calculation
  const checks = [
    { label: 'Identité définie', ok: !!formation.libelle && formation.libelle !== 'Nouveau Programme Pédagogique' },
    { label: 'Compétences ciblées', ok: competencesCount > 0 },
    { label: 'Modules conçus', ok: modulesCount > 0 },
    { label: 'Sessions planifiées', ok: filteredSessions.length > 0 },
    { label: 'Participants inscrits', ok: totalParticipants > 0 },
    { label: 'Pré-requis logistiques', ok: logisticsCount > 0 },
  ];
  const readiness = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white shadow-xl space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Sessions</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-indigo-600 italic">{filteredSessions.length}</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-2xl"><Calendar size={20} /></div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white shadow-xl space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Participants</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-emerald-600 italic">{totalParticipants}</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-2xl"><Users size={20} /></div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white shadow-xl space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Modules</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-blue-600 italic">{modulesCount}</span>
            <div className="p-2.5 bg-blue-50 text-blue-500 rounded-2xl"><BookOpen size={20} /></div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-6 border border-white shadow-xl space-y-3">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Cibles</p>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-black text-amber-600 italic">{competencesCount}</span>
            <div className="p-2.5 bg-amber-50 text-amber-500 rounded-2xl"><Target size={20} /></div>
          </div>
        </div>
      </div>

      {/* Readiness Card */}
      <div className="bg-[#1F3864] rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
          <Compass size={160} />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center">
                <span className="text-2xl font-black italic">{readiness}%</span>
              </div>
              <div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Maturité Programme</h3>
                <p className="text-blue-200/60 font-bold text-sm mt-1">
                  {readiness >= 80 ? 'Prêt pour le déploiement' : readiness >= 50 ? 'En bonne voie' : 'En phase de construction'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${readiness}%`, 
                  background: readiness >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : readiness >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #f97316, #fb923c)' 
                }} 
              />
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-[24px] p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest">Checklist Qualité</span>
              <span className="text-[9px] font-black text-emerald-400">{checks.filter(c => c.ok).length}/{checks.length}</span>
            </div>
            {checks.map(item => (
              <div key={item.label} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
                <span className="text-[10px] font-bold text-blue-100">{item.label}</span>
                {item.ok ? <CheckCircle size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-orange-400 opacity-60" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per-Session Breakdown */}
      {filteredSessions.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-white shadow-xl space-y-6">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1F3864] flex items-center gap-2">
            <BarChart size={14} className="text-blue-500" /> Ventilation par Session
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSessions.map(s => (
              <div key={s['ID Session']} className="bg-gray-50 rounded-[20px] p-5 space-y-3 border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#1F3864]">{s['ID Session']}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                    s.Statut === 'Confirmée' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}>{s.Statut || 'Planifiée'}</span>
                </div>
                <p className="text-[10px] font-bold text-gray-500">{s.Lieu || 'Lieu non défini'}</p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Users size={10} /> {s.inscrits?.length || 0} inscrits</span>
                  <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Calendar size={10} /> {s['Date (Samedi)'] || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
