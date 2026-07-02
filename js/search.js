'use strict';

function handleSearchInput(val) {
  clearTimeout(STATE.searchTimer);
  document.getElementById('search-input').value = val;
  document.getElementById('search-big').value   = val;
  if (val.trim().length > 1) {
    STATE.searchTimer = setTimeout(() => doSearch(val), 450);
  }
}

async function doSearch(q) {
  const query = (q || document.getElementById('search-big').value || document.getElementById('search-input').value).trim();
  if (!query) return;
  navigateTo('search');
  const res = document.getElementById('search-results');
  res.innerHTML = `<div class="sk-card" style="margin:0 auto;max-width:200px;"></div>`;

  let movieHits = [], musicHits = [];
  try {
    [movieHits, musicHits] = await Promise.all([
      searchMoviesAPI(query),
      searchMusicAPI(query)
    ]);
  } catch {
    res.innerHTML = errorBox('Search failed. Check your connection.', `doSearch('${query.replace(/'/g, "\\'")}')`);
    return;
  }

  if (!movieHits.length && !musicHits.length) {
    res.innerHTML = `<div class="search-empty">
      <div class="em-icon">🔍</div>
      <p>No results for "<strong>${query}</strong>"</p>
      <p style="margin-top:8px;font-size:12px;color:var(--grey);">Try a different keyword.</p>
    </div>`;
    return;
  }

  // Stash in dedicated search arrays (not allMovies/allMusic) so Home/Movies/Music
  // pages don't lose their own cached data when the user searches.
  STATE.searchMovies = movieHits;
  STATE.searchMusic  = musicHits;

  let html = '';
  if (movieHits.length) {
    html += `<div class="sec-head" style="margin-top:0;">
      <div class="sec-title">Movies (${movieHits.length})</div>
    </div>
    <div class="card-grid" style="margin-bottom:28px;">
      ${movieHits.slice(0,12).map((item, i) => renderMovieCard(item, i, true)).join('')}
    </div>`;
  }
  if (musicHits.length) {
    html += `<div class="sec-head">
      <div class="sec-title">Music (${musicHits.length})</div>
    </div>
    <div class="music-row">
      ${musicHits.slice(0,10).map((item, i) => renderTrack(item, i, true)).join('')}
    </div>`;
  }
  res.innerHTML = html;
}
