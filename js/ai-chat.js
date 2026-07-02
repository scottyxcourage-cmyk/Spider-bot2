'use strict';
// ── AI Chat page ──────────────────────────────────────────────────────
// History lives in sessionStorage (cleared when the tab closes) — the
// backend doesn't persist conversations yet, only the daily message count.

const AI_HISTORY_KEY = 'sh_ai_history';
let AI_SENDING = false;

function loadAiHistory() {
  try { return JSON.parse(sessionStorage.getItem(AI_HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveAiHistory(history) {
  sessionStorage.setItem(AI_HISTORY_KEY, JSON.stringify(history));
}

async function initAiChatPage() {
  renderAiMessages();
  await refreshAiQuota();
}

function renderAiMessages() {
  const wrap = document.getElementById('ai-chat-messages');
  if (!wrap) return;
  const history = loadAiHistory();
  wrap.innerHTML = history.map(m => `
    <div class="ai-msg ${m.role === 'user' ? 'ai-msg-user' : 'ai-msg-bot'}${m.error ? ' error' : ''}">
      <div class="ai-msg-bubble">${escapeHtmlAi(m.content)}</div>
    </div>`).join('');
  scrollAiChatToBottom();
}

function escapeHtmlAi(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function scrollAiChatToBottom() {
  const win = document.getElementById('ai-chat-window');
  if (win) win.scrollTop = win.scrollHeight;
}

async function refreshAiQuota() {
  const bar = document.getElementById('ai-quota-bar');
  const txt = document.getElementById('ai-quota-text');
  if (!bar || !txt) return;
  try {
    const res = await fetch('/api/ai/usage', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) { txt.textContent = 'Could not check your daily limit.'; return; }
    txt.textContent = `${data.remaining} of ${data.limit} free messages left today`;
    bar.classList.toggle('low', data.remaining > 0 && data.remaining <= 3);
    bar.classList.toggle('empty', data.remaining === 0);
    setAiInputEnabled(data.remaining > 0);
  } catch {
    txt.textContent = 'Could not reach the server to check your limit.';
  }
}

function setAiInputEnabled(enabled) {
  const input = document.getElementById('ai-chat-input');
  const btn   = document.getElementById('ai-chat-send-btn');
  if (input) input.disabled = !enabled;
  if (btn) btn.disabled = !enabled || AI_SENDING;
}

function autoGrowAiInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleAiChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAiChatMessage();
  }
}

async function sendAiChatMessage() {
  if (AI_SENDING) return;
  const input = document.getElementById('ai-chat-input');
  const message = (input.value || '').trim();
  if (!message) return;

  const history = loadAiHistory();
  history.push({ role: 'user', content: message });
  saveAiHistory(history);
  renderAiMessages();

  input.value = '';
  autoGrowAiInput(input);
  AI_SENDING = true;
  setAiInputEnabled(false);
  showAiTyping();

  try {
    const { ok, data } = await aiPost('/api/ai/chat', {
      message,
      // Send prior turns (excluding the message we just added) for context.
      history: history.slice(0, -1).slice(-10)
    });

    hideAiTyping();

    if (!ok) {
      const h = loadAiHistory();
      h.push({ role: 'assistant', content: data.error || 'Something went wrong. Please try again.', error: true });
      saveAiHistory(h);
      renderAiMessages();
      await refreshAiQuota();
      return;
    }

    const h = loadAiHistory();
    h.push({ role: 'assistant', content: data.reply });
    saveAiHistory(h);
    renderAiMessages();
    setAiInputEnabled(data.remaining > 0);
    await refreshAiQuota(); // authoritative refresh from server
  } catch (e) {
    hideAiTyping();
    const h = loadAiHistory();
    h.push({ role: 'assistant', content: 'Could not reach the server. Check your connection and try again.', error: true });
    saveAiHistory(h);
    renderAiMessages();
  } finally {
    AI_SENDING = false;
    if (input && !input.disabled) input.focus();
  }
}

function showAiTyping() {
  const wrap = document.getElementById('ai-chat-messages');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'ai-msg ai-msg-bot';
  el.id = 'ai-typing-row';
  el.innerHTML = `<div class="ai-msg-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div>`;
  wrap.appendChild(el);
  scrollAiChatToBottom();
}
function hideAiTyping() {
  const el = document.getElementById('ai-typing-row');
  if (el) el.remove();
}

async function aiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}
