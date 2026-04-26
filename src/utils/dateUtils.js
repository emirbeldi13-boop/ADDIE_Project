/**
 * Shared date utilities for PedagoTrack
 * All dates in the app use French format DD/MM/YYYY
 */

/**
 * Robust date parser for PedagoTrack
 * Handles:
 *  - French format: DD/MM/YYYY
 *  - ISO format: YYYY-MM-DD
 *  - Placeholder "—"
 * Returns null if invalid
 */
export function parseDate(str) {
  if (!str || str === '—') return null;
  
  // Handle FR format DD/MM/YYYY
  if (typeof str === 'string' && str.includes('/')) {
    const parts = str.split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
    if (d < 1 || d > 31 || m < 1 || m > 12) return null;
    return new Date(y, m - 1, d);
  }

  // Handle ISO format or native Date string
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Legacy: Parse a French DD/MM/YYYY string into a Date object
 * Re-routed to the new shared parseDate
 */
export function parseFRDate(str) {
  return parseDate(str);
}

/**
 * Format a Date object as DD/MM/YYYY
 */
export function toFRDate(date) {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d || isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export const formatDate = toFRDate;

/**
 * Format a Date object or string to ISO YYYY-MM-DD
 */
export function toISO(date) {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

/**
 * Convert French DD/MM/YYYY to ISO YYYY-MM-DD (for <input type="date">)
 */
export function frToISO(frStr) {
  if (!frStr || frStr === '—') return '';
  const parts = frStr.split('/');
  if (parts.length !== 3) return '';
  return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
}

/**
 * Convert ISO YYYY-MM-DD to French DD/MM/YYYY
 */
export function isoToFR(isoStr) {
  if (!isoStr) return '—';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return '—';
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Add days to a French date string, return French date string
 */
export function addDays(frDateStr, days) {
  const d = parseFRDate(frDateStr);
  if (!d) return '—';
  d.setDate(d.getDate() + days);
  return toFRDate(d);
}

/**
 * Calculate months difference between a French date and now
 */
export function monthsDiff(frDateStr) {
  const d = parseFRDate(frDateStr);
  if (!d) return null;
  const now = new Date();
  return Math.max(0, (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()));
}
