import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Flame, Smile, Repeat, Calendar, MapPin, Pencil,
  Star, ShieldAlert, Clock, Activity, TrendingUp, BarChart3
} from 'lucide-react';
import { ProgressBar } from '../../ui/Gauge';
import { CircoBadge, FormationBadge, PriorityGroupBadge } from '../../ui/Badge';
import { PriorityIcon } from '../../ui/AlertBadge';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { COLORS, CIRCO_COLORS, FORMATION_COLORS } from '../../../constants/colors';
import { parseDate, formatDate } from '../../../utils/dateUtils';

const GROUP_META = {
  override:    { label: 'Priorité absolue', color: '#7C3AED' },
  'group-a':   { label: 'Groupe A — Stagiaires non visités', color: COLORS.red },
  'group-b':   { label: 'Groupe B — Stagiaires visités', color: COLORS.orange },
  tenured:     { label: 'Titulaires', color: COLORS.blue },
  unavailable: { label: 'Indisponibles', color: '#9CA3AF' },
};

function StatPill({ icon, label, value, color }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-2.5 bg-white/60 backdrop-blur-sm rounded-xl px-3 py-2 border border-white">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 truncate">{label}</p>
        <p className="text-sm font-black text-[#1F3864]">{value}</p>
      </div>
    </div>
  );
}

