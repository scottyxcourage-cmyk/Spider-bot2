'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { sendVerificationEmail, sendResetEmail } = require('../email');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'insecure-dev-secret-change-me';
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TTL_MS = 60 * 60 * 1000;        // 1h
const COOKIE_NAME = 'sh_session';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' }
});
router.use(authLimiter);

function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    verified: !!row.verified,
    joined: new Date(row.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }),
    bio: row.bio || '',
    avatar_url: row.avatar_url || '',
    points: row.points || 0
  };
}

function setSessionCookie(res, user) {
  const token = jwt.sign({ uid: user.id }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- middleware: requires a logged-in session ---
function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not signed in.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user) return res.status(401).json({ error: 'Session invalid.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

// ---------- SIGNUP ----------
router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!name || !email || !password) return res.status(400).json({ error: 'Please fill in all fields.' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash = await bcrypt.hash(password, 11);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();

    // Create user as verified=1 so they can log in immediately
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, verified, verify_token, verify_expires, created_at)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run(name, email, hash, verifyToken, now + VERIFY_TTL_MS, now);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);

    // Log them in immediately
    setSessionCookie(res, user);

    // Send welcome/verification email in background — don't wait for it
    sendVerificationEmail(email, name, verifyToken).catch(err =>
      console.error('[email] welcome email failed:', err.message)
    );

    res.status(201).json({
      message: `Welcome, ${name}! A verification email has been sent to ${email}.`,
      user: publicUser(user)
    });
  } catch (err) {
    console.error('[signup]', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

// ---------- VERIFY EMAIL ----------
router.get('/verify', (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.status(400).json({ error: 'Missing verification token.' });

  const user = db.prepare('SELECT * FROM users WHERE verify_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or already-used verification link.' });
  if (user.verify_expires < Date.now()) return res.status(400).json({ error: 'This verification link has expired. Please request a new one.' });

  db.prepare('UPDATE users SET verified = 1, verify_token = NULL, verify_expires = NULL WHERE id = ?').run(user.id);
  res.json({ message: 'Email verified! You can now sign in.' });
});

// ---------- RESEND VERIFICATION ----------
router.post('/resend-verification', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // Always respond the same way to avoid leaking which emails exist
  const genericMsg = { message: 'If that account exists and is unverified, a new verification email has been sent.' };
  if (!user || user.verified) return res.json(genericMsg);

  const verifyToken = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verify_token = ?, verify_expires = ? WHERE id = ?')
    .run(verifyToken, Date.now() + VERIFY_TTL_MS, user.id);

  await sendVerificationEmail(user.email, user.name, verifyToken);
  res.json(genericMsg);
});

// ---------- LOGIN ----------
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Please fill in all fields.' });

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'No account found. Create one first.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Incorrect password. Try again.' });

    setSessionCookie(res, user);
    res.json({ message: 'Welcome back!', user: publicUser(user) });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
});

// ---------- FORGOT PASSWORD ----------
router.post('/forgot', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const genericMsg = { message: 'If that account exists, a reset link has been sent.' };
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.json(genericMsg);

  const resetToken = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?')
    .run(resetToken, Date.now() + RESET_TTL_MS, user.id);

  await sendResetEmail(user.email, user.name, resetToken);
  res.json(genericMsg);
});

// ---------- RESET PASSWORD ----------
router.post('/reset', async (req, res) => {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!token || !password) return res.status(400).json({ error: 'Missing token or password.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Invalid or already-used reset link.' });
  if (user.reset_expires < Date.now()) return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' });

  const hash = await bcrypt.hash(password, 11);
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(hash, user.id);
  res.json({ message: 'Password updated! You can now sign in.' });
});

// ---------- ME / LOGOUT ----------
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: 'Signed out.' });
});

