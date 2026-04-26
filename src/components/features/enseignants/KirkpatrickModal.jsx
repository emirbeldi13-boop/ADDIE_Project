import { useState } from 'react';
import { X, Save, Smile, BookOpen, Repeat, AlertCircle, Info } from 'lucide-react';
import { calculateN2Delta } from '../../../utils/kirkpatrickHelpers';

export function KirkpatrickModal({ enseignant, formationId, existingData, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('N1');
  
  // Local state for all fields
  const [n1Data, setN1Data] = useState({
    percentile: existingData?.N1?.['Score global /5'] || '',
    missing: existingData?.N1?.missing || false,
    ...existingData?.N1
  });

  const [n2Data, setN2Data] = useState({
    preTest: existingData?.N2?.['Pré-test /5'] || '',
    postTest: existingData?.N2?.['Post-test /5'] || '',
    missing: existingData?.N2?.missing || false,
    missingReason: existingData?.N2?.missingReason || '',
    ...existingData?.N2
  });

  const [n3Data, setN3Data] = useState({
    papScore: existingData?.N3?.['Score transfert /5'] || '',
    papSource: existingData?.N3?.['Méthode post-éval'] || 'Observation directe',
    adoptionScore: existingData?.N3?.['Adoption /5'] || '',
    statut: existingData?.N3?.['Statut'] || existingData?.N2?.['Statut'] || 'Non réalisé',
    otAtteint: existingData?.N3?.['OT atteint'] || existingData?.N2?.['OT atteint'] || 'Non',
    support: existingData?.N3?.['Soutien'] || '',
    resources: existingData?.N3?.['Ressources'] || '',
    blockers: existingData?.N3?.['Freins'] || '',
    objectivesScore: existingData?.N3?.['Objectifs atteints /5'] || '',
    missing: existingData?.N3?.missing || false,
    missingReason: existingData?.N3?.missingReason || '',
    ...existingData?.N3
  });

  const handleSave = () => {
    // Logic to calculate delta for N2
    const n2Delta = calculateN2Delta(n2Data.preTest, n2Data.postTest);
    
    const payload = {
      N1: {
        ...n1Data,
        level: 1,
        'Score global /5': n1Data.percentile,
        updatedAt: new Date().toISOString()
      },
      N2: {
        ...n2Data,
        level: 2,
        'Pré-test /5': n2Data.preTest,
        'Post-test /5': n2Data.postTest,
        'Delta progression': n2Delta,
        'OT atteint': n3Data.otAtteint,
        updatedAt: new Date().toISOString()
      },
      N3: {
        ...n3Data,
        level: 3,
        'Statut': n3Data.statut,
        'OT atteint': n3Data.otAtteint,
        'Score transfert /5': n3Data.papScore,
        '% réalisation': n3Data.statut === 'Effectif' ? '100.0%' : 
                         n3Data.statut === 'Partiel' ? '50.0%' : 
                         n3Data.statut === 'Insuffisant' ? '20.0%' : '0.0%',
        'Méthode post-éval': n3Data.papSource,
        'Adoption /5': n3Data.adoptionScore,
        'Soutien': n3Data.support,
        'Ressources': n3Data.resources,
        'Freins': n3Data.blockers,
        'Objectifs atteints /5': n3Data.objectivesScore,
        updatedAt: new Date().toISOString()
      }
    };

    onSave(payload);
    onClose();
  };

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
        activeTab === id 
        ? 'border-[#2E75B6] text-[#2E75B6] bg-blue-50/50' 
        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#1F3864] to-[#2E75B6] text-white">
          <div>
            <h2 className="text-lg font-bold">Évaluation Kirkpatrick — {formationId}</h2>
            <p className="text-xs opacity-80">{enseignant?.['Prénom']} {enseignant?.['Nom']}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          <TabButton id="N1" label="N1: Réaction" icon={Smile} />
          <TabButton id="N2" label="N2: Apprentissage" icon={BookOpen} />
          <TabButton id="N3" label="N3: Transfert" icon={Repeat} />
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'N1' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3 text-sm text-blue-700">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>Niveau 1 : Mesure la satisfaction et la pertinence perçue par l'enseignant.</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score Percentile Satisfaction /5</label>
                <input
                  type="number" step="0.1" min="0" max="5"
                  value={n1Data.percentile}
                  onChange={e => setN1Data({ ...n1Data, percentile: e.target.value })}
                  placeholder="Ex: 4.5"
                  disabled={n1Data.missing}
                  className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox" id="n1_missing"
                  checked={n1Data.missing}
                  onChange={e => setN1Data({ ...n1Data, missing: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="n1_missing" className="text-sm text-gray-600">Données indisponibles</label>
              </div>
            </div>
          )}

          {activeTab === 'N2' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-3 text-sm text-emerald-700">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>Niveau 2 : Mesure l'acquisition de connaissances et compétences.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score Pré-test /5</label>
                  <input
                    type="number" step="0.1" min="0" max="5"
                    value={n2Data.preTest}
                    onChange={e => setN2Data({ ...n2Data, preTest: e.target.value })}
                    disabled={n2Data.missing}
                    className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score Post-test /5</label>
                  <input
                    type="number" step="0.1" min="0" max="5"
                    value={n2Data.postTest}
                    onChange={e => setN2Data({ ...n2Data, postTest: e.target.value })}
                    disabled={n2Data.missing}
                    className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {n2Data.preTest && n2Data.postTest && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="text-sm text-gray-500">Progression calculée (Delta)</span>
                  <span className="text-lg font-bold text-emerald-600">
                    +{calculateN2Delta(n2Data.preTest, n2Data.postTest)}
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox" id="n2_missing"
                    checked={n2Data.missing}
                    onChange={e => setN2Data({ ...n2Data, missing: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="n2_missing" className="text-sm text-gray-600 font-medium">Données indisponibles</label>
                </div>
                {n2Data.missing && (
                  <input
                    type="text"
                    value={n2Data.missingReason}
                    onChange={e => setN2Data({ ...n2Data, missingReason: e.target.value })}
                    placeholder="Préciser la raison (ex: absence au post-test)"
                    className="w-full border border-orange-200 rounded-xl px-4 py-2.5 bg-orange-50/30 text-sm outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'N3' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex gap-3 text-sm text-orange-700">
                <Info size={18} className="shrink-0 mt-0.5" />
                <p>Niveau 3 : Mesure le transfert des acquis en situation de classe.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Score PAP (N3.1) /5</label>
                  <input
                    type="number" step="0.1" min="0" max="5"
                    value={n3Data.papScore}
                    onChange={e => setN3Data({ ...n3Data, papScore: e.target.value })}
                    className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source du score</label>
                  <select
                    value={n3Data.papSource}
                    onChange={e => setN3Data({ ...n3Data, papSource: e.target.value })}
                    className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500/20 outline-none bg-white text-sm"
                  >
                    <option value="Observation directe">Observation directe (Inspecteur/CP)</option>
                    <option value="Auto-évaluation">Auto-évaluation (Enseignant)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Statut du Transfert</label>
                  <select
                    value={n3Data.statut}
                    onChange={(e) => setN3Data({ ...n3Data, statut: e.target.value })}
                    className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#2E75B6]/20 outline-none text-sm"
                  >
                    <option value="Non réalisé">Non réalisé</option>
                    <option value="Insuffisant">Insuffisant</option>
                    <option value="Partiel">Partiel</option>
                    <option value="Effectif">Effectif</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700 mb-1">OT Atteint ?</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 h-[42px]">
                    <button
                      onClick={() => setN3Data({ ...n3Data, otAtteint: 'Oui' })}
                      className={`flex-1 text-xs font-bold rounded-lg transition-all ${n3Data.otAtteint === 'Oui' ? 'bg-[#2E75B6] text-white shadow-sm' : 'text-gray-400'}`}
                    >
                      OUI
                    </button>
                    <button
                      onClick={() => setN3Data({ ...n3Data, otAtteint: 'Non' })}
                      className={`flex-1 text-xs font-bold rounded-lg transition-all ${n3Data.otAtteint === 'Non' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400'}`}
                    >
                      NON
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence d'adoption /5</label>
                  <input
                    type="number" step="0.1" min="0" max="5"
                    value={n3Data.adoptionScore}
                    onChange={e => setN3Data({ ...n3Data, adoptionScore: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs atteints /5</label>
                  <input
                    type="number" step="0.1" min="0" max="5"
                    value={n3Data.objectivesScore}
                    onChange={e => setN3Data({ ...n3Data, objectivesScore: e.target.value })}
                    className="w-full border border-gray-300 bg-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase">Conditions de transfert</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Soutien & Accompagnement</label>
                  <textarea
                    value={n3Data.support}
                    onChange={e => setN3Data({ ...n3Data, support: e.target.value })}
                    rows={2}
                    placeholder="Ex: Soutien actif du conseiller pédagogique..."
                    className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ressources & Outils</label>
                  <textarea
                    value={n3Data.resources}
                    onChange={e => setN3Data({ ...n3Data, resources: e.target.value })}
                    rows={2}
                    placeholder="Ex: Accès restreint à la salle multimédia..."
                    className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Freins & Barrières</label>
                  <textarea
                    value={n3Data.blockers}
                    onChange={e => setN3Data({ ...n3Data, blockers: e.target.value })}
                    rows={2}
                    placeholder="Ex: Charge horaire trop lourde, oubli des concepts..."
                    className="w-full border border-gray-300 bg-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#1F3864] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#2E75B6] transition-all shadow-lg shadow-blue-900/10 active:scale-95"
          >
            <Save size={18} />
            Enregistrer l'évaluation
          </button>
        </div>
      </div>
    </div>
  );
}
