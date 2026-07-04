/* ============================================================
   Handles both signup.html and login.html — only the relevant
   form will exist on a given page, so each block checks for its
   form's presence before attaching listeners.
   ============================================================ */

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (input) input.classList.toggle('invalid', Boolean(message));
  if (errorEl) errorEl.textContent = message || '';
}

function clearAllErrors(fieldIds) {
  fieldIds.forEach((id) => setFieldError(id, ''));
}

/* --- Signup --- */

const signupForm = document.getElementById('signup-form');
if (signupForm) {
  attachPasswordToggle('password', 'toggle-password');
  attachPasswordToggle('confirmPassword', 'toggle-confirm');

  // Live password-strength meter — purely a UX aid, the real
  // enforcement happens on submit and again on the server.
  const passwordInput = document.getElementById('password');
  const strengthFill = document.getElementById('strength-fill');
  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    const percentages = ['0%', '25%', '50%', '75%', '100%'];
    const colors = ['#f87171', '#f87171', '#e8a33d', '#e8a33d', '#4ade80'];
    strengthFill.style.width = percentages[score];
    strengthFill.style.background = colors[score];
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(['fullName', 'email', 'password', 'confirmPassword']);

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    let hasError = false;

    if (fullName.length < 2) {
      setFieldError('fullName', 'Please enter your full name.');
      hasError = true;
    }
    if (!isValidEmail(email)) {
      setFieldError('email', 'Please enter a valid email address.');
      hasError = true;
    }
    if (!isStrongPassword(password)) {
      setFieldError('password', 'Password needs 8+ characters, including a letter and a number.');
      hasError = true;
    }
    if (password !== confirmPassword) {
      setFieldError('confirmPassword', 'Passwords do not match.');
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      await apiRequest('/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password, confirmPassword }),
      });
      showToast('Account created! Redirecting…', 'success');
      setTimeout(() => (window.location.href = '/dashboard'), 700);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
}

/* --- Login --- */

const loginForm = document.getElementById('login-form');
if (loginForm) {
  attachPasswordToggle('password', 'toggle-password');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors(['email', 'password']);

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    let hasError = false;

    if (!isValidEmail(email)) {
      setFieldError('email', 'Please enter a valid email address.');
      hasError = true;
    }
    if (!password) {
      setFieldError('password', 'Please enter your password.');
      hasError = true;
    }

    if (hasError) return;

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    try {
      await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      });
      showToast('Welcome back! Redirecting…', 'success');
      setTimeout(() => (window.location.href = '/dashboard'), 600);
    } catch (err) {
      // Both "no such user" and "wrong password" arrive as the same
      // generic message from the server (by design — see authController).
      setFieldError('password', err.message);
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
}
