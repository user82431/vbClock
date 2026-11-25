/* vbClock — countdown timer */

'use strict';

const TIMER_CIRCUMFERENCE = 2 * Math.PI * 88;
const TIMER_PRESETS = [1, 3, 5, 10, 15, 25, 45, 60];

const timer = {
  duration: settings.timerDefault * 60000,
  remaining: settings.timerDefault * 60000,
  endAt: 0,
  endLabel: '',
  running: false,
  done: false,
};

let timerTextCache = '';
let timerSubCache = '';

function readTimerInputs() {
  const hours = clamp(Math.round(Number($('#tHours').value) || 0), 0, 99);
  const minutes = clamp(Math.round(Number($('#tMins').value) || 0), 0, 59);
  const seconds = clamp(Math.round(Number($('#tSecs').value) || 0), 0, 59);
  $('#tHours').value = String(hours);
  $('#tMins').value = String(minutes);
  $('#tSecs').value = String(seconds);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function writeTimerInputs(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  $('#tHours').value = String(Math.floor(total / 3600));
  $('#tMins').value = String(Math.floor((total % 3600) / 60));
  $('#tSecs').value = String(total % 60);
}

function setTimerFromInputs() {
  const ms = readTimerInputs();
  timer.duration = ms;
  timer.remaining = ms;
  timer.endAt = 0;
  timer.done = false;
  timerTextCache = '';
  timerSubCache = '';
  updateTimerButtons();
  updateTimerDisplay();
}

function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function zoneTimeString(date) {
  const parts = zonePartsAt(date, settings.timeZone);
  return formatClock(parts.h, parts.m, 0, false);
}

function updateTimerButtons() {
  const start = $('#timerStart');
  const reset = $('#timerReset');
  if (!start || !reset) return;
  start.textContent = timer.running
    ? 'Pause'
    : timer.remaining < timer.duration && timer.remaining > 0 && !timer.done
      ? 'Resume'
      : 'Start';
  $('#tHours').disabled = timer.running;
  $('#tMins').disabled = timer.running;
  $('#tSecs').disabled = timer.running;
  reset.disabled = false;

  const dot = $('#timerDot');
  if (dot) dot.hidden = !timer.running;
}

function updateTimerDisplay() {
  const timeEl = $('#timerTime');
  if (!timeEl) return;

  const remaining = timer.running ? Math.max(0, timer.endAt - Date.now()) : timer.remaining;

  const text = formatDuration(remaining);
  if (text !== timerTextCache) {
    timeEl.textContent = text;
    timerTextCache = text;
  }

  let sub;
  if (timer.done) sub = 'Done';
  else if (timer.running) sub = `Ends at ${timer.endLabel}`;
  else if (timer.remaining > 0 && timer.remaining < timer.duration) sub = 'Paused';
  else sub = 'Ready';

  if (sub !== timerSubCache) {
    $('#timerSub').textContent = sub;
    timerSubCache = sub;
  }

  const progressEl = $('#ringProgress');
  if (progressEl) {
    const progress = timer.duration > 0 ? clamp(1 - remaining / timer.duration, 0, 1) : 0;
    progressEl.style.strokeDashoffset = String(TIMER_CIRCUMFERENCE * (1 - progress));
  }
}

function startTimer() {
  if (timer.remaining <= 0 || timer.done) setTimerFromInputs();
  if (timer.remaining <= 0) {
    toast('Set a duration above zero first.');
    return;
  }
  unlockAudio();
  timer.running = true;
  timer.done = false;
  timer.endAt = Date.now() + timer.remaining;
  timer.endLabel = zoneTimeString(new Date(timer.endAt));
  timerTextCache = '';
  timerSubCache = '';
  updateTimerButtons();
  updateTimerDisplay();
}

function pauseTimer() {
  timer.remaining = Math.max(0, timer.endAt - Date.now());
  timer.running = false;
  timer.endAt = 0;
  timerTextCache = '';
  timerSubCache = '';
  updateTimerButtons();
  updateTimerDisplay();
}

function toggleTimer() {
  if (timer.running) pauseTimer();
  else startTimer();
}

function resetTimer() {
  timer.running = false;
  timer.endAt = 0;
  setTimerFromInputs();
  updateTimerButtons();
  updateTimerDisplay();
}

function finishTimer() {
  timer.running = false;
  timer.remaining = 0;
  timer.done = true;
  timerTabCacheReset();
  updateTimerButtons();
  updateTimerDisplay();
  enqueueRing({
    kind: 'timer',
    title: 'Timer complete',
    sub: 'Your countdown has finished.',
    sound: settings.timerSound,
  });
}

function timerTabCacheReset() {
  timerTextCache = '';
  timerSubCache = '';
}

function initTimer() {
  if (!$('#timerTime')) return;

  const progress = $('#ringProgress');
  if (progress) {
    progress.style.strokeDasharray = String(TIMER_CIRCUMFERENCE);
    progress.style.strokeDashoffset = '0';
  }

  writeTimerInputs(settings.timerDefault * 60000);
  setTimerFromInputs();

  const presets = $('#timerPresets');
  TIMER_PRESETS.forEach((minutes) => {
    const button = h('button', 'preset', `${minutes}m`);
    button.type = 'button';
    button.addEventListener('click', () => {
      timer.running = false;
      timer.done = false;
      writeTimerInputs(minutes * 60000);
      setTimerFromInputs();
      timerTabCacheReset();
      updateTimerButtons();
      updateTimerDisplay();
    });
    presets.append(button);
  });

  $('#timerStart').addEventListener('click', toggleTimer);
  $('#timerReset').addEventListener('click', resetTimer);

  ['#tHours', '#tMins', '#tSecs'].forEach((selector) => {
    $(selector).addEventListener('change', () => {
      if (!timer.running) {
        setTimerFromInputs();
        timerTabCacheReset();
      }
    });
  });
}

function onTimerDefaultChanged() {
  if (!timer.running && !timer.done && timer.remaining === timer.duration) {
    writeTimerInputs(settings.timerDefault * 60000);
    setTimerFromInputs();
  }
}
