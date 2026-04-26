import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, RotateCcw, Quote, Plus, Clock, AlertCircle, Shield, Trash2, ArchiveRestore, ChevronDown, ChevronUp, Star, ShieldCheck, ArrowRight, TrendingUp, TrendingDown, Target, Brain, Zap, Minus, Calendar, Users } from 'lucide-react';
import { EnseignantEditModal } from './EnseignantEditModal';
import { VisitModal } from './VisitModal';
import { AutoposModal } from './AutoposModal';
import { KirkpatrickModal } from './KirkpatrickModal';
import {
  CircoBadge, StatutBadge, ExceptionalBadge, FormationBadge,
  ScoreObservationBadge, PriorityGroupBadge, AvailabilityBadge,
} from '../../ui/Badge';
import {
  getDelaiClass, isExceptional, getSatisfactionClass,
  getProgressionClass, getTransfertStatutClass,
} from '../../../utils/scoreCalculator';

import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { toISO } from '../../../utils/dateUtils';

// Format a score with "Estimé" visual if from autopos only
function ScoreDisplay({ score, isEstimated, isPartial, partial }) {
  if (score === null || score === undefined) return <span className="text-gray-400">—</span>;
  return (
    <span className={isEstimated ? 'text-gray-500 italic' : isPartial ? 'text-orange-500' : 'text-[#2E75B6] font-bold'}>
      {parseFloat(score).toFixed(2)}/5
      {isEstimated && (
        <span
          className="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded cursor-help"
          title="Score Estimé — dérivé de l'auto-positionnement uniquement. Fiabilité limitée — visite à programmer."
        >
          Estimé
        </span>
      )}
      {isPartial && !isEstimated && (
        <span
          className="ml-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded cursor-help"
          title={`Score partiel — critères manquants: ${partial?.missing?.join(', ')}`}
        >
          Partiel *
        </span>
      )}
    </span>
  );
}

