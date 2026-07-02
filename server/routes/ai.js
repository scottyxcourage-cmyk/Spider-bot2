'use strict';
const express = require('express');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { requireAuth } = require('./auth');

const router = express.Router();

// ── Config ────────────────────────────────────────────────────────────
// Free daily message quota per account. Adjust via env var without a redeploy
// of code — just update AI_DAILY_LIMIT in your pxxl.run environment variables.
const DAILY_LIMIT  = parseInt(process.env.AI_DAILY_LIMIT || '15', 10);
const MODEL        = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // cheap + fast; override if you want a stronger model
const MAX_HISTORY  = 10;   // prior turns sent for context, keeps token cost bounded
const MAX_TOKENS   = 500;  // caps response length -> caps cost per message
const MAX_MSG_LEN  = 2000; // characters

// Pricing per 1M tokens — defaults match OpenAI's gpt-4o-mini list price as of
// this writing. OpenAI prices change over time, so override via env vars if
// they update pricing or you switch models, rather than editing this file.
const PRICE_IN_PER_1M  = parseFloat(process.env.OPENAI_INPUT_COST_PER_1M  || '0.15');
const PRICE_OUT_PER_1M = parseFloat(process.env.OPENAI_OUTPUT_COST_PER_1M || '0.60');

function logCost(userId, usage) {
  const tokensIn  = (usage && usage.prompt_tokens)     || 0;
  const tokensOut = (usage && usage.completion_tokens) || 0;
  const cost = (tokensIn / 1_000_000) * PRICE_IN_PER_1M + (tokensOut / 1_000_000) * PRICE_OUT_PER_1M;
  db.prepare(`
    INSERT INTO ai_cost_log (user_id, date, tokens_in, tokens_out, cost_usd, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, todayKey(), tokensIn, tokensOut, cost, Date.now());
}

// Short burst protection on top of the daily quota — stops rapid-fire retries
// (e.g. a broken client looping) from burning through the day's budget in seconds.
const burstLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down a little and try again in a moment.' }
});
router.use(burstLimiter);
router.use(requireAuth); // every route below requires a signed-in user

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function getUsage(userId) {
  const row = db.prepare('SELECT count FROM ai_usage WHERE user_id = ? AND date = ?').get(userId, todayKey());
  return row ? row.count : 0;
}

function incrementUsage(userId) {
  db.prepare(`
    INSERT INTO ai_usage (user_id, date, count) VALUES (?, ?, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1
  `).run(userId, todayKey());
}

// ---------- USAGE ----------
// Lets the frontend show "X messages left today" before the user even sends one.
router.get('/usage', (req, res) => {
  const used = getUsage(req.user.id);
  res.json({ used, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used) });
});

// ---------- CHAT ----------
router.post('/chat', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI Chat is not configured on this server.' });

    const used = getUsage(req.user.id);
    if (used >= DAILY_LIMIT) {
      return res.status(429).json({
        error: `You've used all ${DAILY_LIMIT} free messages today. Come back tomorrow!`,
        remaining: 0
      });
    }

    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });
    if (message.length > MAX_MSG_LEN) return res.status(400).json({ error: `Message is too long (max ${MAX_MSG_LEN} characters).` });

    // Client sends recent turns for conversational context. We don't persist
    // chat history server-side (yet) — trust the shape but cap length/count
    // so a crafted payload can't blow up the token bill.
    const historyIn = Array.isArray(req.body.history) ? req.body.history : [];
    const trimmedHistory = historyIn
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN) }));

    const messages = [
      { role: 'system', content: 'You are the Spider Hub AI Assistant. Be friendly, clear, and concise — avoid padding answers with unnecessary filler.' },
      ...trimmedHistory,
      { role: 'user', content: message }
    ];

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: MAX_TOKENS, temperature: 0.7 })
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      console.error('[ai-chat] OpenAI error:', data.error || data);
      // Don't charge the user's quota for a failure that wasn't their fault.
      return res.status(502).json({ error: 'The AI service had a problem. Please try again.' });
    }

    const reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
      ? data.choices[0].message.content.trim()
      : "Sorry, I couldn't come up with a reply. Try again?";

    // Only count successful replies against the daily quota.
    incrementUsage(req.user.id);
    logCost(req.user.id, data.usage);
    const remaining = Math.max(0, DAILY_LIMIT - getUsage(req.user.id));

    res.json({ reply, remaining });
  } catch (err) {
    console.error('[ai-chat]', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
