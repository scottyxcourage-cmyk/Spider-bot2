'use strict';

const CONFIG = {
  // Leave blank if the backend (server/server.js) serves this frontend itself (recommended).
  // Otherwise set to the backend's full URL, e.g. 'https://your-backend.pxxl.run'
  API_BASE: '',

  // --- TMDb (The Movie Database) ---
  // Proxied through the backend (server/routes/tmdb.js) so the real API key never
  // reaches the browser. Set TMDB_API_KEY in your .env / pxxl env vars, not here.
  TMDB_PROXY: '/api/tmdb',
  TMDB_IMG: 'https://image.tmdb.org/t/p/w500',
  TMDB_IMG_LARGE: 'https://image.tmdb.org/t/p/w780',

  // --- iTunes Search API (no key required) ---
  // Used for music metadata + legal 30-second preview clips.
  ITUNES_SEARCH: 'https://itunes.apple.com/search',
  ITUNES_LOOKUP: 'https://itunes.apple.com/lookup',
  ITUNES_TOP_SONGS_RSS: 'https://itunes.apple.com/us/rss/topsongs/limit=50/json'
};

const SPLASH_MESSAGES = [
  'Initializing Spider Hub...',
  'Loading Movies...',
  'Loading Music...',
  'Preparing Your Experience...',
  'Almost Ready...'
];

// App state
const STATE = {
  currentUser:  null,
  currentPage:  'home',
  navLocked:    false,
  userMenuOpen: false,
  allMovies:    [],
  allMusic:     [],
  searchMovies: [],
  searchMusic:  [],
  viewCount:    0,
  dlCount:      0,
  saveCount:    0,
  searchTimer:  null,
  audioPlayer:  null
};
