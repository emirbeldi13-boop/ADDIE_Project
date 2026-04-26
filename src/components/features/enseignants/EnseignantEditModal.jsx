import { useState, useEffect, useMemo } from 'react';
import { X, Save, RotateCcw, Plus, Star, Shield, Pencil, AlertCircle } from 'lucide-react';
import { monthsDiff } from '../../../utils/dateUtils';

const NIVEAUX_OPTIONS = [
  '3ème et 4ème secondaire',
  '3ème secondaire',
  '4ème secondaire',
  '1ère et 2ème secondaire',
];

// Utility to convert JJ/MM/AAAA to YYYY-MM-DD for <input type="date">
function toISO(frDate) {
  if (!frDate || frDate === '—') return '';
  const parts = frDate.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

// Utility to convert YYYY-MM-DD to JJ/MM/AAAA
function toFR(isoDate) {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function Field({ label, children, required, hint, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-tight mb-1.5 ml-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1 ml-1">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options, disabled, isSync }) {
  return (
    <div className="relative">
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 bg-white disabled:bg-gray-50 transition-all ${
          isSync ? 'border-[#2E75B6] bg-blue-50/30' : 'border-gray-200'
        }`}
      >
        {options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      {isSync && (
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#2E75B6] rounded-full border-2 border-white shadow-sm animate-pulse flex items-center justify-center" title="Synchronisé">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
}

function StyledInput({ value, onChange, type = 'text', placeholder, className = '', disabled, isSync }) {
  return (
    <div className="relative group">
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 transition-all ${
          disabled ? 'bg-gray-50/80 text-gray-500 cursor-not-allowed border-gray-100 font-medium' : 
          isSync ? 'border-[#2E75B6] bg-blue-50/30 font-semibold text-[#1F3864]' : 'border-gray-200'
        } ${className}`}
      />
      {isSync && (
        <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#2E75B6] rounded-full border-2 border-white shadow-sm animate-pulse flex items-center justify-center z-10" title="Synchronisé">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}
      {disabled && isSync && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 group-hover:text-[#2E75B6] transition-colors" title="Géré par l'historique des visites">
          <Shield size={12} fill="currentColor" opacity={0.5} />
        </div>
      )}
    </div>
  );
}

export function EnseignantEditModal({ enseignant, formations, crefocs, visits, isNew, onSave, onClose }) {
  const circosList = Object.keys(crefocs || {});
  
  const latestVisitFromHistory = useMemo(() => {
    if (!enseignant || !visits) return null;
    const ensVisits = (visits[enseignant.ID] || []).filter(v => !v.deleted && v.visitType === 'official');
    if (ensVisits.length === 0) return null;
    return ensVisits[0];
  }, [enseignant, visits]);

  const BLANK = {
    'Prénom': '',
    'Nom': '',
    'Sexe': 'M',
    'Circonscription': circosList[0] || '',
    'Code Lycée': '',
    'Nom du Lycée': '',
    'Ville': '',
    'Niveaux': '3ème et 4ème secondaire',
    'Statut': 'Titulaire',
    'Année stage': '—',
    'Ancienneté (ans)': '',
    'Effectif moy.': '',
    'Note dernière visite /20': '',
    'Date dernière visite': '',
    'Délai depuis visite (mois)': '',
    'Observateur': '',
    'Dispo F1': 'Oui',
    'Dispo F2': 'Oui',
    'Dispo F3': 'Oui',
    'Verbatim d\'observation': '',
  };

  const [form, setForm] = useState(() => ({ ...BLANK, ...(enseignant || {}) }));
  const [errors, setErrors] = useState({});
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setForm({ ...BLANK, ...(enseignant || {}) });
  }, [enseignant]);

  function handleSync() {
    if (!latestVisitFromHistory) return;
    setForm(f => ({
      ...f,
      'Date dernière visite': latestVisitFromHistory.date,
      'Note dernière visite /20': latestVisitFromHistory.note20 ?? '—',
      'Observateur': latestVisitFromHistory.observer ?? '—',
      'Verbatim d\'observation': latestVisitFromHistory.appreciation || f['Verbatim d\'observation']
    }));
    setNotification({ type: 'success', text: 'Profil synchronisé avec l\'historique !' });
    setTimeout(() => setNotification(null), 3000);
  }

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n; });
  }

  function validate() {
    const errs = {};
    if (!form['Prénom']?.trim()) errs['Prénom'] = 'Requis';
    if (!form['Nom']?.trim()) errs['Nom'] = 'Requis';
    if (!form['Circonscription']) errs['Circonscription'] = 'Requis';
    if (!form['Nom du Lycée']?.trim()) errs['Nom du Lycée'] = 'Requis';
    if (!form['Ville']?.trim()) errs['Ville'] = 'Requis';
    if (form['Note dernière visite /20'] !== '' && form['Note dernière visite /20'] !== '—') {
      const n = parseFloat(form['Note dernière visite /20']);
      if (isNaN(n) || n < 0 || n > 20) {
        errs['Note dernière visite /20'] = 'Entre 0 et 20';
      } else {
        const decimal = Math.round((n % 1) * 10) / 10;
        if (decimal !== 0 && decimal !== 0.5) {
          errs['Note dernière visite /20'] = 'Format .0 ou .5 requis';
        }
      }
    }
    return errs;
  }

  useEffect(() => {
    setForm(f => {
      const dateStr = f['Date dernière visite'];
      if (dateStr && dateStr.length === 10 && dateStr.includes('/')) {
        const diff = monthsDiff(dateStr);
        if (diff !== null) {
          const calculatedDelai = String(diff);
          if (f['Délai depuis visite (mois)'] !== calculatedDelai) {
            return { ...f, 'Délai depuis visite (mois)': calculatedDelai };
          }
        }
      }
      return f;
    });
  }, [form['Date dernière visite']]);

  function handleSave() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const clean = {};
    Object.entries(form).forEach(([k, v]) => {
      clean[k] = (v === '' || v === null || v === undefined) ? '—' : v;
    });

    onSave(clean);
    onClose();
  }

  const isStatutStagiaire = form['Statut'] === 'Stagiaire';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl border border-gray-100 overflow-hidden transform animate-in slide-in-from-bottom-8 duration-500">
        
        {/* Notification Feedback */}
        {notification && (
          <div className="absolute top-0 left-0 right-0 z-[60] py-2.5 px-6 flex items-center justify-center gap-2 text-xs font-bold bg-emerald-500 text-white animate-in slide-in-from-top duration-300">
             <Save size={14} className="animate-bounce" />
             {notification.text}
          </div>
        )}

        {/* Header Section */}
        <div className="relative px-8 py-8 border-b border-gray-50 bg-gradient-to-br from-gray-50/80 via-white to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[24px] bg-[#1F3864] flex items-center justify-center text-white text-2xl font-black shadow-2xl shadow-blue-900/20 ring-4 ring-white">
                {isNew ? <Plus size={32} /> : (form['Prénom']?.[0] || 'E')}
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#1F3864] tracking-tight">
                  {isNew ? 'Ajout Enseignant' : `${form['Prénom']} ${form['Nom']}`}
                </h2>
                {!isNew && (
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-black text-[#2E75B6] uppercase tracking-wider border border-blue-100">
                      ID: {enseignant?.['ID']}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">Dernière modification: Aujourd'hui</span>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 rounded-2xl hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-all border border-transparent hover:border-gray-200"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="px-8 py-8 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Smart Sync Section */}
          {!isNew && latestVisitFromHistory && (
             <div className="bg-gradient-to-r from-[#2E75B6]/5 to-transparent border border-[#2E75B6]/20 rounded-3xl p-5 flex items-center justify-between gap-6 group hover:border-[#2E75B6]/40 transition-all">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-white rounded-2xl text-[#2E75B6] shadow-xl shadow-blue-900/5 group-hover:scale-110 transition-transform">
                      <RotateCcw size={20} />
                   </div>
                   <div>
                      <p className="text-sm font-black text-[#1F3864]">Synchronisation Intelligente</p>
                      <p className="text-[11px] text-gray-500 leading-tight mt-1">
                         Une visite officielle du <span className="text-[#2E75B6] font-bold">{latestVisitFromHistory.date}</span> a été détectée.<br/>Voulez-vous mettre à jour le profil ?
                      </p>
                   </div>
                </div>
                <button 
                  onClick={handleSync}
                  className="px-5 py-2.5 text-[11px] font-black bg-[#2E75B6] text-white rounded-xl hover:bg-[#1F3864] transition-all shadow-lg shadow-blue-900/10 active:scale-95 whitespace-nowrap"
                >
                  Mettre à jour
                </button>
             </div>
          )}

          {/* Profile Core */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-500">
                <Star size={14} fill="currentColor" />
              </div>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Profil & Statut</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Prénom" required>
                <StyledInput value={form['Prénom']} onChange={v => set('Prénom', v)} placeholder="Takoua" />
                {errors['Prénom'] && <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1 font-bold"><AlertCircle size={10}/> {errors['Prénom']}</p>}
              </Field>
              <Field label="Nom" required>
                <StyledInput value={form['Nom']} onChange={v => set('Nom', v)} placeholder="Chebbi" />
                {errors['Nom'] && <p className="text-[10px] text-red-500 mt-1.5 flex items-center gap-1 font-bold"><AlertCircle size={10}/> {errors['Nom']}</p>}
              </Field>
              <Field label="Genre">
                <Select value={form['Sexe']} onChange={v => set('Sexe', v)} options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} />
              </Field>
              <Field label="Statut Professionnel">
                <Select
                  value={form['Statut']}
                  onChange={v => set('Statut', v)}
                  options={['Titulaire', 'Stagiaire', 'Titulaire (en attente)']}
                />
              </Field>
              {isStatutStagiaire && (
                <Field label="Année de stage" hint="Cycle administratif">
                  <StyledInput value={form['Année stage']} onChange={v => set('Année stage', v)} placeholder="1" type="number" />
                </Field>
              )}
              {form['Statut']?.includes('Titulaire') && (
                <Field label="Ancienneté cumulative">
                  <StyledInput value={form['Ancienneté (ans)']} onChange={v => set('Ancienneté (ans)', v)} type="number" placeholder="12" />
                </Field>
              )}
            </div>
          </section>

          {/* Location details */}
          <section className="p-7 bg-blue-50/30 rounded-[32px] border border-blue-100/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-1.5 rounded-lg bg-blue-100 text-[#2E75B6]">
                <Shield size={14} fill="currentColor" />
              </div>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Affectation & Zone</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Circonscription" required>
                <Select value={form['Circonscription']} onChange={v => set('Circonscription', v)} options={circosList} />
              </Field>
              <Field label="Ville de résidence" required>
                <StyledInput value={form['Ville']} onChange={v => set('Ville', v)} placeholder="Béja" />
              </Field>
              <Field label="Établissement scolaire" required className="sm:col-span-2">
                <StyledInput value={form['Nom du Lycée']} onChange={v => set('Nom du Lycée', v)} placeholder="Lycée Habib Bourguiba" />
              </Field>
              <Field label="Niveaux enseignés">
                <Select value={form['Niveaux']} onChange={v => set('Niveaux', v)} options={NIVEAUX_OPTIONS} />
              </Field>
              <Field label="Note administrative">
                <StyledInput value={form['Code Lycée']} onChange={v => set('Code Lycée', v)} placeholder="Code Étab." />
              </Field>
            </div>
          </section>

          {/* Historical Results */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                <Pencil size={14} fill="currentColor" />
              </div>
              <div className="flex-1">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Indicateurs Pédagogiques</h3>
                {latestVisitFromHistory && (
                   <p className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5 flex items-center gap-1">
                      <Shield size={10} fill="currentColor" /> Valeurs liées à l'historique des visites
                   </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field
                label={isStatutStagiaire ? "Note Accompagnement" : "Dernière Note /20"}
                hint="Norme §5.2"
              >
                <StyledInput
                  value={form['Note dernière visite /20']}
                  onChange={v => set('Note dernière visite /20', v)}
                  type="number"
                  placeholder="15.0"
                  disabled={!!latestVisitFromHistory}
                  isSync={!isNew && latestVisitFromHistory && form['Note dernière visite /20'] == latestVisitFromHistory.note20}
                />
                {errors['Note dernière visite /20'] && (
                  <p className="text-[10px] text-red-500 mt-1.5 font-bold">{errors['Note dernière visite /20']}</p>
                )}
              </Field>
              <Field label="Date de l'acte" hint={latestVisitFromHistory ? "Dernière inspection" : "JJ/MM/AAAA"}>
                <StyledInput
                  type="date"
                  value={toISO(form['Date dernière visite'])}
                  onChange={v => set('Date dernière visite', toFR(v))}
                  disabled={!!latestVisitFromHistory}
                  isSync={!isNew && latestVisitFromHistory && form['Date dernière visite'] == latestVisitFromHistory.date}
                />
              </Field>
              <Field label="Observateur Référent">
                <StyledInput
                  value={form['Observateur']}
                  onChange={v => set('Observateur', v)}
                  placeholder="Prénom Nom"
                  disabled={!!latestVisitFromHistory}
                  isSync={!isNew && latestVisitFromHistory && form['Observateur'] == latestVisitFromHistory.observer}
                />
              </Field>
              <Field label="Délai automatique (mois)">
                <StyledInput
                  value={form['Délai depuis visite (mois)']}
                  onChange={() => {}} 
                  type="number"
                  disabled
                  className="bg-gray-50 italic opacity-60"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Synthèse globale">
                  <textarea
                    value={form['Verbatim d\'observation'] || ''}
                    onChange={e => set('Verbatim d\'observation', e.target.value)}
                    rows={4}
                    placeholder="Points forts et axes de progrès..."
                    className="w-full border border-gray-200 rounded-[20px] px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]/20 bg-gray-50/50 min-h-[100px] resize-none"
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Course Availability */}
          <section className="pb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-500">
                <Plus size={14} fill="currentColor" />
              </div>
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Disponibilité Formations</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(formations || {}).map(([id, f]) => {
                const key = `Dispo ${id}`;
                return (
                  <div key={id} className="p-4 bg-[#1F3864]/[0.02] rounded-2xl border border-gray-100 flex flex-col gap-3">
                    <p className="text-[10px] font-black text-[#1F3864] uppercase tracking-tighter opacity-80 truncate">{id}</p>
                    <Select
                      value={form[key] || 'Oui'}
                      onChange={v => set(key, v)}
                      options={[
                        { value: 'Oui', label: 'Disponible' },
                        { value: 'Non', label: 'Inapte' },
                        { value: 'En attente', label: 'Vérif.' },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Dynamic Footer */}
        <div className="flex items-center justify-between gap-6 px-10 py-8 bg-gray-50/80 backdrop-blur-md border-t border-gray-100">
          {!isNew ? (
            <button
              onClick={() => { setForm({ ...BLANK, ...(enseignant || {}) }); setErrors({}); }}
              className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-red-500 transition-all uppercase tracking-widest group"
            >
              <RotateCcw size={14} className="group-hover:rotate-[-90deg] transition-all duration-500" /> 
              Restaurer l'original
            </button>
          ) : <div />}
          
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-3 px-10 py-3.5 text-sm font-black bg-[#1F3864] text-white rounded-[20px] hover:bg-[#2E75B6] transition-all shadow-xl shadow-blue-900/20 hover:shadow-blue-900/30 active:scale-95"
            >
              <Save size={18} /> {isNew ? 'Créer Profile' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
