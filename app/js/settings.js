/* vbClock — schema-driven settings page */

'use strict';

const SETTINGS_SCHEMA = [
  {
    title: 'Appearance',
    hint: 'Light is the default. Dark and everything else are optional.',
    items: [
      { key: 'theme', label: 'Theme', type: 'segmented', options: [['light', 'Light'], ['dark', 'Dark']] },
      { key: 'accent', label: 'Accent color', hint: 'Used for buttons, hands and highlights.', type: 'color', presets: ACCENTS },
      { key: 'wallpaper', label: 'Background', type: 'segmented', options: [['plain', 'Plain'], ['gradient', 'Gradient'], ['grid', 'Grid']] },
      { key: 'font', label: 'Font', type: 'select', options: Object.keys(FONTS).map((id) => [id, FONT_LABELS[id]]) },
      { key: 'radius', label: 'Corner roundness', type: 'range', min: 0, max: 26, step: 1, format: 'px' },
      { key: 'density', label: 'Density', type: 'segmented', options: [['comfortable', 'Comfortable'], ['compact', 'Compact']] },
      { key: 'reducedMotion', label: 'Reduce motion', hint: 'Turns off animations and transitions.', type: 'toggle' },
    ],
  },
  {
    title: 'Clock face',
    hint: 'Set the clock to any country or region, then make the face your own.',
    items: [
      { key: 'timeZone', label: 'Time zone', hint: 'The clock, alarms and timer all follow this zone.', type: 'select', zones: true },
      { key: 'utcOffset', label: 'Custom offset', type: 'range', min: -12, max: 14, step: 0.5, format: 'offset', show: (s) => s.timeZone === 'custom' },
      { key: 'clockSize', label: 'Clock size', type: 'range', min: 180, max: 440, step: 10, format: 'px' },
      { key: 'handStyle', label: 'Hand style', type: 'segmented', options: [['slim', 'Slim'], ['classic', 'Classic'], ['bold', 'Bold']] },
      { key: 'numerals', label: 'Numerals', type: 'segmented', options: [['none', 'None'], ['arabic', 'Arabic'], ['roman', 'Roman']] },
      { key: 'ticks', label: 'Tick marks', type: 'segmented', options: [['none', 'None'], ['hours', 'Hours'], ['all', 'All']] },
      { key: 'faceRing', label: 'Outer ring', type: 'toggle' },
      { key: 'showSeconds', label: 'Seconds hand', type: 'toggle' },
      { key: 'smoothSeconds', label: 'Smooth sweep', hint: 'Glide the seconds hand instead of ticking.', type: 'toggle', show: (s) => s.showSeconds },
      { key: 'hour24', label: '24-hour time', type: 'toggle' },
      { key: 'showDigital', label: 'Digital time', type: 'toggle' },
      { key: 'showDate', label: 'Show date', type: 'toggle' },
      { key: 'useAccentSecond', label: 'Accent second hand', type: 'toggle' },
      { key: 'secondColor', label: 'Second hand color', type: 'color', presets: ['#e11d48', '#f97316', '#16a34a', '#0ea5e9', '#8b5cf6', '#475569'], show: (s) => !s.useAccentSecond },
      { key: 'tickSound', label: 'Audible ticking', hint: 'A soft tick each second. Sound starts after your first click.', type: 'toggle' },
    ],
  },
  {
    title: 'Alarms & sound',
    items: [
      { key: 'alarmSound', label: 'Default alarm sound', type: 'select', options: SOUND_NAMES, preview: true },
      { key: 'volume', label: 'Volume', type: 'range', min: 0, max: 100, step: 5, format: '%' },
      { key: 'snooze', label: 'Snooze length', hint: 'Set to 0 minutes to hide the snooze button.', type: 'range', min: 0, max: 30, step: 1, format: 'min' },
    ],
  },
  {
    title: 'Timer',
    items: [
      { key: 'timerDefault', label: 'Default length', hint: 'Used for a fresh timer.', type: 'range', min: 1, max: 180, step: 1, format: 'min' },
      { key: 'timerSound', label: 'Timer sound', type: 'select', options: SOUND_NAMES, preview: true },
    ],
  },
  {
    title: 'Your data',
    hint: 'Settings and alarms live only in this browser. Export to keep a backup.',
    items: [
      {
        type: 'actions',
        label: 'Backup & reset',
        actions: [
          { id: 'export', label: 'Export' },
          { id: 'import', label: 'Import' },
          { id: 'reset', label: 'Reset all', danger: true },
        ],
      },
    ],
  },
];

const ITEM_BY_KEY = (() => {
  const map = new Map();
  SETTINGS_SCHEMA.forEach((group) => group.items.forEach((item) => {
    if (item.key) map.set(item.key, item);
  }));
  return map;
})();

