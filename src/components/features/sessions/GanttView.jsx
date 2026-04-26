import { useState, useMemo } from 'react';
import { Tooltip } from '../../ui/Tooltip';
import { CircoBadge } from '../../ui/Badge';
import { formatDate } from '../../../utils/exportHelpers';
import { Calendar, Clock, Check, MapPin, Users, Info, ChevronRight } from 'lucide-react';

import { parseDate } from '../../../utils/dateUtils';

export function GanttView({ sessions, store, onEdit }) {
  const [hoveredSession, setHoveredSession] = useState(null);
  const [cursorX, setCursorX] = useState(0);

  // ── Dynamic Timeline Range & Month Grid ───────────────────────────────────
  const { start, end, years, monthColumns } = useMemo(() => {
    if (sessions.length === 0) {
      const s = new Date('2026-09-01');
      const e = new Date('2027-07-31');
      return { start: s, end: e, years: [], monthColumns: [] };
    }

    const dates = sessions.flatMap(s => [
      parseDate(s['Date (Samedi)']),
      parseDate(s['Date ARE (J+42 approx.)'])
    ]).filter(d => d && !isNaN(d));

    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Pad range for visual comfort
    const rangeStart = new Date(minDate.getFullYear(), minDate.getMonth() - 1, 1);
    const rangeEnd = new Date(maxDate.getFullYear(), maxDate.getMonth() + 4, 0);

    const cols = [];
    const ys = {};
    let cur = new Date(rangeStart);
    while (cur <= rangeEnd) {
      const year = cur.getFullYear();
      if (!ys[year]) ys[year] = { label: year, count: 0 };
      ys[year].count++;
      
      cols.push({
        label: cur.toLocaleDateString('fr-FR', { month: 'narrow' }).toUpperCase(),
        fullName: cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        date: new Date(cur)
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    return { start: rangeStart, end: rangeEnd, years: Object.values(ys), monthColumns: cols };
  }, [sessions]);

  const pct = (d) => {
    const date = typeof d === 'string' ? parseDate(d) : d;
    if (!date || isNaN(date)) return 0;
    const progress = ((date - start) / (end - start)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const circosList = Object.keys(store.crefocs || {});
  const groupedSessions = useMemo(() => {
    const groups = {};
    circosList.forEach(c => groups[c] = sessions.filter(s => s['Circonscription'] === c)
      .sort((a, b) => parseDate(a['Date (Samedi)']) - parseDate(b['Date (Samedi)']))
    );
    return groups;
  }, [sessions]);

  const sortedSessions = [...sessions].sort((a, b) => parseDate(a['Date (Samedi)']) - parseDate(b['Date (Samedi)']));

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setCursorX(x);
  };

  return (
    <div className="space-y-6">
      {/* ── Desktop: Enterprise Gantt 2.0 ── */}
      <div className="hidden lg:block bg-white/70 backdrop-blur-xl rounded-[32px] border border-white shadow-2xl overflow-hidden min-h-[600px]">
        
        <div className="flex h-[750px]">
          
          {/* ── LEFT PANEL: Session Intelligence ── */}
          <div className="w-[400px] shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/30">
            <div className="h-[88px] bg-gradient-to-br from-[#1F3864] to-[#2E75B6] p-6 flex items-end">
              <div>
                <h3 className="text-white text-lg font-black tracking-tight flex items-center gap-2">
                  <Calendar size={20} className="text-blue-300" />
                  Missions Actives
                </h3>
                <p className="text-white/40 text-[9px] uppercase tracking-widest font-bold">Synchronisation en temps réel</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-elegant">
              {circosList.map(circo => (
                <div key={circo}>
                  <div className="sticky top-0 z-10 bg-white/80 backdrop-blur px-6 py-3 border-y border-gray-100/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-[#1F3864] uppercase tracking-[0.2em]">{circo}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{groupedSessions[circo].length} sessions</span>
                    </div>
                  </div>
                  
                  <div className="p-3 space-y-2">
                    {groupedSessions[circo].map(s => {
                      const formation = store.formations[s['Formation']] || { color: '#6B7280' };
                      const isHovered = hoveredSession === s['ID Session'];
                      return (
                        <div 
                          key={s['ID Session']} 
                          onMouseEnter={() => setHoveredSession(s['ID Session'])}
                          onMouseLeave={() => setHoveredSession(null)}
                          onClick={() => onEdit(s)}
                          className={`group relative p-4 rounded-2xl transition-all cursor-pointer ${
                            isHovered ? 'bg-white shadow-lg ring-1 ring-blue-500/20 translate-x-1' : 'hover:bg-white/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-1.5 h-10 rounded-full shrink-0"
                              style={{ backgroundColor: formation.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold text-[#2E75B6]">{s['Formation']}</span>
                                <span className="text-[10px] text-gray-400 font-bold">
                                  {formatDate(s['Date (Samedi)'])}
                                </span>
                              </div>
                              <h4 className="text-xs font-black text-[#1F3864] truncate mb-1 flex items-center gap-2">
                                {s['Titre formation'] || formation.libelle}
                                {s._isEdited && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.5)]" title="Session Modifiée" />}
                              </h4>
                              <div className="flex items-center gap-2 text-[9px] text-gray-400">
                                <MapPin size={10} /> {s['Lieu']}
                                <Users size={10} className="ml-1" /> {s['Nb inscrits']}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT PANEL: Interactive Timeline ── */}
          <div 
            className="flex-1 overflow-x-auto overflow-y-hidden bg-[#F8FAFC]/50 scrollbar-elegant relative group/timeline" 
            onMouseMove={handleMouseMove}
          >
            <div style={{ width: monthColumns.length * 80 }} className="h-full relative">
              
              {/* Timeline Header (Glassmorphism) */}
              <div className="sticky top-0 z-30 shadow-sm">
                <div className="flex bg-[#1F3864] text-white h-[44px]">
                  {years.map(y => (
                    <div 
                      key={y.label} 
                      className="border-r border-white/10 flex items-center justify-center text-[11px] font-black tracking-[0.4em]"
                      style={{ width: y.count * 80 }}
                    >
                      {y.label}
                    </div>
                  ))}
                </div>
                <div className="flex bg-white/80 backdrop-blur h-[44px] border-b border-gray-100 shadow-sm">
                  {monthColumns.map((m, i) => (
                    <div 
                      key={i} 
                      className="flex-shrink-0 w-[80px] border-r border-gray-100/50 flex flex-col items-center justify-center"
                    >
                      <span className="text-[10px] font-black text-[#1F3864]">{m.label}</span>
                      <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{m.fullName.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid content */}
              <div className="relative h-full pt-[88px]">
                {/* Vertical Cursor Tracking Line */}
                <div 
                  className="absolute top-0 bottom-0 w-px bg-blue-500/20 z-20 pointer-events-none transition-opacity opacity-0 group-hover/timeline:opacity-100"
                  style={{ left: cursorX }}
                >
                  <div className="absolute top-[92px] left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-500 text-white text-[8px] font-bold rounded shadow-lg">
                    {/* Display date under cursor optionally */}
                  </div>
                </div>

                {/* Vertical Grid Background */}
                <div className="absolute inset-0 flex pointer-events-none">
                  {monthColumns.map((_, i) => (
                    <div key={i} className="w-[80px] h-full border-r border-gray-100/30" />
                  ))}
                </div>

                {/* Rows mapped to sidebar */}
                <div className="flex flex-col">
                  {circosList.map(circo => (
                    <div key={circo}>
                      {/* Space for circo header */}
                      <div className="h-[43px]" /> 
                      
                      <div className="p-3 space-y-2">
                        {groupedSessions[circo].map(s => {
                          const sDate = parseDate(s['Date (Samedi)']);
                          const areDate = parseDate(s['Date ARE (J+42 approx.)']);
                          const formation = store.formations[s['Formation']] || { color: '#6B7280' };
                          
                          const left = pct(sDate);
                          const endPct = areDate ? pct(areDate) : left + 2;
                          const width = endPct - left;

                          const isFinished = sDate && sDate < new Date();
                          const isHovered = hoveredSession === s['ID Session'];

                          return (
                            <div 
                              key={s['ID Session']} 
                              className={`h-[72px] relative transition-all duration-300 ${isHovered ? 'bg-blue-50/30 z-10' : ''}`}
                            >
                              {/* Connector line session -> ARE */}
                              <div 
                                className="absolute top-1/2 -translate-y-1/2 h-px bg-gray-200 border-t border-dashed border-gray-300 pointer-events-none"
                                style={{ left: `${left}%`, width: `${width}%` }}
                              />

                              {/* Start Point (Session) */}
                              <div 
                                className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform ${isHovered ? 'scale-150' : ''} z-10`}
                                style={{ left: `calc(${left}% - 8px)`, backgroundColor: formation.color }}
                              />

                              {/* ARE Point (Terminal) */}
                              <div 
                                className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-md rotate-45 border-2 border-white shadow-lg transition-transform ${isHovered ? 'scale-150' : ''} z-10`}
                                style={{ left: `calc(${endPct}% - 6px)`, backgroundColor: formation.color }}
                              />

                              {/* Hover Tooltip / Floating Card */}
                              <div 
                                onClick={() => onEdit(s)}
                                className={`absolute top-1/2 -translate-y-1/2 h-10 rounded-xl px-4 flex items-center transition-all duration-500 cursor-pointer shadow-xl overflow-hidden ${
                                  isHovered ? 'opacity-100 scale-105' : 'opacity-0 scale-95 pointer-events-none'
                                }`}
                                style={{ 
                                  left: `${left}%`, 
                                  backgroundColor: formation.color,
                                  minWidth: '200px'
                                }}
                              >
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center gap-2 relative z-10 w-full">
                                  {isFinished ? <Check size={14} className="text-white" /> : <Clock size={14} className="text-white/80" />}
                                  <span className="text-[10px] font-black text-white uppercase truncate flex-1 leading-none">
                                    {s['Formation']} — Terminaison {formatDate(s['Date ARE (J+42 approx.)'])}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile view: Modern Card Layout ── */}
      <div className="lg:hidden space-y-4">
        <h3 className="px-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Chronologie Mobilité</h3>
        {sortedSessions.map(s => {
          const formation = store.formations[s['Formation']] || { color: '#6B7280' };
          const sDate = parseDate(s['Date (Samedi)']);
          const isFinished = sDate && sDate < new Date();
          
          return (
            <div 
              key={s['ID Session']} 
              onClick={() => onEdit(s)}
              className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-4 flex items-center gap-4 transition-transform active:scale-[0.98]"
            >
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-[10px] shrink-0 shadow-lg relative overflow-hidden"
                style={{ backgroundColor: formation.color }}
              >
                <div className="absolute inset-0 bg-black/5" />
                <span className="relative z-10">{s['Formation']}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                   <CircoBadge circo={s['Circonscription']} size="sm" />
                   <span className="text-[9px] font-bold text-gray-400">{formatDate(s['Date (Samedi)'])}</span>
                </div>
                <h4 className="font-bold text-[#1F3864] text-xs truncate">{s['Titre formation']}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 text-[9px] text-gray-400">
                    <MapPin size={10} /> {s['Lieu']}
                  </div>
                  <div className={`flex items-center gap-1 text-[9px] font-bold ${isFinished ? 'text-green-500' : 'text-blue-500'}`}>
                    {isFinished ? <Check size={10} /> : <Clock size={10} />}
                    {isFinished ? 'Terminée' : 'Planifiée'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
