function runSplash(cb) {
  const splash  = document.getElementById('splash');
  const bar     = document.getElementById('prog-bar');
  const pctEl   = document.getElementById('pct');
  const msgEl   = document.getElementById('msg-el');

  splash.classList.remove('out');
  splash.style.display = 'flex';

  let msgIdx = 0;
  const total = 4200;
  const start = Date.now();

  const progTick = setInterval(() => {
    const p = Math.min(((Date.now() - start) / total) * 100, 100);
    bar.style.width = p + '%';
    pctEl.textContent = Math.round(p) + '%';
    if (p >= 100) clearInterval(progTick);
  }, 40);

  const msgTick = setInterval(() => {
    msgIdx = Math.min(msgIdx + 1, SPLASH_MESSAGES.length - 1);
    msgEl.style.animation = 'none';
    void msgEl.offsetWidth;
    msgEl.textContent = SPLASH_MESSAGES[msgIdx];
    msgEl.style.animation = 'msgFade 1s ease both';
  }, total / SPLASH_MESSAGES.length);

  setTimeout(() => {
    clearInterval(progTick); clearInterval(msgTick);
    bar.style.width = '100%'; pctEl.textContent = '100%';
    setTimeout(() => {
      splash.classList.add('out');
      setTimeout(() => { splash.style.display = 'none'; cb(); }, 750);
    }, 300);
  }, total);
}