function buildSettingRow(item) {
  const row = h('div', 'setting-row');
  if (item.key) row.dataset.key = item.key;

  const meta = h('div', 'setting-meta');
  meta.append(h('span', 'setting-label', item.label));
  if (item.hint) meta.append(h('span', 'setting-hint', item.hint));
  row.append(meta);

  if (item.type === 'actions') {
    row.classList.add('actions-row');
    const buttons = h('div', 'action-buttons');
    item.actions.forEach((action) => {
      const button = h('button', `ghost-btn${action.danger ? ' danger' : ''}`, action.label);
      button.type = 'button';
      button.dataset.action = action.id;
      buttons.append(button);
    });
    row.append(buttons);
    return row;
  }

  const control = h('div', 'setting-control');

  if (item.type === 'toggle') {
    const label = h('label', 'switch');
    const input = h('input');
    input.type = 'checkbox';
    input.dataset.key = item.key;
    input.checked = Boolean(settings[item.key]);
    input.setAttribute('aria-label', item.label);
    label.append(input, h('span', 'switch-track'));
    control.append(label);
  } else if (item.type === 'segmented') {
    const group = h('div', 'segmented');
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', item.label);
    item.options.forEach(([value, text]) => {
      const button = h('button', 'segment', text);
      button.type = 'button';
      button.dataset.key = item.key;
      button.dataset.value = value;
      const active = String(settings[item.key]) === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      group.append(button);
    });
    control.append(group);
  } else if (item.type === 'select') {
    const select = h('select', 'input');
    select.dataset.key = item.key;
    select.setAttribute('aria-label', item.label);
    if (item.zones) {
      ZONE_GROUPS.forEach((zoneGroup) => {
        const optgroup = h('optgroup');
        optgroup.label = zoneGroup.label;
        zoneGroup.zones.forEach(([value, text]) => {
          const option = h('option', null, text);
          option.value = value;
          optgroup.append(option);
        });
        select.append(optgroup);
      });
    } else {
      item.options.forEach(([value, text]) => {
        const option = h('option', null, text);
        option.value = value;
        select.append(option);
      });
    }
    select.value = settings[item.key];
    control.append(select);

    if (item.preview) {
      const preview = h('button', 'mini-btn', 'Play');
      preview.type = 'button';
      preview.dataset.preview = item.key;
      preview.title = 'Preview sound';
      control.append(preview);
    }
  } else if (item.type === 'range') {
    const wrap = h('div', 'range-wrap');
    const input = h('input');
    input.type = 'range';
    input.dataset.key = item.key;
    input.min = String(item.min);
    input.max = String(item.max);
    input.step = String(item.step);
    input.value = String(settings[item.key]);
    input.setAttribute('aria-label', item.label);
    const out = h('output', 'range-out', formatRangeValue(item.format, settings[item.key]));
    wrap.append(input, out);
    control.append(wrap);
  } else if (item.type === 'color') {
    const wrap = h('div', 'color-field');
    const input = h('input', 'color-input');
    input.type = 'color';
    input.dataset.key = item.key;
    input.value = settings[item.key] === 'auto' ? effectiveAccent() : settings[item.key];
    input.setAttribute('aria-label', item.label);
    wrap.append(input);

    const swatches = h('div', 'swatches');
    item.presets.forEach((color) => {
      const swatch = h('button', 'swatch');
      swatch.type = 'button';
      swatch.dataset.color = color;
      swatch.title = color === 'auto' ? 'Theme default' : color;
      swatch.setAttribute('aria-label', color === 'auto' ? 'Theme default color' : `Use ${color}`);
      if (color === 'auto') swatch.classList.add('auto');
      else swatch.style.background = color;
      if (settings[item.key] === color) swatch.classList.add('is-active');
      swatches.append(swatch);
    });
    wrap.append(swatches);
    control.append(wrap);
  }

  row.append(control);
  return row;
}

function renderSettings() {
  const root = $('#settingsRoot');
  if (!root) return;
  root.textContent = '';

  SETTINGS_SCHEMA.forEach((group) => {
    const card = h('section', 'card settings-group');
    card.append(h('h2', 'group-title', group.title));
    if (group.hint) card.append(h('p', 'group-hint', group.hint));
    group.items.forEach((item) => card.append(buildSettingRow(item)));
    root.append(card);
  });

  syncSettingsUI();
}

function syncSettingVisibility() {
  const root = $('#settingsRoot');
  if (!root) return;
  $$('.setting-row[data-key]', root).forEach((row) => {
    const item = ITEM_BY_KEY.get(row.dataset.key);
    row.hidden = Boolean(item && item.show && !item.show(settings));
  });
}

