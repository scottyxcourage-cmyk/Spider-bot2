'use strict';
require('dotenv').config();

// Surface any crash with a clear message instead of the container just dying silently.
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  console.error('[FATAL] Unhandled rejection:', err);
  process.exit(1);
});

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { router: authRouter } = require('./routes/auth');
const tmdbRouter = require('./routes/tmdb');
const adminRouter = require('./routes/admin');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// pxxl.run (and most hosts) sit behind a reverse proxy that sets X-Forwarded-For.
// Trusting the first proxy hop lets express-rate-limit identify real client IPs correctly.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.PUBLIC_URL || true,
  credentials: true
}));

// API routes
app.use('/api/auth', authRouter);
app.use('/api/tmdb', tmdbRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

// Static frontend (the spiderhub site itself)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// SPA-ish fallback: send index.html for any non-API, non-file route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(rootDir, 'index.html'));
});

console.log(`[boot] Starting Spider Hub on port ${PORT}...`);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Spider Hub server running on port ${PORT}`);
});
