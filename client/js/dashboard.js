/* ============================================================
   Dashboard logic:
   1. Load the logged-in user's profile (also acts as a client-side
      guard — if the request 401s, we bounce to login).
   2. Draw the dial's static tick marks (same as the landing page).
   3. Run the stopwatch: start / stop / resume / reset, driven by
      setInterval/clearInterval as required, with a single guarded
      interval reference so multiple intervals can never stack up.
   4. On stop/reset, persist the elapsed time to the user's
      lifetime total via the /stopwatch-time endpoint.
   ============================================================ */

let elapsedMs = 0; // total elapsed time for the current session, survives pause
let persistedMs = 0; // portion of elapsedMs already saved to the DB (see persistElapsedTime)
let intervalId = null; // guarded so Start can never spawn a second interval
let lastTickAt = null;
let lifetimeSeconds = 0;

const timeEl = document.getElementById('stopwatch-time');
const statusEl = document.getElementById('stopwatch-status');
const sessionTotalEl = document.getElementById('session-total');
const lifetimeTotalEl = document.getElementById('lifetime-total');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const dialHand = document.getElementById('dial-hand-live');

/* --- Draw dial ticks (identical approach to the landing page) --- */
(function drawTicks() {
  const ticksGroup = document.getElementById('ticks');
  const center = 150;
  const outerR = 140;
  for (let i = 0; i < 60; i++) {
    const angle = (i * 6 * Math.PI) / 180;
    const isMajor = i % 5 === 0;
    const innerR = isMajor ? outerR - 14 : outerR - 7;
    const x1 = center + innerR * Math.sin(angle);
    const y1 = center - innerR * Math.cos(angle);
    const x2 = center + outerR * Math.sin(angle);
    const y2 = center - outerR * Math.cos(angle);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('class', isMajor ? 'dial-tick-major' : 'dial-tick-minor');
    ticksGroup.appendChild(line);
  }
})();

/* --- Load profile (also functions as the client-side auth guard) --- */
(async function loadProfile() {
  try {
    const data = await apiRequest('/profile');
    const firstName = data.user.fullName.split(' ')[0];
    document.getElementById('welcome-name').textContent = firstName;

    lifetimeSeconds = data.user.totalStopwatchTime || 0;
    lifetimeTotalEl.textContent = formatHMS(lifetimeSeconds);

    const lastLoginNote = document.getElementById('last-login-note');
    if (data.user.lastLogin) {
      const date = new Date(data.user.lastLogin);
      lastLoginNote.textContent = `Last login: ${date.toLocaleString()}`;
    }
  } catch (err) {
    // Server already guards /dashboard, but if the cookie expired mid-session
    // (e.g. tab left open past token expiry), bounce to login gracefully.
    window.location.href = '/login.html';
  }
})();

/* --- Stopwatch core --- */

function render() {
  const totalSeconds = elapsedMs / 1000;
  timeEl.textContent = formatHMS(totalSeconds);
  sessionTotalEl.textContent = formatHMS(totalSeconds);

  // Sweep the dial hand at one full rotation per 60 seconds, mirroring a
  // real chronometer's seconds hand rather than a generic progress bar.
  const secondsIntoMinute = totalSeconds % 60;
  const degrees = secondsIntoMinute * 6;
  dialHand.style.transform = `rotate(${degrees}deg)`;
}

function tick() {
  const now = Date.now();
  elapsedMs += now - lastTickAt;
  lastTickAt = now;
  render();
}

function startStopwatch() {
  // Guard against a second interval ever being created - clicking Start
  // twice in a row (e.g. a double click) must not double the tick rate.
  if (intervalId !== null) return;

  lastTickAt = Date.now();
  intervalId = setInterval(tick, 250);

  statusEl.textContent = 'Running';
  statusEl.classList.add('running');
  startBtn.disabled = true;
  stopBtn.disabled = false;
  resetBtn.disabled = true;
  startBtn.textContent = 'Resume';
}

async function stopStopwatch() {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;

  statusEl.textContent = 'Paused';
  statusEl.classList.remove('running');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  resetBtn.disabled = false;

  await persistElapsedTime();
}

async function resetStopwatch() {
  if (intervalId !== null) clearInterval(intervalId);
  intervalId = null;

  // Persist whatever hasn't been saved yet before wiping the session clock.
  await persistElapsedTime();

  elapsedMs = 0;
  persistedMs = 0;
  render();

  statusEl.textContent = 'Ready';
  statusEl.classList.remove('running');
  startBtn.disabled = false;
  stopBtn.disabled = true;
  resetBtn.disabled = true;
  startBtn.textContent = 'Start';
  dialHand.style.transform = 'rotate(0deg)';
}

/* --- Bonus feature: persist total stopwatch usage to the DB ---
   Persists only the *newly* elapsed time since the last checkpoint, so
   repeated stop/resume cycles within one session never double-count what
   was already saved, and elapsedMs itself is left untouched so Resume
   continues the visible clock from exactly where it paused. */
async function persistElapsedTime() {
  const newMs = elapsedMs - persistedMs;
  const secondsToSave = Math.floor(newMs / 1000);
  if (secondsToSave <= 0) return;

  try {
    const data = await apiRequest('/stopwatch-time', {
      method: 'PATCH',
      body: JSON.stringify({ elapsedSeconds: secondsToSave }),
    });
    lifetimeSeconds = data.totalStopwatchTime;
    lifetimeTotalEl.textContent = formatHMS(lifetimeSeconds);
    persistedMs += secondsToSave * 1000;
  } catch (err) {
    showToast('Could not save your session time.', 'error');
  }
}

startBtn.addEventListener('click', startStopwatch);
stopBtn.addEventListener('click', stopStopwatch);
resetBtn.addEventListener('click', resetStopwatch);

/* --- Logout --- */
document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } finally {
    window.location.href = '/index.html';
  }
});

render();
