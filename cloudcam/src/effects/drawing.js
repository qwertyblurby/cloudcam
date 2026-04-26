const MODE_GLOW = 'glow';
const MODE_SPARKLE = 'sparkle';
const MODE_HEARTBEAT = 'heartbeat';

const EMOJIS = ['❤', '✨', '🔥', '💫', '🌊'];

const drawingEffect = {
  name: 'drawing',
  strokes: [],
  currentStrokes: new Map(),
  particles: [],
  mode: MODE_GLOW,
  canvas: null,

  init(canvas, analyser) {
    this.canvas = canvas;
    this.setupPointerListeners(canvas);
  },

  setupPointerListeners(canvas) {
    canvas.style.touchAction = 'none';

    canvas.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
      const y = (ev.clientY - rect.top) * (canvas.height / rect.height);

      // Check for tap burst
      const pointerData = this.currentStrokes.get(ev.pointerId);
      if (pointerData && pointerData.startTime) {
        const travel = Math.hypot(x - pointerData.startX, y - pointerData.startY);
        const time = Date.now() - pointerData.startTime;
        if (travel < 8 && time < 200) {
          this.spawnTapBurst(x, y);
          this.currentStrokes.delete(ev.pointerId);
          return;
        }
      }

      // Start new stroke
      const stroke = {
        points: [{ x, y }],
        color: this.getRandomColor(),
        width: 4,
        createdAt: Date.now(),
        opacity: 1,
      };

      this.currentStrokes.set(ev.pointerId, {
        stroke,
        lastX: x,
        lastY: y,
        startTime: Date.now(),
        startX: x,
        startY: y,
      });
    });

    canvas.addEventListener('pointermove', (ev) => {
      ev.preventDefault();
      const pointerData = this.currentStrokes.get(ev.pointerId);
      if (!pointerData) return;

      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
      const y = (ev.clientY - rect.top) * (canvas.height / rect.height);

      const distance = Math.hypot(x - pointerData.lastX, y - pointerData.lastY);
      if (distance > 3) {
        const stroke = pointerData.stroke;
        const lastPoint = stroke.points[stroke.points.length - 1];

        stroke.points.push({ x, y });

        // Apply brush mode effects
        if (this.mode === MODE_SPARKLE) {
          this.spawnSparkles(lastPoint.x, lastPoint.y, x, y, stroke.color);
        } else if (this.mode === MODE_HEARTBEAT) {
          this.addHeartbeatSpike(stroke, lastPoint, { x, y });
        }

        pointerData.lastX = x;
        pointerData.lastY = y;
      }
    });

    const endStroke = (ev) => {
      ev.preventDefault();
      const pointerData = this.currentStrokes.get(ev.pointerId);
      if (pointerData && pointerData.stroke.points.length > 1) {
        this.strokes.push(pointerData.stroke);
      }
      this.currentStrokes.delete(ev.pointerId);
    };

    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);
    canvas.addEventListener('pointerleave', endStroke);
  },

  spawnTapBurst(x, y) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const speed = 2 + Math.random() * 2;
      this.particles.push({
        type: 'emoji',
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        createdAt: Date.now(),
        lifetime: 1000,
        opacity: 1,
      });
    }
  },

  spawnSparkles(x1, y1, x2, y2, color) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        type: 'star',
        x: midX + (Math.random() - 0.5) * 10,
        y: midY + (Math.random() - 0.5) * 10,
        color,
        createdAt: Date.now(),
        lifetime: 500,
        opacity: 1,
        size: 8 + Math.random() * 4,
      });
    }
  },

  addHeartbeatSpike(stroke, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);

    // Track cumulative distance for the stroke
    if (!stroke.totalDistance) stroke.totalDistance = 0;
    stroke.totalDistance += distance;

    if (stroke.totalDistance >= 80) {
      stroke.totalDistance = 0;

      // Calculate perpendicular direction
      const perpX = -dy / distance;
      const perpY = dx / distance;

      // Add spike points
      const spikePoints = [
        { x: p2.x + perpX * 30, y: p2.y + perpY * 30 },
        { x: p2.x - perpX * 15, y: p2.y - perpY * 15 },
        { x: p2.x + perpX * 8, y: p2.y + perpY * 8 },
      ];

      stroke.points.push(...spikePoints);
    }
  },

  getRandomColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  setMode(mode) {
    this.mode = mode;
  },

  render(ctx, videoEl, dt) {
    const now = Date.now();

    // Age out strokes
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const stroke = this.strokes[i];
      const age = now - stroke.createdAt;

      if (age > 3000) {
        this.strokes.splice(i, 1);
        continue;
      }

      // Calculate opacity based on age
      if (age > 2000) {
        stroke.opacity = 1 - (age - 2000) / 1000;
      } else {
        stroke.opacity = 1;
      }

      if (stroke.opacity <= 0) {
        this.strokes.splice(i, 1);
      }
    }

    // Update and render particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      const age = now - particle.createdAt;

      if (age > particle.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      particle.opacity = 1 - age / particle.lifetime;

      if (particle.type === 'emoji') {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05; // gravity
      }
    }

    // Render strokes
    for (const stroke of this.strokes) {
      if (stroke.points.length < 2) continue;

      // Glow pass
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width * 4;
      ctx.globalAlpha = stroke.opacity * 0.25;
      ctx.strokeStyle = stroke.color;
      ctx.stroke();
      ctx.restore();

      // Core pass
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.stroke();
      ctx.restore();
    }

    // Render current strokes being drawn
    for (const [pointerId, pointerData] of this.currentStrokes) {
      const stroke = pointerData.stroke;
      if (stroke.points.length < 2) continue;

      // Glow pass
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width * 4;
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = stroke.color;
      ctx.stroke();
      ctx.restore();

      // Core pass
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;
      ctx.globalAlpha = 1;
      ctx.strokeStyle = stroke.color;
      ctx.stroke();
      ctx.restore();
    }

    // Render particles
    for (const particle of this.particles) {
      ctx.save();
      ctx.globalAlpha = particle.opacity;

      if (particle.type === 'emoji') {
        ctx.font = '24px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(particle.emoji, particle.x, particle.y);
      } else if (particle.type === 'star') {
        // Draw 4-pointed star
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (Math.PI * i) / 2;
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(
            particle.x + Math.cos(angle) * particle.size,
            particle.y + Math.sin(angle) * particle.size
          );
        }
        ctx.stroke();
      }

      ctx.restore();
    }
  },

  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', null);
      this.canvas.removeEventListener('pointermove', null);
      this.canvas.removeEventListener('pointerup', null);
      this.canvas.removeEventListener('pointercancel', null);
      this.canvas.removeEventListener('pointerleave', null);
    }
    this.strokes = [];
    this.currentStrokes.clear();
    this.particles = [];
  },
};

export default drawingEffect;
