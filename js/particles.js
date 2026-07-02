(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, dots;

  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }

  function make() {
    dots = Array.from({ length: 44 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.2 + .4,
      dx: (Math.random() - .5) * .4,
      dy: (Math.random() - .5) * .4,
      a: .3 + Math.random() * .5
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.dx; d.y += d.dy;
      if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
      if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,245,255,${d.a})`;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 6;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }

  resize(); make(); tick();
  window.addEventListener('resize', () => { resize(); make(); });
})();

(function drawWeb() {
  const svg = document.getElementById('web-svg');
  const cx = 240, cy = 240, spokes = 8, rings = 5;
  let delay = 0;

  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    el.setAttribute('x1', cx); el.setAttribute('y1', cy);
    el.setAttribute('x2', cx + Math.cos(a) * 210); el.setAttribute('y2', cy + Math.sin(a) * 210);
    el.setAttribute('stroke', '#00f5ff'); el.setAttribute('stroke-width', '0.9');
    el.setAttribute('stroke-dasharray', '900');
    el.style.animation = `webDraw 2.2s ${delay}s ease forwards`;
    svg.appendChild(el);
    delay += 0.08;
  }

  for (let r = 1; r <= rings; r++) {
    const radius = (r / rings) * 195;
    const pts = Array.from({ length: spokes }, (_, i) => {
      const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
      return `${cx + Math.cos(a) * radius},${cy + Math.sin(a) * radius}`;
    }).join(' ');
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    el.setAttribute('points', pts); el.setAttribute('fill', 'none');
    el.setAttribute('stroke', '#00f5ff'); el.setAttribute('stroke-width', '0.7');
    el.setAttribute('stroke-dasharray', '900');
    el.style.animation = `webDraw 2.2s ${0.9 + r * 0.15}s ease forwards`;
    svg.appendChild(el);
  }
})();
