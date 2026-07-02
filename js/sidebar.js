'use strict';
// ─── SIDEBAR ────────────────────────────────────────────────────────
// All sidebar logic lives here. Zero coupling to existing JS files
// except calling navigateTo() (defined in nav.js) and handleLogout()
// (defined in auth.js), both of which are already global functions.

// ── SVG Icons (18x18, stroke-based, futuristic) ──────────────────────
const SB_ICONS = {
  profile:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  editProfile:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  favorites:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  watchlist:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
  downloads:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  history:       `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4H1"/><polyline points="1 3 1 7 5 7"/></svg>`,
  notifications: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  messages:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  subscription:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  logout:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b7a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  // Settings icons
  appearance:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  theme:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  language:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  playback:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`,
  privacy:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  dataSaver:     `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M1 6l11 7 11-7"/><path d="M1 6l11-4 11 4"/><path d="M1 18l11 4 11-4"/><path d="M1 12l11 4 11-4"/></svg>`,
  cache:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  account:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  settingsGear:  `<svg width="9.5" height="9.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  admin:         `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  aiChat:        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="9" cy="11" r="1"/><circle cx="13" cy="11" r="1"/><circle cx="17" cy="11" r="1"/></svg>`,
  darkMode:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  notifSettings: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  dlSettings:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
};

// ── State ─────────────────────────────────────────────────────────────
let SB_SETTINGS_OPEN = false;
let SB_DARK_MODE     = localStorage.getItem('sb_dark_mode') !== 'false';
let SB_DATA_SAVER    = localStorage.getItem('sb_data_saver') === 'true';

// ── Open / Close ──────────────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('sb-open');
  document.getElementById('sb-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  syncSidebarUser();
  updateSidebarActive(STATE.currentPage);
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('sb-open');
  document.getElementById('sb-overlay').classList.remove('visible');
  document.body.style.overflow = '';
}

// Close on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSidebar(); });

// ── Sync user info into sidebar user card ─────────────────────────────
function syncSidebarUser() {
  const u = STATE.currentUser;
  if (!u) return;
  const letter = u.name ? u.name[0].toUpperCase() : '?';
  const el = id => document.getElementById(id);
  if (el('sb-avatar'))   el('sb-avatar').textContent  = letter;
  if (el('sb-name'))     el('sb-name').textContent    = u.name  || '—';
  if (el('sb-email'))    el('sb-email').textContent   = u.email || '—';
}

// ── Active state ──────────────────────────────────────────────────────
// Called from nav.js showPage() — nav.js has a guard: if (typeof updateSidebarActive === 'function')
function updateSidebarActive(pageId) {
  document.querySelectorAll('.sb-item[data-page]').forEach(el => {
    el.classList.toggle('sb-active', el.dataset.page === pageId);
  });
}

// ── Navigate + close ──────────────────────────────────────────────────
function sbNavigate(page) {
  closeSidebar();
  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (page !== STATE.currentPage) navigateTo(page);
  }, 80);
}
function sbLogout() {
  closeSidebar();
  setTimeout(() => handleLogout(), 120);
}

// ── Settings collapse ─────────────────────────────────────────────────
function toggleSbSettings() {
  SB_SETTINGS_OPEN = !SB_SETTINGS_OPEN;
  const body = document.getElementById('sb-settings-body');
  const btn  = document.getElementById('sb-settings-toggle');
  body.classList.toggle('sb-expanded', SB_SETTINGS_OPEN);
  btn.classList.toggle('sb-expanded', SB_SETTINGS_OPEN);
}

// ── Dark / Light mode toggle ──────────────────────────────────────────
function initDarkMode() {
  document.body.classList.toggle('light-mode', !SB_DARK_MODE);
  const cb = document.getElementById('sb-toggle-darkmode');
  if (cb) cb.checked = SB_DARK_MODE;
}
function toggleDarkMode() {
  SB_DARK_MODE = !SB_DARK_MODE;
  localStorage.setItem('sb_dark_mode', SB_DARK_MODE);
  document.body.classList.toggle('light-mode', !SB_DARK_MODE);
  // Keep all toggles in sync
  ['sb-toggle-darkmode', 'settings-toggle-darkmode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = SB_DARK_MODE;
  });
}

// ── Data saver ────────────────────────────────────────────────────────
function initDataSaver() {
  const cb = document.getElementById('sb-toggle-datasaver');
  if (cb) cb.checked = SB_DATA_SAVER;
}
function toggleDataSaver() {
  SB_DATA_SAVER = !SB_DATA_SAVER;
  localStorage.setItem('sb_data_saver', SB_DATA_SAVER);
  toast(SB_DATA_SAVER ? 'Data Saver enabled' : 'Data Saver disabled', 'info');
}

// ── Cache cleaner ─────────────────────────────────────────────────────
function cleanCache() {
  const btn = document.getElementById('sb-cache-btn');
  if (!btn) return;
  btn.textContent = 'Clearing…';
  btn.disabled = true;
  // Clear stat counters + any in-memory caches
  STATE.allMovies = [];
  STATE.allMusic  = [];
  STATE.searchMovies = [];
  STATE.searchMusic  = [];
  STATE.viewCount = 0;
  STATE.dlCount   = 0;
  STATE.saveCount = 0;
  const s = JSON.parse(localStorage.getItem('sh_stats') || '{}');
  s.views = 0; s.dl = 0; s.saves = 0;
  localStorage.setItem('sh_stats', JSON.stringify(s));
  setTimeout(() => {
    btn.textContent = '✓ Cleared';
    btn.disabled = false;
    toast('Cache cleared successfully', 'info');
  }, 900);
}

// ── Language selector ─────────────────────────────────────────────────
function handleLanguageChange(val) {
  toast(`Language set to ${val}`, 'info');
  // Real i18n implementation would go here
}

// ── Initialise after DOM ready ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initDataSaver();
  injectIcons();
});

// ── Inject SVG icons into placeholder spans ───────────────────────────
function injectIcons() {
  const map = {
    'sb-icon-profile':       'profile',
    'sb-icon-editProfile':   'editProfile',
    'sb-icon-favorites':     'favorites',
    'sb-icon-watchlist':     'watchlist',
    'sb-icon-downloads':     'downloads',
    'sb-icon-history':       'history',
    'sb-icon-notifications': 'notifications',
    'sb-icon-messages':      'messages',
    'sb-icon-subscription':  'subscription',
    'sb-icon-admin':         'admin',
    'sb-icon-aiChat':        'aiChat',
    'sb-icon-logout':        'logout',
    'sb-icon-settingsGear':  'settingsGear',
    'sb-icon-appearance':    'appearance',
    'sb-icon-darkMode':      'darkMode',
    'sb-icon-theme':         'theme',
    'sb-icon-language':      'language',
    'sb-icon-playback':      'playback',
    'sb-icon-dlSettings':    'dlSettings',
    'sb-icon-dataSaver':     'dataSaver',
    'sb-icon-cache':         'cache',
    'sb-icon-notifSettings': 'notifSettings',
    'sb-icon-privacy':       'privacy',
    'sb-icon-account':       'account',
  };
  for (const [elId, iconKey] of Object.entries(map)) {
    const el = document.getElementById(elId);
    if (el && SB_ICONS[iconKey]) el.innerHTML = SB_ICONS[iconKey];
  }
}
