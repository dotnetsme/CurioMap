/**
 * Zero-dependency, GPU-accelerated Stardust particle celebration effect.
 *
 * Spawns radiant cosmic embers (cyan aurora, electric violet, supernova amber)
 * on gamification milestones (e.g. badge awards, streak claims).
 *
 * Strict accessibility: completely short-circuits if `prefers-reduced-motion: reduce`.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  rotation: number;
  vRot: number;
}

const COSMIC_COLORS = [
  "#64d2ff", // Hyper Cyan
  "#5ac8fa", // Cyan Glow
  "#2997ff", // Electric Violet
  "#bf5af2", // Purple Flare
  "#ff9f0a", // Supernova Amber
  "#ffffff", // Star White
];

export function fireStardust(originX?: number, originY?: number, count = 55) {
  if (typeof window === "undefined") return;

  // Respect reduced motion accessibility
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const startX = originX ?? width / 2;
  const startY = originY ?? height * 0.45;

  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 6.5;
    particles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.8,
      size: 2.5 + Math.random() * 4.5,
      color: COSMIC_COLORS[Math.floor(Math.random() * COSMIC_COLORS.length)],
      alpha: 1,
      decay: 0.012 + Math.random() * 0.018,
      gravity: 0.14,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.2,
    });
  }

  let rafId: number;

  const render = () => {
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.alpha <= 0) continue;

      activeCount++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.alpha -= p.decay;
      p.rotation += p.vRot;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;

      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      // Render 4-point spark diamond
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.lineTo(p.size * 0.4, 0);
      ctx.lineTo(0, p.size);
      ctx.lineTo(-p.size * 0.4, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    if (activeCount > 0) {
      rafId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(rafId);
      canvas.remove();
    }
  };

  rafId = requestAnimationFrame(render);

  // Safety fallback cleanup after 2.5 seconds
  setTimeout(() => {
    cancelAnimationFrame(rafId);
    if (canvas.parentNode) canvas.remove();
  }, 2500);
}
