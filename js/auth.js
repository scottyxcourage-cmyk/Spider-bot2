// All auth now talks to the real backend (server/routes/auth.js) instead of localStorage.
// Sessions are stored as an httpOnly cookie set by the server - nothing sensitive lives client-side.

const AUTH_API = (window.CONFIG && CONFIG.API_BASE) ? CONFIG.API_BASE : '';

async function apiPost(path, body) {
  const res = await fetch(AUTH_API + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function apiGet(path) {
  const res = await fetch(AUTH_API + path, { credentials: 'include' });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

async function apiPut(path, body) {
  const res = await fetch(AUTH_API + path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('form-login').style.display  = isLogin ? 'block' : 'none';
  document.getElementById('form-signup').style.display = isLogin ? 'none'  : 'block';
  clearAuthMessages();
}

function clearAuthMessages() {
  document.getElementById('auth-error').classList.remove('visible');
  document.getElementById('auth-success').classList.remove('visible');
  document.getElementById('resend-verify-link').style.display = 'none';
}
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg; el.classList.add('visible');
  document.getElementById('auth-success').classList.remove('visible');
}
function showAuthSuccess(msg) {
  const el = document.getElementById('auth-success');
  el.textContent = msg; el.classList.add('visible');
  document.getElementById('auth-error').classList.remove('visible');
}

// ---------- LOGIN ----------
async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  if (!email || !pass) { showAuthError('Please fill in all fields.'); return; }
  if (!email.includes('@')) { showAuthError('Enter a valid email address.'); return; }

  const btn = document.getElementById('btn-login');
  btn.disabled = true;
  btn.innerHTML = '<span class="auth-spinner"></span>Signing in...';
  document.getElementById('resend-verify-link').style.display = 'none';

  const { ok, data } = await apiPost('/api/auth/login', { email, password: pass });

  btn.disabled = false;
  btn.textContent = 'Sign In';

  if (!ok) {
    showAuthError(data.error || 'Could not sign in. Please try again.');
    if (data.needsVerification) {
      document.getElementById('resend-verify-link').style.display = 'block';
    }
    return;
  }

  STATE.currentUser = data.user;
  launchApp();
}

// ---------- SIGNUP ----------
async function handleSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  if (!name || !email || !pass || !pass2) { showAuthError('Please fill in all fields.'); return; }
  if (!email.includes('@')) { showAuthError('Enter a valid email address.'); return; }
  if (pass.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }
  if (pass !== pass2) { showAuthError("Passwords don't match."); return; }

  const btn = document.getElementById('btn-signup');
  btn.disabled = true;
  btn.innerHTML = '<span class="auth-spinner"></span>Creating account...';

  const { ok, data } = await apiPost('/api/auth/signup', { name, email, password: pass });

  btn.disabled = false;
  btn.textContent = 'Create Account';

  if (!ok) {
    showAuthError(data.error || 'Could not create your account. Please try again.');
    return;
  }

  // Logged in immediately — launch the app
  STATE.currentUser = data.user;
  toast(data.message || `Welcome, ${data.user.name}!`, 'success');
  launchApp();
}

// ---------- RESEND VERIFICATION ----------
async function handleResendVerification() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showAuthError('Enter your email address first.'); return; }
  const { data } = await apiPost('/api/auth/resend-verification', { email });
  showAuthSuccess(data.message || 'If that account exists and is unverified, a new verification email has been sent.');
}

// ---------- FORGOT PASSWORD ----------
async function handleForgot() {
  const email = document.getElementById('login-email').value.trim();
  if (!email) { showAuthError('Enter your email address first.'); return; }
  if (!email.includes('@')) { showAuthError('Enter a valid email address.'); return; }
  const { data } = await apiPost('/api/auth/forgot', { email });
  showAuthSuccess(data.message || 'If that account exists, a reset link has been sent.');
}

// ---------- LOGOUT ----------
async function handleLogout() {
  await apiPost('/api/auth/logout', {});
  STATE.currentUser = null;
  const app = document.getElementById('app');
  app.classList.remove('visible');
  app.style.display = 'none';
  document.getElementById('auth-screen').classList.add('visible');
  closeUserMenu();
  toast('Signed out successfully.', 'info');
}

// ---------- SESSION CHECK (used on boot) ----------
async function fetchSession() {
  const { ok, data } = await apiGet('/api/auth/me');
  return ok ? data.user : null;
}

function toggleUserMenu() {
  STATE.userMenuOpen = !STATE.userMenuOpen;
  document.getElementById('user-menu').style.display = STATE.userMenuOpen ? 'block' : 'none';
}
function closeUserMenu() {
  STATE.userMenuOpen = false;
  document.getElementById('user-menu').style.display = 'none';
}

