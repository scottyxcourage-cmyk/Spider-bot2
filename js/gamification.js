'use strict';
// ── Gamification (frontend-only, per-device) ─────────────────────────────
// Everything here is derived from REAL local usage (views/saves + daily visits).
// There is no backend wallet/earnings system yet, so we never fabricate money
// figures — balance & referral earnings show as real $0.00 until that ships.
// Points/streak/level are honest local scores, not currency.

const XP_PER_LEVEL = 150;

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

function loadGamify() {
  try { return JSON.parse(localStorage.getItem('sh_gamify') || '{}'); }
  catch { return {}; }
}
function saveGamify(g) {
  localStorage.setItem('sh_gamify', JSON.stringify(g));
}

// Call once on boot — updates the daily streak based on last visit date.
function tickStreak() {
  const g = loadGamify();
  const today = todayKey();
  if (g.lastVisit === today) return g; // already counted today

  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = `${y.getFullYear()}-${y.getMonth()+1}-${y.getDate()}`;

  g.streak = (g.lastVisit === yesterday) ? (g.streak || 0) + 1 : 1;
  g.best = Math.max(g.best || 0, g.streak);
  g.lastVisit = today;
  saveGamify(g);
  return g;
}

function getPoints() {
  // Real, transparent formula from actual usage — no fabricated numbers.
  const g = loadGamify();
  const views  = STATE.viewCount || 0;
  const saves  = STATE.saveCount || 0;
  const streak = g.streak || 0;
  return (views * 2) + (saves * 5) + (streak * 3);
}

function getLevelInfo() {
  const pts = getPoints();
  const level = Math.floor(pts / XP_PER_LEVEL) + 1;
  const into  = pts % XP_PER_LEVEL;
  const pct   = Math.round((into / XP_PER_LEVEL) * 100);
  return { points: pts, level, into, remaining: XP_PER_LEVEL - into, pct };
}

function getStreak() {
  const g = loadGamify();
  return { current: g.streak || 0, best: g.best || 0 };
}

// Real notifications only — derived from actual account state, nothing fake.
function getNotifications() {
  const list = [];
  if (STATE.currentUser && STATE.currentUser.verified === false) {
    list.push({ icon: '📧', title: 'Verify your email to unlock all features', time: 'Action needed' });
  }
  const g = loadGamify();
  if ((g.streak || 0) >= 3) {
    list.push({ icon: '🔥', title: `${g.streak}-day streak — keep it going!`, time: 'Today' });
  }
  return list;
}

// Real recent activity, built from this session's actual counters.
function getRecentActivity() {
  const items = [];
  if (STATE.viewCount > 0) items.push({ icon: '👁️', title: `You viewed ${STATE.viewCount} title${STATE.viewCount===1?'':'s'}`, time: 'This session' });
  if (STATE.saveCount > 0) items.push({ icon: '💾', title: `You saved ${STATE.saveCount} item${STATE.saveCount===1?'':'s'}`, time: 'This session' });
  const g = loadGamify();
  if (g.streak > 1) items.push({ icon: '🔥', title: `${g.streak}-day login streak`, time: 'Ongoing' });
  return items;
}
