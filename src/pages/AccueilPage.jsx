import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { Breadcrumb } from '../components/layout/Breadcrumb';
import {
  Users, AlertTriangle, Calendar, ArrowRight, Clock, Shield,
  BarChart2, CheckCircle, Eye, Plus,
} from 'lucide-react';

function QuickAction({ icon: Icon, label, to, color }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0`} style={{ background: color }}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1F3864] group-hover:text-[#2E75B6] transition-colors">{label}</p>
      </div>
      <ArrowRight size={14} className="text-gray-300 group-hover:text-[#2E75B6] transition-colors flex-shrink-0" />
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`} style={{ background: `${color}15`, color }}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1F3864]">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export function AccueilPage({ data, alerts, loadedAt, alertCount, onMenuOpen, store }) {
  const { enseignants, sessions } = data;

  const stats = useMemo(() => {
    const total = enseignants.length;
    const stagiaires = enseignants.filter(e => e['Statut'] === 'Stagiaire').length;
    const groupA = enseignants.filter(e => e.priorityGroup === 'group-a').length;
    const overrides = enseignants.filter(e => e.isOverridden).length;
    const pending = enseignants.filter(e => e.availabilityStatus === 'pending').length;
    return { total, stagiaires, groupA, overrides, pending };
  }, [enseignants]);

  // Recent audit trail entries
  const recentAudit = useMemo(() => {
    return (store?.auditTrail || []).slice(0, 6);
  }, [store?.auditTrail]);

  const auditLabels = {
    visit_added: { icon: Eye, label: 'Visite enregistrée', color: '#059669' },
    visit_deleted: { icon: Clock, label: 'Visite supprimée', color: '#DC2626' },
    override_set: { icon: Shield, label: 'Priorité absolue', color: '#7C3AED' },
    override_removed: { icon: Shield, label: 'Priorité retirée', color: '#6B7280' },
    unavailability_declared: { icon: Clock, label: 'Indisponibilité déclarée', color: '#D97706' },
    availability_validated: { icon: CheckCircle, label: 'Disponibilité validée', color: '#2563EB' },
    needs_theme_validated: { icon: BarChart2, label: 'Thème validé', color: '#1F3864' },
  };

  return (
    <div>
      <Header
        title="Accueil — PedagoTrack"
        subtitle="Cycle de Formation Italiano 2026-2027 · Mohamed Amir Beldi"
        alertCount={alertCount}
        loadedAt={loadedAt}
        onMenuOpen={onMenuOpen}
      />
      <Breadcrumb />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-[#1F3864] to-[#2E75B6] rounded-2xl p-5 md:p-6 text-white">
          <h2 className="text-lg md:text-xl font-bold">Bonjour, Mohamed Amir Beldi</h2>
          <p className="text-sm text-blue-100 mt-1">
            Inspecteur — Cycle Italiano 2026-2027 · {Object.keys(store.crefocs || {}).join(' · ')}
          </p>
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-blue-200">Enseignants</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-blue-200">Sessions</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2">
              <p className="text-2xl font-bold">{alertCount}</p>
              <p className="text-xs text-blue-200">Alertes actives</p>
            </div>
          </div>
        </div>

        {/* Pending items — needs attention */}
        {(stats.groupA > 0 || stats.pending > 0 || alertCount > 0) && (
          <div className="space-y-2">
            {stats.groupA > 0 && (
              <Link to="/enseignants" className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 hover:bg-red-100 transition-colors">
                <span className="text-lg">🔴</span>
                <span><strong>{stats.groupA} stagiaire{stats.groupA > 1 ? 's' : ''} sans visite</strong> — visite d'accompagnement à programmer</span>
                <ArrowRight size={14} className="ml-auto flex-shrink-0" />
              </Link>
            )}
            {stats.pending > 0 && (
              <Link to="/parametres" className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-700 hover:bg-yellow-100 transition-colors">
                <span className="text-lg">⏳</span>
                <span><strong>{stats.pending} déclaration{stats.pending > 1 ? 's' : ''} d'indisponibilité</strong> en attente de validation</span>
                <ArrowRight size={14} className="ml-auto flex-shrink-0" />
              </Link>
            )}
            {alertCount > 0 && (
              <Link to="/alertes" className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-700 hover:bg-orange-100 transition-colors">
                <AlertTriangle size={16} />
                <span><strong>{alertCount} alerte{alertCount > 1 ? 's' : ''} active{alertCount > 1 ? 's' : ''}</strong> à traiter</span>
                <ArrowRight size={14} className="ml-auto flex-shrink-0" />
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick actions */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions rapides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickAction icon={Users} label="Voir les enseignants" to="/enseignants" color="#2E75B6" />
              <QuickAction icon={BarChart2} label="Tableaux de bord" to="/tableaux-de-bord" color="#1F3864" />
              <QuickAction icon={Calendar} label="Sessions & calendrier" to="/sessions" color="#375623" />
              <QuickAction icon={AlertTriangle} label="Alertes & suivi" to="/alertes" color="#C55A11" />
            </div>

            {/* Stats strip */}
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">Indicateurs clés</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Enseignants" value={stats.total} sub={`${stats.stagiaires} stagiaires`} color="#2E75B6" />
              <StatCard icon={Eye} label="Sans visite" value={stats.groupA} sub="Groupe A" color="#DC2626" />
              <StatCard icon={Shield} label="Priorité absolue" value={stats.overrides} sub="Décisions inspecteur" color="#7C3AED" />
              <StatCard icon={AlertTriangle} label="Alertes" value={alertCount} sub="À traiter" color="#C55A11" />
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activité récente</h3>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              {recentAudit.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-400">Aucune activité enregistrée</p>
                  <p className="text-xs text-gray-300 mt-1">Les actions apparaîtront ici au fur et à mesure</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAudit.map((entry) => {
                    const meta = auditLabels[entry.type] || { icon: Clock, label: entry.type, color: '#6B7280' };
                    const ItemIcon = meta.icon;
                    return (
                      <div key={entry.id} className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${meta.color}15`, color: meta.color }}>
                          <ItemIcon size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{meta.label}</p>
                          {entry.ensId && (
                            <Link to={`/enseignants/${entry.ensId}`} className="text-xs text-[#2E75B6] hover:underline truncate block">
                              {entry.ensId}
                            </Link>
                          )}
                          <p className="text-[10px] text-gray-400">
                            {new Date(entry.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
