import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Download, SlidersHorizontal,
  Plus, Pencil, Trash2, Star, Shield, Filter
} from 'lucide-react';
import { CircoBadge, StatutBadge, PriorityGroupBadge, AvailabilityBadge } from '../../ui/Badge';
import { getDelaiClass, isExceptional } from '../../../utils/scoreCalculator';
import { downloadCSV } from '../../../utils/exportHelpers';
import { EnseignantEditModal } from './EnseignantEditModal';
import { OverrideModal } from './OverrideModal';

const PAGE_SIZE = 25;

const GROUP_LABELS = {
  'override':    { icon: '⭐', label: 'Priorité absolue — Décision inspecteur',    color: 'bg-purple-50 border-purple-200 text-purple-800' },
  'group-a':     { icon: '🔴', label: 'Groupe A — Stagiaires non visités',          color: 'bg-red-50 border-red-200 text-red-800' },
  'group-b':     { icon: '🟠', label: 'Groupe B — Stagiaires visités',              color: 'bg-orange-50 border-orange-200 text-orange-800' },
  'tenured':     { icon: '⬜', label: 'Titulaires',                                 color: 'bg-blue-50 border-blue-100 text-blue-800' },
  'unavailable': { icon: '🚫', label: 'Non disponibles',                            color: 'bg-gray-50 border-gray-200 text-gray-500' },
};

// §2.5 warning text — shown for Group A
const GROUP_A_WARNING = 'Score basé sur l\'auto-évaluation uniquement — fiabilité limitée — visite à programmer';

function ScoreCell({ ens, formationFilter, isUnconfigured }) {
  // Use the unified rawUrgencyScore (where 5.0 = highest urgency/priority)
  const score = formationFilter
    ? ens.formationScore
    : ens.scoreInfo?.rawUrgencyScore;
  const isEstimated = ens.priorityGroup === 'group-a' || (ens.priorityGroup === 'group-b' && !ens.hasVisit);
  const isPartial = ens.scoreInfo?.partial;

  if (ens.priorityGroup === 'override') {
    return <span className="text-xs text-purple-600 italic">— Priorité manuelle</span>;
  }
  if (ens.priorityGroup === 'unavailable') {
    return <span className="text-xs text-gray-400">N/D</span>;
  }
  if (score === null || score === undefined) {
    return <span className="text-xs text-gray-400">—</span>;
  }
  return (
    <span
      className={`font-semibold ${isPartial ? 'text-orange-500' : 'text-[#1F3864]'}`}
      title={
        isUnconfigured ? "Mode sécurité : Aucune compétence ciblée, moyenne globale appliquée" :
        isEstimated ? 'Score estimé (auto-positionnement uniquement)' : 
        isPartial ? `Score partiel — manquants: ${ens.scoreInfo?.missing?.join(', ')}` : 
        'Score calculé'
      }
    >
      {parseFloat(score).toFixed(2)}
      {isPartial && <span className="text-xs text-orange-400 ml-0.5">*</span>}
      {isEstimated && <span className="text-xs text-gray-400 ml-0.5 italic"> est.</span>}
    </span>
  );
}

