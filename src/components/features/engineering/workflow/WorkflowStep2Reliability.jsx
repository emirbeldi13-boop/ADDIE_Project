import React, { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, Info, Eye, EyeOff, ShieldAlert, Zap } from 'lucide-react';
import { StepValidationFooter } from './WorkflowStepper';
import { calculateRobustnessIndex, summarizeReliabilityABC, getDataReliability, getRobustnessMultiplier } from '../../../../utils/causalEngine';

/**
 * ÉTAPE 2 — Quelle est la fiabilité de mes données ?
 * Outils : 2.1 Pondération des sources | 2.2 Robustesse territoriale | 2.3 Divergences
 */
export function WorkflowStep2Reliability({ store, participants, selectedCircos, stepValidation, onValidate, onInvalidate }) {
  const [checks, setChecks] = useState({ robustesse: false, divergences: false, composites: false });
  const [divergenceDecisions, setDivergenceDecisions] = useState({});
  const [showAllSources, setShowAllSources] = useState(false);

  // ═══ Outil 2.1 — Pondération des sources ═══
  const sourceWeighting = useMemo(() => {
    return participants.map(p => {
      const reliability = getDataReliability(p);
      const hasAutopos = p.avgAutoposScore != null && p.avgAutoposScore > 0;
      const hasObs = p.temporalObsScore != null;
      const autoWeight = hasObs ? (hasAutopos ? 25 : 0) : (hasAutopos ? 100 : 0);
      const obsWeight = hasObs ? 65 : 0;
      
      return {
        id: p.ID,
        nom: p.Nom || p['Prénom'] || p.ID,
        circo: p['Circonscription'],
        autopos: hasAutopos,
        autoWeight,
        obs: hasObs,
        obsWeight,
        transfert: false, // Not tracked currently
        docsMEN: false,   // Not tracked currently
        situation: reliability.level,
        reliability
      };
    });
  }, [participants]);

  // ═══ Outil 2.2 — Robustesse territoriale ═══
  const robustnessPerCirco = useMemo(() => {
    const circos = [...new Set(store.enseignants.map(e => e['Circonscription']))].filter(Boolean);
    return circos.map(c => {
      const allInCirco = store.enseignants.filter(e => e['Circonscription'] === c);
      const participantsInCirco = participants.filter(p => p['Circonscription'] === c);
      const totalInCirco = allInCirco.length;
      const index = calculateRobustnessIndex(participantsInCirco, totalInCirco);
      if (index.quorum > 1) index.quorum = 1;
      return { circo: c, ...index, total: totalInCirco, sample: participantsInCirco.length };
    });
  }, [store.enseignants, participants]);

  const reliabilitySummary = useMemo(
    () => participants.length ? summarizeReliabilityABC(participants) : null,
    [participants]
  );

  // ═══ Outil 2.3 — Divergences significatives ═══
  const divergences = useMemo(() => {
    return participants
      .filter(p => p.avgAutoposScore != null && p.temporalObsScore != null)
      .map(p => ({
        id: p.ID,
        nom: p.Nom || p['Prénom'] || p.ID,
        autopos: p.avgAutoposScore,
        obs: p.temporalObsScore,
        ecart: +(p.avgAutoposScore - p.temporalObsScore).toFixed(1),
        absEcart: +Math.abs(p.avgAutoposScore - p.temporalObsScore).toFixed(1),
        interpretation: p.avgAutoposScore > p.temporalObsScore + 1.5 
          ? 'Possible surestimation' 
          : p.temporalObsScore > p.avgAutoposScore + 1.5 
            ? 'Anxiété professionnelle — Besoin confiance'
            : null,
      }))
      .filter(d => d.absEcart > 1.5)
      .sort((a, b) => b.absEcart - a.absEcart);
  }, [participants]);

  const allDivergencesResolved = divergences.length === 0 || 
    divergences.every(d => divergenceDecisions[d.id]);

  const situationColors = { A: 'text-emerald-600 bg-emerald-50', B: 'text-amber-600 bg-amber-50', C: 'text-slate-500 bg-slate-100' };
  const situationLabels = { A: 'Fiable', B: 'Modéré', C: 'Indicatif ⚠' };

  const displayedSources = showAllSources ? sourceWeighting : sourceWeighting.slice(0, 8);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* ─── Header ─── */}
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-2xl">
          <ShieldCheck size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            2. Fiabilité des Données
          </h2>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            Puis-je faire confiance à ce que je vais analyser ?
          </p>
        </div>
      </div>

      {/* ═══ OUTIL 2.1 — Tableau de pondération ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Eye size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pondération des Sources</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Par enseignant — Situation A/B/C</p>
            </div>
          </div>
          <button
            onClick={() => setShowAllSources(!showAllSources)}
            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors"
          >
            {showAllSources ? 'Réduire' : `Voir tous (${sourceWeighting.length})`}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[8px]">Enseignant</th>
                <th className="text-center py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[8px]">Autopos.</th>
                <th className="text-center py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[8px]">Obs. directe</th>
                <th className="text-center py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[8px]">Transfert</th>
                <th className="text-center py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[8px]">Docs MEN</th>
                <th className="text-center py-2 px-3 font-black text-slate-400 uppercase tracking-widest text-[8px]">Situation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {displayedSources.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-700">{s.nom}</td>
                  <td className="text-center py-2.5 px-3">
                    {s.autopos ? (
                      <span className="text-emerald-600 font-black">✓ {s.autoWeight}%</span>
                    ) : (
                      <span className="text-slate-300">✗</span>
                    )}
                  </td>
                  <td className="text-center py-2.5 px-3">
                    {s.obs ? (
                      <span className="text-emerald-600 font-black">✓ {s.obsWeight}%</span>
                    ) : (
                      <span className="text-slate-300 text-[9px]">✗ estim.</span>
                    )}
                  </td>
                  <td className="text-center py-2.5 px-3"><span className="text-slate-300">✗</span></td>
                  <td className="text-center py-2.5 px-3"><span className="text-slate-300">✗</span></td>
                  <td className="text-center py-2.5 px-3">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${situationColors[s.situation]}`}>
                      {s.situation} {s.situation === 'C' && '🔴'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Situation legend */}
        <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
          {Object.entries(situationLabels).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${situationColors[k]}`}>{k}</span>
              <span className="text-[9px] font-bold text-slate-500">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ OUTIL 2.2 — Robustesse territoriale ═══ */}
      <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Matrice de Robustesse Territoriale</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quorum × Sources par circonscription</p>
          </div>
        </div>

        {/* Robustness per circo cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {robustnessPerCirco.map(r => (
            <div key={r.circo} className={`p-5 rounded-2xl border space-y-3 ${
              r.level === 'robust' ? 'bg-emerald-50/50 border-emerald-200' :
              r.level === 'probable' ? 'bg-amber-50/50 border-amber-200' :
              r.level === 'preliminary' ? 'bg-orange-50/50 border-orange-200' :
              'bg-rose-50/50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 uppercase">{r.circo}</span>
                <span className="text-lg" style={{ color: r.color }}>
                  {r.level === 'robust' ? '🟢' : r.level === 'probable' ? '🟡' : r.level === 'preliminary' ? '🟠' : '🔴'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-500">Quorum</span>
                  <span className="font-black text-slate-900">{Math.round(r.quorum * 100)}% ({r.sample}/{r.total})</span>
                </div>
                <div className="h-1.5 bg-white rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-1000 rounded-full" style={{ width: `${Math.min(100, r.quorum * 100)}%`, backgroundColor: r.color }} />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-500">Sources moy.</span>
                  <span className="font-black text-slate-900">{r.avgSources?.toFixed(1) || '0'}</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: r.color }}>
                  {r.label}
                </p>
              </div>
              {r.level === 'insufficient' && (
                <div className="p-3 bg-rose-100 rounded-xl border border-rose-200">
                  <p className="text-[9px] font-bold text-rose-700 leading-snug">
                    Diagnostic territorial bloqué — Tendance préliminaire uniquement. Seuls les diagnostics individuels restent actifs.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Fiabilité summary */}
        {reliabilitySummary && (
          <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-100">
            {Object.entries(reliabilitySummary.dist).map(([cat, val]) => {
              const pct = reliabilitySummary.pct[cat];
              return (
                <div key={cat} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className={`text-[11px] font-black ${cat === 'A' ? 'text-emerald-500' : cat === 'B' ? 'text-amber-500' : 'text-slate-400'}`}>NIVEAU {cat}</span>
                    <span className="text-[10px] font-black text-slate-900">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${cat === 'A' ? 'bg-emerald-500' : cat === 'B' ? 'bg-amber-500' : 'bg-slate-300'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-tight">
                    {cat === 'A' ? 'Double Preuve (Auto+Obs)' : cat === 'B' ? 'Source Unique' : 'Donnée Indicative'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ OUTIL 2.3 — Divergences ═══ */}
      {divergences.length > 0 && (
        <div className="bg-white rounded-[32px] border border-amber-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Divergences Significatives</h3>
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
                {divergences.length} enseignant(s) avec écart autopos./observation &gt; 1.5 pts
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 px-3 font-black text-slate-400 uppercase text-[8px]">Enseignant</th>
                  <th className="text-center py-2 px-3 font-black text-slate-400 uppercase text-[8px]">Autopos.</th>
                  <th className="text-center py-2 px-3 font-black text-slate-400 uppercase text-[8px]">Obs. dir.</th>
                  <th className="text-center py-2 px-3 font-black text-slate-400 uppercase text-[8px]">Écart</th>
                  <th className="text-left py-2 px-3 font-black text-slate-400 uppercase text-[8px]">Interprétation</th>
                  <th className="text-left py-2 px-3 font-black text-slate-400 uppercase text-[8px]">Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {divergences.map(d => (
                  <tr key={d.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-700">{d.nom}</td>
                    <td className="text-center py-3 px-3 font-bold">{d.autopos.toFixed(1)}/5</td>
                    <td className="text-center py-3 px-3 font-bold">{d.obs.toFixed(1)}/5</td>
                    <td className="text-center py-3 px-3">
                      <span className={`font-black ${d.ecart > 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                        {d.ecart > 0 ? '+' : ''}{d.ecart}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[10px] font-bold text-slate-500 italic">{d.interpretation}</td>
                    <td className="py-3 px-3">
                      <select
                        value={divergenceDecisions[d.id] || ''}
                        onChange={e => setDivergenceDecisions(prev => ({ ...prev, [d.id]: e.target.value }))}
                        className="text-[9px] font-bold border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-200 outline-none"
                      >
                        <option value="">— Choisir —</option>
                        <option value="obs">Utiliser score observation</option>
                        <option value="moyenne">Utiliser moyenne pondérée</option>
                        <option value="reporter">Reporter au prochain diagnostic</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!allDivergencesResolved && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center gap-2">
              <Info size={14} className="text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-700">
                Décision inspecteur requise : résolvez toutes les divergences avant de continuer.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Validation ═══ */}
      <StepValidationFooter
        stepId={2}
        isValidated={stepValidation?.validated}
        onValidate={() => onValidate(2)}
        onInvalidate={onInvalidate}
        validationChecks={[
          { label: 'Le niveau de robustesse est acceptable pour décider', checked: checks.robustesse, onChange: v => setChecks(p => ({ ...p, robustesse: v })) },
          { label: 'Les divergences ont été tranchées', checked: checks.divergences || divergences.length === 0, onChange: v => setChecks(p => ({ ...p, divergences: v })) },
          { label: 'Les scores composites sont validés', checked: checks.composites, onChange: v => setChecks(p => ({ ...p, composites: v })) },
        ]}
      />
    </div>
  );
}
