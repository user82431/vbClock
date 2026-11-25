/* vbClock — settings state, time zones and the analog clock */

'use strict';

const rootEl = document.documentElement;

let settings = sanitizeSettings(loadJSON(KEY_SETTINGS, {}));

function sanitizeSettings(raw) {
  const s = { ...DEFAULTS, ...(raw || {}) };
  if (!['light', 'dark'].includes(s.theme)) s.theme = 'light';
  if (!FONTS[s.font]) s.font = 'lexend';
  if (!['comfortable', 'compact'].includes(s.density)) s.density = 'comfortable';
  if (!['plain', 'gradient', 'grid'].includes(s.wallpaper)) s.wallpaper = 'plain';
  if (!['arabic', 'roman', 'none'].includes(s.numerals)) s.numerals = 'arabic';
  if (!['none', 'hours', 'all'].includes(s.ticks)) s.ticks = 'all';
  if (!HAND_STYLES[s.handStyle]) s.handStyle = 'slim';
  if (!ZONE_LABELS.has(s.timeZone)) s.timeZone = 'local';
  if (!['chime', 'bell', 'beep', 'digital', 'gentle'].includes(s.alarmSound)) s.alarmSound = 'chime';
  if (!['chime', 'bell', 'beep', 'digital', 'gentle'].includes(s.timerSound)) s.timerSound = 'bell';
  if (s.accent !== 'auto' && !/^#[0-9a-fA-F]{6}$/.test(String(s.accent))) s.accent = 'auto';
  if (!/^#[0-9a-fA-F]{6}$/.test(String(s.secondColor))) s.secondColor = '#e11d48';

  s.radius = clamp(Math.round(Number(s.radius) || 0), 0, 26);
  s.clockSize = clamp(Math.round(Number(s.clockSize) || 280), 180, 440);
  s.utcOffset = clamp(Number(s.utcOffset) || 0, -12, 14);
  s.volume = clamp(Math.round(Number.isFinite(Number(s.volume)) ? Number(s.volume) : 70), 0, 100);
  s.snooze = clamp(Math.round(Number.isFinite(Number(s.snooze)) ? Number(s.snooze) : 5), 0, 30);
  s.timerDefault = clamp(Math.round(Number(s.timerDefault) || 5), 1, 180);

  ['showSeconds', 'smoothSeconds', 'hour24', 'faceRing', 'useAccentSecond', 'showDigital',
    'showDate', 'tickSound', 'reducedMotion'].forEach((key) => {
    s[key] = Boolean(s[key]);
  });

  return s;
}

function saveSettings() {
  saveJSON(KEY_SETTINGS, settings);
}

function effectiveAccent() {
  if (settings.accent === 'auto') {
    return settings.theme === 'dark' ? '#4cc2ff' : '#0067c0';
  }
  return settings.accent;
}

function contrastText(hex) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#101010' : '#ffffff';
}

/* ---------- time zones ---------- */

const zoneFmtCache = new Map();

function zoneFormatter(tz) {
  let fmt = zoneFmtCache.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    zoneFmtCache.set(tz, fmt);
  }
  return fmt;
}

