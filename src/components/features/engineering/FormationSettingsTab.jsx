import React from 'react';
import { Settings2, ShieldCheck, Target, ChevronUp, ChevronDown, Plus, AlertCircle } from 'lucide-react';

const FORM_STATUSES = [
  { value: 'En attente', label: 'En attente', color: 'bg-amber-100 text-amber-700' },
  { value: 'Confirmée', label: 'Confirmée', color: 'bg-green-100 text-green-700' },
  { value: 'Annulée', label: 'Annulée', color: 'bg-red-100 text-red-700' }
];

export function FormationSettingsTab({ formation, competences, store, updateFormation, addCompetence }) {
  if (!formation) return null;

  const handleInputChange = (field, value) => {
    updateFormation(formation.id, { [field]: value });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12 pb-20">
      
      {/* 1. Technical Settings Card */}
      <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 border border-white shadow-2xl space-y-8">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-[24px]">
            <Settings2 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#1F3864]">Réglages Techniques</h3>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Identité et planification globale</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Libellé Complet du Programme</label>
            <input 
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-6 py-4 text-sm font-black text-[#1F3864] outline-none transition-all shadow-inner"
              value={formation.libelle || ''}
              onChange={(e) => handleInputChange('libelle', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Circonscription</label>
            <select 
              className="w-full bg-blue-50 border-2 border-blue-100 focus:border-blue-200 rounded-[24px] px-6 py-4 text-sm font-black text-blue-700 outline-none transition-all shadow-inner appearance-none cursor-pointer"
              value={formation.Circonscription || ''}
              onChange={(e) => handleInputChange('Circonscription', e.target.value)}
            >
              <option value="">Nationale (Toutes)</option>
              {store && Object.keys(store.crefocs).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Trimestre Période</label>
            <select 
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-6 py-4 text-sm font-black text-[#1F3864] outline-none transition-all shadow-inner appearance-none cursor-pointer"
              value={formation.trimestre}
              onChange={(e) => handleInputChange('trimestre', e.target.value)}
            >
              <option value="T1">T1 (Nov. 2026)</option>
              <option value="T2">T2 (Fév. 2027)</option>
              <option value="T3">T3 (Mar-Mai 2027)</option>
              <option value="Annuel">Annuel</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Statut Administratif</label>
            <div className="flex flex-wrap gap-2">
              {FORM_STATUSES.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleInputChange('status', s.value)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    formation.status === s.value 
                      ? `${s.color} border-current shadow-lg scale-105` 
                      : 'bg-white border-gray-100 text-gray-300 hover:border-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Identité Visuelle</label>
            <div className="flex gap-4">
              <input 
                type="color"
                className="w-16 h-12 border-none bg-transparent cursor-pointer p-0"
                value={formation.color || '#2E75B6'}
                onChange={(e) => handleInputChange('color', e.target.value)}
              />
              <input 
                className="flex-1 bg-gray-50 border-2 border-transparent focus:border-blue-100 rounded-[24px] px-6 py-4 text-xs font-mono font-black text-[#1F3864] outline-none shadow-inner"
                value={formation.color}
                onChange={(e) => handleInputChange('color', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Objectives & Skills Card */}
      <div className="space-y-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-10 border border-white shadow-2xl space-y-8">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1F3864] flex items-center gap-2">
              <Target size={14} className="text-blue-500" /> Compétences Référentiel
            </h4>
            <span className="text-[10px] text-gray-400 font-bold italic uppercase tracking-tighter">Scoring Prioritaire §2.8</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(competences).map(([cCode, cLabel]) => {
              const current = formation.targetedComps || [];
              const isChecked = current.includes(cCode);
              return (
                <label
                  key={cCode}
                  className={`flex items-start gap-4 p-4 rounded-3xl border-2 transition-all select-none cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50 border-blue-200 shadow-sm text-[#1F3864]'
                      : 'bg-white border-transparent text-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {
                      const next = isChecked ? current.filter(c => c !== cCode) : [...current, cCode];
                      handleInputChange('targetedComps', next);
                    }}
                    className="mt-1 flex-shrink-0 accent-[#2E75B6] w-4 h-4"
                  />
                  <div>
                    <p className="text-xs font-black font-mono">{cCode}</p>
                    <p className="text-[10px] font-bold leading-tight mt-1 opacity-60 uppercase tracking-tighter truncate w-32">{cLabel.replace(/^[A-Z]\d+ — /, '')}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
