// ============================================
// YogaBinds — Auth Module (ES Module)
// Shared across all pages — injects modals,
// handles login/signup/logout/reset/Google sign-in
// ============================================

import { loginUser, signupUser, logoutUser, onAuthChange, resetPassword, googleSignIn } from './firebase.js';

// ---- 30-minute session timeout ----
var SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms
var _sessionTimer = null;

function startSessionTimer() {
  clearSessionTimer();
  sessionStorage.setItem('yogabinds_login_time', String(Date.now()));
  _sessionTimer = setTimeout(async function() {
    await logoutUser();
    sessionStorage.removeItem('yogabinds_login_time');
    alert('Your session has expired. Please log in again.');
  }, SESSION_TIMEOUT);
}

function resumeSessionTimer() {
  clearSessionTimer();
  var loginTime = sessionStorage.getItem('yogabinds_login_time');
  if (!loginTime) return;
  var elapsed = Date.now() - Number(loginTime);
  if (elapsed >= SESSION_TIMEOUT) {
    sessionStorage.removeItem('yogabinds_login_time');
    logoutUser();
    return;
  }
  var remaining = SESSION_TIMEOUT - elapsed;
  _sessionTimer = setTimeout(async function() {
    await logoutUser();
    sessionStorage.removeItem('yogabinds_login_time');
    alert('Your session has expired. Please log in again.');
  }, remaining);
}

function clearSessionTimer() {
  if (_sessionTimer) {
    clearTimeout(_sessionTimer);
    _sessionTimer = null;
  }
}

// ---- Friendly error messages ----
function friendlyAuthError(firebaseError) {
  var msg = String(firebaseError || '');
  if (msg.includes('user-not-found')) {
    return "Account doesn't exist, please register.";
  }
  if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
    return "Account doesn't exist or password is incorrect. Please try again or register.";
  }
  if (msg.includes('email-already-in-use')) {
    return 'An account with this email already exists. Try signing in.';
  }
  if (msg.includes('weak-password')) {
    return 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and a number.';
  }
  if (msg.includes('too-many-requests')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (msg.includes('network-request-failed')) {
    return 'Network error. Please check your connection and try again.';
  }
  if (msg.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (msg.includes('popup-closed-by-user')) {
    return 'Sign-in popup was closed. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

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
        <div class="form-row">
          <div class="form-group">
            <label for="signupFirstName">First Name</label>
            <input type="text" id="signupFirstName" placeholder="First name" required autocomplete="given-name" />
          </div>
          <div class="form-group">
            <label for="signupLastName">Last Name</label>
            <input type="text" id="signupLastName" placeholder="Last name" required autocomplete="family-name" />
          </div>
        </div>
        <div class="form-group">
          <label for="signupEmail">Email Address</label>
          <input type="email" id="signupEmail" placeholder="you@example.com" required autocomplete="email" />
        </div>
        <div class="form-group">
          <label for="signupPassword">Password</label>
          <input type="password" id="signupPassword" placeholder="Min 8 chars, upper + lower + number" required autocomplete="new-password" minlength="8" />
        </div>
        <div class="form-group">
          <label for="signupConfirmPassword">Confirm Password</label>
          <input type="password" id="signupConfirmPassword" placeholder="Confirm your password" required autocomplete="new-password" minlength="8" />
        </div>
        <div class="form-group">
          <label for="signupPhone">Phone Number</label>
          <input type="tel" id="signupPhone" placeholder="+61 4XX XXX XXX" required autocomplete="tel" />
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
    // Resume session timer if returning to page while logged in
    resumeSessionTimer();

    var name = user.displayName ? user.displayName.split(' ')[0] : user.email.split('@')[0];
    btn.textContent = 'Log out';
    btn.onclick = async function(e) {
      e.preventDefault();
      clearSessionTimer();
      sessionStorage.removeItem('yogabinds_login_time');
      await logoutUser();
    };

    // Show My Bookings link in navbar
    var bookingsLink = document.getElementById('navMyBookings');
    if (!bookingsLink) {
      bookingsLink = document.createElement('li');
      bookingsLink.id = 'navMyBookings';
      bookingsLink.innerHTML = '<a href="my-bookings.html">My Bookings</a>';
      btn.closest('ul').insertBefore(bookingsLink, btn.closest('li'));
    }
    bookingsLink.style.display = '';

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
    clearSessionTimer();
    sessionStorage.removeItem('yogabinds_login_time');
    btn.textContent = 'Login';
    btn.onclick = function(e) { e.preventDefault(); openLoginModal(); };
    var emailEl = document.getElementById('navUserEmail');
    if (emailEl) emailEl.style.display = 'none';
    var bookingsLink = document.getElementById('navMyBookings');
    if (bookingsLink) bookingsLink.style.display = 'none';
  }

  // Payment page: show choice screen for guests, form for signed-in users
  if (document.querySelector('.payment-page')) {
    var form = document.getElementById('paymentForm');
    var overlay = document.getElementById('paymentAuthOverlay');
    var successShown = document.getElementById('paymentSuccess').classList.contains('show');

    if (user) {
      // Signed in — show form directly
      if (overlay) overlay.style.display = 'none';
      if (form && !successShown) form.style.display = '';
    } else {
      // Not signed in — show guest/signin choice (unless guest already chose)
      if (!window._guestCheckoutChosen) {
        if (form) form.style.display = 'none';
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'paymentAuthOverlay';
          overlay.className = 'auth-required-overlay';
          overlay.innerHTML = '<div class="auth-required-box"><h3>How would you like to book?</h3><p>Sign in for a faster experience, or continue as a guest.</p><div class="auth-choice-buttons"><a href="#" class="btn btn-primary" id="paymentLoginBtn">Sign In</a><a href="#" class="btn btn-outline" id="paymentGuestBtn">Continue as Guest</a></div></div>';
          form.parentNode.insertBefore(overlay, form);
          document.getElementById('paymentLoginBtn').addEventListener('click', function(e) {
            e.preventDefault();
            openLoginModal();
          });
          document.getElementById('paymentGuestBtn').addEventListener('click', function(e) {
            e.preventDefault();
            window._guestCheckoutChosen = true;
            overlay.style.display = 'none';
            form.style.display = '';
          });
        }
        overlay.style.display = 'flex';
      }
    }
  }
});

