(function () {
  const canvas = document.querySelector('.wander-canvas');
  if (!canvas) return;

  const host = canvas.closest('.wander-title') || canvas.parentElement;
  const ctx = canvas.getContext('2d');
  const text = "Hi! I'm Mariia.";

  const SK = {
    H: [[[0.1, 0], [0.1, 1]], [[0.9, 0], [0.9, 1]], [[0.1, 0.5], [0.9, 0.5]]],
    I: [[[0.25, 0], [0.75, 0]], [[0.5, 0], [0.5, 1]], [[0.25, 1], [0.75, 1]]],
    M: [[[0.08, 1], [0.08, 0], [0.5, 0.55], [0.92, 0], [0.92, 1]]],
    a: [[[0.78, 0.5], [0.55, 0.37], [0.26, 0.42], [0.1, 0.62], [0.12, 0.85], [0.3, 1], [0.58, 0.98], [0.78, 0.82]], [[0.78, 0.38], [0.78, 1]]],
    i: [[[0.5, 0.1], [0.5, 0.2]], [[0.5, 0.4], [0.5, 1]]],
    m: [[[0.08, 1], [0.08, 0.4]], [[0.08, 0.56], [0.28, 0.4], [0.45, 0.56], [0.45, 1]], [[0.45, 0.56], [0.66, 0.4], [0.86, 0.56], [0.86, 1]]],
    r: [[[0.24, 1], [0.24, 0.4]], [[0.24, 0.58], [0.48, 0.4], [0.8, 0.38]]],
    '.': [[[0.38, 0.94], [0.62, 0.99], [0.4, 1.02], [0.5, 0.95]]],
    '!': [[[0.5, 0], [0.5, 0.68]], [[0.5, 0.9], [0.5, 1]]],
    "'": [[[0.52, 0], [0.42, 0.26]]],
  };

  const WIDTH = {
    '.': 0.3,
    '!': 0.3,
    "'": 0.25,
    a: 0.8,
    i: 0.28,
    m: 1.2,
    r: 0.58,
  };

  const SIMPLIFY = 0.1;
  const cfg = {
    gw: 60,
    gh: 120,
    tr: 16,
    inertia: 0.83,
    speed: 1.0,
    sw: 5.0,
    zoom: 0.9,
  };

  let dpr = window.devicePixelRatio || 1;
  let layout = { fit: 1, tx: 0, ty: 0 };
  let frameId = 0;
  let resizeId = 0;

  function hash32(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), t | 1);
      r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rdp(pts, eps) {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];

    while (stack.length) {
      const [a, b] = stack.pop();
      if (b - a < 2) continue;
      const ax = pts[a][0], ay = pts[a][1];
      const bx = pts[b][0], by = pts[b][1];
      const dx = bx - ax, dy = by - ay;
      const seg = Math.hypot(dx, dy);
      let far = -1, best = eps;
      for (let i = a + 1; i < b; i++) {
        const px = pts[i][0], py = pts[i][1];
        const d = seg < 1e-9 ? Math.hypot(px - ax, py - ay)
          : Math.abs(dy * px - dx * py + bx * ay - by * ax) / seg;
        if (d > best) {
          best = d;
          far = i;
        }
      }
      if (far > 0) {
        keep[far] = 1;
        stack.push([a, far], [far, b]);
      }
    }

    const out = [];
    for (let i = 0; i < pts.length; i++) {
      if (keep[i]) out.push(pts[i]);
    }
    return out;
  }

  function walkStroke(waypoints, ox, oy, gw, gh, wander, inertia, speed, rng, phase, strokeSalt) {
    const rnd = (a, b) => rng() * (b - a) + a;
    const wpts = waypoints.map((p) => [ox + p[0] * gw, oy + p[1] * gh]);
    const path = [];
    let px = wpts[0][0] + rnd(-wander * 0.3, wander * 0.3);
    let py = wpts[0][1] + rnd(-wander * 0.3, wander * 0.3);
    let vx = rnd(-1, 1), vy = rnd(-1, 1);
    path.push([px, py]);

    for (let wi = 0; wi < wpts.length - 1; wi++) {
      const tx = wpts[wi + 1][0];
      const ty = wpts[wi + 1][1];
      const segDist = Math.hypot(tx - wpts[wi][0], ty - wpts[wi][1]);
      const steps = Math.min(900, Math.max(30, Math.floor(segDist / speed * 80)));

      for (let s = 0; s < steps; s++) {
        const dx = tx - px;
        const dy = ty - py;
        const dist = Math.hypot(dx, dy) + 0.001;
        const wave = Math.sin(phase + s * 0.085 + wi * 0.75 + strokeSalt * 0.0017);
        const pull = Math.min(dist * 0.2, 4.0) * speed * (0.94 + wave * 0.06);
        const wanderAngle = rnd(0, Math.PI * 2) + wave * 0.9;
        const wanderForce = wander * rnd(0.3, 1.0) * (0.55 + (wave + 1) * 0.225);
        const wx = Math.cos(wanderAngle) * wanderForce;
        const wy = Math.sin(wanderAngle) * wanderForce;
        const ax = (dx / dist) * pull + wx;
        const ay = (dy / dist) * pull + wy;

        vx = vx * inertia + ax * (1 - inertia);
        vy = vy * inertia + ay * (1 - inertia);
        px += vx * speed;
        py += vy * speed;
        path.push([px, py]);
        if (dist < wander * 0.4 + 1.5) break;
      }
    }

    return path;
  }

  function paramsForFrame(wander) {
    return {
      gw: cfg.gw,
      gh: cfg.gh,
      tr: cfg.tr,
      wander,
      inertia: cfg.inertia,
      speed: cfg.speed,
      sw: cfg.sw,
      zoom: cfg.zoom,
      text,
    };
  }

  function buildPaths(wander, phase) {
    const p = paramsForFrame(wander);
    const allPaths = [];
    const lines = p.text.split('\n');
    const leading = p.gh * 1.4;
    let y = 0;

    lines.forEach((line) => {
      let x = 0;
      line.split('').forEach((c, ci) => {
        if (c === ' ') {
          x += p.gw * 0.5 + p.tr;
          return;
        }
        const skel = SK[c];
        if (!skel) {
          x += p.gw + p.tr;
          return;
        }
        const gw = p.gw * (WIDTH[c] || 1);
        skel.forEach((stroke, si) => {
          const seed = hash32(`${text}|${c}|${ci}|${si}|${y}`);
          const rng = mulberry32(seed);
          allPaths.push({
            seed,
            points: rdp(walkStroke(stroke, x, y, gw, p.gh, p.wander, p.inertia, p.speed, rng, phase, seed), SIMPLIFY),
          });
        });
        x += gw + p.tr;
      });
      y += leading;
    });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    allPaths.forEach((entry) => {
      entry.points.forEach((pt) => {
        if (pt[0] < minX) minX = pt[0];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[1] > maxY) maxY = pt[1];
      });
    });

    return {
      paths: allPaths,
      bounds: allPaths.length ? { minX, minY, maxX, maxY } : { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    };
  }

  function buildReferenceBounds() {
    const p = paramsForFrame(5);
    const lines = p.text.split('\n');
    const leading = p.gh * 1.4;
    let y = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    lines.forEach((line) => {
      let x = 0;
      line.split('').forEach((c) => {
        if (c === ' ') {
          x += p.gw * 0.5 + p.tr;
          return;
        }
        const skel = SK[c];
        if (!skel) {
          x += p.gw + p.tr;
          return;
        }
        const gw = p.gw * (WIDTH[c] || 1);
        skel.forEach((stroke) => {
          stroke.forEach((pt) => {
            const px = x + pt[0] * gw;
            const py = y + pt[1] * p.gh;
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          });
        });
        x += gw + p.tr;
      });
      y += leading;
    });

    const pad = Math.max(40, cfg.sw * 4 + 20);
    return {
      minX: minX - pad,
      minY: minY - pad,
      maxX: maxX + pad,
      maxY: maxY + pad,
    };
  }

  function syncCanvasSize() {
    const box = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(box.width));
    const height = Math.max(1, Math.round(box.height));
    const nextDpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.round(width * nextDpr));
    const pixelHeight = Math.max(1, Math.round(height * nextDpr));

    dpr = nextDpr;
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    const bounds = buildReferenceBounds();
    const bw = Math.max(bounds.maxX - bounds.minX, 1);
    const bh = Math.max(bounds.maxY - bounds.minY, 1);
    const margin = Math.max(16, Math.min(60, Math.min(width, height) * 0.12));
    const fit = Math.min((width - margin * 2) / bw, (height - margin * 2) / bh) * cfg.zoom;

    layout = {
      fit,
      tx: width / 2 - (bounds.minX + bw / 2) * fit,
      ty: height / 2 - (bounds.minY + bh / 2) * fit,
    };

    return { width, height };
  }

  function draw(wander, phase) {
    const { width: W, height: H } = syncCanvasSize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const { paths } = buildPaths(wander, phase);
    if (!paths.length) return;

    ctx.save();
    ctx.translate(layout.tx, layout.ty);
    ctx.scale(layout.fit, layout.fit);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = cfg.sw;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    paths.forEach((entry) => {
      ctx.beginPath();
      const path = entry.points;
      const warpAmp = wander * 0.14 + 0.35;
      for (let i = 0; i < path.length; i++) {
        const pt = path[i];
        const prev = path[i - 1] || pt;
        const next = path[i + 1] || pt;
        const dx = next[0] - prev[0];
        const dy = next[1] - prev[1];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const wobble = Math.sin(phase * 1.85 + i * 0.22 + entry.seed * 0.00021) * warpAmp;
        const x = pt[0] + nx * wobble;
        const y = pt[1] + ny * wobble;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    ctx.restore();
  }

  function currentWander(now) {
    return 11 + 6 * Math.sin(now * 0.0009);
  }

  function stop() {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function tick(now) {
    draw(currentWander(now), now * 0.001);
    frameId = requestAnimationFrame(tick);
  }

  function render() {
    stop();
    if (document.hidden) {
      return;
    }
    frameId = requestAnimationFrame(tick);
  }

  document.addEventListener('visibilitychange', render);

  const observer = new ResizeObserver(() => {
    if (resizeId) cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(() => {
      resizeId = 0;
      render();
    });
  });
  observer.observe(host);

  render();
})();