export function EnseignantFiche({ id, data, store }) {
  const { enseignants, satisfaction, acquis, transfert, observations, autopositionnement, sessions } = data;
  const { isMobile, chartH } = useBreakpoint();
  const [editOpen, setEditOpen] = useState(false);
  const [visitOpen, setVisitOpen] = useState(false);
  const [autoposOpen, setAutoposOpen] = useState(false);
  const [kpOpen, setKpOpen] = useState(false);
  const [kpFormation, setKpFormation] = useState(null);
  const [editingVisit, setEditingVisit] = useState(null);

  const ens = useMemo(() => enseignants.find(e => e['ID'] === id), [enseignants, id]);
  const satData = useMemo(() => satisfaction.filter(s => s['ID Ens'] === id), [satisfaction, id]);
  const acqData = useMemo(() => acquis.filter(a => a['ID Ens'] === id), [acquis, id]);
  const transData = useMemo(() => transfert.filter(t => t['ID Ens'] === id), [transfert, id]);
  const obsData = useMemo(() => observations.filter(o => o['ID Ens'] === id), [observations, id]);
  const autoData = useMemo(() => autopositionnement.filter(a => a['ID Enseignant'] === id), [autopositionnement, id]);

  // All visits from the new visits store (includes soft-deleted)
  const allVisits = useMemo(() => store?.visits?.[id] || [], [store?.visits, id]);

  // Legacy history entries (from manual edit modal)
  const legacyHistory = useMemo(() => store?.ensHistory?.[id] || [], [store?.ensHistory, id]);

  // Merged unified timeline: normalize both sources → sort newest first
  const unifiedTimeline = useMemo(() => {
    // New visits from the visits store
    const newVisitIds = new Set(
      allVisits
        .filter(v => !v.deleted)
        .map(v => `${v.date}|${(v.observer || '').trim().toLowerCase()}`)
    );

    // Normalize legacy entries, skip any duplicated by the new store (same date+observer)
    const legacyNorm = legacyHistory
      .filter(h => {
        const key = `${h.date}|${(h.observateur || '').trim().toLowerCase()}`;
        return !newVisitIds.has(key);
      })
      .map(h => ({
        id: h.id,
        date: h.date,
        observer: h.observateur,
        note20: h.note !== '—' ? parseFloat(h.note) : null,
        exceptional: h.note !== '—' ? parseFloat(h.note) >= 16 : false,
        appreciation: h.verbatim || '',
        visitType: 'official',
        visitScore: null,
        scores: null,
        weights: null,
        partial: false,
        recordedAt: h.recordedAt,
        deleted: false,
        _source: 'legacy',
      }));

    const newNorm = allVisits.map(v => ({ ...v, _source: 'new' }));

    const sortByDate = (a, b) => {
      const pa = (a.date || '').split('/').reverse().join('-');
      const pb = (b.date || '').split('/').reverse().join('-');
      return pb.localeCompare(pa);
    };

    return [...newNorm, ...legacyNorm].sort(sortByDate);
  }, [allVisits, legacyHistory]);

  const activeTimeline = useMemo(() => unifiedTimeline.filter(v => !v.deleted), [unifiedTimeline]);
  const deletedTimeline = useMemo(() => unifiedTimeline.filter(v => v.deleted), [unifiedTimeline]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  const manualAutoData = useMemo(() => store?.autoposManual?.[id] || [], [store?.autoposManual, id]);

  const radarData = useMemo(() => {
    const allComps = store.competences ? Object.keys(store.competences) : ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6', 'RC7', 'RC8', 'RC9', 'RC10', 'RC11', 'RC12'];
    return allComps.map(c => {
      // 1. Collect all candidates for this competency
      const candidates = [];
      
      // Add manual entries (structure: { scores: { C1: X, ... }, recordedAt: ISO })
      manualAutoData.forEach(m => {
        if (m.scores && m.scores[c] !== undefined && m.scores[c] !== null) {
          candidates.push({
            score: parseFloat(m.scores[c]),
            date: m.recordedAt // Use ISO for sorting
          });
        }
      });

      // Add legacy entries (structure: { Compétence: C1, Date: DD/MM/YYYY, Score (1-5): X })
      autoData.filter(a => a['Compétence'] === c).forEach(a => {
        const isoDate = toISO(a['Date'] || '');
        candidates.push({
          score: parseFloat(a['Score (1-5)'] || 0),
          date: isoDate || '1970-01-01'
        });
      });

      // 2. Sort candidates by date descending
      candidates.sort((a, b) => b.date.localeCompare(a.date));

      const perceptionScore = candidates.length ? candidates[0].score : 0;

      // reality (latest observation, official or informal)
      const validVisits = activeTimeline.filter(v => 
        !v.deleted && 
        v.scores && 
        v.scores[c] !== null && 
        v.scores[c] !== undefined
      );
      const realityScore = validVisits.length ? parseFloat(validVisits[0].scores[c]) : 0;

      return {
        competence: c,
        libelle: store.competences[c] || c,
        perception: perceptionScore,
        reality: realityScore,
        fullMark: 5
      };
    });
  }, [autoData, manualAutoData, activeTimeline, store.competences]);

  const perceptionInsights = useMemo(() => {
    const activeComps = radarData.filter(d => d.perception > 0 && d.reality > 0);
    if (activeComps.length === 0) return null;

    const diffs = activeComps.map(d => Math.abs(d.perception - d.reality));
    const avgDiff = diffs.reduce((a,b) => a+b, 0) / diffs.length;
    const alignment = Math.max(0, 100 - (avgDiff * 20)); // 0-100 scale

    const overConfident = radarData.filter(d => d.perception - d.reality > 0.8).map(d => d.competence);
    const growthSurprise = radarData.filter(d => d.reality - d.perception > 0.5).map(d => d.competence);

    return {
      alignment: Math.round(alignment),
      overConfident,
      growthSurprise
    };
  }, [radarData]);

  const pedagogicalDiagnostic = useMemo(() => {
    if (!perceptionInsights) return null;

    const recommendations = [];
    const lowComps = radarData.filter(d => d.reality > 0 && d.reality < 3).sort((a,b) => a.reality - b.reality);
    
    // 1. Training Recommendations (RCET mapping)
    lowComps.slice(0, 3).forEach(c => {
      // Mapping intelligent selon les besoins prioritaires du RCET
      if (c.competence === 'RC2' || c.competence === 'RC3') recommendations.push({ type: 'formation', libelle: 'S’inscrire au module F2.1 (Scénarisation & APC)', icon: <Brain size={14} /> });
      if (c.competence === 'RC4' || c.competence === 'RC5') recommendations.push({ type: 'formation', libelle: 'S’inscrire au module F3.1 (Différenciation)', icon: <Zap size={14} /> });
      if (c.competence === 'RC7') recommendations.push({ type: 'formation', libelle: 'S’inscrire au module F1.1 (Évaluation)', icon: <Target size={14} /> });
    });

    // 2. Soft Skills / Alignment Recommendations
    if (perceptionInsights.alignment < 70) {
      recommendations.push({ type: 'coaching', libelle: 'Entretien de cadrage pédagogique (Écart de perception)', icon: <Shield size={14} /> });
    }

    // 3. Excellence / Support
    if (perceptionInsights.alignment > 90 && radarData.every(d => d.reality >= 4 || d.reality === 0)) {
      recommendations.push({ type: 'pro', libelle: 'Candidat potentiel pour tutorat / Mentorat', icon: <ShieldCheck size={14} /> });
    }

    return recommendations.slice(0, 3);
  }, [perceptionInsights, radarData, satData]);

  // --- Mastery Dashboard Logic ---
  const masteryData = useMemo(() => {
    const codes = store.competences ? Object.keys(store.competences) : ['RC1', 'RC2', 'RC3', 'RC4', 'RC5', 'RC6', 'RC7', 'RC8', 'RC9', 'RC10', 'RC11', 'RC12'];
    
    return codes.map(code => {
      // Find latest observation for this specific competency
      const visitsWithComp = activeTimeline.filter(v => v.scores && v.scores[code] !== null && v.scores[code] !== undefined);
      const latestVisit = visitsWithComp[0];
      const prevVisit = visitsWithComp[1];
      
      const latestObs = latestVisit ? parseFloat(latestVisit.scores[code]) : null;
      const prevObs = prevVisit ? parseFloat(prevVisit.scores[code]) : null;
      
      // Find latest autopos
      const latestAutoEntries = autoData.filter(a => a['Compétence'] === code).sort((a, b) => {
        const da = (a['Date'] || '').split('/').reverse().join('-');
        const db = (b['Date'] || '').split('/').reverse().join('-');
        return db.localeCompare(da);
      });
      const latestAutopos = latestAutoEntries.length ? parseFloat(latestAutoEntries[0]['Score (1-5)']) : null;

      let trend = 'stable';
      if (latestObs !== null && prevObs !== null) {
        if (latestObs > prevObs) trend = 'up';
        if (latestObs < prevObs) trend = 'down';
      }

      return {
        code,
        label: store.competences[code] || code,
        obs: latestObs,
        autopos: latestAutopos,
        trend,
        lastSeen: latestVisit ? latestVisit.date : null
      };
    });
  }, [activeTimeline, autoData, store.competences]);
  
  // Find sessions where the teacher is enrolled
  const enrolledSessions = useMemo(() => {
    if (!sessions) return [];
    return sessions.filter(s => s.inscrits && s.inscrits.includes(id));
  }, [sessions, id]);

  // Merge unique formations from evaluation data AND sessions
  const teacherFormations = useMemo(() => {
    const formationIds = new Set([
      ...satData.map(s => s['Formation']),
      ...acqData.map(a => a['Formation']),
      ...transData.map(t => t['Formation']),
      ...enrolledSessions.map(s => s['Formation'])
    ]);
    return Array.from(formationIds).filter(Boolean);
  }, [satData, acqData, transData, enrolledSessions]);

  const insights = useMemo(() => {
    const sorted = [...masteryData]
      .filter(m => m.obs !== null)
      .sort((a, b) => b.obs - a.obs);
    
    return {
      strengths: sorted.slice(0, 2),
      growth: sorted.reverse().slice(0, 2).filter(m => m.obs < 3.5)
    };
  }, [masteryData]);

  if (!ens) {
    return (
      <div className="p-8 text-center text-gray-400">
        Enseignant introuvable (ID : {id})
        <br />
        <Link to="/enseignants" className="text-[#2E75B6] hover:underline mt-2 block">← Retour à la liste</Link>
      </div>
    );
  }

  const exceptional = isExceptional(ens['Note dernière visite /20']);
  function handleSaveVisit(visitData) {
    store?.addVisit(id, visitData);
  }

  function handleSaveAutopos(scores) {
    store?.saveAutopositionnement(id, scores);
  }

  function handleDelete() {
    store?.deleteEnseignant(id);
    navigate('/enseignants');
  }

  const isPendingTitulaire = ens['Statut'] === 'Titulaire (en attente)';

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link to="/enseignants" className="inline-flex items-center gap-1.5 text-sm text-[#2E75B6] hover:underline">
          <ArrowLeft size={14} /> Retour à la liste
        </Link>
        {store && (
          <div className="flex items-center gap-2 flex-wrap">
            {store.resetEnseignantEdits && (
              <button
                onClick={() => store.resetEnseignantEdits(id)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5"
              >
                <RotateCcw size={12} /> Réinitialiser
              </button>
            )}
             <button
                onClick={() => setAutoposOpen(true)}
                className="flex items-center gap-1.5 text-sm bg-[#1F3864] text-white px-3 py-1.5 rounded-lg hover:bg-[#2E75B6] transition-colors"
              >
                <Star size={14} /> Auto-positionnement
              </button>
            {isPendingTitulaire && store.confirmTitularisation && (
              <button
                onClick={() => store.confirmTitularisation(id)}
                className="flex items-center gap-1.5 text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors shadow-sm animate-pulse"
              >
                <ShieldCheck size={14} /> Confirmer la titularisation
              </button>
            )}
            <button
              onClick={() => setVisitOpen(true)}
              className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus size={14} /> Enregistrer une visite
            </button>
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-sm bg-[#2E75B6] text-white px-3 py-1.5 rounded-lg hover:bg-[#1F3864] transition-colors"
            >
              <Pencil size={14} /> Modifier
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
              title="Supprimer définitivement (archiver)"
            >
              <Trash2 size={14} /> Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
        <div className="flex items-start gap-3 md:gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#1F3864] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
            {ens['Prénom']?.[0]}{ens['Nom']?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg md:text-xl font-bold text-[#1F3864]">{ens['Prénom']} {ens['Nom']}</h2>
              {exceptional && <ExceptionalBadge />}
              {ens.isOverridden && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                  <Shield size={10} /> Priorité absolue
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{ens['Nom du Lycée']} — {ens['Ville']}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <CircoBadge circo={ens['Circonscription']} />
              <StatutBadge value={ens['Statut']} />
              <PriorityGroupBadge group={ens.priorityGroup} />
              {ens.availabilityStatus !== 'available' && (
                <AvailabilityBadge status={ens.availabilityStatus} />
              )}
            </div>
          </div>

          {/* Priority score box */}
          <div className="hidden sm:block text-right flex-shrink-0">
            <p className="text-xs text-gray-400">
              {ens.priorityGroup === 'group-a' ? 'Score autopos. (estimé)' :
               ens.priorityGroup === 'group-b' ? 'Score Groupe B (§2.6)' :
               ens.priorityGroup === 'tenured' ? 'Score global (§2.7)' :
               ens.priorityGroup === 'override' ? 'Priorité manuelle' : 'Score'}
            </p>
            <p className="text-2xl font-bold text-[#2E75B6]">
              {ens.priorityGroup === 'override'
                ? '⭐'
                : (ens.scoreInfo?.rawUrgencyScore !== null && ens.scoreInfo?.rawUrgencyScore !== undefined 
                    ? parseFloat(ens.scoreInfo.rawUrgencyScore).toFixed(2) 
                    : '—')}
            </p>
            <p className="text-xs text-gray-400">Rang #{ens.priorityRank || '—'}</p>
            {ens.temporalObsScore !== null && ens.temporalObsScore !== undefined && (
              <p className="text-xs text-gray-400 mt-1">
                Score obs. temporel : <span className="font-semibold text-[#1F3864]">{ens.temporalObsScore.toFixed(2)}/5</span>
              </p>
            )}
          </div>
        </div>

        {/* Visit Info Details */}
        <div className="flex items-center gap-6 mt-2 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} />
            Dernière visite : <span className="font-semibold text-gray-600">{ens['Date dernière visite']}</span>
            {ens._isVisitEdited && (
              <span className="flex items-center gap-0.5 text-[8px] font-black text-[#2E75B6] bg-blue-50 px-1 py-0.5 rounded uppercase">
                <Pencil size={7} /> Modifié
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={12} />
            Observateur : <span className="font-semibold text-gray-600">{ens['Observateur']}</span>
          </div>
        </div>

        {/* Override info */}
        {ens.isOverridden && ens.overrideInfo && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-700 flex items-start gap-2">
            <Shield size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Priorité absolue activée</span> — {ens.overrideInfo.reason}
              {ens.overrideInfo.reasonText && ` : ${ens.overrideInfo.reasonText}`}
              <span className="ml-2 text-purple-400">
                {new Date(ens.overrideInfo.timestamp).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        )}

        {/* Pending Titularisation Alert */}
        {isPendingTitulaire && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg text-yellow-700">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-yellow-900">Titularisation recommandée (§2.7)</h4>
              <p className="text-xs text-yellow-800 mt-1">
                Une note officielle a été enregistrée pour ce stagiaire. Il est désormais éligible à la titularisation.
                Veuillez confirmer son nouveau statut pour débloquer le calcul multi-critères des titulaires.
              </p>
              <button 
                onClick={() => store.confirmTitularisation(id)}
                className="mt-2 text-xs font-bold text-yellow-900 hover:underline flex items-center gap-1"
              >
                Confirmer maintenant <ArrowRight size={10} />
              </button>
            </div>
          </div>
        )}

        {/* Group A warning */}
        {ens.priorityGroup === 'group-a' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            Score basé sur l'auto-évaluation uniquement — fiabilité limitée — visite à programmer.
          </div>
        )}

        {/* Info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-5 pt-4 md:pt-5 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Niveaux enseignés</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{ens['Niveaux']}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Ancienneté</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">
              {ens['Statut'] === 'Stagiaire'
                ? <span className="text-orange-500">Stagiaire</span>
                : ens['Ancienneté (ans)'] !== '—' ? `${ens['Ancienneté (ans)']} ans` : '—'
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">
              {ens['Statut'] === 'Stagiaire' ? "Visite d'accompagnement" : "Note dernière visite"}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className={`text-sm font-medium ${exceptional ? 'text-yellow-700' : 'text-gray-700'}`}>
                {ens['Statut'] === 'Stagiaire'
                  ? (ens['Date dernière visite'] !== '—' ? 'Réalisée' : 'Non réalisée')
                  : ens['Note dernière visite /20'] !== '—' ? `${ens['Note dernière visite /20']}/20` : '—'
                }
              </p>
              {ens._isVisitEdited && (
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" title="Donnée Synchronisée" />
              )}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400">Délai depuis visite</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className={`text-sm font-medium ${getDelaiClass(ens['Délai depuis visite (mois)'])}`}>
                {ens['Délai depuis visite (mois)'] !== '—' && ens['Délai depuis visite (mois)'] != null
                  ? `${ens['Délai depuis visite (mois)']} mois` : '—'}
                {parseInt(ens['Délai depuis visite (mois)']) > 72 && (
                  <span className="ml-1 text-xs text-red-600 block sm:inline">⚠ Urgent</span>
                )}
              </p>
              {ens._isVisitEdited && (
                 <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" title="Calcul Dynamique" />
              )}
            </div>
          </div>

          {/* Priority score on mobile */}
          <div className="sm:hidden col-span-2">
            <p className="text-xs text-gray-400">Score priorité</p>
            <p className="text-lg font-bold text-[#2E75B6] mt-0.5">
              {ens.priorityGroup === 'override' ? '⭐ Priorité manuelle'
                : ens.priorityGroup === 'tenured'
                  ? (ens.scoreInfo?.score !== null && ens.scoreInfo?.score !== undefined ? parseFloat(ens.scoreInfo.score).toFixed(2) : '—')
                  : (ens.priorityScore !== null ? parseFloat(ens.priorityScore).toFixed(2) : '—')}
            </p>
          </div>

          {ens.avgAutoposScore !== null && (
            <div>
              <p className="text-xs text-gray-400">Autopos. moyen (RC2+RC3+RC4)</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">
                <ScoreDisplay
                  score={ens.avgAutoposScore}
                  isEstimated={ens.priorityGroup === 'group-a'}
                />
              </p>
            </div>
          )}

          {ens.temporalObsScore !== null && (
            <div>
              <p className="text-xs text-gray-400">Score obs. temporel (§1.2)</p>
              <p className="text-sm font-medium text-[#1F3864] mt-0.5">
                {ens.temporalObsScore.toFixed(2)}/5
                <span className="text-xs text-gray-400 ml-1">({ens.visitCount} visite{ens.visitCount > 1 ? 's' : ''})</span>
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Modernized Reality vs Perception Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 overflow-hidden relative">
           {/* SVG Gradients for Radar */}
           <svg style={{ height: 0, width: 0, position: 'absolute' }}>
             <defs>
               <linearGradient id="realityGradient" x1="0" y1="0" x2="1" y2="1">
                 <stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/>
                 <stop offset="95%" stopColor="#059669" stopOpacity={0.2}/>
               </linearGradient>
               <linearGradient id="perceptionGradient" x1="0" y1="0" x2="1" y2="1">
                 <stop offset="5%" stopColor="#2E75B6" stopOpacity={0.4}/>
                 <stop offset="95%" stopColor="#1F3864" stopOpacity={0.1}/>
               </linearGradient>
             </defs>
           </svg>

           <div className="flex flex-col gap-6">
              {/* Radar Chart Section */}
              <div>
                <div className="flex flex-col mb-4">
                    <h3 className="text-sm font-black text-[#1F3864] uppercase tracking-wider">Réalité vs Perception</h3>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tight">Analyse des écarts en temps réel</p>
                </div>

                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="#cbd5e1" strokeWidth={1} />
                      <PolarAngleAxis 
                        dataKey="competence" 
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white/95 backdrop-blur-md border border-gray-100 shadow-xl rounded-xl p-3 animate-in fade-in zoom-in duration-200">
                               <p className="text-[10px] font-black text-gray-500 uppercase mb-2 tracking-widest">{d.libelle}</p>
                               <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-4">
                                     <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Réel</span>
                                     <span className="text-xs font-black text-emerald-700">{d.reality}/5</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                     <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Auto</span>
                                     <span className="text-xs font-black text-blue-700">{d.perception}/5</span>
                                  </div>
                               </div>
                            </div>
                          );
                        }}
                      />
                      <Radar 
                        name="Réalité" 
                        dataKey="reality" 
                        stroke="#10b981" 
                        strokeWidth={2.5} 
                        fill="url(#realityGradient)" 
                        fillOpacity={1}
                      />
                      <Radar 
                        name="Perception" 
                        dataKey="perception" 
                        stroke="#2E75B6" 
                        strokeWidth={1.5} 
                        strokeDasharray="3 3"
                        fill="url(#perceptionGradient)" 
                        fillOpacity={1}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Legend Summary */}
              <div className="flex items-center justify-center gap-6 pb-2 border-b border-gray-50">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500 shadow-sm"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Observation Réelle</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500 shadow-sm opacity-50"></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Autopositionnement</span>
                </div>
              </div>

              {/* Insights Section (Compact) */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                 {perceptionInsights ? (
                    <>
                       <div className="bg-gray-50 rounded-xl p-3 border border-gray-100/50">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-tight mb-0.5">Alignement</p>
                          <p className="text-xl font-black text-[#1F3864] tracking-tighter">{perceptionInsights.alignment}%</p>
                       </div>
                       
                       <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100/30 flex items-center gap-2">
                           <TrendingUp size={16} className="text-emerald-500 shrink-0" />
                           <p className="text-[10px] font-bold text-emerald-800 leading-tight">
                              {perceptionInsights.growthSurprise.length > 0 ? 'Potentiel inexploité détecté' : 'Profil cohérent'}
                           </p>
                       </div>
                    </>
                 ) : (
                    <div className="col-span-2 py-4 text-center">
                        <p className="text-[10px] text-gray-300 uppercase font-black">Analyse en attente de données</p>
                    </div>
                 )}
              </div>

              {/* NEW: Plan d'Accompagnement Pédagogique (PAP) */}
              <div className="bg-[#1F3864]/5 rounded-2xl p-4 border border-[#1F3864]/10">
                 <h4 className="text-[10px] font-black text-[#1F3864] uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Zap size={12} className="text-[#2E75B6]" /> Plan d'Accompagnement (PAP)
                 </h4>
                 <div className="space-y-2.5">
                    {pedagogicalDiagnostic && pedagogicalDiagnostic.length > 0 ? (
                       pedagogicalDiagnostic.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3 group/rec">
                             <div className={`mt-0.5 p-1.5 rounded-lg transition-colors ${
                                rec.type === 'formation' ? 'bg-blue-100 text-blue-600' : 
                                rec.type === 'coaching' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                             }`}>
                                {rec.icon}
                             </div>
                             <p className="text-[11px] font-bold text-gray-700 leading-snug group-hover/rec:text-[#1F3864] transition-colors pt-0.5">
                                {rec.libelle}
                             </p>
                          </div>
                       ))
                    ) : (
                       <p className="text-[10px] text-gray-400 italic">Générez une visite officielle pour activer le plan d'action.</p>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* Modernized Mastery Dashboard */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-[#1F3864]">Maîtrise des Compétences (Observations)</h3>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mt-0.5">Performance terrain vs. Auto-positionnement</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-[#2E75B6]"></div>
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Observé</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                 <span className="text-[10px] text-gray-400 font-bold uppercase">Autopos.</span>
               </div>
            </div>
          </div>

          {/* Actionable Insights Bar */}
          {(insights.strengths.length > 0 || insights.growth.length > 0) && (
            <div className="flex flex-col md:flex-row gap-3 mb-6">
               {insights.strengths.length > 0 && (
                 <div className="flex-1 bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                   <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                     <Zap size={16} />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-emerald-800 uppercase">Points Forts</p>
                     <p className="text-xs text-emerald-700 mt-1">
                       Excellente maîtrise sur <span className="font-bold">{insights.strengths.map(s => s.code).join(' & ')}</span>
                     </p>
                   </div>
                 </div>
               )}
               {insights.growth.length > 0 && (
                 <div className="flex-1 bg-amber-50/50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
                   <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                     <Target size={16} />
                   </div>
                   <div>
                     <p className="text-[10px] font-bold text-amber-800 uppercase">Axe de Progrès</p>
                     <p className="text-xs text-amber-700 mt-1">
                       Focus recommandé sur <span className="font-bold">{insights.growth.map(s => s.code).join(' & ')}</span>
                     </p>
                   </div>
                 </div>
               )}
            </div>
          )}

          {unifiedTimeline.filter(v => !v.deleted).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Brain className="text-gray-300 mb-2" size={32} />
              <p className="text-sm text-gray-400 italic">Aucune donnée d'observation pour générer le profil</p>
              <button onClick={() => setVisitOpen(true)} className="text-[#2E75B6] text-xs font-bold mt-2 hover:underline">Programmer une visite</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {masteryData.map((m) => (
                <div key={m.code} className="group flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[10px] font-bold text-[#1F3864] border border-gray-100 flex-shrink-0">
                        {m.code}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#1F3864] truncate">{m.label}</p>
                        <p className="text-[10px] text-gray-400">
                          {m.lastSeen ? `Dernière obs: ${m.lastSeen}` : 'Jamais observé'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                       <div className="text-right">
                         <div className="flex items-center gap-1 justify-end">
                            {m.trend === 'up' && <TrendingUp size={10} className="text-emerald-500" />}
                            {m.trend === 'down' && <TrendingDown size={10} className="text-red-500" />}
                            {m.trend === 'stable' && <Minus size={10} className="text-gray-300" />}
                            <span className="text-xs font-bold text-[#1F3864]">{m.obs ? `${m.obs.toFixed(1)}/5` : '—'}</span>
                         </div>
                         {m.autopos !== null && (
                           <p className="text-[9px] text-gray-400 font-medium">Autopos: {m.autopos.toFixed(1)}/5</p>
                         )}
                       </div>
                    </div>
                  </div>

                  {/* Multi-source progress bar */}
                  <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    {/* Autopos background bar */}
                    {m.autopos !== null && (
                      <div 
                        className="absolute h-full bg-gray-200 rounded-full transition-all duration-700 delay-100" 
                        style={{ width: `${(m.autopos / 5) * 100}%` }}
                      ></div>
                    )}
                    {/* Observed primary bar */}
                    <div 
                      className={`absolute h-full rounded-full transition-all duration-1000 ease-out z-10 ${
                        m.obs >= 4 ? 'bg-[#2E75B6]' : m.obs >= 3 ? 'bg-blue-400' : 'bg-amber-400'
                      }`} 
                      style={{ width: m.obs ? `${(m.obs / 5) * 100}%` : '0%' }}
                    ></div>
                    
                    {/* Gap highlight (if Obs << Autopos) */}
                    {m.obs !== null && m.autopos !== null && (m.autopos - m.obs) > 0.8 && (
                       <div className="absolute top-0 right-0 h-full w-1 bg-red-400/50 blur-[1px] z-20" style={{ left: `${(m.obs / 5) * 100}%`, width: `${((m.autopos - m.obs) / 5) * 100}%` }}></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Unified Visit Timeline — new visits store + legacy history (§1.1 / §1.2) */}
      {(activeTimeline.length > 0 || deletedTimeline.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="text-emerald-600" size={20} />
              <h3 className="text-sm font-semibold text-[#1F3864]">
                Historique des visites ({activeTimeline.length}) — Score temporel §1.2
              </h3>
            </div>
            {ens.temporalObsScore !== null && ens.temporalObsScore !== undefined && (
              <div className="text-right">
                <p className="text-xs text-gray-400">Score temporel pondéré</p>
                <p className="text-xl font-bold text-emerald-600">{ens.temporalObsScore.toFixed(2)}/5</p>
              </div>
            )}
          </div>

          {activeTimeline.length === 0 && (
            <p className="text-sm text-gray-400 italic">Aucune visite active enregistrée.</p>
          )}

          <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-emerald-100 before:via-emerald-50 before:to-transparent">
            {activeTimeline.map((visit, idx) => (
              <div key={visit.id || idx} className="relative flex items-start gap-6 group">
                <div className={`absolute left-5 -translate-x-1/2 mt-1.5 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10 ${
                  visit._source === 'legacy' ? 'bg-gray-400' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 bg-gray-50/50 rounded-xl p-4 border border-gray-100/50 hover:bg-white hover:shadow-md transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-[#1F3864]">{visit.date}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-sm ${
                        visit.visitType === 'official' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {visit.visitType === 'official' ? 'Officielle' : 'Informelle'}
                      </span>
                      {visit._source === 'legacy' && (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          Historique
                        </span>
                      )}
                      {idx === 0 && visit._source !== 'legacy' && (
                        <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                          Coeff. ×1.0 (plus récente)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {visit.note20 !== null && visit.note20 !== undefined && (
                        <span className={`text-sm font-bold ${visit.exceptional ? 'text-yellow-700' : 'text-gray-700'}`}>
                          {visit.exceptional && '⭐ '}{visit.note20}/20
                        </span>
                      )}
                      {visit.visitScore !== null && visit.visitScore !== undefined && (
                        <span className="font-bold text-emerald-600 bg-white px-2 py-1 rounded-lg border border-emerald-100 text-sm">
                          {visit.visitScore}/5
                          {visit.partial && <span className="text-xs text-orange-400 ml-1">*</span>}
                        </span>
                      )}
                      
                      {/* Finalization Badge */}
                      {visit.finalized && (
                         <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-[10px] font-black text-white shadow-sm border border-emerald-400 uppercase tracking-widest animate-in fade-in zoom-in duration-300">
                            <ShieldCheck size={12} fill="white" className="text-emerald-500" /> Confirmé
                         </span>
                      )}

                      {/* Action buttons (only for new-store visits) */}
                      {visit._source === 'new' && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button
                             onClick={() => setEditingVisit(visit)}
                             className="p-1.5 rounded-lg text-gray-400 hover:text-[#2E75B6] hover:bg-blue-50 transition-colors"
                             title={visit.finalized ? "Consulter le rapport scellé" : "Modifier la visite"}
                           >
                             <Pencil size={14} />
                           </button>

                           {!visit.finalized && store?.deleteVisit && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`Archiver la visite du ${visit.date} ?\nElle restera consultable dans "Visites archivées" et pourra être restaurée.`)) {
                                    store.deleteVisit(id, visit.id, 'Archivé manuellement');
                                  }
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                title="Archiver cette visite"
                              >
                                <Trash2 size={14} />
                              </button>
                           )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    <span className="font-medium">Observateur :</span> {visit.observer}
                  </p>

                  {/* Per-competency scores */}
                  {visit.scores && Object.values(visit.scores).some(v => v !== null) && (
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 mb-2">
                      {Object.keys(visit.scores).map(c => (
                        <div key={c} className="text-center">
                          <p className="text-[10px] text-gray-400">{c}</p>
                          <p className={`text-sm font-semibold ${
                            visit.scores[c] === null ? 'text-gray-300' : 'text-[#1F3864]'
                          }`}>
                            {visit.scores[c] ?? '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {visit.appreciation && (
                    <div className="relative mt-2 pl-4 border-l-2 border-emerald-200 py-1 italic text-sm text-gray-600 bg-white/50 rounded-r-lg">
                      <Quote className="absolute -top-2 -left-3 text-emerald-100" size={16} />
                      <p className="whitespace-pre-wrap">{visit.appreciation}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Archived (soft-deleted) visits section */}
          {deletedTimeline.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowDeleted(p => !p)}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showDeleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Visites archivées ({deletedTimeline.length})
              </button>
              {showDeleted && (
                <div className="space-y-3 mt-3">
                  {deletedTimeline.map((visit, idx) => (
                    <div key={visit.id || idx} className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 opacity-60">
                      <div>
                        <span className="text-sm font-medium text-gray-500">{visit.date}</span>
                        {visit.observer && (
                          <span className="text-xs text-gray-400 ml-2">— {visit.observer}</span>
                        )}
                        {visit.note20 !== null && visit.note20 !== undefined && (
                          <span className="text-xs text-gray-400 ml-2">{visit.note20}/20</span>
                        )}
                        {visit.visitScore !== null && visit.visitScore !== undefined && (
                          <span className="text-xs text-gray-400 ml-2">{visit.visitScore}/5</span>
                        )}
                        {visit.deleteReason && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{visit.deleteReason}</p>
                        )}
                      </div>
                      {store?.restoreVisit && (
                        <button
                          onClick={() => store.restoreVisit(id, visit.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex-shrink-0"
                          title="Restaurer cette visite"
                        >
                          <ArchiveRestore size={12} /> Restaurer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}



      {/* Formations results section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Résultats par formation</h3>
        {teacherFormations.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 bg-gray-50/50 rounded-[20px] border border-dashed border-gray-100">
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400">Aucune formation enregistrée</p>
              <p className="text-[10px] text-gray-300 px-6">L'historique apparaîtra automatiquement dès que l'enseignant sera inscrit à une session.</p>
            </div>
          </div>
        ) : teacherFormations.map(f => {
          const sat = satData.find(s => s['Formation'] === f);
          const acq = acqData.find(a => a['Formation'] === f);
          const trans = transData.find(t => t['Formation'] === f);
          const session = enrolledSessions.find(s => s['Formation'] === f);
          
          return (
            <div key={f} className={`bg-white rounded-xl border shadow-sm p-4 group relative overflow-hidden ${(!sat && !acq && !trans) ? 'border-dashed border-blue-200' : 'border-gray-100'}`}>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <FormationBadge formation={f} />
                  {acq ? (
                    <span className="text-xs text-gray-400">{acq['Date formation']}</span>
                  ) : session ? (
                    <span className="text-xs text-blue-500 font-semibold flex items-center gap-1">
                      <Calendar size={12} /> {session['Date (Samedi)']} ({session['Statut']})
                    </span>
                  ) : null}
                  {(sat?._isEdited || acq?._isEdited || trans?._isEdited) && (
                    <span className="flex items-center gap-1 text-[9px] font-black text-[#2E75B6] bg-blue-50 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                       <Pencil size={8} /> Modifié
                    </span>
                  )}
                  {!sat && !acq && !trans && session && (
                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                      Évaluation en attente
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setKpFormation(f);
                    setKpOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#2E75B6] hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                >
                  <Pencil size={12} /> {(!sat && !acq && !trans) ? 'Commencer l\'évaluation' : 'Évaluer Kirkpatrick'}
                </button>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                {/* N1 Satisfaction */}
                <div className="p-2 rounded-lg bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Satisfaction N1</p>
                  {sat?.missing ? (
                    <p className="text-sm text-orange-500 italic mt-0.5">Données indisponibles</p>
                  ) : sat ? (
                    <p className={`text-lg font-bold mt-0.5 ${getSatisfactionClass(sat['Score global /5'])}`}>
                      {sat['Score global /5']}/5
                    </p>
                  ) : <p className="text-sm text-gray-300 mt-0.5">—</p>}
                </div>

                {/* N2 Progression */}
                {acq ? (
                  <>
                    <div className="p-2 rounded-lg bg-gray-50/50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Progression N2</p>
                      {acq.missing ? (
                        <p className="text-xs text-orange-500 italic mt-0.5" title={acq.missingReason}>
                          Indisponibles {acq.missingReason ? `(${acq.missingReason})` : ''}
                        </p>
                      ) : (
                        <>
                          <p className={`text-lg font-bold mt-0.5 ${getProgressionClass(acq['Delta progression'])}`}>
                            {acq['Delta progression'] !== undefined ? `+${acq['Delta progression']}/5` : '—'}
                          </p>
                          <p className="text-[10px] text-gray-400">({acq['Pré-test /5'] ?? '—'} → {acq['Post-test /5'] ?? '—'})</p>
                        </>
                      )}
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50/50">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Objectifs / OT</p>
                      <p className={`text-sm font-bold mt-0.5 ${(acq?.['OT atteint'] === 'Oui' || trans?.['OT atteint'] === 'Oui') ? 'text-green-700' : 'text-red-600'}`}>
                        {(acq?.['OT atteint'] === 'Oui' || trans?.['OT atteint'] === 'Oui') ? '✓ Atteint' : '✗ Non atteint'}
                      </p>
                      {(acq?.['Objectifs atteints /5'] || trans?.['Objectifs atteints /5']) && (
                        <p className="text-xs text-[#2E75B6] font-medium mt-0.5">{acq?.['Objectifs atteints /5'] || trans?.['Objectifs atteints /5']}/5 global</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-2 rounded-lg bg-gray-50/50">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">N2 / N3</p>
                    <p className="text-sm text-gray-300 mt-0.5">Non évalué</p>
                  </div>
                )}

                {/* N3 Adoption/Transfert Recap */}
                <div className="p-2 rounded-lg bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Transfert N3</p>
                  {trans ? (
                    <p className={`text-sm font-bold mt-0.5 ${getTransfertStatutClass(trans['Statut'])}`}>
                      {trans['Statut']} ({trans._isEdited ? (trans['Score transfert /5'] ? trans['Score transfert /5'] + '/5' : '—') : (trans['% réalisation'] || trans['Score transfert /5'] + '/5')})
                    </p>
                  ) : <p className="text-sm text-gray-300 mt-0.5">—</p>}
                </div>
              </div>

              {/* N3 Level Details */}
              {trans && (
                <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Détails du transfert</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">Source :</span>
                      <span className="font-semibold text-[#1F3864] bg-blue-50 px-1.5 py-0.5 rounded italic">
                        {trans['Méthode post-éval'] || 'Observation direct'}
                      </span>
                    </div>
                    {trans['Adoption /5'] && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Adoption :</span>
                        <span className="font-bold text-[#1F3864]">{trans['Adoption /5']}/5</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 mt-1 md:mt-0">
                    {trans['Soutien'] && (
                      <div className="flex gap-1.5 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                        <p className="text-xs text-gray-600 italic"><span className="font-bold not-italic text-blue-700">Soutien :</span> {trans['Soutien']}</p>
                      </div>
                    )}
                    {trans['Ressources'] && (
                      <div className="flex gap-1.5 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
                        <p className="text-xs text-gray-600 italic"><span className="font-bold not-italic text-emerald-700">Ressources :</span> {trans['Ressources']}</p>
                      </div>
                    )}
                    {trans['Freins'] && (
                      <div className="flex gap-1.5 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1 shrink-0" />
                        <p className="text-xs text-gray-600 italic"><span className="font-bold not-italic text-orange-700">Barrières :</span> {trans['Freins']}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EnseignantEditModal
          enseignant={ens}
          formations={store.formations}
          crefocs={store.crefocs}
          visits={store.visits}
          isNew={false}
          onSave={(changes) => store.updateEnseignant(id, changes)}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Autopos modal */}
      {autoposOpen && (
        <AutoposModal
          enseignant={ens}
          competences={store.competences}
          history={store.autoposManual[id] || []}
          onSave={handleSaveAutopos}
          onDelete={(entryId) => store.deleteAutopositionnement(id, entryId)}
          onClose={() => setAutoposOpen(false)}
        />
      )}

      {/* Visit recording modal */}
      {visitOpen && (
        <VisitModal
          enseignant={ens}
          competences={store.competences}
          onSave={handleSaveVisit}
          onClose={() => setVisitOpen(false)}
          addCompetence={store.addCompetence}
        />
      )}

      {editingVisit && (
        <VisitModal
          enseignant={ens}
          competences={store.competences}
          existingVisit={editingVisit}
          onSave={(updatedData) => store.updateVisit(id, editingVisit.id, updatedData)}
          onClose={() => setEditingVisit(null)}
          addCompetence={null}
        />
      )}

      {/* Kirkpatrick Modal */}
      {kpOpen && (
        <KirkpatrickModal
          enseignant={ens}
          formationId={kpFormation}
          existingData={{
            N1: satData.find(s => s['Formation'] === kpFormation),
            N2: acqData.find(a => a['Formation'] === kpFormation),
            N3: transData.find(t => t['Formation'] === kpFormation)
          }}
          onSave={(payload) => {
            if (payload.N1) store.updateKirkpatrick(id, kpFormation, 'N1', payload.N1);
            if (payload.N2) store.updateKirkpatrick(id, kpFormation, 'N2', payload.N2);
            if (payload.N3) store.updateKirkpatrick(id, kpFormation, 'N3', payload.N3);
          }}
          onClose={() => {
            setKpOpen(false);
            setKpFormation(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-red-100">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#1F3864] mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer <strong>{ens['Prénom']} {ens['Nom']}</strong> ?
              <br />
              <span className="text-red-500 text-xs mt-2 block">
                ⚠ Il sera retiré de toutes les listes de priorité. Cette action est réversible via l'archive dans les paramètres.
              </span>
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleDelete} 
                className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-sm shadow-red-200 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
