import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Smile, TrendingUp, Target, Repeat, Pencil, MapPin,
  Calendar, Users, Sparkles, AlertCircle
} from 'lucide-react';
import { FormationBadge, CircoBadge } from '../../ui/Badge';
import { ProgressBar } from '../../ui/Gauge';
import { FORMATIONS as FORMATIONS_DEFAULT } from '../../../constants/formations';
import { COLORS, CIRCO_COLORS, FORMATION_COLORS } from '../../../constants/colors';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { parseDate, formatDate } from '../../../utils/dateUtils';
import { analyzeVenueReadiness } from '../../../utils/formationMatcher';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

const SAT_DIMS = [
  { key: 'Q1 Pertinence obj.',    label: 'Pertinence obj.' },
  { key: 'Q2 Qualité anim.',      label: 'Animation' },
  { key: 'Q3 Adéquation méth.',   label: 'Méthodes' },
  { key: 'Q4 Qualité supports',   label: 'Supports' },
  { key: 'Q5 Applicabilité',      label: 'Applicabilité' },
  { key: 'Q6 Organisation',       label: 'Organisation' },
  { key: 'Q7 Satisfaction glob.', label: 'Satisfaction' },
];

function PremiumKPI({ icon, title, value, subtitle, color, badge }) {
  const Icon = icon;
  return (
    <div className="relative bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5 overflow-hidden hover:shadow-2xl transition-shadow duration-500">
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl -translate-y-8 translate-x-8"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</p>
          <p className="text-3xl font-black mt-1 tracking-tight" style={{ color }}>{value}</p>
          {subtitle && <p className="text-[11px] text-gray-500 mt-1 font-medium truncate">{subtitle}</p>}
        </div>
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          <Icon size={20} />
        </div>
      </div>
      {badge && (
        <div className="mt-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#2E75B6] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
          <Pencil size={8} /> {badge}
        </div>
      )}
    </div>
  );
}