function zonePartsAt(date, tz) {
  if (tz === 'local') {
    return {
      h: date.getHours(), m: date.getMinutes(), s: date.getSeconds(),
      day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear(),
      weekday: date.getDay(),
    };
  }

  if (tz === 'custom') {
    const shifted = new Date(date.getTime() + settings.utcOffset * 3600000);
    return {
      h: shifted.getUTCHours(), m: shifted.getUTCMinutes(), s: shifted.getUTCSeconds(),
      day: shifted.getUTCDate(), month: shifted.getUTCMonth() + 1, year: shifted.getUTCFullYear(),
      weekday: shifted.getUTCDay(),
    };
  }

  const values = {};
  for (const part of zoneFormatter(tz).formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = parseInt(part.value, 10);
  }
  const year = values.year;
  const month = values.month;
  const day = values.day;
  return {
    h: (values.hour || 0) % 24,
    m: values.minute || 0,
    s: values.second || 0,
    day,
    month,
    year,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

let livePartsCache = { key: '', second: -1, parts: null };

function getLiveParts(now) {
  const key = `${settings.timeZone}|${settings.utcOffset}`;
  const second = Math.floor(now / 1000);
  if (livePartsCache.key === key && livePartsCache.second === second) {
    return livePartsCache.parts;
  }
  const parts = zonePartsAt(new Date(now), settings.timeZone);
  livePartsCache = { key, second, parts };
  return parts;
}

function formatClock(hour, minute, second, withSeconds) {
  if (settings.hour24) {
    return `${pad(hour)}:${pad(minute)}${withSeconds ? ':' + pad(second) : ''}`;
  }
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 || 12;
  return `${h12}:${pad(minute)}${withSeconds ? ':' + pad(second) : ''} ${suffix}`;
}

function formatAlarmTime(time) {
  const [hour, minute] = String(time).split(':').map(Number);
  if (settings.hour24) return `${pad(hour)}:${pad(minute)}`;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:${pad(minute)} ${suffix}`;
}

let abbrCache = { tz: '', at: 0, value: '' };

function tzAbbr(tz) {
  if (!tz || tz === 'custom') return '';
  const now = Date.now();
  if (abbrCache.tz === tz && now - abbrCache.at < 60000) return abbrCache.value;
  let value = '';
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' });
    const part = fmt.formatToParts(new Date()).find((p) => p.type === 'timeZoneName');
    value = part ? part.value : '';
  } catch (err) {
    value = '';
  }
  abbrCache = { tz, at: now, value };
  return value;
}

function zoneDisplay() {
  const tz = settings.timeZone;
  if (tz === 'local') {
    let systemZone = '';
    try {
      systemZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch (err) {
      systemZone = '';
    }
    return { name: 'Local time', abbr: tzAbbr(systemZone) };
  }
  if (tz === 'custom') {
    return { name: formatOffset(settings.utcOffset), abbr: '' };
  }
  return { name: ZONE_LABELS.get(tz) || tz, abbr: tzAbbr(tz) };
}

/* ---------- applying settings ---------- */

function applySettings() {
  const accent = effectiveAccent();
  rootEl.dataset.theme = settings.theme;
  rootEl.dataset.wallpaper = settings.wallpaper;
  rootEl.dataset.density = settings.density;
  rootEl.classList.toggle('reduce-motion', settings.reducedMotion);
  rootEl.style.setProperty('--accent', accent);
  rootEl.style.setProperty('--accent-contrast', contrastText(accent));
  rootEl.style.setProperty('--radius', `${settings.radius}px`);
  rootEl.style.setProperty('--font', FONTS[settings.font] || FONTS.system);
  rootEl.style.setProperty('--clock-size', `${settings.clockSize}px`);
  rootEl.style.setProperty('--second-hand', settings.useAccentSecond ? 'var(--accent)' : settings.secondColor);

  renderClockFace();
  syncClockVisibility();
  updateThemeButton();
  updateZoneChip();

  if (typeof renderAlarms === 'function' && $('#alarmList')) renderAlarms();
  if (typeof updateTimerDisplay === 'function' && $('#timerTime')) updateTimerDisplay();
  if (typeof syncSettingVisibility === 'function') syncSettingVisibility();

  // Let the desktop shell match its title bar to the app theme.
  if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
    try {
      window.chrome.webview.postMessage({ type: 'state', theme: settings.theme, accent: accent });
    } catch (err) {
      /* running in a normal browser */
    }
  }
}

function syncClockVisibility() {
  const wrap = $('#clockDigital');
  if (!wrap) return;
  wrap.hidden = !(settings.showDigital || settings.showDate);
  $('#digitalTime').hidden = !settings.showDigital;
  $('#digitalDate').hidden = !settings.showDate;
}

/* ---------- analog face ---------- */

const SVG_NS = 'http://www.w3.org/2000/svg';
const NUMERALS_ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

function polar(radius, degrees) {
  const angle = ((degrees - 90) * Math.PI) / 180;
  return [100 + radius * Math.cos(angle), 100 + radius * Math.sin(angle)];
}

function renderClockFace() {
  const tickLayer = $('#tickLayer');
  const numeralLayer = $('#numeralLayer');
  const ring = $('#clockRing');
  if (!tickLayer || !numeralLayer || !ring) return;

  tickLayer.textContent = '';
  numeralLayer.textContent = '';
  ring.style.display = settings.faceRing ? '' : 'none';

  const secondHand = $('#handSecond');
  if (secondHand) secondHand.style.display = settings.showSeconds ? '' : 'none';

  if (settings.ticks !== 'none') {
    for (let i = 0; i < 60; i += 1) {
      const major = i % 5 === 0;
      if (settings.ticks === 'hours' && !major) continue;
      const [x1, y1] = polar(90, i * 6);
      const [x2, y2] = polar(major ? 81 : 86, i * 6);
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', x1.toFixed(2));
      line.setAttribute('y1', y1.toFixed(2));
      line.setAttribute('x2', x2.toFixed(2));
      line.setAttribute('y2', y2.toFixed(2));
      line.setAttribute('class', major ? 'tick tick-major' : 'tick');
      tickLayer.append(line);
    }
  }

  if (settings.numerals !== 'none') {
    for (let i = 1; i <= 12; i += 1) {
      const [x, y] = polar(68, i * 30);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', x.toFixed(2));
      text.setAttribute('y', y.toFixed(2));
      text.setAttribute('class', 'numeral');
      text.textContent = settings.numerals === 'roman' ? NUMERALS_ROMAN[i % 12] : String(i);
      numeralLayer.append(text);
    }
  }

  const style = HAND_STYLES[settings.handStyle] || HAND_STYLES.slim;
  applyHandGeometry('#handHour', style.hour);
  applyHandGeometry('#handMinute', style.minute);
  applyHandGeometry('#handSecond', style.second);
  const pin = $('#clockPin');
  if (pin) pin.setAttribute('r', String(style.pin));
}

function applyHandGeometry(selector, [width, length, tail]) {
  const line = $(`${selector} line`);
  if (!line) return;
  line.setAttribute('x1', '100');
  line.setAttribute('y1', String(100 + tail));
  line.setAttribute('x2', '100');
  line.setAttribute('y2', String(100 - length));
  line.setAttribute('stroke-width', String(width));
}

function rotateHand(selector, degrees) {
  const group = $(selector);
  if (group) group.setAttribute('transform', `rotate(${degrees.toFixed(3)} 100 100)`);
}

/* ---------- clock rendering loop ---------- */

let digitalCache = { time: '', date: '' };

function updateDigital(parts) {
  const timeEl = $('#digitalTime');
  const dateEl = $('#digitalDate');
  if (!timeEl || !dateEl) return;

  if (settings.showDigital) {
    const text = formatClock(parts.h, parts.m, parts.s, settings.showSeconds);
    if (text !== digitalCache.time) {
      timeEl.textContent = text;
      digitalCache.time = text;
    }
  }

  if (settings.showDate) {
    const text = `${WEEKDAYS[parts.weekday]}, ${MONTHS[parts.month - 1]} ${parts.day}`;
    if (text !== digitalCache.date) {
      dateEl.textContent = text;
      digitalCache.date = text;
    }
  }
}

function clockFrame() {
  const now = Date.now();
  const parts = getLiveParts(now);
  const fraction = settings.smoothSeconds ? (now % 1000) / 1000 : 0;
  const seconds = parts.s + fraction;

  rotateHand('#handSecond', seconds * 6);
  rotateHand('#handMinute', (parts.m + seconds / 60) * 6);
  rotateHand('#handHour', (((parts.h % 12) + parts.m / 60 + seconds / 3600) % 12) * 30);

  updateDigital(parts);
  if (typeof updateTimerDisplay === 'function') updateTimerDisplay();

  requestAnimationFrame(clockFrame);
}

/* ---------- header bits ---------- */

function updateThemeButton() {
  const label = $('#themeQuickLabel');
  const button = $('#themeQuick');
  if (!label || !button) return;
  label.textContent = settings.theme === 'dark' ? 'Dark' : 'Light';
  button.title = settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
}

function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  saveSettings();
  applySettings();
  if (typeof syncSettingsUI === 'function') syncSettingsUI();
}

function updateZoneChip() {
  const nameEl = $('#zoneName');
  const abbrEl = $('#zoneAbbr');
  if (!nameEl || !abbrEl) return;
  const display = zoneDisplay();
  if (nameEl.textContent !== display.name) nameEl.textContent = display.name;
  if (abbrEl.textContent !== display.abbr) abbrEl.textContent = display.abbr;
}
