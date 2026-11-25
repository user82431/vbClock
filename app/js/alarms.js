/* vbClock — alarms and the ringing overlay */

'use strict';

function sanitizeAlarms(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a.time === 'string' && /^\d{2}:\d{2}$/.test(a.time))
    .map((a) => ({
      id: String(a.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      time: a.time,
      label: String(a.label || '').slice(0, 40),
      days: Array.isArray(a.days) ? a.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : [],
      enabled: a.enabled !== false,
      sound: SOUND_NAMES.some(([id]) => id === a.sound) ? a.sound : 'default',
    }));
}

let alarms = sanitizeAlarms(loadJSON(KEY_ALARMS, []));

function saveAlarms() {
  saveJSON(KEY_ALARMS, alarms);
}

function repeatSummary(days) {
  if (!days.length) return 'Once';
  if (days.length === 7) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) return 'Weekdays';
  if (sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6) return 'Weekends';
  return sorted.map((d) => WEEKDAYS_SHORT[d]).join(', ');
}

function updateAlarmDot() {
  const dot = $('#alarmDot');
  if (dot) dot.hidden = !alarms.some((a) => a.enabled);
}

function renderAlarms() {
  const list = $('#alarmList');
  if (!list) return;
  list.textContent = '';

  const count = $('#alarmCount');
  if (count) {
    const active = alarms.filter((a) => a.enabled).length;
    count.textContent = alarms.length ? `${active} active of ${alarms.length}` : '';
  }

  if (!alarms.length) {
    list.append(h('div', 'empty-state', 'No alarms yet. Add one to get started.'));
    updateAlarmDot();
    return;
  }

  alarms.sort((a, b) => a.time.localeCompare(b.time));

  alarms.forEach((alarm) => {
    const item = h('div', `alarm-item${alarm.enabled ? '' : ' is-off'}`);

    const main = h('div', 'alarm-main');
    const time = h('div', 'alarm-time');
    const formatted = formatAlarmTime(alarm.time);
    if (settings.hour24) {
      time.textContent = formatted;
    } else {
      const suffix = formatted.slice(-2);
      time.append(document.createTextNode(formatted.slice(0, -3)));
      time.append(h('span', 'ap', suffix));
    }
    main.append(time);

    const meta = h('div', 'alarm-meta');
    meta.append(h('span', 'alarm-label', alarm.label || 'Alarm'));
    meta.append(h('span', 'alarm-repeat', repeatSummary(alarm.days)));
    main.append(meta);
    item.append(main);

    const toggle = h('label', 'switch small');
    const input = h('input');
    input.type = 'checkbox';
    input.checked = alarm.enabled;
    input.dataset.alarmToggle = alarm.id;
    input.setAttribute('aria-label', `Enable ${alarm.label || 'alarm'} at ${formatted}`);
    toggle.append(input, h('span', 'switch-track'));
    item.append(toggle);

    const del = h('button', 'icon-btn danger');
    del.type = 'button';
    del.dataset.alarmDel = alarm.id;
    del.title = 'Delete alarm';
    del.setAttribute('aria-label', `Delete ${formatted} alarm`);
    del.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"/></svg>';
    item.append(del);

    list.append(item);
  });

  updateAlarmDot();
}

/* ---------- alarm form ---------- */

function initAlarmForm() {
  const picker = $('#dayPicker');
  if (picker) {
    picker.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-day]');
      if (!button) return;
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      button.classList.toggle('is-on', on);
      const selected = $$('#dayPicker button[aria-pressed="true"]')
        .map((b) => WEEKDAYS_SHORT[Number(b.dataset.day)]);
      const hint = $('#repeatHint');
      if (hint) {
        hint.textContent = selected.length
          ? `Repeats ${selected.join(', ')}. Click a day to toggle it.`
          : 'Leave all off for a one-time alarm.';
      }
    });
  }

  const form = $('#alarmForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const time = $('#alarmTime').value;
    if (!/^\d{2}:\d{2}$/.test(time)) {
      toast('Pick a time for the alarm first.');
      return;
    }
    const label = $('#alarmLabel').value.trim();
    const days = $$('#dayPicker button[aria-pressed="true"]').map((b) => Number(b.dataset.day));
    const sound = $('#alarmSound').value;

    alarms.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time,
      label,
      days,
      enabled: true,
      sound,
    });
    saveAlarms();
    renderAlarms();

    $('#alarmLabel').value = '';
    $('#alarmLabel').blur();
    toast(`Alarm set for ${formatAlarmTime(time)}.`);
  });
}