export function DashboardFormation({ formation, data, store }) {
  const { satisfaction, acquis, transfert, sessions } = data;

  // §5 of handover — dynamic formation config sourced from the reactive store
  const formDef = store?.formations?.[formation] || FORMATIONS_DEFAULT[formation];
  const color = formDef?.color || FORMATION_COLORS[formation] || COLORS.blue;
  const { isMobile, chartH } = useBreakpoint();

  const crefocKeys = useMemo(
    () => Object.keys(store?.crefocs || {}),
    [store?.crefocs]
  );

  // ─── Filtered Kirkpatrick data (already merged with admin overrides) ──────
  const satAll        = useMemo(() => satisfaction.filter(s => s['Formation'] === formation), [satisfaction, formation]);
  const acqAll        = useMemo(() => acquis.filter(a => a['Formation'] === formation), [acquis, formation]);
  const trAll         = useMemo(() => transfert.filter(t => t['Formation'] === formation), [transfert, formation]);

  const satFiltered   = useMemo(() => satAll.filter(s => !s.missing), [satAll]);
  const acqFiltered   = useMemo(() => acqAll.filter(a => !a.missing), [acqAll]);
  const transFiltered = useMemo(() => trAll.filter(t => !t.missing), [trAll]);

  // ─── _isEdited counts (visibility of admin overrides) ─────────────────────
  const editedCounts = useMemo(() => ({
    n1: satAll.filter(s => s._isEdited).length,
    n2: acqAll.filter(a => a._isEdited).length,
    n3: trAll.filter(t => t._isEdited).length,
  }), [satAll, acqAll, trAll]);

  // ─── KPI computations ─────────────────────────────────────────────────────
  const avgSat = satFiltered.length
    ? (satFiltered.reduce((s, x) => s + (parseFloat(x['Score global /5']) || 0), 0) / satFiltered.length).toFixed(2)
    : '—';
  const avgProg = acqFiltered.length
    ? (acqFiltered.reduce((s, a) => s + (parseFloat(a['Delta progression']) || 0), 0) / acqFiltered.length).toFixed(2)
    : '—';
  const otRate = acqFiltered.length
    ? Math.round(acqFiltered.filter(a => a['OT atteint'] === 'Oui').length / acqFiltered.length * 100)
    : 0;
  const transfertEffectif = transFiltered.length
    ? Math.round(transFiltered.filter(t => t['Statut'] === 'Effectif').length / transFiltered.length * 100)
    : 0;

  // ─── Radar: 7 satisfaction dimensions ─────────────────────────────────────
  const radarData = useMemo(() => SAT_DIMS.map(dim => ({
    dimension: dim.label,
    score: satFiltered.length
      ? parseFloat((satFiltered.reduce((s, x) => s + (parseFloat(x[dim.key]) || 0), 0) / satFiltered.length).toFixed(2))
      : 0,
  })), [satFiltered]);

  // ─── Objectifs atteints — config pulled from store (editable) ─────────────
  const opps = useMemo(() => formDef?.objectifs || [], [formDef]);
  const oppData = useMemo(() => opps.map(op => {
    const atteints = acqFiltered.filter(a => a[`${op.id} atteint?`] === 'Oui').length;
    const taux = acqFiltered.length ? Math.round(atteints / acqFiltered.length * 100) : 0;
    const shortLabel = (op.libelle || op.id).replace(/F\d-OBJ\d — /, '');
    return { op: op.id, libelle: shortLabel, taux };
  }), [opps, acqFiltered]);

  // ─── Satisfaction par circo — circos driven by store.crefocs ──────────────
  const satByCirco = useMemo(() => crefocKeys.map(c => {
    const d = satFiltered.filter(s => s['Circo'] === c);
    const avg = d.length
      ? parseFloat((d.reduce((s, x) => s + (parseFloat(x['Score global /5']) || 0), 0) / d.length).toFixed(2))
      : 0;
    return { circo: c, score: avg, count: d.length };
  }), [satFiltered, crefocKeys]);

  // ─── Progression bins (N2) ────────────────────────────────────────────────
  const progBins = useMemo(() => [
    { range: '< 0.5',   count: acqFiltered.filter(a => parseFloat(a['Delta progression']) < 0.5).length },
    { range: '0.5–1.0', count: acqFiltered.filter(a => { const d = parseFloat(a['Delta progression']); return d >= 0.5 && d < 1.0; }).length },
    { range: '1.0–1.5', count: acqFiltered.filter(a => { const d = parseFloat(a['Delta progression']); return d >= 1.0 && d < 1.5; }).length },
    { range: '1.5–2.0', count: acqFiltered.filter(a => { const d = parseFloat(a['Delta progression']); return d >= 1.5 && d < 2.0; }).length },
    { range: '≥ 2.0',   count: acqFiltered.filter(a => parseFloat(a['Delta progression']) >= 2.0).length },
  ], [acqFiltered]);

  // ─── Dynamic formation sessions + venue readiness ─────────────────────────
  const formationSessions = useMemo(
    () => (sessions || []).filter(s => s['Formation'] === formation),
    [sessions, formation]
  );

  const sessionsByCirco = useMemo(() => {
    const now = new Date();
    return crefocKeys.map(circo => {
      const circoSessions = formationSessions.filter(s => s['Circonscription'] === circo);
      const next = circoSessions
        .filter(s => {
          const d = parseDate(s['Date (Samedi)']);
          return d && d >= now;
        })
        .sort((a, b) => (parseDate(a['Date (Samedi)']) || 0) - (parseDate(b['Date (Samedi)']) || 0))[0]
        || circoSessions.sort((a, b) => (parseDate(b['Date (Samedi)']) || 0) - (parseDate(a['Date (Samedi)']) || 0))[0];

      const crefoc = store?.crefocs?.[circo];
      const readiness = crefoc ? analyzeVenueReadiness(formDef, crefoc) : null;
      const inscrits = next ? (next['inscrits']?.length ?? next['Nb inscrits'] ?? 0) : 0;
      const capacity = crefoc?.places || 20;

      return { circo, next, readiness, inscrits, capacity };
    });
  }, [formationSessions, crefocKeys, store?.crefocs, formDef]);

  const radarFontSize = isMobile ? 9 : 10;

  if (!formDef) {
    return (
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-8 text-center">
        <AlertCircle className="mx-auto text-amber-500 mb-3" size={32} />
        <p className="text-sm font-black text-[#1F3864]">Formation introuvable</p>
        <p className="text-xs text-gray-500 mt-1">
          La configuration pour « {formation} » n'existe pas dans le store.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <FormationBadge formation={formation} />
        <span className="text-sm text-gray-500 font-medium">{formDef?.trimestre}</span>
        {formDef?.competence && (
          <span className="text-xs text-gray-400 font-medium">· {formDef.competence}</span>
        )}
        {(editedCounts.n1 + editedCounts.n2 + editedCounts.n3) > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] font-black text-[#2E75B6] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 uppercase tracking-widest">
            <Pencil size={9} /> {editedCounts.n1 + editedCounts.n2 + editedCounts.n3} override(s) admin
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumKPI
          icon={Smile}
          title="Satisfaction N1"
          value={`${avgSat}/5`}
          color={color}
          subtitle={`${satFiltered.length}/${satAll.length} éval. exploitables`}
          badge={editedCounts.n1 > 0 ? `${editedCounts.n1} modifié(s)` : null}
        />
        <PremiumKPI
          icon={TrendingUp}
          title="Progression N2"
          value={avgProg === '—' ? '—' : `+${avgProg}/5`}
          color={color}
          subtitle={`Basé sur ${acqFiltered.length} pré/post tests`}
          badge={editedCounts.n2 > 0 ? `${editedCounts.n2} modifié(s)` : null}
        />
        <PremiumKPI
          icon={Target}
          title="Objectifs atteints"
          value={`${otRate}%`}
          color={color}
          subtitle="Taux de réussite OT"
        />
        <PremiumKPI
          icon={Repeat}
          title="Transfert N3"
          value={`${transfertEffectif}%`}
          color={color}
          subtitle="PAP validés en classe"
          badge={editedCounts.n3 > 0 ? `${editedCounts.n3} modifié(s)` : null}
        />
      </div>

      {/* Sessions + venue readiness per circo */}
      {crefocKeys.length > 0 && (
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={12} /> Sessions {formation} · Venue Readiness
            </h3>
            <Link
              to="/sessions"
              className="text-[10px] font-black uppercase tracking-widest text-[#2E75B6] hover:underline"
            >
              Planifier →
            </Link>
          </div>
          <div className={`grid grid-cols-1 ${crefocKeys.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
            {sessionsByCirco.map(({ circo, next, readiness, inscrits, capacity }) => (
              <div key={circo} className="bg-white/50 rounded-2xl border border-gray-100/70 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CircoBadge circo={circo} />
                  {readiness && (
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                        readiness.canHost ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}
                      title={`Venue readiness — ${readiness.score}%`}
                    >
                      {readiness.score}% {readiness.canHost ? 'CONFORME' : 'ALERTE'}
                    </span>
                  )}
                </div>
                {next ? (
                  <>
                    <p className="text-[11px] font-bold text-[#1F3864] line-clamp-1">
                      {next['Titre formation'] || formDef.libelle}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-500">
                      <Calendar size={10} /> {formatDate(next['Date (Samedi)'])}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10px] text-gray-500 truncate">
                      <MapPin size={10} /> <span className="truncate">{next['Lieu']}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold">
                      <Users size={10} className="text-gray-400" />
                      <span className={inscrits > capacity ? 'text-red-500' : 'text-[#1F3864]'}>
                        {inscrits}
                      </span>
                      <span className="text-gray-300">/ {capacity}</span>
                      {inscrits === 0 && <Sparkles size={10} className="text-amber-400 ml-1" />}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">Aucune session planifiée</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Radar satisfaction */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex justify-between items-center">
            Satisfaction N1 — Dimensions
            <span className="text-[#2E75B6] normal-case tracking-normal text-[10px]">
              {satFiltered.length} réponses
            </span>
          </h3>
          {satFiltered.length === 0 ? (
            <p className="text-sm text-gray-400 py-16 text-center">Aucune donnée N1 disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={chartH(260, 220)}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: radarFontSize, fontWeight: 'bold', fill: '#64748B' }} />
                <Radar name="Score" dataKey="score" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={3} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(v) => [`${v}/5`, 'Moyenne']}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* OPP */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
            Performance par objectifs pédagogiques
          </h3>
          {opps.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">
              Aucun objectif configuré pour cette formation.
              <br />
              <Link to="/parametres" className="text-[#2E75B6] hover:underline text-xs font-semibold">
                Configurer dans Paramètres →
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {oppData.map(opp => (
                <ProgressBar
                  key={opp.op}
                  value={opp.taux}
                  max={100}
                  color={opp.taux >= 70 ? color : opp.taux >= 40 ? '#D97706' : COLORS.red}
                  label={opp.libelle}
                  showValue
                />
              ))}
            </div>
          )}
        </div>

        {/* Satisfaction par circo */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
            Satisfaction par circonscription
          </h3>
          {satByCirco.every(c => c.count === 0) ? (
            <p className="text-sm text-gray-400 py-10 text-center">Aucune évaluation N1 enregistrée</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={chartH(200, 180)}>
                <BarChart data={satByCirco} margin={{ top: 0, right: 8, bottom: 0, left: isMobile ? -25 : -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="circo" tick={{ fontSize: isMobile ? 11 : 12, fontWeight: 'bold' }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(v, _n, p) => [`${v}/5 (${p.payload.count} réponses)`, 'Moyenne N1']}
                  />
                  <Bar dataKey="score" name="N1 Moyenne" radius={[8, 8, 0, 0]} barSize={40}>
                    {satByCirco.map(entry => (
                      <Cell key={entry.circo} fill={CIRCO_COLORS[entry.circo] || color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 flex flex-wrap gap-1.5 justify-center text-[10px] font-medium text-gray-500">
                {satByCirco.map(c => (
                  <span key={c.circo} className="px-2 py-0.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="font-black" style={{ color: CIRCO_COLORS[c.circo] || '#6B7280' }}>{c.circo}</span>
                    <span className="mx-1 text-gray-300">·</span>
                    <span>{c.count} rép.</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Distribution des gains */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-6">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
            Distribution des gains N2
          </h3>
          {acqFiltered.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">Aucun pré/post test exploitable</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={chartH(200, 180)}>
                <BarChart data={progBins} margin={{ top: 0, right: 8, bottom: 0, left: isMobile ? -25 : -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="range" tick={{ fontSize: isMobile ? 10 : 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" name="Effectif" fill={color} radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  Cible institutionnelle : +1.5 pts
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