function syncSettingsUI() {
  const root = $('#settingsRoot');
  if (!root) return;

  $$('.segment[data-key]', root).forEach((button) => {
    const active = String(settings[button.dataset.key]) === button.dataset.value;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  $$('.setting-row[data-key]', root).forEach((row) => {
    const key = row.dataset.key;
    const item = ITEM_BY_KEY.get(key);
    const range = row.querySelector('input[type="range"][data-key]');
    if (range) {
      range.value = String(settings[key]);
      const out = row.querySelector('output');
      if (out) out.textContent = formatRangeValue(item ? item.format : null, settings[key]);
    }
    const color = row.querySelector('input[type="color"][data-key]');
    if (color) color.value = settings[key] === 'auto' ? effectiveAccent() : settings[key];
  });

  $$('.setting-row[data-key] .swatch', root).forEach((swatch) => {
    const row = swatch.closest('.setting-row[data-key]');
    const key = row ? row.dataset.key : 'accent';
    swatch.classList.toggle('is-active', String(settings[key]) === swatch.dataset.color);
  });

  syncSettingVisibility();
}

function updateSetting(key, value) {
  settings[key] = value;
  saveSettings();
  applySettings();
  syncSettingsUI();

  if (key === 'timerDefault' && typeof onTimerDefaultChanged === 'function') {
    onTimerDefaultChanged();
  }
}

function initSettings() {
  renderSettings();
  const root = $('#settingsRoot');
  if (!root) return;

  root.addEventListener('input', (event) => {
    const el = event.target;
    if (el.type === 'range' || el.type === 'color') {
      updateSetting(el.dataset.key, el.type === 'range' ? Number(el.value) : el.value);
    }
  });

  root.addEventListener('change', (event) => {
    const el = event.target;
    if (el.type === 'range' || el.type === 'color') return;
    if (el.matches('select[data-key], input[type="checkbox"][data-key]')) {
      updateSetting(el.dataset.key, el.type === 'checkbox' ? el.checked : el.value);
    }
  });

  root.addEventListener('click', (event) => {
    const segment = event.target.closest('.segment[data-key]');
    if (segment) {
      updateSetting(segment.dataset.key, segment.dataset.value);
      return;
    }

    const swatch = event.target.closest('.swatch[data-color]');
    if (swatch) {
      const row = swatch.closest('.setting-row[data-key]');
      updateSetting(row ? row.dataset.key : 'accent', swatch.dataset.color);
      return;
    }

    const preview = event.target.closest('[data-preview]');
    if (preview) {
      const name = settings[preview.dataset.preview];
      unlockAudio();
      playSound(name, settings.volume / 100, false);
      return;
    }

    const action = event.target.closest('[data-action]');
    if (action) handleDataAction(action.dataset.action);
  });
}

/* ---------- import / export / reset ---------- */

function handleDataAction(action) {
  if (action === 'export') exportData();
  else if (action === 'import') importData();
  else if (action === 'reset') resetAllData();
}

function exportData() {
  const payload = {
    app: APP_NAME,
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    alarms,
  };
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vbclock-backup.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Exported your settings and alarms.');
  } catch (err) {
    toast('Could not export on this browser.');
  }
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const nextSettings = data && typeof data === 'object' ? data.settings || data : null;
        if (!nextSettings || typeof nextSettings !== 'object') throw new Error('bad file');

        settings = sanitizeSettings(nextSettings);
        alarms = sanitizeAlarms(Array.isArray(data.alarms) ? data.alarms : []);

        saveSettings();
        saveAlarms();
        applySettings();
        renderSettings();
        renderAlarms();
        if (typeof onTimerDefaultChanged === 'function') onTimerDefaultChanged();
        toast('Import complete.');
      } catch (err) {
        toast('That file is not valid vbClock data.');
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

function resetAllData() {
  if (!window.confirm('Reset all vbClock settings and alarms? This cannot be undone.')) return;
  try {
    localStorage.removeItem(KEY_SETTINGS);
    localStorage.removeItem(KEY_ALARMS);
  } catch (err) {
    /* ignore */
  }
  settings = sanitizeSettings({});
  alarms = [];
  saveSettings();
  saveAlarms();
  applySettings();
  renderSettings();
  renderAlarms();
  timer.running = false;
  timer.done = false;
  writeTimerInputs(settings.timerDefault * 60000);
  setTimerFromInputs();
  toast('Everything is back to defaults.');
}

function focusTimeZoneSetting() {
  if (typeof setView === 'function') setView('settings');
  setTimeout(() => {
    const row = $('.setting-row[data-key="timeZone"]');
    if (!row) return;
    row.scrollIntoView({ behavior: settings.reducedMotion ? 'auto' : 'smooth', block: 'center' });
    const select = row.querySelector('select');
    if (select) select.focus({ preventScroll: true });
  }, 80);
}
