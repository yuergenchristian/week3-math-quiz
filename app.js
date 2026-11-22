/* Week 3 Math Quiz — vanilla JS, no account, server, or dependencies.
   Fixed public question banks have NO answer keys. Teacher keys are separate. */
(() => {
  'use strict';

  const BANKS = window.QUIZ_BANKS;
  const KEYS = ['fitri', 'salsa', 'mandala'];
  const DEFAULT_NAMES = { fitri: 'Fitri', salsa: 'Salsa', mandala: 'Mandala' };
  const STORAGE_KEY = 'week3-math-quiz-classroom-v1';
  const DURATION_MS = 15 * 60 * 1000;
  const $ = id => document.getElementById(id);
  const CLAMP = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const AUDIO = $('quiz-audio');
  let localMusicUrl = null;
  let toastTimer = null;

  if (!BANKS || KEYS.some(key => !Array.isArray(BANKS[key]) || BANKS[key].length !== 30)) {
    document.body.innerHTML = '<p style="padding:30px;font:18px Arial">Quiz files are incomplete. Make sure <b>questions.js</b> is uploaded beside index.html.</p>';
    return;
  }
  const LOOKUP = Object.fromEntries(KEYS.map(k => [k, Object.fromEntries(BANKS[k].map(q => [q.id, q]))]));

  function shuffled(a) {
    const result = [...a];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function guidedOrder(name) {
    const all = BANKS[name];
    let used = new Set();
    const select = (predicate, count) => {
      const possible = shuffled(all.filter(q => !used.has(q.id) && predicate(q)));
      const picked = possible.slice(0, count);
      picked.forEach(q => used.add(q.id));
      return picked;
    };
    const s = [];
    if (name === 'fitri') {
      s.push(...shuffled([
        ...select(q => q.kind === 'add' && q.level !== 'hard', 5),
        ...select(q => q.kind === 'sub' && q.level !== 'hard', 5),
        ...select(q => q.kind === 'mul' && q.level !== 'hard', 5),
      ]));
    } else if (name === 'salsa') {
      // Hard-first preference: start with multiplication, then mix other operations.
      s.push(...select(q => q.kind === 'mul' && q.level !== 'easy', 5));
      s.push(...shuffled([
        ...select(q => q.kind === 'sub' && q.level !== 'hard', 5),
        ...select(q => q.kind === 'add' && q.level !== 'hard', 5),
      ]));
    } else {
      // Mandala: confidence-building subtraction without borrowing, then regrouping.
      s.push(...select(q => q.kind === 'sub' && q.level === 'easy', 5));
      s.push(...select(q => q.kind === 'sub' && q.level === 'medium', 5));
      s.push(...shuffled([
        ...select(q => q.kind === 'add' && q.level !== 'hard', 4),
        ...select(q => q.kind === 'mul' && q.level === 'easy', 1),
      ]));
    }
    const remainder = shuffled(all.filter(q => !used.has(q.id)));
    return [...s, ...remainder].map(q => q.id);
  }
  function makeOrders(mode) {
    return Object.fromEntries(KEYS.map(k => [k, mode === 'random' ? shuffled(BANKS[k]).map(q => q.id) : guidedOrder(k)]));
  }
  function blankScores() {
    return Object.fromEntries(KEYS.map(k => [k, { attempted: 0, correct: 0 }]));
  }
  function newState(names = DEFAULT_NAMES, mode = 'guided') {
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      names: { ...names },
      mode,
      orders: makeOrders(mode),
      indices: { fitri: 0, salsa: 0, mandala: 0 },
      timer: { status: 'ready', remainingMs: DURATION_MS, endAt: null },
      score: blankScores(), teamTarget: 23, studentMin: 5,
      unlocked: false,
      volume: 35,
    };
  }
  function restoreState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!parsed || parsed.version !== 1) return null;
      for (const k of KEYS) {
        if (!Array.isArray(parsed.orders?.[k]) || parsed.orders[k].length !== 30) return null;
        const allIds = BANKS[k].map(q => q.id).sort().join(',');
        if (parsed.orders[k].slice().sort().join(',') !== allIds) return null;
        if (!Number.isInteger(parsed.indices?.[k]) || parsed.indices[k] < 0 || parsed.indices[k] >= 30) return null;
        if (!parsed.score?.[k]) return null;
      }
      if (!['ready', 'running', 'paused', 'ended'].includes(parsed.timer?.status)) return null;
      return parsed;
    } catch (_) { return null; }
  }
  let state = restoreState() || newState();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {
      // Even when browser storage is unavailable, the current quiz remains usable.
    }
  }
  save();

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }
  function cleanName(value, fallback) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 24) || fallback;
  }
  function qFor(name) { return LOOKUP[name][state.orders[name][state.indices[name]]]; }
  function navigationLocked() { return state.timer.status === 'ended' && !state.unlocked; }

  function renderQuestions() {
    for (const k of KEYS) {
      const q = qFor(k);
      $('student-name-' + k).textContent = cleanName(state.names?.[k], DEFAULT_NAMES[k]);
      $('expression-' + k).textContent = q.text;
      $('id-' + k).textContent = q.id;
      $('progress-' + k).textContent = `Question ${state.indices[k] + 1} of 30`;
      $('bar-' + k).style.width = `${(state.indices[k] + 1) / 30 * 100}%`;
      for (const button of document.querySelectorAll(`button.nav-button[data-student="${k}"]`)) {
        const step = Number(button.dataset.direction);
        button.disabled = navigationLocked() || (step < 0 ? state.indices[k] <= 0 : state.indices[k] >= 29);
        button.title = navigationLocked() ? 'Timer finished — unlock navigation in teacher controls' :
          (step < 0 ? 'Previous question' : 'Next question');
      }
    }
    $('timeup-notice').hidden = state.timer.status !== 'ended';
    document.querySelector('.app-shell').classList.toggle('time-ended', state.timer.status === 'ended');
  }
  function move(name, by) {
    if (navigationLocked()) { toast('Time is up. Use Teacher controls to unlock navigation.'); return; }
    const updated = CLAMP(state.indices[name] + by, 0, 29);
    if (updated === state.indices[name]) {
      if (by > 0) toast(`${state.names[name]} has reached question 30 of 30!`);
      return;
    }
    state.indices[name] = updated;
    save(); renderQuestions();
  }
  function remainingMs() {
    if (state.timer.status === 'running') return Math.max(0, state.timer.endAt - Date.now());
    return CLAMP(Number(state.timer.remainingMs) || 0, 0, DURATION_MS);
  }
  function stopMusic() {
    AUDIO.pause();
    $('music-toggle').classList.remove('playing');
    $('music-toggle').setAttribute('aria-label', 'Play music');
  }
  function finishTimer() {
    if (state.timer.status === 'ended') return;
    state.timer.status = 'ended'; state.timer.remainingMs = 0; state.timer.endAt = null;
    stopMusic(); save(); renderClock(); renderQuestions();
    toast('Time is up! Collect the quiz papers.');
  }
  function renderClock() {
    const remaining = remainingMs();
    if (state.timer.status === 'running' && remaining <= 0) { finishTimer(); return; }
    const secs = Math.ceil(remaining / 1000);
    $('timer-readout').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    const statusText = { ready: 'READY', running: 'LIVE', paused: 'PAUSED', ended: 'FINISHED' }[state.timer.status];
    $('session-flag').textContent = statusText;
    $('session-flag').className = 'session-flag ' + state.timer.status;
    $('timer-verb').textContent = { ready: 'START', running: 'PAUSE', paused: 'RESUME', ended: 'DONE' }[state.timer.status];
    $('timer-toggle').classList.toggle('urgent', state.timer.status === 'running' && remaining <= 60000);
    $('timer-toggle').disabled = state.timer.status === 'ended';
    $('timer-toggle').setAttribute('aria-label', state.timer.status === 'running' ? 'Pause timer' : 'Start or resume timer');
  }
  function toggleTimer() {
    const t = state.timer;
    if (t.status === 'ended') { toast('Use Reset timer in Teacher controls to begin again.'); return; }
    if (t.status === 'running') {
      t.remainingMs = remainingMs(); t.endAt = null; t.status = 'paused';
    } else {
      t.endAt = Date.now() + remainingMs(); t.status = 'running';
    }
    save(); renderClock();
  }
  function resetTimer() {
    if (!confirm('Reset the timer to 15:00? Question positions and scores will stay unchanged.')) return;
    state.timer = { status: 'ready', remainingMs: DURATION_MS, endAt: null };
    state.unlocked = false; $('unlock-navigation').checked = false;
    stopMusic(); save(); renderClock(); renderQuestions();
    toast('Timer reset to 15:00.');
  }

  function fieldInputs() {
    for (const k of KEYS) {
      $('name-' + k).value = cleanName(state.names?.[k], DEFAULT_NAMES[k]);
      $('score-name-' + k).textContent = cleanName(state.names?.[k], DEFAULT_NAMES[k]);
      $('attempted-' + k).value = state.score[k].attempted;
      $('correct-' + k).value = state.score[k].correct;
    }
    $('order-mode').value = ['guided', 'random'].includes(state.mode) ? state.mode : 'guided';
    $('unlock-navigation').checked = !!state.unlocked;
    $('team-target').value = state.teamTarget;
    $('student-min').value = state.studentMin;
    $('music-volume').value = state.volume ?? 35;
    $('volume-label').textContent = (state.volume ?? 35) + '%';
    AUDIO.volume = CLAMP((state.volume ?? 35) / 100, 0, 1);
    renderScores();
  }
  function activateTab(name) {
    for (const tab of document.querySelectorAll('.tab')) {
      const isActive = tab.dataset.tab === name;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    }
    for (const view of document.querySelectorAll('.tab-content')) view.hidden = view.id !== 'content-' + name;
  }
  function openSettings() { fieldInputs(); activateTab('setup'); $('teacher-dialog').showModal(); }
  function closeSettings() { $('teacher-dialog').close(); }

  function updateScore(name, which, value) {
    const score = state.score[name];
    const number = CLAMP(parseInt(value, 10) || 0, 0, 30);
    if (which === 'correct') {
      score.correct = number;
      if (score.correct > score.attempted) score.attempted = score.correct;
    } else {
      score.attempted = number;
      if (score.correct > score.attempted) score.correct = score.attempted;
    }
    $('attempted-' + name).value = score.attempted;
    $('correct-' + name).value = score.correct;
    save(); renderScores();
  }
  function renderScores() {
    const correct = KEYS.reduce((sum, k) => sum + state.score[k].correct, 0);
    const attempted = KEYS.reduce((sum, k) => sum + state.score[k].attempted, 0);
    const min = state.studentMin;
    const individualOK = KEYS.every(k => state.score[k].correct >= min);
    const pass = correct >= state.teamTarget && individualOK;
    $('team-score-number').textContent = `${correct} / ${state.teamTarget}`;
    $('team-score-bar').style.width = `${CLAMP(correct / state.teamTarget * 100, 0, 100)}%`;
    $('team-score-bar').style.background = pass ? '#239767' : '#187ab3';
    const msg = $('team-score-status');
    msg.classList.toggle('success', pass);
    if (attempted === 0) msg.textContent = 'Enter the scores after checking the papers.';
    else if (pass) msg.textContent = '✓ TEAM GOAL REACHED — Math team stamp earned!';
    else {
      const missing = Math.max(0, state.teamTarget - correct);
      const personal = KEYS.filter(k => state.score[k].correct < min).map(k => `${cleanName(state.names[k], DEFAULT_NAMES[k])}: ${min - state.score[k].correct} more`);
      msg.textContent = [missing ? `${missing} more team points needed` : 'Team total reached', personal.length ? `Individual minimum: ${personal.join(' · ')}` : ''].filter(Boolean).join(' • ');
    }
  }
  function newSession() {
    if (!confirm('Start a NEW session? This reshuffles the questions and resets the timer and all entered scores.')) return;
    const names = { ...state.names }; const mode = $('order-mode').value;
    const volume = state.volume;
    state = newState(names, mode); state.volume = volume;
    stopMusic(); save(); renderQuestions(); renderClock(); fieldInputs();
    toast('New session ready! Question banks are unchanged; only the order shuffled.');
    closeSettings();
  }
  function csvCell(s) {
    let text = String(s ?? '');
    if (/^[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function downloadCSV(rows, filename) {
    const blob = new Blob(['\ufeff' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename;
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
  function exportQuestionOrder() {
    const rows = [['Student','Displayed Position','Permanent Question ID','Question','Session Created']];
    for (const k of KEYS) {
      state.orders[k].forEach((id, i) => rows.push([state.names[k], i + 1, id, LOOKUP[k][id].text, state.createdAt]));
    }
    downloadCSV(rows, 'math-quiz-question-order.csv');
  }
  function exportScoreSummary() {
    const rows = [['Student','Attempted','Correct','Team Target','Individual Minimum']];
    for (const k of KEYS) rows.push([state.names[k], state.score[k].attempted, state.score[k].correct, state.teamTarget, state.studentMin]);
    const total = KEYS.reduce((sum, k) => sum + state.score[k].correct, 0);
    rows.push(['TOTAL','',total,state.teamTarget,'']);
    downloadCSV(rows,'math-quiz-score-summary.csv');
  }
  async function toggleMusic() {
    if (!AUDIO.paused) { stopMusic(); return; }
    // The supplied ZIP intentionally includes no licensed music; local selection always works offline.
    if (!AUDIO.src) AUDIO.src = new URL('./assets/music.mp3', document.baseURI).href;
    try {
      await AUDIO.play();
      $('music-toggle').classList.add('playing');
      $('music-toggle').setAttribute('aria-label', 'Pause music');
    } catch (_) {
      $('music-toggle').classList.remove('playing');
      toast('No playable music found. Choose a local audio file in Teacher controls.');
      AUDIO.removeAttribute('src'); AUDIO.load();
    }
  }
  function chooseMusic(event) {
    const file = event.target.files?.[0]; if (!file) return;
    if (localMusicUrl) URL.revokeObjectURL(localMusicUrl);
    stopMusic(); localMusicUrl = URL.createObjectURL(file); AUDIO.src = localMusicUrl;
    toast(`Music selected: ${file.name}. Press the music note to play.`);
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch (_) { toast('Fullscreen is not supported by this browser.'); }
  }
  function registerEvents() {
    for (const b of document.querySelectorAll('.nav-button'))
      b.addEventListener('click', () => move(b.dataset.student, Number(b.dataset.direction)));
    $('timer-toggle').addEventListener('click', toggleTimer);
    $('reset-timer').addEventListener('click', resetTimer);
    $('music-toggle').addEventListener('click', toggleMusic);
    AUDIO.addEventListener('ended', stopMusic);
    $('music-file').addEventListener('change', chooseMusic);
    $('music-volume').addEventListener('input', e => {
      state.volume = CLAMP(Number(e.target.value), 0, 100);
      AUDIO.volume = state.volume / 100; $('volume-label').textContent = state.volume + '%'; save();
    });
    $('fullscreen-toggle').addEventListener('click', toggleFullscreen);
    $('settings-toggle').addEventListener('click', openSettings);
    $('settings-close').addEventListener('click', closeSettings);
    $('dialog-done').addEventListener('click', closeSettings);
    $('teacher-dialog').addEventListener('click', e => { if (e.target === $('teacher-dialog')) closeSettings(); });
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => activateTab(t.dataset.tab)));
    for (const k of KEYS) {
      $('name-' + k).addEventListener('change', e => {
        state.names[k] = cleanName(e.target.value, DEFAULT_NAMES[k]);
        e.target.value = state.names[k]; $('score-name-' + k).textContent = state.names[k]; save(); renderQuestions();
      });
      $('attempted-' + k).addEventListener('change', e => updateScore(k,'attempted',e.target.value));
      $('correct-' + k).addEventListener('change', e => updateScore(k,'correct',e.target.value));
    }
    $('order-mode').addEventListener('change', e => { state.mode = e.target.value; save(); toast('Order mode saved. It will apply when you begin a new shuffled session.'); });
    $('unlock-navigation').addEventListener('change', e => { state.unlocked = e.target.checked; save(); renderQuestions(); });
    $('team-target').addEventListener('change', e => { state.teamTarget = CLAMP(Number(e.target.value) || 23, 1, 90); e.target.value = state.teamTarget; save(); renderScores(); });
    $('student-min').addEventListener('change', e => { state.studentMin = CLAMP(Number(e.target.value) || 0, 0, 30); e.target.value = state.studentMin; save(); renderScores(); });
    $('new-session').addEventListener('click', newSession);
    $('export-order').addEventListener('click', exportQuestionOrder);
    $('export-scores').addEventListener('click', exportScoreSummary);
    document.addEventListener('keydown', e => {
      if ($('teacher-dialog').open || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(e.target.tagName)) return;
      const map = { '1':'fitri', '2':'salsa', '3':'mandala' };
      if (map[e.key]) { e.preventDefault(); move(map[e.key], e.shiftKey ? -1 : 1); }
      else if (e.code === 'Space') { e.preventDefault(); toggleTimer(); }
      else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); toggleFullscreen(); }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) renderClock(); });
  }
  registerEvents(); fieldInputs(); renderQuestions(); renderClock();
  setInterval(renderClock, 250);
})();
