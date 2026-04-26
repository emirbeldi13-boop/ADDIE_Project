import { useState } from 'react';
import { 
  Pencil, Trash2, MapPin, Calendar, Users, 
  AlertCircle, ChevronDown, CheckCircle2, Sparkles, ShieldCheck, Download, Compass
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CircoBadge } from '../../ui/Badge';
import { SessionEditModal } from './SessionEditModal';
import { analyzeVenueReadiness } from '../../../utils/formationMatcher';
import { parseDate, formatDate } from '../../../utils/dateUtils';
import { exportSessionToPDF } from '../../../utils/pdfGenerator';

export function SessionsList({ sessions, store }) {
  const navigate = useNavigate();
  const [editSession, setEditSession] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const now = new Date();

  function getSessionStatus(s) {
    if (s['Statut'] && s['Statut'] !== 'Planifiée') return s['Statut'];
    const d = parseDate(s['Date (Samedi)']);
    if (!d) return 'Non planifiée';
    if (d < now) return 'Terminée';
    const diff = d - now;
    if (diff < 30 * 24 * 3600 * 1000) return 'Prochaine';
    return 'Planifiée';
  }

  function getStatusStyle(status) {
    switch (status) {
      case 'Terminée': return 'bg-gray-100 text-gray-500 border-gray-200';
      case 'Prochaine': return 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse';
      case 'Confirmée': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'En cours': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'Analyse': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      default: return 'bg-blue-50/50 text-[#2E75B6] border-blue-100/50';
    }
  }

  const sortedSessions = [...sessions].sort((a, b) => parseDate(a['Date (Samedi)']) - parseDate(b['Date (Samedi)']));

  const handleDelete = (id) => {
    store.deleteSession(id);
    setDeleteId(null);
  };

  const handleExportDossier = (session, formation, crefoc) => {
    const participants = (session.inscrits || []).map(id => store.enseignants.find(e => e.ID === id)).filter(Boolean);
    exportSessionToPDF(session, formation, crefoc, participants, store);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 items-start">
      {sortedSessions.map(s => {
        const formation = store.formations[s['Formation']] || { libelle: s['Formation'], color: '#6B7280' };
        const status = getSessionStatus(s);
        const crefoc = Object.values(store.crefocs).find(c => c.nom === s['Lieu']) || store.crefocs[s['Circonscription']] || { places: 20, logistics: {} };
        const inscrits = s['inscrits']?.length || s['Nb inscrits'] || 0;
        const occupancy = Math.round((inscrits / (crefoc.places || 20)) * 100);
        const isOverCapacity = inscrits > (crefoc.places || 20);
        const requirements = s.cdc?.equipments || formation?.techRequirements || [];
        const readiness = analyzeVenueReadiness({ ...formation, techRequirements: requirements }, crefoc);

        return (
          <div 
            key={s['ID Session']} 
            className="group relative bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden"
          >
            {/* Design Accent */}
            <div className="h-2.5 w-full" style={{ backgroundColor: formation.color }} />

            <div className="p-7">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${getStatusStyle(status)}`}>
                      {status}
                    </span>
                    <span className="text-[9px] text-gray-400 font-black tracking-widest uppercase">{s['ID Session']}</span>
                    {s._isEdited && (
                      <span className="flex items-center gap-1 text-[8px] font-black text-[#2E75B6] bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100 uppercase tracking-tighter">
                         <Pencil size={8} /> Modifié
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-black text-[#1F3864] leading-tight group-hover:text-[#2E75B6] transition-colors line-clamp-2">
                    {s['Titre formation'] || formation.libelle}
                  </h3>
                </div>
                
                <div className="flex gap-2">
                   <button 
                     onClick={() => navigate('/ingenierie', { state: { formationId: s.formationId || s.Formation || s['ID Formation'], sessionId: s['ID Session'] } })}
                     title="Ouvrir dans le Studio ADDIE"
                     className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                   >
                     <Compass size={14} />
                   </button>
                   <button 
                     onClick={() => handleExportDossier(s, formation, crefoc)}
                     title="Télécharger le dossier complet (PDF)"
                     className="p-2.5 bg-blue-50 text-[#2E75B6] rounded-2xl hover:bg-[#2E75B6] hover:text-white transition-all shadow-sm active:scale-90"
                   >
                     <Download size={14} />
                   </button>
                   <button 
                     onClick={() => setEditSession(s)}
                     className="p-2.5 bg-gray-50 text-gray-400 rounded-2xl hover:bg-[#2E75B6] hover:text-white transition-all shadow-sm active:scale-90"
                   >
                     <Pencil size={14} />
                   </button>
                   <button 
                     onClick={() => setDeleteId(s['ID Session'])}
                     className="p-2.5 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm active:scale-90"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-1 gap-4 mb-6">
                <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                  <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2E75B6]">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#1F3864]">{formatDate(s['Date (Samedi)'])}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Atelier ARE : {s['Date ARE (J+42 approx.)'] || 'À définir'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
                  <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-[#2E75B6]">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CircoBadge circo={s['Circonscription']} size="sm" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-600 mt-0.5 line-clamp-1">{s['Lieu']}</p>
                  </div>
                </div>
              </div>

              {/* Progress & Logistics */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Maturité du Set</span>
                      {inscrits === 0 && <span className="flex h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />}
                    </div>
                    <span className={`text-sm font-black ${isOverCapacity ? 'text-red-500' : 'text-[#1F3864]'}`}>
                      {inscrits} <span className="text-gray-300 font-normal">/ {crefoc.places || 20}</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-700 ${
                        isOverCapacity ? 'bg-red-500' : 
                        occupancy > 85 ? 'bg-amber-400' : 'bg-[#2E75B6]'
                      }`}
                      style={{ width: `${Math.min(100, occupancy)}%` }}
                    />
                  </div>
                  {isOverCapacity && (
                    <p className="text-[9px] text-red-500 font-bold flex items-center gap-1">
                      <AlertCircle size={10} /> Capacité outrepassée
                    </p>
                  )}
                  {inscrits === 0 && (
                    <p className="text-[9px] text-amber-500 font-bold flex items-center gap-1">
                      <Sparkles size={10} /> Set vide — Recommandation conseillée
                    </p>
                  )}
                </div>

                {/* Logistics Module */}
                <div className="bg-white/50 rounded-2xl border border-gray-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase">Venue Readiness</h4>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${readiness.canHost ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {readiness.score}% {readiness.canHost ? 'CONFORME' : 'ALERTE'}
                      </span>
                    </div>
                    <button 
                      onClick={() => setExpandedId(expandedId === s['ID Session'] ? null : s['ID Session'])}
                      className="text-[10px] font-black text-[#2E75B6] hover:underline flex items-center gap-1"
                    >
                      {expandedId === s['ID Session'] ? 'RÉDUIRE' : 'VÉRIFIER'}
                      <ChevronDown size={12} className={`transition-transform duration-300 ${expandedId === s['ID Session'] ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  <div className={`overflow-hidden transition-all duration-300 ${expandedId === s['ID Session'] ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                      {Object.keys(crefoc.logistics || {}).map(key => {
                        const isAvailable = crefoc.logistics[key];
                        const isRequired = requirements?.includes(key);
                        if (!isRequired && !expandedId) return null;
                        return (
                          <div key={key} className={`flex items-center gap-2 p-1.5 rounded-lg border ${
                            isRequired 
                              ? (isAvailable ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100')
                              : 'bg-gray-50 border-transparent'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-red-400'}`} />
                            <span className={`text-[9px] truncate ${isRequired ? 'font-black text-gray-700' : 'text-gray-400'}`}>
                              {key}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {editSession && (
        <SessionEditModal
          session={editSession}
          store={store}
          onSave={(updated) => {
            store.updateSession(editSession['ID Session'], updated);
            setEditSession(null);
          }}
          onClose={() => setEditSession(null)}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1F3864]/60 backdrop-blur-md">
          <div className="bg-white rounded-[32px] shadow-2xl p-8 max-w-sm w-full animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-[#1F3864] text-center mb-2">Supprimer la session ?</h3>
            <p className="text-sm text-gray-500 text-center mb-8">
              Cette action est irréversible. Toutes les données de planification liées seront perdues.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteId(null)}
                className="flex-1 px-6 py-3 text-sm font-bold text-gray-400 hover:bg-gray-100 rounded-2xl transition-all"
              >
                Annuler
              </button>
              <button 
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-6 py-3 text-sm font-black bg-red-500 text-white rounded-2xl hover:bg-red-600 shadow-xl shadow-red-200 transition-all active:scale-95"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
