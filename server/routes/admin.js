'use strict';
const express = require('express');
const db = require('../db');
const router = express.Router();

// Simple admin key check — set ADMIN_KEY in your .env
function requireAdmin(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.key;
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// GET /api/admin/users — list all users
router.get('/users', requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, name, email, verified, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();
  res.json({ users });
});

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ message: 'User deleted.' });
});

// PATCH /api/admin/users/:id/verify — manually verify a user
router.patch('/users/:id/verify', requireAdmin, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  db.prepare('UPDATE users SET verified = 1, verify_token = NULL, verify_expires = NULL WHERE id = ?').run(id);
  res.json({ message: 'User verified.' });
});

// GET /api/admin/stats — quick stats
router.get('/stats', requireAdmin, (req, res) => {
  const total    = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const verified = db.prepare('SELECT COUNT(*) as n FROM users WHERE verified = 1').get().n;
  const today    = db.prepare(`SELECT COUNT(*) as n FROM users WHERE created_at > ?`).get(Date.now() - 86400000).n;
  res.json({ total, verified, unverified: total - verified, today });
});

// GET /api/admin/ai-costs — AI Chat usage & spend summary
router.get('/ai-costs', requireAdmin, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = Date.now() - 7 * 86400000;

  const todayRow = db.prepare(`
    SELECT COUNT(*) as messages, COALESCE(SUM(tokens_in),0) as tokensIn,
           COALESCE(SUM(tokens_out),0) as tokensOut, COALESCE(SUM(cost_usd),0) as cost
    FROM ai_cost_log WHERE date = ?
  `).get(today);

  const last7Row = db.prepare(`
    SELECT COUNT(*) as messages, COALESCE(SUM(cost_usd),0) as cost
    FROM ai_cost_log WHERE created_at >= ?
  `).get(sevenDaysAgo);

  const allTimeRow = db.prepare(`
    SELECT COUNT(*) as messages, COALESCE(SUM(cost_usd),0) as cost
    FROM ai_cost_log
  `).get();

  const topUsersToday = db.prepare(`
    SELECT u.id, u.name, u.email, COUNT(*) as messages, SUM(c.cost_usd) as cost
    FROM ai_cost_log c JOIN users u ON u.id = c.user_id
    WHERE c.date = ?
    GROUP BY c.user_id
    ORDER BY cost DESC
    LIMIT 10
  `).all(today);

  res.json({
    today:   { messages: todayRow.messages, tokensIn: todayRow.tokensIn, tokensOut: todayRow.tokensOut, cost: todayRow.cost },
    last7Days: { messages: last7Row.messages, cost: last7Row.cost },
    allTime: { messages: allTimeRow.messages, cost: allTimeRow.cost },
    topUsersToday
  });
});

module.exports = router;
