import { CONFIG } from '../config.js';

// Today's date in South Africa as YYYY-MM-DD
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CONFIG.timezone }).format(new Date());
}

// "08:15:00" -> "08:15" (for <input type="time">)
export function toTimeInput(value, fallback = '08:15') {
  return value ? String(value).slice(0, 5) : fallback;
}

// "08:15" -> "08:15:00" (for the database)
export function toDbTime(value) {
  const v = String(value || '').trim();
  return /^\d{2}:\d{2}$/.test(v) ? `${v}:00` : v;
}

// "2026-11-04" -> { weekday: "Wed", date: "4 Nov" }
export function formatDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  return {
    weekday: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
    date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  };
}

// Timestamp -> "08:07" in South African time
export function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: CONFIG.timezone
  });
}
