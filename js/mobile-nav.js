'use strict';
// ── MOBILE BOTTOM TAB BAR ─────────────────────────────────────────────
// Injected into the DOM after app launch. Zero coupling — reads STATE
// and calls navigateTo() / openSidebar() which already exist globally.

const MOBILE_TABS = [
  {
    page: 'home',
    label: 'Home',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><polyline points="9 21 9 12 15 12 15 21"/></svg>`
  },
  {
    page: 'movies',
    label: 'Movies',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>`
  },
  {
    page: 'music',
    label: 'Music',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
  },
  {
    page: 'search',
    label: 'Search',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`
  },
  {
    page: '__menu__',
    label: 'Menu',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8892a4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`
  }
];

function injectMobileNav() {
  // Don't inject twice
  if (document.getElementById('mobile-nav')) return;

  const nav = document.createElement('div');
  nav.id = 'mobile-nav';
  nav.innerHTML = `<div class="mn-inner">${
    MOBILE_TABS.map(t => `
      <button class="mn-btn${t.page === 'home' ? ' active' : ''}"
              data-mnpage="${t.page}"
              onclick="handleMnClick('${t.page}')"
              aria-label="${t.label}">
        ${t.svg}
        <span class="mn-label">${t.label}</span>
      </button>
    `).join('')
  }</div>`;
  document.body.appendChild(nav);
}

function handleMnClick(page) {
  if (page === '__menu__') {
    if (typeof openSidebar === 'function') openSidebar();
    return;
  }
  updateMobileNavActive(page);
  navigateTo(page);
}

function updateMobileNavActive(pageId) {
  document.querySelectorAll('.mn-btn[data-mnpage]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mnpage === pageId);
  });
}

// Hook into nav.js showPage() — called after every page switch
const _origShowPage = typeof showPage !== 'undefined' ? showPage : null;
// We patch it after DOM ready since showPage is defined in nav.js
document.addEventListener('DOMContentLoaded', () => {
  // Wrap showPage to also update mobile nav
  if (typeof showPage === 'function') {
    const orig = showPage;
    window.showPage = function(id) {
      orig(id);
      updateMobileNavActive(id);
    };
  }
});
