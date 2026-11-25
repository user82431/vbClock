/* vbClock — navigation, heartbeat and startup */

'use strict';

function setView(view) {
  const next = VIEW_META[view] ? view : 'clock';
  $$('.rail-btn[data-view]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === next);
  });
  $$('.view').forEach((section) => {
    section.classList.toggle('is-active', section.id === `view-${next}`);
  });
  const [title, sub] = VIEW_META[next];
  $('#pageTitle').textContent = title;
  $('#pageSub').textContent = sub;
  saveJSON(KEY_VIEW, next);

  if (next === 'timer') {
    updateTimerButtons();
    updateTimerDisplay();
  }
  if (next === 'settings') syncSettingsUI();
}

function heartbeat() {
  const now = Date.now();
  const parts = getLiveParts(now);

  updateZoneChip();
  checkAlarms(parts);

  if (settings.tickSound) playTick();

  if (timer.running && now >= timer.endAt) finishTimer();
}

function init() {
  initAlarmForm();
  initAlarmList();
  initRingControls();
  initTimer();
  initSettings();

  applySettings();
  renderAlarms();
  updateZoneChip();

  $$('.rail-btn[data-view]').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  $('#themeQuick').addEventListener('click', toggleTheme);
  $('#zoneChip').addEventListener('click', focusTimeZoneSetting);

  setView(loadJSON(KEY_VIEW, 'clock'));

  requestAnimationFrame(clockFrame);
  setInterval(heartbeat, 1000);
  heartbeat();
}

document.addEventListener('DOMContentLoaded', init);
