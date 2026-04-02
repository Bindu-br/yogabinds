// ============================================
// YogaBinds — Auth Module (ES Module)
// Shared across all pages — injects modals,
// handles login/signup/logout/reset/Google sign-in
// ============================================

import { loginUser, signupUser, logoutUser, onAuthChange, resetPassword, googleSignIn } from './firebase.js';

// ---- Inject Login & Signup Modals ----
function injectModals() {
  var html = `
  <div class="modal-overlay" id="loginModal">
    <div class="modal">
      <button class="modal-close" onclick="closeLoginModal()">&#215;</button>
      <h2>Welcome back.</h2>
      <p>Sign in to your YogaBinds account.</p>
      <form id="loginForm">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" placeholder="Your password" required autocomplete="current-password" />
        </div>
        <div class="modal-forgot"><a href="#" id="forgotPasswordLink">Forgot password?</a></div>
        <div id="loginError" class="modal-error"></div>
        <button type="submit" class="btn btn-primary">Sign In</button>
      </form>
      <div class="modal-divider"><span>or</span></div>
      <button class="btn btn-google" id="googleSignInBtn">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
      </button>
      <div class="modal-switch">Don't have an account? <a href="#" id="switchToSignupLink">Sign up</a></div>
    </div>
  </div>

  <div class="modal-overlay" id="signupModal">
    <div class="modal">
      <button class="modal-close" onclick="closeSignupModal()">&#215;</button>
      <h2>Begin your journey.</h2>
      <p>Create a YogaBinds account to get started.</p>
      <form id="signupForm">
        <div class="form-group">
          <label for="signupEmail">Email</label>
          <input type="email" id="signupEmail" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="signupPassword">Password</label>
          <input type="password" id="signupPassword" placeholder="Create a password" required autocomplete="new-password" />
        </div>
        <div id="signupError" class="modal-error"></div>
        <button type="submit" class="btn btn-primary">Create Account</button>
      </form>
      <div class="modal-divider"><span>or</span></div>
      <button class="btn btn-google" id="googleSignUpBtn">
        <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Continue with Google
      </button>
      <div class="modal-switch">Already have an account? <a href="#" id="switchToLoginLink">Sign in</a></div>
    </div>
  </div>

  <div class="modal-overlay" id="resetModal">
    <div class="modal">
      <button class="modal-close" onclick="closeResetModal()">&#215;</button>
      <h2>Reset password.</h2>
      <p>Enter your email and we'll send you a reset link.</p>
      <form id="resetForm">
        <div class="form-group">
          <label for="resetEmail">Email</label>
          <input type="email" id="resetEmail" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div id="resetError" class="modal-error"></div>
        <div id="resetSuccess" class="modal-success"></div>
        <button type="submit" class="btn btn-primary">Send Reset Link</button>
      </form>
      <div class="modal-switch"><a href="#" id="backToLoginLink">Back to sign in</a></div>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

// ---- Initialize ----
injectModals();

// ---- Modal switch links ----
document.getElementById('switchToSignupLink').addEventListener('click', function(e) {
  e.preventDefault();
  closeLoginModal();
  openSignupModal();
});

document.getElementById('switchToLoginLink').addEventListener('click', function(e) {
  e.preventDefault();
  closeSignupModal();
  openLoginModal();
});

document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
  e.preventDefault();
  closeLoginModal();
  document.getElementById('resetModal').classList.add('active');
});

document.getElementById('backToLoginLink').addEventListener('click', function(e) {
  e.preventDefault();
  closeResetModal();
  openLoginModal();
});

// ---- Close modals on overlay click ----
document.getElementById('loginModal').addEventListener('click', function(e) {
  if (e.target === this) closeLoginModal();
});
document.getElementById('signupModal').addEventListener('click', function(e) {
  if (e.target === this) closeSignupModal();
});
document.getElementById('resetModal').addEventListener('click', function(e) {
  if (e.target === this) closeResetModal();
});

// ---- Auth state: update navbar ----
onAuthChange(function(user) {
  var btn = document.getElementById('loginBtn');
  if (!btn) return;

  if (user) {
    var email = user.email || '';
    var name = email.split('@')[0];
    btn.textContent = 'Log out';
    btn.onclick = async function(e) {
      e.preventDefault();
      await logoutUser();
    };

    // Show user email in navbar
    var emailEl = document.getElementById('navUserEmail');
    if (!emailEl) {
      emailEl = document.createElement('li');
      emailEl.id = 'navUserEmail';
      emailEl.className = 'nav-user-email';
      emailEl.textContent = name;
      btn.closest('ul').insertBefore(emailEl, btn.closest('li'));
    }
    emailEl.textContent = name;
    emailEl.style.display = '';
  } else {
    btn.textContent = 'Login';
    btn.onclick = function(e) { e.preventDefault(); openLoginModal(); };
    var emailEl = document.getElementById('navUserEmail');
    if (emailEl) emailEl.style.display = 'none';
  }

  // Payment page: show form for both logged-in users and guests
  if (document.querySelector('.payment-page')) {
    var overlay = document.getElementById('paymentAuthOverlay');
    if (overlay) overlay.style.display = 'none';
    var form = document.getElementById('paymentForm');
    if (form && !document.getElementById('paymentSuccess').classList.contains('show')) {
      form.style.display = '';
    }
  }
});

// ---- Login form ----
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value;
  var password = document.getElementById('loginPassword').value;
  var errorEl = document.getElementById('loginError');
  var submitBtn = this.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';
  var result = await loginUser(email, password);
  if (result.success) {
    closeLoginModal();
    this.reset();
  } else {
    errorEl.textContent = result.error;
  }
  document.getElementById('loginPassword').value = '';
  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign In';
});

// ---- Signup form ----
document.getElementById('signupForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var email = document.getElementById('signupEmail').value;
  var password = document.getElementById('signupPassword').value;
  var errorEl = document.getElementById('signupError');
  var submitBtn = this.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';
  var result = await signupUser(email, password);
  if (result.success) {
    closeSignupModal();
    this.reset();
  } else {
    errorEl.textContent = result.error;
  }
  document.getElementById('signupPassword').value = '';
  submitBtn.disabled = false;
  submitBtn.textContent = 'Create Account';
});

// ---- Password reset form ----
document.getElementById('resetForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var email = document.getElementById('resetEmail').value;
  var errorEl = document.getElementById('resetError');
  var successEl = document.getElementById('resetSuccess');
  var submitBtn = this.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  successEl.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';
  var result = await resetPassword(email);
  if (result.success) {
    successEl.textContent = 'Reset link sent! Check your inbox.';
    this.reset();
  } else {
    errorEl.textContent = result.error;
  }
  submitBtn.disabled = false;
  submitBtn.textContent = 'Send Reset Link';
});

// ---- Google sign-in buttons ----
document.getElementById('googleSignInBtn').addEventListener('click', async function() {
  var errorEl = document.getElementById('loginError');
  errorEl.textContent = '';
  var result = await googleSignIn();
  if (result.success) {
    closeLoginModal();
  } else {
    errorEl.textContent = result.error;
  }
});

document.getElementById('googleSignUpBtn').addEventListener('click', async function() {
  var errorEl = document.getElementById('signupError');
  errorEl.textContent = '';
  var result = await googleSignIn();
  if (result.success) {
    closeSignupModal();
  } else {
    errorEl.textContent = result.error;
  }
});