export function EnseignantsList({ enseignants, store }) {
  const [search, setSearch] = useState('');
  const [filterCirco, setFilterCirco] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('priorityRank');
  const [sortDir, setSortDir] = useState('asc');

  // Modal state
  const [modal, setModal] = useState(null);
  const [overrideModal, setOverrideModal] = useState(null); // { enseignant }
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const formationFilter = store?.formationFilter || '';

  const filtered = useMemo(() => {
    let data = enseignants;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(e =>
        `${e['Prénom']} ${e['Nom']}`.toLowerCase().includes(q) ||
        (e['Nom du Lycée'] || '').toLowerCase().includes(q) ||
        (e['ID'] || '').toLowerCase().includes(q)
      );
    }
    if (filterCirco) data = data.filter(e => e['Circonscription'] === filterCirco);
    if (filterStatut) data = data.filter(e => e['Statut'] === filterStatut);
    if (filterGroup) data = data.filter(e => e.priorityGroup === filterGroup);
    return [...data].sort((a, b) => {
      let va = a[sortBy] ?? a.priorityScore ?? 99;
      let vb = b[sortBy] ?? b.priorityScore ?? 99;
      if (va === '—' || va === null || va === undefined) va = sortDir === 'asc' ? Infinity : -Infinity;
      if (vb === '—' || vb === null || vb === undefined) vb = sortDir === 'asc' ? Infinity : -Infinity;
      const na = parseFloat(va), nb = parseFloat(vb);
      if (!isNaN(na) && !isNaN(nb)) return sortDir === 'asc' ? na - nb : nb - na;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }, [enseignants, search, filterCirco, filterStatut, filterGroup, sortBy, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Group separators — compute which rows start a new group
  const groupBoundaries = useMemo(() => {
    const boundaries = {};
    let lastGroup = null;
    paginated.forEach((e, i) => {
      if (e.priorityGroup !== lastGroup) {
        boundaries[i] = e.priorityGroup;
        lastGroup = e.priorityGroup;
      }
    });
    return boundaries;
  }, [paginated]);

  function toggleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  }

  function SortBtn({ col, label }) {
    const active = sortBy === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-left whitespace-nowrap ${active ? 'text-[#2E75B6] font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
      >
        {label}
        <span className="text-xs">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </button>
    );
  }

  function handleSave(data) {
    if (modal?.mode === 'add') store.addEnseignant(data);
    else if (modal?.mode === 'edit') store.updateEnseignant(modal.enseignant['ID'], data);
  }

  function handleDelete(id) {
    store.deleteEnseignant(id);
    setDeleteConfirm(null);
  }

  function handleOverrideSave({ reason, reasonText, scopes }) {
    store.setOverride(overrideModal.enseignant['ID'], reason, reasonText, scopes);
    setOverrideModal(null);
  }

  function handleRemoveOverride(id) {
    store.removeOverride(id);
  }

  // Group A count for the warning banner
  const groupACcount = enseignants.filter(e => e.priorityGroup === 'group-a').length;
  const pendingAvailabilityCount = enseignants.filter(e => e.availabilityStatus === 'pending').length;

  // --- HIERARCHICAL FILTERS LOGIC ---
  const [activeFamily, setActiveFamily] = useState(null);
  
  // Group formations by their family code (F1, F2...)
  const families = useMemo(() => {
    const map = {};
    Object.entries(store.formations || {}).forEach(([id, f]) => {
      const root = id.split('.')[0];
      if (!map[root]) map[root] = { id: root, name: f.family || f.libelle, modules: [] };
      map[root].modules.push({ id, ...f });
    });
    return Object.values(map).sort((a, b) => a.id.localeCompare(b.id));
  }, [store.formations]);

  return (
    <div className="space-y-4">
      {/* Formation filter bar — Hierarchical View */}
      {store && (
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          {/* Level 1: Families */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2">Thématiques :</span>
            <button
              onClick={() => { 
                store.setFormationFilter(''); 
                setActiveFamily(null);
                setPage(1); 
              }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                formationFilter === ''
                  ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                  : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
              }`}
            >
              Tous (Global)
            </button>
            {families.map(fam => (
              <button
                key={fam.id}
                onClick={() => {
                  setActiveFamily(activeFamily === fam.id ? null : fam.id);
                  if (activeFamily !== fam.id) {
                     store.setFormationFilter(fam.id); 
                  }
                }}
                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                  activeFamily === fam.id || (formationFilter.startsWith(fam.id) && formationFilter !== '')
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                }`}
              >
                {fam.id} — {fam.name}
              </button>
            ))}
          </div>

          {/* Level 2: Specific Modules (Contextual) */}
          {(activeFamily || (formationFilter && formationFilter.includes('.'))) && (
            <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-gray-50 animate-in slide-in-from-top-2 duration-300">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mr-2">Modules :</span>
               {families.find(f => f.id === (activeFamily || (formationFilter && formationFilter.split('.')[0])))?.modules.map(mod => (
                 <button
                   key={mod.id}
                   onClick={() => { store.setFormationFilter(mod.id); setPage(1); }}
                   className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                     formationFilter === mod.id
                       ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-50'
                       : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'
                   }`}
                 >
                   {mod.id} — {mod.libelle}
                 </button>
               ))}
            </div>
          )}

          {formationFilter && (
            <div className="pt-2 px-2 flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Tri actif : <span className="text-blue-600 font-black">
                    {Object.values(store.formations).find(f => f.id === formationFilter)?.libelle || 'Filtre thématique'}
                  </span>
               </p>
            </div>
          )}
        </div>
      )}

      {/* Alerts bar */}
      {(groupACcount > 0 || pendingAvailabilityCount > 0 || store.isUnconfiguredFormation) && (
        <div className="space-y-2">
          {store.isUnconfiguredFormation && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
              <span className="text-base flex-shrink-0">⚠️</span>
              <div>
                <strong>Configuration incomplète</strong> — Aucune compétence n'est ciblée pour la formation <strong>{store.formationFilter}</strong>. 
                <br />
                Les scores affichés correspondent à la moyenne globale par défaut. 
                <Link to="/parametres" className="ml-2 font-bold underline hover:text-blue-900 transition-colors">Ajuster le ciblage dans les paramètres</Link>
              </div>
            </div>
          )}
          {groupACcount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
              <span className="text-base flex-shrink-0">🔴</span>
              <div>
                <strong>{groupACcount} stagiaire{groupACcount > 1 ? 's' : ''} sans visite</strong> — {GROUP_A_WARNING}
              </div>
            </div>
          )}
          {pendingAvailabilityCount > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-700">
              <span className="text-base flex-shrink-0">⏳</span>
              <div>
                <strong>{pendingAvailabilityCount} déclaration(s) d'indisponibilité en attente</strong> de validation inspecteur
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20"
            placeholder="Rechercher nom, lycée, ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'border-[#2E75B6] bg-blue-50 text-[#2E75B6]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <SlidersHorizontal size={14} />
          <span className="hidden sm:inline">Filtres</span>
        </button>
        <button
          onClick={() => downloadCSV(filtered, 'enseignants_priorite.csv')}
          className="hidden md:flex flex-shrink-0 items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <Download size={14} /> Export
        </button>
        {store && (
          <button
            onClick={() => setModal({ mode: 'add' })}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#2E75B6] text-white text-sm rounded-lg hover:bg-[#1F3864] transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        )}
        <span className="flex-shrink-0 text-sm text-gray-400 hidden sm:block">{filtered.length}</span>
      </div>

      {/* Collapsible filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
          <select
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none"
            value={filterCirco}
            onChange={e => { setFilterCirco(e.target.value); setPage(1); }}
          >
            <option value="">Toutes circo.</option>
            {Object.keys(store.crefocs || {}).map(c => <option key={c}>{c}</option>)}
          </select>
          <select
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none"
            value={filterStatut}
            onChange={e => { setFilterStatut(e.target.value); setPage(1); }}
          >
            <option value="">Tous statuts</option>
            <option value="Titulaire">Titulaire</option>
            <option value="Stagiaire">Stagiaire</option>
          </select>
          <select
            className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none"
            value={filterGroup}
            onChange={e => { setFilterGroup(e.target.value); setPage(1); }}
          >
            <option value="">Tous groupes</option>
            <option value="override">⭐ Priorité absolue</option>
            <option value="group-a">🔴 Groupe A (non visités)</option>
            <option value="group-b">🟠 Groupe B (visités)</option>
            <option value="tenured">⬜ Titulaires</option>
            <option value="unavailable">🚫 Non disponibles</option>
          </select>
          <button
            onClick={() => downloadCSV(filtered, 'enseignants_priorite.csv')}
            className="md:hidden flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            <Download size={14} /> Export ({filtered.length})
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-3 py-3 text-left"><SortBtn col="priorityRank" label="Rang" /></th>
              <th className="px-3 py-3 text-left">Groupe</th>
              <th className="px-3 py-3 text-left"><SortBtn col="Nom" label="Enseignant" /></th>
              <th className="px-3 py-3 text-left hidden sm:table-cell">Circo.</th>
              <th className="px-3 py-3 text-left hidden md:table-cell">Statut</th>
              <th className="px-3 py-3 text-left hidden lg:table-cell">
                <SortBtn col="Délai depuis visite (mois)" label="Délai" />
              </th>
              <th className="px-3 py-3 text-left hidden sm:table-cell">
                <SortBtn col="priorityScore" label={formationFilter ? `Score ${formationFilter}` : 'Score priorité'} />
              </th>
              <th className="px-3 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.map((e, idx) => (
              <React.Fragment key={e['ID']}>
                {groupBoundaries[idx] !== undefined && (
                  <tr className="bg-gray-50/80">
                    <td colSpan={8} className={`px-4 py-2 border-l-4 ${
                      groupBoundaries[idx] === 'override' ? 'border-purple-400' :
                      groupBoundaries[idx] === 'group-a' ? 'border-red-400' :
                      groupBoundaries[idx] === 'group-b' ? 'border-orange-400' :
                      groupBoundaries[idx] === 'tenured' ? 'border-blue-300' :
                      'border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{GROUP_LABELS[groupBoundaries[idx]]?.icon}</span>
                        <span className="text-xs font-semibold text-gray-600">
                          {GROUP_LABELS[groupBoundaries[idx]]?.label}
                        </span>
                        {groupBoundaries[idx] === 'group-a' && (
                          <span className="text-xs text-red-500 italic">— {GROUP_A_WARNING}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )}

                <tr
                  className={`hover:bg-blue-50/30 transition-colors group ${
                    e.availabilityStatus === 'unavailable' ? 'opacity-50' : ''
                  } ${e.isOverridden ? 'bg-purple-50/30' : ''}`}
                >
                  <td className="px-3 py-3">
                    <span className={`font-mono text-xs ${
                      e.priorityGroup === 'override' ? 'text-purple-600 font-bold' : 'text-gray-500'
                    }`}>
                      {e.priorityGroup === 'override' ? '⭐' : e.priorityRank || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <PriorityGroupBadge group={e.priorityGroup} />
                  </td>
                  <td className="px-3 py-3 max-w-[200px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        to={`/enseignants/${e['ID']}`}
                        className="font-medium text-[#1F3864] hover:text-[#2E75B6] hover:underline leading-tight"
                      >
                        {e['Prénom']} {e['Nom']}
                      </Link>
                      {isExceptional(e['Note dernière visite /20']) && (
                        <Star size={11} className="text-yellow-500 flex-shrink-0" fill="currentColor" title="Note exceptionnelle ≥ 16/20" />
                      )}
                      {e.availabilityStatus !== 'available' && (
                        <AvailabilityBadge status={e.availabilityStatus} />
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate hidden sm:block">{e['Nom du Lycée']}</div>
                    {e.isOverridden && e.overrideInfo && (
                      <div className="text-xs text-purple-600 mt-0.5 flex items-center gap-1">
                        <Shield size={10} /> {e.overrideInfo.reason}
                        {e.overrideInfo.reasonText && ` — ${e.overrideInfo.reasonText}`}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <CircoBadge circo={e['Circonscription']} />
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell">
                    <StatutBadge value={e['Statut']} />
                  </td>
                  <td className={`px-3 py-3 font-medium hidden lg:table-cell ${getDelaiClass(e['Délai depuis visite (mois)'])}`}>
                    {e['Délai depuis visite (mois)'] !== '—' && e['Délai depuis visite (mois)'] != null
                      ? `${e['Délai depuis visite (mois)']} m.`
                      : <span className="text-xs text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-3 py-3 hidden sm:table-cell">
                    <ScoreCell 
                      ens={e} 
                      formationFilter={formationFilter} 
                      isUnconfigured={store.isUnconfiguredFormation}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/enseignants/${e['ID']}`}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-[#2E75B6]"
                        title="Voir fiche"
                      >
                        →
                      </Link>
                      {store && (
                        <>
                          <button
                            onClick={() => e.isOverridden
                              ? handleRemoveOverride(e['ID'])
                              : setOverrideModal({ enseignant: e })
                            }
                            className={`p-1.5 rounded transition-colors ${
                              e.isOverridden
                                ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                : 'text-gray-400 hover:bg-purple-50 hover:text-purple-600'
                            }`}
                            title={e.isOverridden ? 'Retirer la priorité absolue' : 'Marquer priorité absolue (§2.2)'}
                          >
                            <Star size={13} fill={e.isOverridden ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => setModal({ mode: 'edit', enseignant: e })}
                            className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-[#2E75B6] transition-colors"
                            title="Modifier"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(e['ID'])}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">Aucun résultat</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
          <span className="text-xs">Page {page}/{totalPages} · {filtered.length} résultats</span>
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 rounded text-xs ${p === page ? 'bg-[#2E75B6] text-white' : 'hover:bg-gray-100'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {modal && (
        <EnseignantEditModal
          enseignant={modal.enseignant}
          formations={store.formations}
          crefocs={store.crefocs}
          visits={store.visits}
          isNew={modal.mode === 'add'}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {overrideModal && (
        <OverrideModal
          enseignant={overrideModal.enseignant}
          formations={store.formations}
          onSave={handleOverrideSave}
          onClose={() => setOverrideModal(null)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-[#1F3864] mb-2">Confirmer la suppression</h3>
            <p className="text-sm text-gray-600 mb-5">
              Supprimer <strong>
                {enseignants.find(e => e['ID'] === deleteConfirm)?.['Prénom']}{' '}
                {enseignants.find(e => e['ID'] === deleteConfirm)?.['Nom']}
              </strong> ?
              <br /><span className="text-red-500 text-xs">Cette action est réversible depuis les Paramètres.</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Annuler</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
