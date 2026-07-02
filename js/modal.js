'use strict';

function openModal() {
  document.getElementById('modal-overlay').classList.add('visible');
  document.body.style.overflow = 'hidden';
  STATE.viewCount++;
  document.getElementById('stat-views').textContent = STATE.viewCount;
}
function closeModal(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('modal-overlay').classList.remove('visible');
  document.body.style.overflow = '';
  stopPreview();
}

function setModalHeroImg(src, alt, fallback) {
  const mh = document.getElementById('modal-hero');
  mh.querySelector('img')?.remove();
  const im = document.createElement('img');
  im.src = src; im.alt = alt;
  im.onerror = () => im.src = fallback;
  im.style.cssText = 'width:100%;height:100%;object-fit:cover;';
  mh.insertBefore(im, mh.firstChild);
}

async function openMovieModal(idx, fromSearch) {
  const item = (fromSearch ? STATE.searchMovies : STATE.allMovies)[idx];
  if (!item) return;
  const { id, title, poster, backdrop, year, rating, overview } = item;
  const img = backdrop || poster || fallbackImg(title + idx);

  setModalHeroImg(img, title, fallbackImg(title + idx));
  document.getElementById('modal-badge').textContent = '🎬 Movie';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-meta').innerHTML =
    (year   ? `<span class="badge">${year}</span>` : '') +
    (rating ? `<span class="badge cyan">⭐ ${rating}</span>` : '');
  document.getElementById('modal-desc').textContent = overview || 'No description available.';
  document.getElementById('modal-actions').innerHTML =
    `<button class="btn-modal primary" id="trailer-btn" onclick="watchTrailer(${id}, '${encodeURIComponent(title)}')">▶ Watch Trailer</button>
     <a class="btn-modal secondary" href="https://www.themoviedb.org/movie/${id}" target="_blank" rel="noopener">ℹ More Info</a>
     <button class="btn-modal secondary" onclick="handleSave('${encodeURIComponent(title)}')">🔖 Save</button>
     <button class="btn-modal secondary" onclick="closeModalDirect()">Close</button>`;
  openModal();
}

async function watchTrailer(tmdbId, encodedTitle) {
  const title = decodeURIComponent(encodedTitle);
  const btn = document.getElementById('trailer-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Loading trailer...'; }
  const key = await fetchMovieTrailerKey(tmdbId);
  if (btn) { btn.disabled = false; btn.textContent = '▶ Watch Trailer'; }
  if (key) {
    window.open(`https://www.youtube.com/watch?v=${key}`, '_blank', 'noopener');
  } else {
    toast(`No trailer found for ${title}.`, 'info');
  }
}

function openMusicModal(idx, fromSearch) {
  const item = (fromSearch ? STATE.searchMusic : STATE.allMusic)[idx];
  if (!item) return;
  const { title, artist, poster, previewUrl, itunesUrl } = item;
  const img = poster || fallbackImgSq(title + idx);

  setModalHeroImg(img, title, fallbackImgSq(title + idx));
  document.getElementById('modal-badge').textContent = '🎵 Music';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-meta').innerHTML =
    (artist ? `<span class="badge">🎤 ${artist}</span>` : '');
  document.getElementById('modal-desc').textContent = previewUrl
    ? '30-second preview clip, courtesy of iTunes.'
    : 'No preview clip available for this track.';

  const playBtn = previewUrl
    ? `<button class="btn-modal primary" id="preview-btn" onclick="togglePreview('${previewUrl.replace(/'/g, "\\'")}', ${idx})">▶ Play Preview</button>`
    : '';
  const itunesBtn = itunesUrl
    ? `<a class="btn-modal secondary" href="${itunesUrl}" target="_blank" rel="noopener">🎧 Open in Apple Music</a>`
    : '';

  document.getElementById('modal-actions').innerHTML =
    playBtn + itunesBtn +
    `<button class="btn-modal secondary" onclick="handleSave('${encodeURIComponent(title)}')">🔖 Save</button>
     <button class="btn-modal secondary" onclick="closeModalDirect()">Close</button>`;
  openModal();
}

// ---------- Audio preview playback (legal 30s clips from iTunes) ----------
function togglePreview(url, idx) {
  const btn = document.getElementById('preview-btn');
  if (STATE.audioPlayer && !STATE.audioPlayer.paused && STATE.audioPlayer.dataset.idx == idx) {
    stopPreview();
    return;
  }
  stopPreview();
  STATE.audioPlayer = new Audio(url);
  STATE.audioPlayer.dataset.idx = idx;
  STATE.audioPlayer.play().catch(() => toast('Could not play preview.', 'error'));
  if (btn) btn.textContent = '⏸ Pause Preview';
  STATE.audioPlayer.onended = () => { if (btn) btn.textContent = '▶ Play Preview'; };
}
function stopPreview() {
  if (STATE.audioPlayer) {
    STATE.audioPlayer.pause();
    STATE.audioPlayer = null;
  }
  const btn = document.getElementById('preview-btn');
  if (btn) btn.textContent = '▶ Play Preview';
}
function playPreview(idx, fromSearch) {
  const item = (fromSearch ? STATE.searchMusic : STATE.allMusic)[idx];
  if (!item || !item.previewUrl) { toast('No preview available for this track.', 'info'); return; }
  togglePreview(item.previewUrl, idx);
}

function handleSave(encodedTitle) {
  const title = decodeURIComponent(encodedTitle);
  STATE.saveCount++;
  document.getElementById('stat-saves').textContent = STATE.saveCount;
  toast(`Saved: ${title}`, 'info');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalDirect(); });
