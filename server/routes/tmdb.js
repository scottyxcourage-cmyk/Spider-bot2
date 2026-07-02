'use strict';
// Proxies TMDb requests through the backend so the API key never reaches the browser.
// The frontend calls /api/tmdb/<tmdb-path> and this forwards it to TMDb with the key attached.
const express = require('express');
const router = express.Router();

const TMDB_BASE = 'https://api.themoviedb.org/3';

router.get('/*', async (req, res) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TMDB_API_KEY is not configured on the server.' });
  }

  // req.params[0] is everything after /api/tmdb/, e.g. "trending/movie/week" or "search/movie"
  const tmdbPath = req.params[0];
  const url = new URL(`${TMDB_BASE}/${tmdbPath}`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(req.query)) {
    url.searchParams.set(key, value);
  }

  try {
    const tmdbRes = await fetch(url.toString());
    const data = await tmdbRes.json();
    res.status(tmdbRes.status).json(data);
  } catch (err) {
    console.error('[tmdb proxy]', err.message);
    res.status(502).json({ error: 'Could not reach TMDb.' });
  }
});

module.exports = router;
