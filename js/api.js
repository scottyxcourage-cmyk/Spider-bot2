'use strict';
// Movies: TMDb (themoviedb.org) - legitimate metadata, posters, ratings, official trailers.
// Music:  iTunes Search API - legitimate metadata + real 30-second preview clips, no key needed.

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${CONFIG.TMDB_PROXY}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDb HTTP ${res.status}`);
  return res.json();
}

function normalizeMovie(m) {
  return {
    id:       m.id,
    title:    m.title || m.name || 'Untitled',
    poster:   m.poster_path ? CONFIG.TMDB_IMG + m.poster_path : '',
    backdrop: m.backdrop_path ? CONFIG.TMDB_IMG_LARGE + m.backdrop_path : '',
    year:     (m.release_date || m.first_air_date || '').slice(0, 4),
    rating:   m.vote_average ? m.vote_average.toFixed(1) : '',
    overview: m.overview || ''
  };
}

async function loadMovies() {
  const data = await tmdbFetch('/trending/movie/week');
  STATE.allMovies = (data.results || []).map(normalizeMovie);
  return STATE.allMovies;
}

async function searchMoviesAPI(query) {
  const data = await tmdbFetch('/search/movie', { query });
  return (data.results || []).map(normalizeMovie);
}

async function fetchMovieTrailerKey(tmdbId) {
  try {
    const data = await tmdbFetch(`/movie/${tmdbId}/videos`);
    const vids = data.results || [];
    const trailer = vids.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                 || vids.find(v => v.site === 'YouTube');
    return trailer ? trailer.key : null;
  } catch {
    return null;
  }
}

// ---------- Music (iTunes Search API) ----------

function normalizeItunesTrack(t) {
  return {
    id:         t.trackId || t.collectionId,
    title:      t.trackName || t.collectionName || 'Untitled',
    artist:     t.artistName || '',
    poster:     (t.artworkUrl100 || '').replace('100x100', '400x400'),
    previewUrl: t.previewUrl || '',
    itunesUrl:  t.trackViewUrl || t.collectionViewUrl || ''
  };
}

async function loadMusic() {
  // iTunes Search API doesn't have a generic "top charts" endpoint, so we search
  // a broad popular term and let results stand in as a curated front page list.
  const res = await fetch(`${CONFIG.ITUNES_SEARCH}?term=top+hits&media=music&entity=song&limit=50`);
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = await res.json();
  STATE.allMusic = (data.results || []).map(normalizeItunesTrack);
  return STATE.allMusic;
}

async function searchMusicAPI(query) {
  const res = await fetch(`${CONFIG.ITUNES_SEARCH}?term=${encodeURIComponent(query)}&media=music&entity=song&limit=25`);
  if (!res.ok) throw new Error(`iTunes HTTP ${res.status}`);
  const data = await res.json();
  return (data.results || []).map(normalizeItunesTrack);
}