function initAlarmList() {
  const list = $('#alarmList');
  if (!list) return;

  list.addEventListener('change', (event) => {
    const toggle = event.target.closest('input[data-alarm-toggle]');
    if (!toggle) return;
    const alarm = alarms.find((a) => a.id === toggle.dataset.alarmToggle);
    if (!alarm) return;
    alarm.enabled = toggle.checked;
    saveAlarms();
    renderAlarms();
  });

  list.addEventListener('click', (event) => {
    const del = event.target.closest('button[data-alarm-del]');
    if (!del) return;
    const alarm = alarms.find((a) => a.id === del.dataset.alarmDel);
    alarms = alarms.filter((a) => a.id !== del.dataset.alarmDel);
    saveAlarms();
    renderAlarms();
    toast(alarm ? `Deleted the ${formatAlarmTime(alarm.time)} alarm.` : 'Alarm deleted.');
  });
}

/* ---------- firing ---------- */

let lastAlarmMinute = '';

function checkAlarms(parts) {
  const minuteKey = `${parts.year}-${parts.month}-${parts.day} ${pad(parts.h)}:${pad(parts.m)}`;
  if (minuteKey === lastAlarmMinute) return;
  lastAlarmMinute = minuteKey;

  const hhmm = `${pad(parts.h)}:${pad(parts.m)}`;
  let changed = false;

  alarms.forEach((alarm) => {
    if (!alarm.enabled || alarm.time !== hhmm) return;
    if (alarm.days.length && !alarm.days.includes(parts.weekday)) return;

    if (!alarm.days.length) {
      alarm.enabled = false;
      changed = true;
    }

    enqueueRing({
      kind: 'alarm',
      title: alarm.label || 'Alarm',
      sub: `${formatAlarmTime(alarm.time)} · ${repeatSummary(alarm.days)}`,
      sound: alarm.sound === 'default' ? settings.alarmSound : alarm.sound,
    });
  });

  if (changed) {
    saveAlarms();
    renderAlarms();
  }
}

/* ---------- ring overlay ---------- */

const ringQueue = [];
let activeRing = null;
let ringStopSound = null;
let ringFlashTimer = null;

function enqueueRing(item) {
  ringQueue.push(item);
  if (!activeRing) showNextRing();
}

function showNextRing() {
  activeRing = ringQueue.shift() || null;
  if (!activeRing) return;

  const ring = activeRing;
  $('#ringKicker').textContent = ring.kind === 'timer' ? 'Timer' : 'Alarm';
  $('#ringTitle').textContent = ring.title;
  $('#ringSub').textContent = ring.sub || '';
  $('#ringOverlay').hidden = false;

  const snoozeBtn = $('#ringSnooze');
  const canSnooze = ring.kind === 'alarm' && settings.snooze > 0;
  snoozeBtn.hidden = !canSnooze;
  snoozeBtn.textContent = `Snooze ${settings.snooze} min`;

  const pulse = $('#ringPulse');
  if (pulse) pulse.style.background = '';

  ringStopSound = playSound(ring.sound || settings.alarmSound, settings.volume / 100, true);
  startTitleFlash(ring.kind === 'timer' ? 'Timer done' : 'Alarm');
}

function dismissRing() {
  if (ringStopSound) {
    ringStopSound();
    ringStopSound = null;
  }
  $('#ringOverlay').hidden = true;
  document.title = APP_NAME;
  stopTitleFlash();
  activeRing = null;
  if (ringQueue.length) setTimeout(showNextRing, 260);
}

function snoozeRing() {
  if (!activeRing || activeRing.kind !== 'alarm') return;
  const ring = { ...activeRing };
  const minutes = settings.snooze;
  dismissRing();
  if (minutes > 0) {
    setTimeout(() => {
      enqueueRing({
        ...ring,
        sub: ring.sub ? `${ring.sub} · snoozed` : 'Snoozed',
      });
    }, minutes * 60000);
    toast(`Snoozed for ${minutes} min.`);
  }
}

function startTitleFlash(label) {
  stopTitleFlash();
  let on = false;
  ringFlashTimer = setInterval(() => {
    on = !on;
    document.title = on ? `${label} — ${APP_NAME}` : APP_NAME;
  }, 900);
}

function stopTitleFlash() {
  if (ringFlashTimer) {
    clearInterval(ringFlashTimer);
    ringFlashTimer = null;
  }
  document.title = APP_NAME;
}

function initRingControls() {
  $('#ringStop').addEventListener('click', dismissRing);
  $('#ringSnooze').addEventListener('click', snoozeRing);
}
