(() => {
  const supportsFinePointer =
    window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches &&
    window.matchMedia('(hover: hover)').matches;

  if (!supportsFinePointer) {
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const points = [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const lifeMs = 6000;
  const maxPoints = 420;
  const maxStep = 6;
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
    'position:fixed',
    'left:0',
    'top:0',
    'z-index:-1',
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

  function pushPoint(x, y, time) {
    points.push({ x, y, time });
    if (points.length > maxPoints) {
      points.splice(0, points.length - maxPoints);
    }
  }

  function addPoint(x, y, now) {
    const prev = points[points.length - 1];

    if (!prev) {
      pushPoint(x, y, now);
      return;
    }

    const dx = x - prev.x;
    const dy = y - prev.y;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / maxStep));

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      pushPoint(
        prev.x + dx * t,
        prev.y + dy * t,
        prev.time + (now - prev.time) * t
      );
    }
  }

  function getSmoothedPoints() {
    if (points.length < 3) {
      return points;
    }

    const smoothed = [{ ...points[0] }];
    const strength = 0.28;

    for (let i = 1; i < points.length; i += 1) {
      const prev = smoothed[i - 1];
      const curr = points[i];

      smoothed.push({
        x: prev.x + (curr.x - prev.x) * strength,
        y: prev.y + (curr.y - prev.y) * strength,
        time: curr.time
      });
    }

    return smoothed;
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
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

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
      const strokePoints = getSmoothedPoints();

      ctx.save();
      ctx.translate(-scrollX, -scrollY);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(98, 98, 98, 0.95)';

      ctx.beginPath();
      ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
      ctx.lineWidth = 3.1;
      ctx.globalAlpha = 0.95;

      if (strokePoints.length === 2) {
        ctx.lineTo(strokePoints[1].x, strokePoints[1].y);
      } else {
        for (let i = 1; i < strokePoints.length - 1; i += 1) {
          const prev = strokePoints[i];
          const next = strokePoints[i + 1];
          const midX = (prev.x + next.x) / 2;
          const midY = (prev.y + next.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }

        const last = strokePoints[strokePoints.length - 1];
        const beforeLast = strokePoints[strokePoints.length - 2];
        ctx.quadraticCurveTo(beforeLast.x, beforeLast.y, last.x, last.y);
      }

      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
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
  window.addEventListener('pointerleave', resetPointer, { passive: true });
  window.addEventListener('pointerout', resetPointer, { passive: true });
  window.addEventListener('blur', clearCanvas, { passive: true });

  window.addEventListener('keydown', (event) => {
    if ((event.key || '').toLowerCase() === 'c' && (event.metaKey || event.ctrlKey)) {
      clearCanvas();
    }
  });
})();
