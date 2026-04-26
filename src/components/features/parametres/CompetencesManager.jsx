import { useState } from 'react';
import { Edit2, Check, X, BookOpen, Plus, Trash2 } from 'lucide-react';

export function CompetencesManager({ competences, updateCompetence, addCompetence, deleteCompetence }) {
  const [editingCode, setEditingCode] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  const [isAdding, setIsAdding] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const startEdit = (code, currentLabel) => {
    setEditingCode(code);
    setEditValue(currentLabel);
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditValue('');
  };

  const saveEdit = () => {
    updateCompetence(editingCode, editValue);
    setEditingCode(null);
  };

  const handleAdd = () => {
    if (!newCode.trim() || !newLabel.trim()) return;
    addCompetence(newCode.trim().toUpperCase(), newLabel.trim());
    setIsAdding(false);
    setNewCode('');
    setNewLabel('');
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[#1F3864]">Référentiel de Compétences (RCET)</h3>
          <p className="text-xs text-gray-400">Gérez le référentiel de compétences de l'application</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2E75B6] text-white rounded-lg text-xs font-semibold hover:bg-[#1F3864] transition-colors"
        >
          <Plus size={14} /> Ajouter une compétence
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
        {Object.entries(competences).map(([code, label]) => (
          <div key={code} className="group p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            {editingCode === code ? (
              <div className="flex-1 flex items-center gap-3">
                <span className="font-mono font-bold text-[#2E75B6] w-12 flex-shrink-0 text-sm">
                  {code}
                </span>
                <input 
                  autoFocus
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#2E75B6]/20 focus:outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                />
                <div className="flex items-center gap-1">
                  <button onClick={saveEdit} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <Check size={18} />
                  </button>
                  <button onClick={cancelEdit} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#2E75B6] font-mono font-bold text-sm flex-shrink-0">
                    {code}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm text-gray-700 leading-snug">{label}</p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Libellé officiel</p>
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                  <button onClick={() => startEdit(code, label)} className="p-2 text-gray-400 hover:text-[#2E75B6] hover:bg-blue-50 rounded-lg transition-all">
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Supprimer la compétence ${code} ?\nAttention : cela n'effacera pas l'historique brut, mais la masquera des futurs calculs.`)) {
                        deleteCompetence(code);
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {isAdding && (
          <div className="p-4 bg-blue-50/50 flex flex-col gap-3 border-t border-blue-100">
            <h4 className="text-xs font-semibold text-[#1F3864]">Nouvelle compétence</h4>
            <div className="flex items-center gap-3">
              <input 
                placeholder="Code (ex: C8)"
                className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono uppercase"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
              <input 
                placeholder="Libellé complet de la compétence"
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
              <div className="flex items-center gap-1">
                <button onClick={handleAdd} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsAdding(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3 text-xs text-amber-800">
        <BookOpen className="text-amber-500 flex-shrink-0" size={16} />
        <div>
          <p className="font-semibold mb-1">Impact des modifications dynamiques</p>
          <p className="opacity-80">
            L'ajout ou la suppression de compétences modifie automatiquement les formulaires d'évaluation (checklist de visite) 
            et la configuration des formations. Les anciennes données resteront conservées dans le système, mais les compétences 
            supprimées ne seront plus affichées ni calculées.
          </p>
        </div>
      </div>
    </div>
  );
}
