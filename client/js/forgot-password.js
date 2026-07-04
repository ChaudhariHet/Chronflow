/* ============================================================
   Forgot-password flow: step 1 requests a reset token from the
   server, step 2 submits a new password using that token.
   Since no mail service is configured in this project, the
   token is returned directly in the API response for demo
   purposes (see authController.forgotPassword for the note).
   ============================================================ */

let currentResetToken = null;

const forgotForm = document.getElementById('forgot-form');
const resetForm = document.getElementById('reset-form');
const requestStep = document.getElementById('request-step');
const resetStep = document.getElementById('reset-step');

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setFieldError('email', '');

  const email = document.getElementById('email').value.trim();

  if (!isValidEmail(email)) {
    setFieldError('email', 'Please enter a valid email address.');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  try {
    const data = await apiRequest('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    showToast(data.message, 'success');

    if (data.resetToken) {
      // In this demo build we reveal the token directly since there's no
      // mail service wired up; in production this step would end here and
      // the user would click a link from their inbox instead.
      currentResetToken = data.resetToken;
      requestStep.style.display = 'none';
      resetStep.style.display = 'block';
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send reset link';
  }
});

if (resetForm) {
  attachPasswordToggle('newPassword', 'toggle-password');

  resetForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFieldError('newPassword', '');

    const newPassword = document.getElementById('newPassword').value;

    if (!isStrongPassword(newPassword)) {
      setFieldError('newPassword', 'Password needs 8+ characters, including a letter and a number.');
      return;
    }

    const submitBtn = document.getElementById('reset-submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting…';

    try {
      await apiRequest('/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: currentResetToken, newPassword }),
      });
      showToast('Password reset! Redirecting to login…', 'success');
      setTimeout(() => (window.location.href = '/login.html'), 900);
    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Reset password';
    }
  });
}

function setFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  const errorEl = document.getElementById(`error-${fieldId}`);
  if (input) input.classList.toggle('invalid', Boolean(message));
  if (errorEl) errorEl.textContent = message || '';
}