function setUserUI() {
  if (!STATE.currentUser) return;
  const letter = STATE.currentUser.name ? STATE.currentUser.name[0].toUpperCase() : 'U';
  document.getElementById('avatar-letter').textContent         = letter;
  document.getElementById('menu-name').textContent             = STATE.currentUser.name || 'User';
  document.getElementById('menu-email').textContent            = STATE.currentUser.email || '';
  const avatarBig = document.getElementById('profile-avatar-big');
  if (avatarBig) avatarBig.textContent = letter;
  document.getElementById('profile-name').textContent          = STATE.currentUser.name || '—';
  document.getElementById('profile-joined').textContent        = `Member since ${STATE.currentUser.joined || '—'}`;
  // Sidebar user card
  const sbAv = document.getElementById('sb-avatar');
  const sbNm = document.getElementById('sb-name');
  const sbEm = document.getElementById('sb-email');
  if (sbAv) sbAv.textContent = letter;
  if (sbNm) sbNm.textContent = STATE.currentUser.name  || '—';
  if (sbEm) sbEm.textContent = STATE.currentUser.email || '—';

  if (typeof renderProfileExtras === 'function') renderProfileExtras();
  if (typeof renderDashboardWidgets === 'function') renderDashboardWidgets();
}

document.addEventListener('click', e => {
  if (!document.getElementById('user-avatar').contains(e.target)) closeUserMenu();
});


// ---------- GOOGLE SIGN-IN ----------
// Two paths to the same destination:
//  1. Google Identity Services (GIS) popup button — nicest UX, but depends on
//     accounts.google.com/gsi/client loading, which some ad blockers / carrier
//     data-saver browsers block silently.
//  2. A plain "Continue with Google" link to a server-side OAuth redirect —
//     just a normal page navigation, so it works even when #1 is blocked.
// We always try #1 first and reveal #2 automatically if #1 fails or times out,
// so there's never a dead end for the user.

const GSI_LOAD_TIMEOUT_MS = 6000;

function logGoogleAuth(level, msg, extra) {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[GoogleAuth] ${msg}`, extra !== undefined ? extra : '');
}

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.accounts) { resolve(); return; }
    const existing = document.getElementById('gsi-client-script');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script error (existing tag)')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-client-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script failed to load (blocked or network error)'));
    document.head.appendChild(script);

    setTimeout(() => reject(new Error(`timed out after ${GSI_LOAD_TIMEOUT_MS}ms`)), GSI_LOAD_TIMEOUT_MS);
  });
}

function showGoogleFallbackLinks() {
  ['google-fallback-login', 'google-fallback-signup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  });
  // Hide the (now-broken/empty) SDK button containers so there's no dead space.
  ['google-btn-login', 'google-btn-signup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function hideGoogleEntirely() {
  document.querySelectorAll('#google-btn-login, #google-btn-signup, #google-fallback-login, #google-fallback-signup').forEach(el => {
    el.style.display = 'none';
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.classList.contains('auth-divider')) { prev.style.display = 'none'; break; }
      prev = prev.previousElementSibling;
    }
  });
}

async function bootGoogleSignIn() {
  handleGoogleRedirectResult(); // in case we just came back from the redirect flow

  let clientId = null;
  try {
    const { ok, data } = await apiGet('/api/auth/google-client-id');
    clientId = ok ? (data.clientId || null) : null;
  } catch (e) {
    logGoogleAuth('error', 'Failed to reach server for client ID', e);
  }

  if (!clientId) {
    logGoogleAuth('warn', 'No GOOGLE_CLIENT_ID configured on the server — hiding Google Sign-In.');
    hideGoogleEntirely();
    return;
  }

  try {
    await loadGsiScript();
  } catch (e) {
    logGoogleAuth('warn', `GIS script unavailable (${e.message}) — showing redirect-link fallback.`);
    showGoogleFallbackLinks();
    return;
  }

  if (!window.google || !window.google.accounts) {
    logGoogleAuth('warn', 'GIS script loaded but window.google.accounts is missing — showing fallback.');
    showGoogleFallbackLinks();
    return;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  } catch (e) {
    logGoogleAuth('error', 'google.accounts.id.initialize() threw — showing fallback.', e);
    showGoogleFallbackLinks();
    return;
  }

  renderGoogleButtons();
}

function renderGoogleButtons(isRetry = false) {
  let anySucceeded = false;
  ['google-btn-login', 'google-btn-signup'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // Fix 1: Skip hidden containers — offsetWidth is 0 when display:none
    if (el.offsetWidth === 0 || (el.parentElement && el.parentElement.offsetWidth === 0)) {
      return;
    }

    try {
      el.innerHTML = ''; // clear any previous render
      const measured = el.parentElement ? el.parentElement.offsetWidth - 32 : 280;
      const width = Math.max(200, Math.min(measured || 280, 380));
      google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width,
      });
      anySucceeded = true;
    } catch (e) {
      logGoogleAuth('error', `renderButton failed for #${id}`, e);
    }
  });

  // Fix 3: Retry once after 300ms if nothing rendered (don't loop forever)
  if (!anySucceeded && !isRetry) {
    setTimeout(() => renderGoogleButtons(true), 300);
  } else if (!anySucceeded && isRetry) {
    showGoogleFallbackLinks();
  }
}

