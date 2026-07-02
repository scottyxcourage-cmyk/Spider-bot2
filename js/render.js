function fallbackImg(seed)   { return `https://picsum.photos/seed/${encodeURIComponent(seed||'x')}/300/450`; }
function fallbackImgSq(seed) { return `https://picsum.photos/seed/${encodeURIComponent(seed||'y')}/300/300`; }

function skMovieCard() {
  return `<div class="sk-card">
    <div class="sk sk-poster"></div>
    <div class="sk-body">
      <div class="sk" style="height:13px;width:72%;margin-bottom:6px;"></div>
      <div class="sk" style="height:11px;width:44%;"></div>
    </div>
  </div>`;
}
function skTrack() {
  return `<div class="sk-track">
    <div class="sk" style="width:22px;height:14px;border-radius:4px;flex-shrink:0;"></div>
    <div class="sk" style="width:48px;height:48px;border-radius:8px;flex-shrink:0;"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:7px;">
      <div class="sk" style="height:13px;width:65%;"></div>
      <div class="sk" style="height:11px;width:40%;"></div>
    </div>
    <div class="sk" style="width:34px;height:34px;border-radius:50%;flex-shrink:0;"></div>
  </div>`;
}
function skHero() {
  return `<div class="sk" style="border-radius:18px;height:320px;margin-bottom:36px;"></div>`;
}
function skMoviePage() {
  return skHero() +
    `<div class="sec-head"><div class="sk" style="height:12px;width:120px;"></div></div>` +
    `<div class="card-grid">${Array.from({length:10}, skMovieCard).join('')}</div>`;
}
function skMusicPage() {
  return `<div class="music-row">${Array.from({length:8}, skTrack).join('')}</div>`;
}
function genericSkeleton() {
  return `<div class="sk" style="height:200px;border-radius:12px;margin-bottom:20px;"></div>
    <div class="sk" style="height:18px;width:40%;border-radius:6px;margin-bottom:20px;"></div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${Array.from({length:4}, () => `<div class="sk" style="height:60px;border-radius:10px;"></div>`).join('')}
    </div>`;
}

function errorBox(msg, retryCb) {
  return `<div class="state-box">
    <div class="state-icon">⚠️</div>
    <div class="state-title">Could not load content</div>
    <div class="state-sub">${msg}</div>
    <button class="btn-retry" onclick="${retryCb}">↺ &nbsp;Retry</button>
  </div>`;
}

function renderMovieCard(item, idx, fromSearch) {
  const title  = item.title || `Item ${idx + 1}`;
  const year   = item.year || '';
  const rating = item.rating || '';
  const img    = item.poster || fallbackImg(title + idx);
  return `<div class="card" onclick="openMovieModal(${idx}, ${!!fromSearch})">
    <img class="card-poster" src="${img}" alt="${title}" onerror="this.src='${fallbackImg(title+idx)}'"/>
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-sub">${year}${year && rating ? ' · ' : ''}${rating ? '⭐ ' + rating : ''}</div>
    </div>
  </div>`;
}

function renderTrack(item, idx, fromSearch) {
  const title  = item.title || `Track ${idx + 1}`;
  const artist = item.artist || '';
  const img    = item.poster || fallbackImgSq(title + idx);
  return `<div class="track-item" onclick="openMusicModal(${idx}, ${!!fromSearch})">
    <span class="track-num">${idx + 1}</span>
    <img class="track-thumb" src="${img}" alt="${title}" onerror="this.src='${fallbackImgSq(title+idx)}'"/>
    <div class="track-info">
      <div class="track-title">${title}</div>
      <div class="track-artist">${artist}</div>
    </div>
    <button class="btn-dl" onclick="event.stopPropagation();playPreview(${idx}, ${!!fromSearch})" title="Play preview">▶</button>
  </div>`;
}

