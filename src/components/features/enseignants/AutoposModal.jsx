import { useState } from 'react';
import { X, Check, Info, Star, History, Trash2, Calendar, Layout } from 'lucide-react';

export function AutoposModal({ enseignant, competences, history = [], onSave, onDelete, onClose }) {
  const [tab, setTab] = useState('new'); // 'new' | 'history'
  
  // Initialize scores with current T0 if available, else null
  const [scores, setScores] = useState(
    Object.keys(competences).reduce((acc, code) => {
      acc[code] = null;
      return acc;
    }, {})
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreChange = (code, val) => {
    setScores(prev => ({ ...prev, [code]: val }));
  };

  const handleSave = async () => {
    if (!Object.values(scores).some(s => s !== null)) {
      alert('Veuillez saisir au moins un score.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(scores);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer cette entrée de l\'historique ?\nCette action est irréversible.')) {
      onDelete(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-start justify-center p-4 pt-12 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-300 mb-12">
        {/* Header - matching VisitModal style */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2">
              <Star size={20} className="text-[#2E75B6]" fill="#2E75B6" />
              <h3 className="font-bold text-[#1F3864] text-xl">Auto-positionnement</h3>
            </div>
            <p className="text-xs text-gray-400 font-medium mt-1">
              Gestion des scores déclaratifs — <span className="text-gray-600 font-bold">{enseignant['Prénom']} {enseignant['Nom']}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 rounded-2xl text-gray-400 transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-white">
          <button 
            onClick={() => setTab('new')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${tab === 'new' ? 'text-[#2E75B6] border-b-2 border-[#2E75B6] bg-blue-50/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            <Layout size={14} /> Nouvelle Saisie
          </button>
          <button 
            onClick={() => setTab('history')}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${tab === 'history' ? 'text-[#2E75B6] border-b-2 border-[#2E75B6] bg-blue-50/30' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
          >
            <History size={14} /> Historique ({history.length})
          </button>
        </div>

        <div className="p-6 md:p-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-gray-50/30">
          {tab === 'new' ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3 text-blue-700 text-xs leading-relaxed">
                <Info size={18} className="shrink-0 text-[#2E75B6]" />
                <p>
                  Saisissez les scores actuels de l'enseignant. Ces données écrasent temporairement les scores de base pour le calcul de priorité. 
                  L'historique complet est conservé.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {Object.entries(competences).map(([code, label]) => (
                  <div key={code} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow hover:border-blue-100 transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-[#2E75B6] bg-blue-50 px-2 py-0.5 rounded-lg font-mono">{code}</span>
                        <p className="text-sm font-bold text-[#1F3864]">{label.replace(/^C\d+ — /, '')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(val => (
                        <button
                          key={val}
                          onClick={() => handleScoreChange(code, val)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                            scores[code] === val 
                              ? 'bg-[#2E75B6] text-white shadow-lg shadow-blue-200 scale-105' 
                              : 'bg-gray-50 text-gray-400 border border-transparent hover:border-blue-200 hover:text-blue-400 hover:bg-white'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                      <button
                        onClick={() => handleScoreChange(code, null)}
                        className={`ml-2 p-2 rounded-xl transition-all ${scores[code] === null ? 'text-gray-300' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                        disabled={scores[code] === null}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <History size={40} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm">Aucun historique de saisie manuelle.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((entry) => (
                    <div key={entry.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-50 p-2 rounded-xl text-gray-500">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1F3864]">
                              Saisie du {new Date(entry.recordedAt).toLocaleDateString('fr-FR')}
                            </p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              {new Date(entry.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDelete(entry.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Supprimer cette entrée"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {Object.entries(entry.scores).map(([code, score]) => (
                          score && (
                            <div key={code} className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 flex items-center gap-2">
                              <span className="text-[10px] font-bold font-mono text-gray-400">{code}</span>
                              <span className="text-xs font-bold text-[#2E75B6]">{score}/5</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - matching VisitModal style */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest hidden sm:block">
            {tab === 'new' ? 'Données déclaratives §2.6' : 'Audit historique §5.1'}
          </p>
          <div className="flex gap-3 w-full sm:w-auto">
            <button onClick={onClose} className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
              Fermer
            </button>
            {tab === 'new' && (
              <button 
                onClick={handleSave}
                disabled={isSubmitting || !Object.values(scores).some(s => s !== null)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-10 py-2.5 text-sm font-bold text-white bg-[#2E75B6] hover:bg-[#1F3864] rounded-2xl shadow-xl shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
              >
                <Check size={18} />
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
