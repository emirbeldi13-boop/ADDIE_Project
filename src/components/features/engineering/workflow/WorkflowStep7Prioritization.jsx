import React, { useMemo, useState } from 'react';
import { 
  UserCheck, Users, AlertTriangle, Star, ShieldCheck, 
  TrendingUp, Map, CheckCircle2, LayoutGrid, Info
} from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

/**
 * ÉTAPE 6 — Qui former en priorité ?
 */
export function WorkflowStep7Prioritization({ 
  store, 
  participants, 
  selectedRCs, 
  stepValidation, 
  onValidate, 
  onInvalidate 
}) {
  const isLocked = stepValidation?.validated;
  const [checks, setChecks] = useState({ priorisation: false, composition: false, radar: false });
  const rcIds = selectedRCs.length > 0 ? selectedRCs : Object.keys(store.competences || {});
  const circos = [...new Set(participants.map(p => p['Circonscription']))].filter(Boolean);

  // ═══ Outil 6.1 — Priority list ═══
  const priorityList = useMemo(() => {
    return participants.map(p => {
      // Calculate composite score on target RCs
      const targetScores = rcIds.map(rc => p.realityScores?.[rc] ?? 3);
      const avgTarget = targetScores.length > 0 ? targetScores.reduce((a, b) => a + b, 0) / targetScores.length : 3;
      const target = 4.0;
      const gap = +(target - avgTarget).toFixed(1);
      const priorityScore = +(gap * 10 + (p.hasVisit ? 0 : 5)).toFixed(0);
      
      return {
        id: p.ID,
        nom: p.Nom || p['Prénom'] || p.ID,
        circo: p['Circonscription'],
        avgTarget: +avgTarget.toFixed(1),
        gap,
        hasVisit: p.hasVisit,
        statut: p['Statut'] || 'Titulaire',
        priorityScore,
        cluster: gap > 1.5 ? 'critical' : gap > 0.5 ? 'consolidation' : 'autonomy',
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [participants, rcIds]);

  // ═══ Outil 6.2 — Composition ═══
  const composition = useMemo(() => {
    const total = priorityList.length;
    const stagiaires = priorityList.filter(p => p.statut === 'Stagiaire' || p.statut === 'Titulaire (en attente)').length;
    const titulaires = total - stagiaires;
    const critical = priorityList.filter(p => p.cluster === 'critical').length;
    const consolidation = priorityList.filter(p => p.cluster === 'consolidation').length;
    const autonomy = priorityList.filter(p => p.cluster === 'autonomy').length;
    
    // Recommended: max 25 per session, ratio stagiaires < 40%
    const maxSession = 25;
    const recommended = Math.min(total, maxSession);
    const stagiairePct = total > 0 ? Math.round((stagiaires / total) * 100) : 0;
    const isBalanced = stagiairePct <= 40;

    return { total, stagiaires, titulaires, critical, consolidation, autonomy, recommended, stagiairePct, isBalanced };
  }, [priorityList]);

  // ═══ Outil 7.3 — Radar ═══
  const radarData = useMemo(() => {
    return rcIds.map(rcId => {
      const scores = priorityList.map(p => {
        const participant = participants.find(pp => pp.ID === p.id);
        return participant?.realityScores?.[rcId] ?? 3;
      });
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return {
        name: store.competences[rcId]?.split(' — ')[0] || rcId,
        'Groupe T1': +avg.toFixed(1),
        'Cible': store.referential?.[rcId]?.targetScore || 4.0,
      };
    });
  }, [rcIds, priorityList, participants, store.competences, store.referential]);

  const clusterColors = { 
    critical: 'text-rose-600 bg-rose-50 border-rose-100 shadow-rose-500/5', 
    consolidation: 'text-amber-600 bg-amber-50 border-amber-100 shadow-amber-500/5', 
    autonomy: 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-emerald-500/5' 
  };
  const clusterLabels = { critical: 'Critique', consolidation: 'Consolidation', autonomy: 'Autonomie' };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl">
          <UserCheck size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">6. Priorisation</h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            Arbitrage de l'effectif et composition du groupe cible
          </p>
        </div>
      </div>

      {/* ═══ OUTIL 6.1 — Composition Recommandée ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Users size={20} className="text-indigo-500" /> Composition de la Session (T1)
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Indicateurs d'équilibre et capacité d'accueil recommandée
          </p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Effectif recommandé', value: composition.recommended, sub: `/ ${composition.total} total`, icon: UserCheck, color: 'indigo' },
              { label: 'Stagiaires', value: composition.stagiaires, sub: `${composition.stagiairePct}%`, icon: Star, color: composition.isBalanced ? 'emerald' : 'amber', alert: !composition.isBalanced },
              { label: 'Titulaires', value: composition.titulaires, sub: 'Expérimentés', icon: ShieldCheck, color: 'slate' },
              { label: 'Profils critiques', value: composition.critical, sub: 'Besoin urgent', icon: AlertTriangle, color: 'rose', isRed: true },
            ].map((item, i) => (
              <div key={i} className={`p-6 rounded-[28px] border transition-all shadow-sm flex flex-col justify-between min-h-[140px] ${
                item.alert ? 'bg-amber-50 border-amber-200' : item.isRed ? 'bg-rose-50 border-rose-200' : 'bg-slate-50/50 border-slate-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                  <item.icon size={16} className={`text-${item.color}-500`} />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">{item.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{item.sub}</p>
                  {item.alert && (
                    <div className="mt-2 flex items-center gap-1 text-amber-600">
                      <Info size={10} />
                      <span className="text-[8px] font-black uppercase tracking-tighter">Ratio stagiaires élevé (&gt;40%)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ═══ OUTIL 6.2 — Liste de priorisation ═══ */}
        <div className="lg:col-span-8 bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <LayoutGrid size={20} className="text-indigo-500" /> Liste de Priorisation
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Classement algorithmique basé sur les écarts (GAP) et les visites
            </p>
          </div>
          
          <div className="p-0 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
            {circos.map(circo => {
              const teachers = priorityList.filter(p => p.circo === circo);
              return (
                <div key={circo} className="space-y-0">
                  <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100">
                    <div className="flex items-center gap-2">
                       <Map size={14} className="text-indigo-600" />
                       <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{circo}</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                      {teachers.length} enseignants
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="text-center py-3 px-2 font-black text-slate-400 uppercase text-[8px] w-12">#</th>
                          <th className="text-left py-3 px-3 font-black text-slate-400 uppercase text-[8px]">Enseignant</th>
                          <th className="text-center py-3 px-2 font-black text-slate-400 uppercase text-[8px]">Moy. RC</th>
                          <th className="text-center py-3 px-2 font-black text-slate-400 uppercase text-[8px]">GAP</th>
                          <th className="text-center py-3 px-2 font-black text-slate-400 uppercase text-[8px]">Priorité</th>
                          <th className="text-center py-3 px-8 font-black text-slate-400 uppercase text-[8px] w-32">Profil</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {teachers.slice(0, 15).map((p, i) => (
                          <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${i < 3 ? 'bg-rose-50/20' : ''} ${isLocked ? 'opacity-70' : ''}`}>
                            <td className="text-center py-4 px-2 font-black text-slate-300">{i + 1}</td>
                            <td className="py-4 px-3">
                               <div className="flex flex-col">
                                  <span className="font-black text-slate-900 uppercase tracking-tight">{p.nom}</span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.statut} • {p.hasVisit ? 'Visité' : 'Non visité'}</span>
                               </div>
                            </td>
                            <td className="text-center py-4 px-2 font-black text-slate-600">{p.avgTarget}/5</td>
                            <td className="text-center py-4 px-2">
                              <span className={`font-black ${p.gap > 1.5 ? 'text-rose-600' : p.gap > 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {p.gap > 0 ? `+${p.gap}` : '0'}
                              </span>
                            </td>
                            <td className="text-center py-4 px-2">
                               <div className="flex flex-col items-center gap-1">
                                  <span className="font-black text-indigo-600 text-sm">{p.priorityScore}</span>
                                  <div className="w-10 h-0.5 bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, p.priorityScore)}%` }} />
                                  </div>
                               </div>
                            </td>
                            <td className="py-4 px-8">
                               <div className="flex justify-center">
                                  <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest shadow-sm border ${clusterColors[p.cluster]}`}>
                                    {clusterLabels[p.cluster]}
                                  </span>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ OUTIL 6.3 — Radar du Groupe ═══ */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 mb-8">
              <TrendingUp size={20} className="text-rose-500" /> Radar du Groupe T1
            </h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 8, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <Radar name="Cible" dataKey="Cible" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                  <Radar name="Groupe T1" dataKey="Groupe T1" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.15} dot={{ r: 3, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
                  <RechartsTooltip />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
               <div className="flex items-start gap-3">
                  <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight">
                    Ce radar représente la moyenne réelle du groupe d'enseignants priorisés face aux cibles de maîtrise attendues.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      <StepValidationFooter
        stepId={6}
        isValidated={stepValidation?.validated}
        onValidate={() => onValidate(6)}
        onInvalidate={onInvalidate}
        validationChecks={[
          { label: 'La priorisation des enseignants est validée', checked: checks.priorisation, onChange: v => setChecks(p => ({ ...p, priorisation: v })) },
          { label: 'La composition du groupe est équilibrée', checked: checks.composition, onChange: v => setChecks(p => ({ ...p, composition: v })) },
          { label: 'Le radar de départ du groupe est enregistré', checked: checks.radar, onChange: v => setChecks(p => ({ ...p, radar: v })) },
        ]}
      />
    </div>
  );
}