/* ── Dashboard widgets (welcome banner, pills, XP, activity feed) ── */
function renderDashboardWidgets() {
  if (!STATE.currentUser) return;
  const g = (typeof tickStreak === 'function') ? tickStreak() : { streak: 0 };
  const lvl = (typeof getLevelInfo === 'function') ? getLevelInfo() : { level: 1, into: 0, pct: 0, points: 0 };

  const name   = STATE.currentUser.name || 'there';
  const letter = name[0] ? name[0].toUpperCase() : 'U';
  const hour   = new Date().getHours();
  const greet  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  setText('dash-avatar', letter);
  setText('dash-greeting', greet);
  setText('dash-username', name);
  setText('dash-streak-pill', `🔥 ${g.streak || 0}-day streak`);
  setText('dash-points', lvl.points);
  setText('dash-level-badge', `LV ${lvl.level}`);
  setText('dash-xp-count', `${lvl.into} / ${XP_PER_LEVEL} XP`);
  const fill = document.getElementById('dash-xp-fill');
  if (fill) fill.style.width = lvl.pct + '%';

  const notifs = (typeof getNotifications === 'function') ? getNotifications() : [];
  setText('dash-notif-count', notifs.length);

  const feedEl = document.getElementById('dash-activity-feed');
  if (feedEl) {
    const activity = (typeof getRecentActivity === 'function') ? getRecentActivity() : [];
    feedEl.innerHTML = activity.length
      ? activity.map(a => `<div class="dash-feed-item">
          <div class="dash-feed-icon">${a.icon}</div>
          <div class="dash-feed-body"><div class="dash-feed-title">${a.title}</div><div class="dash-feed-time">${a.time}</div></div>
        </div>`).join('')
      : `<div class="dash-feed-empty">Nothing yet — browse some movies or music to see activity here.</div>`;
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Page render functions ── */
async function renderHome() {
  renderDashboardWidgets();
  const heroEl   = document.getElementById('home-hero');
  const moviesEl = document.getElementById('home-movies');
  const musicEl  = document.getElementById('home-music');
  heroEl.innerHTML   = skHero();
  moviesEl.innerHTML = Array.from({length:6}, skMovieCard).join('');
  musicEl.innerHTML  = Array.from({length:5}, skTrack).join('');
  try {
    await Promise.all([
      STATE.allMovies.length ? null : loadMovies(),
      STATE.allMusic.length  ? null : loadMusic()
    ]);
    if (STATE.allMovies.length) {
      const h = STATE.allMovies[0];
      const title = h.title || 'Featured';
      const img   = h.backdrop || h.poster || fallbackImg(title);
      heroEl.innerHTML = `<div class="hero-banner" onclick="openMovieModal(0)">
        <img src="${img}" alt="${title}" onerror="this.src='${fallbackImg(title)}'"/>
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <div class="hero-badge">🔥 Trending This Week</div>
          <div class="hero-title">${title}</div>
          <div class="hero-meta">
            ${h.year ? `<span>📅 ${h.year}</span>` : ''}
            ${h.rating ? `<span>⭐ ${h.rating}</span>` : ''}
          </div>
          <div class="hero-actions">
            <button class="btn-hero primary" onclick="event.stopPropagation();openMovieModal(0)">View Details</button>
          </div>
        </div>
      </div>`;
    }
    moviesEl.innerHTML = STATE.allMovies.slice(0, 6).map(renderMovieCard).join('');
    musicEl.innerHTML  = STATE.allMusic.slice(0, 5).map(renderTrack).join('');
  } catch(e) {
    heroEl.innerHTML   = '';
    moviesEl.innerHTML = errorBox('Failed to load content.', 'renderHome()');
    musicEl.innerHTML  = '';
    toast('Could not reach the API. Check your connection.', 'error');
  }
}

async function renderMoviesPage() {
  const grid  = document.getElementById('movies-grid');
  const errEl = document.getElementById('movies-error');
  grid.innerHTML  = Array.from({length:12}, skMovieCard).join('');
  errEl.innerHTML = '';
  try {
    if (!STATE.allMovies.length) await loadMovies();
    grid.innerHTML = STATE.allMovies.map(renderMovieCard).join('');
  } catch(e) {
    grid.innerHTML  = '';
    errEl.innerHTML = errorBox('Could not load movies.', 'renderMoviesPage()');
  }
}

async function renderMusicPage() {
  const list  = document.getElementById('music-list');
  const errEl = document.getElementById('music-error');
  list.innerHTML  = Array.from({length:10}, skTrack).join('');
  errEl.innerHTML = '';
  try {
    if (!STATE.allMusic.length) await loadMusic();
    list.innerHTML = STATE.allMusic.map(renderTrack).join('');
  } catch(e) {
    list.innerHTML  = '';
    errEl.innerHTML = errorBox('Could not load music.', 'renderMusicPage()');
  }
}

/* ── Profile page extras (cover/bio/badges/XP) ── */
function renderProfileExtras() {
  const u = STATE.currentUser;
  if (!u) return;
  
  const letter = u.name ? u.name[0].toUpperCase() : 'U';
  const handle = '@' + (u.email ? u.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'') : 'user');

  setText('profile-username', handle);
  setText('profile-name', u.name || 'User');
  setText('profile-joined', `Member since ${u.joined || '—'}`);

  // Update avatar (emoji or image URL)
  const avatarEl = document.getElementById('profile-avatar-big');
  if (avatarEl) {
    if (u.avatar_url) {
      if (u.avatar_url.startsWith('http')) {
        avatarEl.style.backgroundImage = `url(${u.avatar_url})`;
        avatarEl.style.backgroundSize = 'cover';
        avatarEl.style.backgroundPosition = 'center';
        avatarEl.textContent = '';
      } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.textContent = u.avatar_url.length <= 2 ? u.avatar_url : letter;
      }
    } else {
      avatarEl.style.backgroundImage = 'none';
      avatarEl.textContent = letter;
    }
  }

  const badgeEl = document.getElementById('profile-verify-badge');
  if (badgeEl) {
    const verified = !!u.verified;
    badgeEl.classList.toggle('unverified', !verified);
    badgeEl.title = verified ? 'Verified account' : 'Email not verified yet';
  }

  const bio = u.bio || '';
  const bioEl = document.getElementById('profile-bio');
  if (bioEl) {
    bioEl.textContent = bio || "Add a short bio so people know what you're about.";
    bioEl.classList.toggle('empty', !bio);
  }

  // Display points
  const points = u.points || 0;
  const pointsEl = document.getElementById('dash-points');
  if (pointsEl) pointsEl.textContent = points;

  const lvl = (typeof getLevelInfo === 'function') ? getLevelInfo() : { level: 1, into: 0, pct: 0 };
  setText('profile-level-badge', `LV ${lvl.level}`);
  setText('profile-xp-count', `${lvl.into} / ${XP_PER_LEVEL} XP`);
  const fill = document.getElementById('profile-xp-fill');
  if (fill) fill.style.width = lvl.pct + '%';

  const streak = (typeof getStreak === 'function') ? getStreak() : { current: 0 };
  const badges = [
    { icon: '✅', label: 'Verified',      unlocked: !!u.verified },
    { icon: '💾', label: 'First Save',    unlocked: STATE.saveCount >= 1 },
    { icon: '🧭', label: 'Explorer',      unlocked: STATE.viewCount >= 10 },
    { icon: '🔥', label: '3-Day Streak',  unlocked: streak.current >= 3 },
    { icon: '⚡',  label: '7-Day Streak',  unlocked: streak.current >= 7 },
  ];
  const badgesEl = document.getElementById('profile-badges');
  if (badgesEl) {
    badgesEl.innerHTML = badges.map(b =>
      `<div class="profile-badge-chip${b.unlocked ? '' : ' locked'}"><span class="ic">${b.icon}</span>${b.label}</div>`
    ).join('');
  }
}

function editBio() {
  sbNavigate('edit-profile');
}

function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem('sh_stats') || '{}');
    STATE.viewCount = s.views || 0;
    STATE.dlCount   = s.dl    || 0;
    STATE.saveCount = s.saves || 0;
    setText('stat-views', STATE.viewCount);
    setText('stat-dl', STATE.dlCount);
    setText('stat-saves', STATE.saveCount);
  } catch {}
}
function saveStats() {
  localStorage.setItem('sh_stats', JSON.stringify({ views: STATE.viewCount, dl: STATE.dlCount, saves: STATE.saveCount }));
}
window.addEventListener('beforeunload', saveStats);