function PremiumKPI({ icon, title, value, subtitle, color, badge }) {
  const Icon = icon;
  return (
    <div className="relative bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5 overflow-hidden group hover:shadow-2xl transition-shadow duration-500">
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

export function DashboardCycle({ data, alerts, store }) {
  const { enseignants, sessions, satisfaction, acquis, transfert } = data;
  const { isMobile, chartH } = useBreakpoint();

  const storeCrefocs = store?.crefocs;
  const storeFormations = store?.formations;
  const storeVisits = store?.visits;
  const storeOverrides = store?.overrides;
  const storeAvailability = store?.availability;
  const storeAuditTrail = store?.auditTrail;
  const storeKpEdits = store?.kpEdits;
  const storePending = store?.pendingChanges;

  const crefocKeys = useMemo(
    () => Object.keys(storeCrefocs || {}),
    [storeCrefocs]
  );
  const formationIds = useMemo(
    () => Object.keys(storeFormations || {}),
    [storeFormations]
  );

  // ─── Core stats — all driven by the reactive priority engine ──────────────
  const stats = useMemo(() => {
    const total = enseignants.length;
    const stagiaires = enseignants.filter(e => e['Statut'] === 'Stagiaire').length;
    const enAttente = enseignants.filter(e => e['Statut'] === 'Titulaire (en attente)').length;
    const titulaires = enseignants.filter(e => e['Statut'] === 'Titulaire').length;

    // §2.4 — High-priority = override (⭐) + group-a (🔴)
    const overrides = enseignants.filter(e => e.priorityGroup === 'override').length;
    const groupA = enseignants.filter(e => e.priorityGroup === 'group-a').length;
    const groupB = enseignants.filter(e => e.priorityGroup === 'group-b').length;
    const unavailable = enseignants.filter(e => e.priorityGroup === 'unavailable').length;
    const highPriority = overrides + groupA;

    // Dynamic delay — uses the recomputed Délai field from buildPriorityList
    const delays = enseignants
      .map(e => parseFloat(e['Délai depuis visite (mois)']))
      .filter(d => !isNaN(d));
    const delaiMoyen = delays.length
      ? (delays.reduce((a, b) => a + b, 0) / delays.length).toFixed(1)
      : '—';

    // Merged N1 satisfaction
    const satValid = satisfaction.filter(s => !s.missing);
    const avgSat = satValid.length
      ? (satValid.reduce((s, x) => s + (parseFloat(x['Score global /5']) || 0), 0) / satValid.length).toFixed(2)
      : '—';
    const editedSat = satisfaction.filter(s => s._isEdited).length;

    // Merged N2 progression
    const acqValid = acquis.filter(a => !a.missing);
    const avgProg = acqValid.length
      ? (acqValid.reduce((s, a) => s + (parseFloat(a['Delta progression']) || 0), 0) / acqValid.length).toFixed(2)
      : '—';
    const editedAcq = acquis.filter(a => a._isEdited).length;

    // Merged N3 transfert
    const trValid = transfert.filter(t => !t.missing);
    const effectif = trValid.filter(t => t['Statut'] === 'Effectif').length;
    const transfertPct = trValid.length ? Math.round((effectif / trValid.length) * 100) : 0;
    const editedTr = transfert.filter(t => t._isEdited).length;

    // Visit coverage (dynamic store)
    const visitsMap = storeVisits || {};
    const visitedIds = Object.keys(visitsMap).filter(id =>
      (visitsMap[id] || []).some(v => !v.deleted && v.visitType === 'official')
    );
    const visitsRecorded = Object.values(visitsMap).reduce(
      (sum, arr) => sum + arr.filter(v => !v.deleted).length, 0
    );

    return {
      total, stagiaires, titulaires, enAttente,
      overrides, groupA, groupB, unavailable, highPriority,
      delaiMoyen,
      avgSat, editedSat,
      avgProg, editedAcq,
      transfertPct, editedTr,
      visitedTeachers: visitedIds.length,
      visitsRecorded,
      effectifCount: effectif,
      trTotal: trValid.length,
    };
  }, [enseignants, satisfaction, acquis, transfert, storeVisits]);

  // ─── Per-circonscription composition — circos driven by store.crefocs ─────
  const circoData = useMemo(() => {
    return crefocKeys.map(circo => {
      const inCirco = enseignants.filter(e => e['Circonscription'] === circo);
      const capacity = storeCrefocs?.[circo]?.places || 20;
      return {
        circo,
        total: inCirco.length,
        prioritaires: inCirco.filter(
          e => e.priorityGroup === 'override' || e.priorityGroup === 'group-a'
        ).length,
        accompagnement: inCirco.filter(e => e.priorityGroup === 'group-b').length,
        titulaires: inCirco.filter(e => e.priorityGroup === 'tenured').length,
        indispo: inCirco.filter(e => e.priorityGroup === 'unavailable').length,
        capacity,
      };
    });
  }, [enseignants, crefocKeys, storeCrefocs]);

  // ─── Top-3 prioritaires per circo — dynamic ranking from priority engine ──
  const topPerCirco = useMemo(() => {
    return crefocKeys.map(circo => ({
      circo,
      top: enseignants
        .filter(e =>
          e['Circonscription'] === circo &&
          (e.priorityGroup === 'override' || e.priorityGroup === 'group-a' || e.priorityGroup === 'group-b')
        )
        .sort((a, b) => (a.priorityRank ?? 9999) - (b.priorityRank ?? 9999))
        .slice(0, 3),
    }));
  }, [enseignants, crefocKeys]);

  // ─── Next session — dynamic from store.sessions (reactive) ────────────────
  const nextSession = useMemo(() => {
    const now = new Date();
    return sessions
      .filter(s => {
        const d = parseDate(s['Date (Samedi)']);
        return d && d >= now;
      })
      .sort((a, b) => (parseDate(a['Date (Samedi)']) || 0) - (parseDate(b['Date (Samedi)']) || 0))[0];
  }, [sessions]);

  // ─── Transfert N3 status distribution ─────────────────────────────────────
  const transfertPie = useMemo(() => {
    const valid = transfert.filter(t => !t.missing);
    return [
      { name: 'Effectif',    value: valid.filter(t => t['Statut'] === 'Effectif').length,    color: COLORS.green },
      { name: 'Partiel',     value: valid.filter(t => t['Statut'] === 'Partiel').length,     color: COLORS.orange },
      { name: 'Insuffisant', value: valid.filter(t => t['Statut'] === 'Insuffisant').length, color: COLORS.red },
    ].filter(slice => slice.value > 0);
  }, [transfert]);

  // ─── Priority-group composition for admin overview ────────────────────────
  const groupComposition = useMemo(() => {
    return ['override', 'group-a', 'group-b', 'tenured', 'unavailable']
      .map(key => ({
        key,
        name: GROUP_META[key].label,
        value: enseignants.filter(e => e.priorityGroup === key).length,
        color: GROUP_META[key].color,
      }))
      .filter(d => d.value > 0);
  }, [enseignants]);

  // ─── Admin-activity pulse (overrides, pending availability, edits) ────────
  const adminPulse = useMemo(() => {
    const pending = storePending || {};
    const activeOverrides = Object.values(storeOverrides || {}).filter(o => o?.active).length;
    const pendingAvail = Object.values(storeAvailability || {}).reduce((sum, teacher) => {
      return sum + Object.values(teacher || {}).filter(f => f?.status === 'pending').length;
    }, 0);
    const validatedUnavail = Object.values(storeAvailability || {}).reduce((sum, teacher) => {
      return sum + Object.values(teacher || {}).filter(f => f?.status === 'validated').length;
    }, 0);
    const auditCount = (storeAuditTrail || []).length;
    const kpEdits = Object.keys(storeKpEdits || {}).length;
    return {
      activeOverrides,
      pendingAvail,
      validatedUnavail,
      pendingEdits: pending.enseignants || 0,
      pendingSessions: pending.sessions || 0,
      auditCount,
      kpEdits,
    };
  }, [storePending, storeOverrides, storeAvailability, storeAuditTrail, storeKpEdits]);

  const pieRadius = isMobile ? { inner: 35, outer: 60 } : { inner: 50, outer: 80 };

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumKPI
          icon={Users}
          title="Total enseignants"
          value={stats.total}
          subtitle={`${stats.stagiaires} stag · ${stats.enAttente} att · ${stats.titulaires} tit`}
          color={COLORS.navy}
        />
        <PremiumKPI
          icon={Flame}
          title="Priorité haute"
          value={stats.highPriority}
          subtitle={`⭐ ${stats.overrides} · 🔴 ${stats.groupA}`}
          color={COLORS.red}
        />
        <PremiumKPI
          icon={Smile}
          title="Satisfaction N1"
          value={`${stats.avgSat}/5`}
          subtitle={`${satisfaction.filter(s => !s.missing).length} évaluations`}
          color={COLORS.blue}
          badge={stats.editedSat > 0 ? `${stats.editedSat} modifiés` : null}
        />
        <PremiumKPI
          icon={Repeat}
          title="Transfert N3"
          value={`${stats.transfertPct}%`}
          subtitle={`${stats.effectifCount}/${stats.trTotal} PAP effectifs`}
          color={COLORS.green}
          badge={stats.editedTr > 0 ? `${stats.editedTr} modifiés` : null}
        />
      </div>

      {/* Live pulse row */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            Pouls administratif — données temps réel
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <StatPill icon={Star}        label="Overrides actifs"  value={adminPulse.activeOverrides} color="#7C3AED" />
          <StatPill icon={Clock}       label="Dispo en attente"  value={adminPulse.pendingAvail}    color="#D97706" />
          <StatPill icon={ShieldAlert} label="Indispo validées"  value={adminPulse.validatedUnavail} color="#6B7280" />
          <StatPill icon={Activity}    label="Visites en base"   value={stats.visitsRecorded}       color={COLORS.teal} />
          <StatPill icon={Pencil}      label="Fiches modifiées"  value={adminPulse.pendingEdits}    color={COLORS.blue} />
          <StatPill icon={BarChart3}   label="Overrides KP N1-N3" value={adminPulse.kpEdits}        color={COLORS.violet} />
        </div>
      </div>

      {/* Secondary info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Prochaine session */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
            <Calendar size={12} /> Prochaine session
          </h3>
          {nextSession ? (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <FormationBadge formation={nextSession['Formation']} />
                {nextSession._isEdited && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-black text-[#2E75B6] bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tighter">
                    <Pencil size={8} /> Modifié
                  </span>
                )}
              </div>
              <p className="font-black text-[#1F3864] leading-tight">
                {nextSession['Titre formation'] || store?.formations?.[nextSession['Formation']]?.libelle}
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center gap-2 flex-wrap">
                  <CircoBadge circo={nextSession['Circonscription']} />
                  <span className="text-xs flex items-center gap-1 text-gray-500 min-w-0">
                    <MapPin size={10} /> <span className="truncate">{nextSession['Lieu']}</span>
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  📅 {formatDate(nextSession['Date (Samedi)'])}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  👥 {nextSession['inscrits']?.length ?? nextSession['Nb inscrits'] ?? 0} inscrits · {nextSession['Durée (h)']}
                </p>
              </div>
              <Link
                to="/sessions"
                className="inline-flex items-center mt-3 text-[10px] font-black uppercase tracking-widest text-[#2E75B6] hover:underline"
              >
                Voir le planning →
              </Link>
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucune session planifiée</p>
          )}
        </div>

        {/* Alertes actives */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Flame size={12} /> Alertes actives
            </h3>
            {alerts.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-black bg-red-600 text-white">
                {alerts.length}
              </span>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune alerte active 🎉</p>
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 4).map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <PriorityIcon priority={a.priority} />
                  <span className="text-gray-700 line-clamp-2">{a.message}</span>
                </li>
              ))}
              {alerts.length > 4 && (
                <li>
                  <Link to="/alertes" className="text-xs text-[#2E75B6] hover:underline font-semibold">
                    + {alerts.length - 4} autres alertes →
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Progression N2 par formation — dynamic over store.formations */}
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <TrendingUp size={12} /> Progression N2 (Acquis)
          </h3>
          <div className="space-y-3">
            {formationIds.map(fId => {
              const form = store.formations[fId];
              const d = acquis.filter(a => a['Formation'] === fId && !a.missing);
              const avg = d.length
                ? d.reduce((s, a) => s + (parseFloat(a['Delta progression']) || 0), 0) / d.length
                : 0;
              const color = form?.color || FORMATION_COLORS[fId] || COLORS.blue;
              return (
                <ProgressBar
                  key={fId}
                  value={parseFloat(avg.toFixed(2))}
                  max={5}
                  color={color}
                  label={`${fId} — ${form?.court || form?.libelle || fId}`}
                  showValue
                />
              );
            })}
            <p className="text-[10px] text-gray-400 font-medium mt-2">Objectif cible : +1.5 pts/5</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Répartition par circonscription
          </h3>
          <ResponsiveContainer width="100%" height={chartH(220, 180)}>
            <BarChart data={circoData} margin={{ top: 5, right: 8, bottom: 0, left: isMobile ? -25 : -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="circo" tick={{ fontSize: isMobile ? 11 : 12, fontWeight: 'bold' }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Bar dataKey="prioritaires" name="Priorité haute" fill={COLORS.red} radius={[6, 6, 0, 0]} />
              <Bar dataKey="accompagnement" name="Accompagnement" fill={COLORS.orange} radius={[6, 6, 0, 0]} />
              <Bar dataKey="titulaires" name="Titulaires" fill={COLORS.blue} radius={[6, 6, 0, 0]} />
              <Bar dataKey="indispo" name="Indispo." fill="#9CA3AF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-medium text-gray-500">
            {circoData.map(c => (
              <div
                key={c.circo}
                className="flex items-center justify-between px-2 py-1 rounded-lg bg-gray-50/80"
                title={`Capacité CREFOC ${c.circo}: ${c.capacity} places`}
              >
                <span className="font-black" style={{ color: CIRCO_COLORS[c.circo] || '#6B7280' }}>
                  {c.circo}
                </span>
                <span className="text-gray-400">{c.total}/{c.capacity}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Transfert N3 — Statut PAP
          </h3>
          {transfertPie.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">Aucune donnée exploitable</p>
          ) : (
            <ResponsiveContainer width="100%" height={chartH(220, 180)}>
              <PieChart>
                <Pie
                  data={transfertPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={pieRadius.inner}
                  outerRadius={pieRadius.outer}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={isMobile ? 10 : 12}
                >
                  {transfertPie.map(entry => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(v, n) => [`${v} enseignants`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Priority composition + Top 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Composition des groupes de priorité
          </h3>
          {groupComposition.length === 0 ? (
            <p className="text-sm text-gray-400 py-10 text-center">Aucun enseignant</p>
          ) : (
            <ResponsiveContainer width="100%" height={chartH(220, 180)}>
              <PieChart>
                <Pie
                  data={groupComposition}
                  cx="50%"
                  cy="50%"
                  innerRadius={pieRadius.inner}
                  outerRadius={pieRadius.outer}
                  dataKey="value"
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={isMobile ? 10 : 12}
                >
                  {groupComposition.map(entry => <Cell key={entry.key} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(v, n) => [`${v} enseignants`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 space-y-1.5">
            {groupComposition.map(g => (
              <div key={g.key} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                  <span className="text-gray-600 truncate">{g.name}</span>
                </div>
                <span className="font-black text-[#1F3864]">{g.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-xl p-5">
          <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
            Top 3 enseignants prioritaires par circonscription
          </h3>
          <div className={`grid grid-cols-1 ${crefocKeys.length >= 3 ? 'sm:grid-cols-3' : crefocKeys.length === 2 ? 'sm:grid-cols-2' : ''} gap-4`}>
            {topPerCirco.map(({ circo, top }) => (
              <div key={circo} className="bg-white/50 rounded-2xl border border-gray-100/70 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <CircoBadge circo={circo} />
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {top.length} {top.length > 1 ? 'cas' : 'cas'}
                  </span>
                </div>
                {top.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucun cas prioritaire</p>
                ) : (
                  <ul className="space-y-1.5">
                    {top.map(e => {
                      const score = e.scoreInfo?.rawUrgencyScore;
                      const scoreDisplay = typeof score === 'number' && !isNaN(score) ? score.toFixed(2) : '—';
                      return (
                        <li key={e['ID']} className="flex items-center gap-2 text-[12px]">
                          <span className="font-black text-gray-300 font-mono w-5 flex-shrink-0 text-xs">
                            #{e.priorityRank}
                          </span>
                          <Link
                            to={`/enseignants/${e['ID']}`}
                            className="text-[#2E75B6] hover:underline font-semibold truncate flex-1"
                          >
                            {e['Prénom']} {e['Nom']}
                          </Link>
                          <PriorityGroupBadge group={e.priorityGroup} />
                          <span
                            className="text-[10px] font-black text-gray-400 flex-shrink-0 tabular-nums"
                            title="Score d'urgence (5 = max)"
                          >
                            {scoreDisplay}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
