/* ============================================================
   Loads the logged-in user's profile and renders identity +
   account details. Same guard pattern as dashboard.js: a failed
   fetch means an expired/invalid session, so we redirect to login.
   ============================================================ */

(async function loadProfile() {
  try {
    const data = await apiRequest('/profile');
    const { fullName, email, createdAt, lastLogin, totalStopwatchTime } = data.user;

    document.getElementById('profile-name').textContent = fullName;
    document.getElementById('profile-email').textContent = email;

    const initials = fullName
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    document.getElementById('profile-initials').textContent = initials;

    document.getElementById('detail-created').textContent = createdAt
      ? new Date(createdAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '—';

    document.getElementById('detail-last-login').textContent = lastLogin
      ? new Date(lastLogin).toLocaleString()
      : 'This is your first login';

    document.getElementById('detail-total-time').textContent = formatHMS(totalStopwatchTime || 0);
  } catch (err) {
    window.location.href = '/login.html';
  }
})();

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } finally {
    window.location.href = '/index.html';
  }
});
