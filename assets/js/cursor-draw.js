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
  const addThreshold = 0.45;
  let expiryTimer = 0;

  if (!ctx) {
    return;
  }

  canvas.id = 'cursor-draw-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = [
    'position:absolute',
    'left:0',
    'top:0',
    'z-index:0',
    'pointer-events:none',
    'mix-blend-mode:multiply',
    'opacity:0.95'
  ].join(';');

  document.body.insertBefore(canvas, document.body.firstChild);

  const stackStyle = document.createElement('style');
  stackStyle.textContent = [
    'body > header,',
    'body > main,',
    'body > footer {',
    '  position: relative;',
    '  z-index: 1;',
    '}'
  ].join('\n');
  document.head.appendChild(stackStyle);

  function clearExpiryTimer() {
    if (expiryTimer) {
      window.clearTimeout(expiryTimer);
      expiryTimer = 0;
    }
  }

  function scheduleExpiry() {
    clearExpiryTimer();

    if (!points.length) {
      return;
    }

    const now = performance.now();
    const oldest = points[0];
    const delay = Math.max(0, oldest.time + lifeMs - now);

    expiryTimer = window.setTimeout(() => {
      expiryTimer = 0;
      render();
    }, delay + 16);
  }

  function resize() {
    const pageWidth = Math.max(
      window.innerWidth,
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    );
    const pageHeight = Math.max(
      window.innerHeight,
      document.documentElement.scrollHeight,
      document.body.scrollHeight
    );

    canvas.width = Math.max(1, Math.floor(pageWidth * dpr));
    canvas.height = Math.max(1, Math.floor(pageHeight * dpr));
    canvas.style.width = `${pageWidth}px`;
    canvas.style.height = `${pageHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    render();
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

  function pruneExpired(now) {
    while (points.length && now - points[0].time > lifeMs) {
      points.shift();
    }
  }

  function render() {
    clearExpiryTimer();

    const now = performance.now();
    pruneExpired(now);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (points.length > 1) {
      const strokePoints = getSmoothedPoints();

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';

      ctx.beginPath();
      ctx.moveTo(strokePoints[0].x, strokePoints[0].y);
      ctx.lineWidth = 3.8;
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

    if (points.length) {
      scheduleExpiry();
    }
  }

  function handlePointerMove(event) {
    const x = event.clientX + window.scrollX;
    const y = event.clientY + window.scrollY;
    const prev = points[points.length - 1];

    if (!prev) {
      pushPoint(x, y, performance.now());
      render();
      return;
    }
    const dx = x - prev.x;
    const dy = y - prev.y;
    const dist = Math.hypot(dx, dy);

    if (dist < addThreshold) {
      return;
    }

    const now = performance.now();
    const steps = Math.max(1, Math.ceil(dist / maxStep));

    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      pushPoint(
        prev.x + dx * t,
        prev.y + dy * t,
        prev.time + (now - prev.time) * t
      );
    }

    render();
  }

  function clearCanvas() {
    clearExpiryTimer();
    points.length = 0;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', handlePointerMove, { passive: true });
  window.addEventListener('blur', clearCanvas, { passive: true });

  window.addEventListener('keydown', (event) => {
    if ((event.key || '').toLowerCase() === 'c' && (event.metaKey || event.ctrlKey)) {
      clearCanvas();
    }
  });
})();
