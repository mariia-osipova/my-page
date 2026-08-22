(() => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const points = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const lifeMs = 6000;
  const maxPoints = 420;
  const follow = 0.18;
  let rafId = 0;
  let hasTarget = false;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;

  if (!ctx) {
    return;
  }

  canvas.id = 'cursor-draw-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'z-index:79',
    'pointer-events:none',
    'mix-blend-mode:multiply',
    'opacity:0.95'
  ].join(';');

  document.body.appendChild(canvas);

  function resize() {
    const pageWidth = Math.max(window.innerWidth, document.documentElement.scrollWidth);
    const pageHeight = Math.max(window.innerHeight, document.documentElement.scrollHeight);
    canvas.width = Math.max(1, Math.floor(pageWidth * dpr));
    canvas.height = Math.max(1, Math.floor(pageHeight * dpr));
    canvas.style.width = `${pageWidth}px`;
    canvas.style.height = `${pageHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function schedule() {
    if (!rafId) {
      rafId = window.requestAnimationFrame(draw);
    }
  }

  function addPoint(x, y, now) {
    points.push({ x, y, time: now });
    if (points.length > maxPoints) {
      points.splice(0, points.length - maxPoints);
    }
  }

  function handlePointerMove(event) {
    targetX = event.clientX + window.scrollX;
    targetY = event.clientY + window.scrollY;
    if (!hasTarget) {
      hasTarget = true;
      currentX = targetX;
      currentY = targetY;
    }
    schedule();
  }

  function handleScroll() {
    if (points.length || hasTarget) {
      schedule();
    }
  }

  function draw() {
    rafId = 0;
    const now = performance.now();

    if (hasTarget) {
      currentX += (targetX - currentX) * follow;
      currentY += (targetY - currentY) * follow;
      addPoint(currentX, currentY, now);
    }

    while (points.length && now - points[0].time > lifeMs) {
      points.shift();
    }

    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    if (points.length > 1) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(150, 150, 150, 1)';

      for (let i = 1; i < points.length; i += 1) {
        const prev = points[i - 1];
        const curr = points[i];
        const age = now - curr.time;
        const t = 1 - age / lifeMs;

        if (t <= 0) {
          continue;
        }

        const alpha = Math.max(0, Math.min(1, t * 0.82));
        const width = 4;
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.beginPath();
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;

        if (i === 1) {
          ctx.moveTo(prev.x, prev.y);
        } else {
          const before = points[i - 2];
          ctx.moveTo((before.x + prev.x) / 2, (before.y + prev.y) / 2);
        }

        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    if (points.length > 0 || hasTarget) {
      schedule();
    }
  }

  function resetPointer() {
    hasTarget = false;
  }

  function clearCanvas() {
    points.length = 0;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('pointerleave', resetPointer, { passive: true });
  window.addEventListener('pointerout', resetPointer, { passive: true });
  window.addEventListener('pointercancel', resetPointer, { passive: true });
  window.addEventListener('blur', clearCanvas, { passive: true });

  window.addEventListener('keydown', (event) => {
    if ((event.key || '').toLowerCase() === 'c' && (event.metaKey || event.ctrlKey)) {
      clearCanvas();
    }
  });
})();