// Re-render when switching tabs (login <-> signup) so button appears in new form
const _origSwitchTab = window.switchTab || switchTab;
window.switchTab = function(tab) {
  _origSwitchTab(tab);
  if (window.google && window.google.accounts) {
    // Fix 2: Increased from 60ms to 200ms to allow DOM paint before measuring
    setTimeout(renderGoogleButtons, 200);
  }
};

async function handleGoogleCredential(response) {
  const { ok, data } = await apiPost('/api/auth/google', { credential: response.credential });
  if (!ok) {
    logGoogleAuth('error', 'Backend rejected Google credential', data);
    showAuthError(data.error || 'Google sign-in failed. Please try again.');
    return;
  }
  STATE.currentUser = data.user;
  toast('Welcome, ' + data.user.name + '!', 'success');
  launchApp();
}

// After the redirect-flow fallback sends the user back here with
// ?googleAuth=success|failed, finish (or report) sign-in and clean the URL.
function handleGoogleRedirectResult() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get('googleAuth');
  if (!result) return;

  params.delete('googleAuth');
  const cleanUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.replaceState({}, '', cleanUrl);

  if (result === 'success') {
    fetchSession().then(user => {
      if (user) {
        STATE.currentUser = user;
        toast('Welcome, ' + user.name + '!', 'success');
        launchApp();
      }
    });
  } else {
    logGoogleAuth('error', 'Redirect-flow Google sign-in failed (see server logs for details).');
    showAuthError('Google sign-in failed. Please try again or use email/password.');
  }
}

// ---------- PROFILE EDITING ----------
async function loadProfileForm() {
  const user = STATE.currentUser;
  if (!user) return;
  
  // Populate form fields
  document.getElementById('name').value = user.name || '';
  document.getElementById('bio').value = user.bio || '';
  document.getElementById('avatar_url').value = user.avatar_url || '';
  
  // Update preview and character counts
  updateAvatarPreview();
  updateCharCounts();
  
  // Add input listeners for real-time updates
  document.getElementById('avatar_url').addEventListener('input', updateAvatarPreview);
  document.getElementById('name').addEventListener('input', updateCharCounts);
  document.getElementById('bio').addEventListener('input', updateCharCounts);
}

function updateAvatarPreview() {
  const val = document.getElementById('avatar_url').value.trim();
  const preview = document.getElementById('avatar-preview');
  
  if (!val) {
    preview.textContent = '👤';
  } else if (val.startsWith('http')) {
    // It's a URL, show as background image
    preview.style.backgroundImage = `url(${val})`;
    preview.style.backgroundSize = 'cover';
    preview.style.backgroundPosition = 'center';
    preview.textContent = '';
  } else {
    // Treat as emoji
    preview.style.backgroundImage = 'none';
    preview.textContent = val.length <= 2 ? val : '😀';
  }
}

function updateCharCounts() {
  const name = document.getElementById('name').value;
  const bio = document.getElementById('bio').value;
  document.getElementById('name-count').textContent = name.length;
  document.getElementById('bio-count').textContent = bio.length;
}

async function handleProfileUpdate(event) {
  event.preventDefault();
  
  const name = document.getElementById('name').value.trim();
  const bio = document.getElementById('bio').value.trim();
  const avatar_url = document.getElementById('avatar_url').value.trim();
  const errorEl = document.getElementById('profile-error');
  const btn = event.target.querySelector('button[type="submit"]');
  
  if (!name) {
    errorEl.textContent = 'Please enter a name.';
    errorEl.style.display = 'block';
    return;
  }
  
  btn.disabled = true;
  btn.textContent = '⏳ Saving...';
  errorEl.style.display = 'none';
  
  const result = await apiPut('/api/auth/profile', { name, bio, avatar_url });
  
  if (result.ok) {
    // Update STATE with new user info
    STATE.currentUser = result.data.user;
    toast('Profile updated!', 'success');
    setTimeout(() => sbNavigate('profile'), 500);
  } else {
    errorEl.textContent = result.data.error || 'Failed to update profile.';
    errorEl.style.display = 'block';
  }
  
  btn.disabled = false;
  btn.textContent = '💾 Save Profile';
}

// Boot on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootGoogleSignIn);
} else {
  bootGoogleSignIn();
}
