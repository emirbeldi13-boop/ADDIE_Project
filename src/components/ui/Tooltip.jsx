import { useState, useRef } from 'react';
import { GLOSSAIRE, COMPETENCES_RCET } from '../../constants/formations';

/**
 * Tooltip component - 300ms delay as per UX spec
 * Used to show full label when abbreviation is displayed
 */
export function Tooltip({ children, content, delay = 300 }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef(null);

  function show() {
    timer.current = setTimeout(() => setVisible(true), delay);
  }
  function hide() {
    clearTimeout(timer.current);
    setVisible(false);
  }

  return (
    <span className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && content && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap shadow-lg pointer-events-none">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

/**
 * Abbr component - wraps a code/abbreviation with a mandatory tooltip
 */
export function Abbr({ code, fallback }) {
  const label = GLOSSAIRE[code] || COMPETENCES_RCET[code] || fallback || code;
  return (
    <Tooltip content={label}>
      <span className="cursor-help border-b border-dotted border-gray-400">{code}</span>
    </Tooltip>
  );
}