// ---- Login form ----
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var email = document.getElementById('loginEmail').value.trim().toLowerCase();
  var password = document.getElementById('loginPassword').value;
  var errorEl = document.getElementById('loginError');
  var submitBtn = this.querySelector('button[type="submit"]');
  errorEl.textContent = '';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';
  var result = await loginUser(email, password);
  if (result.success) {
    startSessionTimer();
    closeLoginModal();
    this.reset();
  } else {
    errorEl.textContent = friendlyAuthError(result.error);
  }
  document.getElementById('loginPassword').value = '';
  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign In';
});

// ---- Signup form ----
document.getElementById('signupForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var firstName = document.getElementById('signupFirstName').value.trim();
  var lastName = document.getElementById('signupLastName').value.trim();
  var email = document.getElementById('signupEmail').value.trim().toLowerCase();
  var password = document.getElementById('signupPassword').value;
  var confirmPassword = document.getElementById('signupConfirmPassword').value;
  var phone = document.getElementById('signupPhone').value.trim();
  var errorEl = document.getElementById('signupError');
  var submitBtn = this.querySelector('button[type="submit"]');
  errorEl.textContent = '';

  // Validate name lengths
  if (!firstName || !lastName || firstName.length > 50 || lastName.length > 50) {
    errorEl.textContent = 'Please enter a valid first and last name (max 50 characters each).';
    return;
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errorEl.textContent = 'Please enter a valid email address.';
    return;
  }

  // Validate phone
  if (!/^[+\d\s()\-]{6,30}$/.test(phone)) {
    errorEl.textContent = 'Please enter a valid phone number.';
    return;
  }

  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    return;
  }

  // Stronger password requirements
  if (password.length < 8) {
    errorEl.textContent = 'Password must be at least 8 characters long.';
    return;
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    errorEl.textContent = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account...';
  var result = await signupUser(email, password, {
    firstName: firstName,
    lastName: lastName,
    phone: phone
  });
  if (result.success) {
    startSessionTimer();
    closeSignupModal();
    this.reset();
  } else {
    errorEl.textContent = friendlyAuthError(result.error);
  }
  document.getElementById('signupPassword').value = '';
  document.getElementById('signupConfirmPassword').value = '';
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
    errorEl.textContent = friendlyAuthError(result.error);
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
    startSessionTimer();
    closeLoginModal();
  } else {
    errorEl.textContent = friendlyAuthError(result.error);
  }
});

document.getElementById('googleSignUpBtn').addEventListener('click', async function() {
  var errorEl = document.getElementById('signupError');
  errorEl.textContent = '';
  var result = await googleSignIn();
  if (result.success) {
    startSessionTimer();
    closeSignupModal();
  } else {
    errorEl.textContent = friendlyAuthError(result.error);
  }
});
