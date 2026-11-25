/* vbClock — shared constants, defaults and small helpers */

'use strict';

const APP_NAME = 'vbClock';
const KEY_SETTINGS = 'vbclock.settings.v1';
const KEY_ALARMS = 'vbclock.alarms.v1';
const KEY_VIEW = 'vbclock.view.v1';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

const pad = (n) => String(n).padStart(2, '0');
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    /* storage may be unavailable — the app still works for this session */
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SOUND_NAMES = [
  ['chime', 'Chime'],
  ['bell', 'Bell'],
  ['beep', 'Beep'],
  ['digital', 'Digital'],
  ['gentle', 'Gentle'],
];

const FONTS = {
  lexend: '"Lexend", "Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  system: '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
  segoe: '"Segoe UI", system-ui, -apple-system, Arial, sans-serif',
  georgia: 'Georgia, "Times New Roman", Times, serif',
  consolas: 'Consolas, "Cascadia Mono", "Courier New", monospace',
  trebuchet: '"Trebuchet MS", Verdana, sans-serif',
};

const FONT_LABELS = {
  lexend: 'Lexend',
  system: 'System',
  segoe: 'Segoe UI',
  georgia: 'Georgia',
  consolas: 'Monospace',
  trebuchet: 'Trebuchet',
};

const ACCENTS = ['auto', '#0067c0', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#16a34a', '#0d9488'];

/* Hand geometry per style: [stroke width, length, tail] */
const HAND_STYLES = {
  slim: { hour: [3.2, 47, 10], minute: [2.1, 67, 13], second: [1.1, 82, 20], pin: 2.6 },
  classic: { hour: [5, 45, 8], minute: [3.4, 65, 11], second: [1.6, 80, 18], pin: 3.2 },
  bold: { hour: [7.2, 42, 6], minute: [4.8, 63, 9], second: [2.2, 78, 16], pin: 4 },
};

/* Curated time zones, grouped for a friendly picker. */
const ZONE_GROUPS = [
  {
    label: 'System',
    zones: [
      ['local', 'Local time'],
      ['custom', 'Custom UTC offset'],
      ['UTC', 'UTC — Coordinated Universal Time'],
    ],
  },
  {
    label: 'Europe',
    zones: [
      ['Europe/London', 'London (UK)'],
      ['Europe/Dublin', 'Dublin (Ireland)'],
      ['Europe/Lisbon', 'Lisbon (Portugal)'],
      ['Europe/Paris', 'Paris (France)'],
      ['Europe/Berlin', 'Berlin (Germany)'],
      ['Europe/Madrid', 'Madrid (Spain)'],
      ['Europe/Rome', 'Rome (Italy)'],
      ['Europe/Amsterdam', 'Amsterdam (Netherlands)'],
      ['Europe/Brussels', 'Brussels (Belgium)'],
      ['Europe/Vienna', 'Vienna (Austria)'],
      ['Europe/Zurich', 'Zurich (Switzerland)'],
      ['Europe/Stockholm', 'Stockholm (Sweden)'],
      ['Europe/Oslo', 'Oslo (Norway)'],
      ['Europe/Copenhagen', 'Copenhagen (Denmark)'],
      ['Europe/Helsinki', 'Helsinki (Finland)'],
      ['Europe/Warsaw', 'Warsaw (Poland)'],
      ['Europe/Prague', 'Prague (Czechia)'],
      ['Europe/Athens', 'Athens (Greece)'],
      ['Europe/Istanbul', 'Istanbul (Türkiye)'],
      ['Europe/Moscow', 'Moscow (Russia)'],
      ['Europe/Kyiv', 'Kyiv (Ukraine)'],
    ],
  },
  {
    label: 'Americas',
    zones: [
      ['America/New_York', 'New York (US Eastern)'],
      ['America/Chicago', 'Chicago (US Central)'],
      ['America/Denver', 'Denver (US Mountain)'],
      ['America/Phoenix', 'Phoenix (US Arizona)'],
      ['America/Los_Angeles', 'Los Angeles (US Pacific)'],
      ['America/Anchorage', 'Anchorage (US Alaska)'],
      ['Pacific/Honolulu', 'Honolulu (US Hawaii)'],
      ['America/Toronto', 'Toronto (Canada Eastern)'],
      ['America/Vancouver', 'Vancouver (Canada Pacific)'],
      ['America/Mexico_City', 'Mexico City (Mexico)'],
      ['America/Bogota', 'Bogotá (Colombia)'],
      ['America/Lima', 'Lima (Peru)'],
      ['America/Santiago', 'Santiago (Chile)'],
      ['America/Sao_Paulo', 'São Paulo (Brazil)'],
      ['America/Argentina/Buenos_Aires', 'Buenos Aires (Argentina)'],
    ],
  },
  {
    label: 'Africa',
    zones: [
      ['Africa/Casablanca', 'Casablanca (Morocco)'],
      ['Africa/Cairo', 'Cairo (Egypt)'],
      ['Africa/Lagos', 'Lagos (Nigeria)'],
      ['Africa/Nairobi', 'Nairobi (Kenya)'],
      ['Africa/Johannesburg', 'Johannesburg (South Africa)'],
    ],
  },
  {
    label: 'Asia',
    zones: [
      ['Asia/Jerusalem', 'Jerusalem (Israel)'],
      ['Asia/Riyadh', 'Riyadh (Saudi Arabia)'],
      ['Asia/Dubai', 'Dubai (UAE)'],
      ['Asia/Tehran', 'Tehran (Iran)'],
      ['Asia/Karachi', 'Karachi (Pakistan)'],
      ['Asia/Kolkata', 'New Delhi (India)'],
      ['Asia/Kathmandu', 'Kathmandu (Nepal)'],
      ['Asia/Dhaka', 'Dhaka (Bangladesh)'],
      ['Asia/Bangkok', 'Bangkok (Thailand)'],
      ['Asia/Jakarta', 'Jakarta (Indonesia)'],
      ['Asia/Singapore', 'Singapore'],
      ['Asia/Kuala_Lumpur', 'Kuala Lumpur (Malaysia)'],
      ['Asia/Manila', 'Manila (Philippines)'],
      ['Asia/Hong_Kong', 'Hong Kong'],
      ['Asia/Shanghai', 'Beijing (China)'],
      ['Asia/Taipei', 'Taipei (Taiwan)'],
      ['Asia/Seoul', 'Seoul (South Korea)'],
      ['Asia/Tokyo', 'Tokyo (Japan)'],
    ],
  },
  {
    label: 'Oceania',
    zones: [
      ['Australia/Perth', 'Perth (Australia)'],
      ['Australia/Brisbane', 'Brisbane (Australia)'],
      ['Australia/Adelaide', 'Adelaide (Australia)'],
      ['Australia/Sydney', 'Sydney (Australia)'],
      ['Australia/Melbourne', 'Melbourne (Australia)'],
      ['Pacific/Auckland', 'Auckland (New Zealand)'],
      ['Pacific/Fiji', 'Suva (Fiji)'],
    ],
  },
];

const ZONE_LABELS = (() => {
  const map = new Map();
  ZONE_GROUPS.forEach((group) => group.zones.forEach(([id, label]) => map.set(id, label)));
  return map;
})();

const DEFAULTS = {
  /* Appearance */
  theme: 'light',
  accent: 'auto',
  font: 'lexend',
  radius: 16,
  density: 'comfortable',
  wallpaper: 'plain',
  reducedMotion: false,

  /* Clock face */
  timeZone: 'local',
  utcOffset: 0,
  hour24: false,
  showSeconds: true,
  smoothSeconds: true,
  numerals: 'arabic',
  ticks: 'all',
  faceRing: true,
  useAccentSecond: true,
  secondColor: '#e11d48',
  handStyle: 'slim',
  clockSize: 280,
  showDigital: true,
  showDate: true,

  /* Sound */
  tickSound: false,
  volume: 70,

  /* Alarms */
  alarmSound: 'chime',
  snooze: 5,

  /* Timer */
  timerDefault: 5,
  timerSound: 'bell',
};

const VIEW_META = {
  clock: ['Clock', 'Your time, your way.'],
  alarms: ['Alarm', 'Wake up on your schedule.'],
  timer: ['Timer', 'Count down with focus.'],
  settings: ['Settings', 'Make vbClock yours.'],
};

function formatOffset(value) {
  const sign = value < 0 ? '−' : '+';
  const abs = Math.abs(value);
  const hours = Math.floor(abs);
  const minutes = Math.round((abs - hours) * 60);
  return `UTC${sign}${hours}${minutes ? ':' + pad(minutes) : ''}`;
}

function formatRangeValue(format, value) {
  switch (format) {
    case 'px': return `${value}px`;
    case '%': return `${value}%`;
    case 'min': return `${value} min`;
    case 'offset': return formatOffset(value);
    default: return String(value);
  }
}

let toastTimer = null;
function toast(message) {
  const node = $('#toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2200);
}