// ---------- UPDATE PROFILE ----------
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { name, bio, avatar_url } = req.body;
    
    // Validate inputs
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ error: 'Name cannot be empty.' });
      if (trimmed.length > 100) return res.status(400).json({ error: 'Name must be under 100 characters.' });
    }
    
    if (bio !== undefined) {
      const trimmed = String(bio).trim();
      if (trimmed.length > 500) return res.status(400).json({ error: 'Bio must be under 500 characters.' });
    }
    
    if (avatar_url !== undefined) {
      const trimmed = String(avatar_url).trim();
      // Allow emoji or data URLs or standard image URLs
      if (trimmed.length > 2000) return res.status(400).json({ error: 'Avatar URL is too long.' });
      if (trimmed && !trimmed.startsWith('http') && trimmed.length > 2) {
        // Allow short emoji strings or data URLs
        if (!trimmed.startsWith('data:')) return res.status(400).json({ error: 'Avatar must be a URL or emoji.' });
      }
    }
    
    // Build update query dynamically
    const updates = [];
    const values = [];
    
    if (name !== undefined) {
      updates.push('name = ?');
      values.push(String(name).trim());
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(String(bio).trim());
    }
    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(String(avatar_url).trim());
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }
    
    values.push(req.user.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values);
    
    // Fetch updated user
    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    res.json({ message: 'Profile updated!', user: publicUser(updated) });
  } catch (err) {
    console.error('[profile-update]', err);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ---------- PUBLIC: GOOGLE CLIENT ID -------
// Safe to expose — it's a public value used only to render the GSI button.
router.get('/google-client-id', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.json({ clientId: null });
  res.json({ clientId });
});

// Shared by both the JS-SDK popup flow and the redirect fallback flow below,
// so a user ends up in the same account either way.
function findOrCreateGoogleUser(email, name) {
  email = email.toLowerCase();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const result = db.prepare(`
      INSERT INTO users (name, email, password_hash, verified, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(name || email.split('@')[0], email, 'GOOGLE_AUTH', Date.now());
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  } else if (!user.verified) {
    db.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(user.id);
    user.verified = 1;
  }
  return user;
}

// ---------- GOOGLE SIGN-IN (JS SDK / One Tap popup flow) ----------
// Primary path — nicest UX, but depends on accounts.google.com/gsi/client
// loading in the browser, which some ad blockers / data-saver browsers block.
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Missing Google credential.' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'Google Sign-In is not configured on this server.' });

    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    const payload  = await response.json();

    if (!response.ok || payload.error) {
      return res.status(401).json({ error: 'Invalid Google token.' });
    }
    if (payload.aud !== clientId) {
      return res.status(401).json({ error: 'Token audience mismatch. Ensure GOOGLE_CLIENT_ID matches your Google Cloud project.' });
    }
    if (!payload.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const user = findOrCreateGoogleUser(payload.email, payload.name);
    setSessionCookie(res, user);
    res.json({ message: `Welcome, ${user.name}!`, user: publicUser(user) });
  } catch (err) {
    console.error('[google-auth:popup]', err);
    res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

// ---------- GOOGLE SIGN-IN (redirect flow — fallback) ----------
// Plain link, no third-party JS required. This is what keeps Google Sign-In
// working even when accounts.google.com/gsi/client is blocked by an ad
// blocker, a carrier data-saver browser, or a restrictive network — the
// only requirement is that a normal top-level navigation to accounts.google.com
// can happen, which is far more reliable than a script tag loading.
router.get('/google/login', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const publicUrl = process.env.PUBLIC_URL;
  if (!clientId || !publicUrl) {
    return res.status(500).send('Google Sign-In is not configured on this server.');
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('sh_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${publicUrl}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

router.get('/google/callback', async (req, res) => {
  const publicUrl = process.env.PUBLIC_URL || '';
  const failUrl = `${publicUrl}/?googleAuth=failed`;
  try {
    const { code, state, error } = req.query;
    if (error) { console.warn('[google-auth:redirect] Google returned error:', error); return res.redirect(failUrl); }

    const expectedState = req.cookies && req.cookies.sh_oauth_state;
    res.clearCookie('sh_oauth_state');
    if (!code || !state || !expectedState || state !== expectedState) {
      console.warn('[google-auth:redirect] Missing/mismatched state or code — possible CSRF attempt or expired link.');
      return res.redirect(failUrl);
    }

    const clientId     = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret || !publicUrl) {
      console.error('[google-auth:redirect] Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / PUBLIC_URL.');
      return res.redirect(failUrl);
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${publicUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('[google-auth:redirect] Token exchange failed:', tokenData.error || tokenData);
      return res.redirect(failUrl);
    }

    // Verify + decode the id_token the same way the popup flow does.
    const infoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenData.id_token)}`);
    const payload = await infoRes.json();
    if (!infoRes.ok || payload.error || payload.aud !== clientId || !payload.email_verified) {
      console.error('[google-auth:redirect] id_token verification failed:', payload.error || payload);
      return res.redirect(failUrl);
    }

    const user = findOrCreateGoogleUser(payload.email, payload.name);
    setSessionCookie(res, user);
    res.redirect(`${publicUrl}/?googleAuth=success`);
  } catch (err) {
    console.error('[google-auth:redirect]', err);
    res.redirect(failUrl);
  }
});

module.exports = { router, requireAuth };
