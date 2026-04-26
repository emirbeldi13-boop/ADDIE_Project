import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export function SimpleInputModal({ 
  title, 
  subtitle, 
  initialValue = '', 
  placeholder = '', 
  onSave, 
  onClose,
  isTextarea = false
}) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    if (!value.trim()) return;
    onSave(value.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="font-bold text-[#1F3864] text-lg">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 font-medium">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 rounded-xl text-gray-400 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {isTextarea ? (
            <textarea
              autoFocus
              className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[#2E75B6]/10 focus:outline-none transition-all min-h-[120px] resize-none"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && handleSave()}
            />
          ) : (
            <input
              autoFocus
              className="w-full border border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-[#2E75B6]/10 focus:outline-none transition-all"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          )}
          {isTextarea && <p className="text-[10px] text-gray-400 mt-2 text-right">Ctrl + Enter pour enregistrer</p>}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Annuler</button>
          <button 
            onClick={handleSave}
            disabled={!value.trim()}
            className="flex items-center gap-2 px-8 py-2 text-sm font-bold text-white bg-[#2E75B6] hover:bg-[#1F3864] rounded-xl shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          >
            <Check size={16} />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
