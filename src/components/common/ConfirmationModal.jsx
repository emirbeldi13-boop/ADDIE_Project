import React from 'react';
import { AlertTriangle, X, ArrowRight, RotateCcw } from 'lucide-react';

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = "Confirmer", 
  cancelLabel = "Annuler",
  variant = "warning" 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        {/* Header decoration */}
        <div className={`h-2 w-full ${variant === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`} />
        
        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
              variant === 'warning' ? 'bg-amber-50 text-amber-600 shadow-amber-500/10' : 'bg-rose-50 text-rose-600 shadow-rose-500/10'
            }`}>
              {variant === 'warning' ? <AlertTriangle size={24} /> : <RotateCcw size={24} />}
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">
            {title}
          </h3>
          
          <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-transparent"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-4 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-slate-900 hover:bg-indigo-600 shadow-slate-900/20'
              }`}
            >
              {confirmLabel}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
