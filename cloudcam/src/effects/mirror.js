const MODE_HORIZONTAL = 'horizontal';
const MODE_QUAD = 'quad';
const MODE_KALEIDOSCOPE = 'kaleidoscope';

const mirrorEffect = {
  name: 'mirror',
  mode: MODE_HORIZONTAL,
  kalaAngle: 0,

  init(canvas, analyser) {
    // No initialization needed
  },

  setMirrorMode(mode) {
    this.mode = mode;
  },

  render(ctx, videoEl, dt) {
    // Draw base video first
    ctx.drawImage(videoEl, 0, 0, 1280, 720);

    if (this.mode === MODE_HORIZONTAL) {
      ctx.save();
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      // Draw left half mirrored to right half
      ctx.drawImage(videoEl, 0, 0, 640, 720, 0, 0, 640, 720);
      ctx.restore();
    } else if (this.mode === MODE_QUAD) {
      // Top-left: normal
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 640, 360);
      ctx.clip();
      ctx.drawImage(videoEl, 0, 0, 640, 360, 0, 0, 640, 360);
      ctx.restore();

      // Top-right: flipped horizontal
      ctx.save();
      ctx.beginPath();
      ctx.rect(640, 0, 640, 360);
      ctx.clip();
      ctx.translate(1280, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(videoEl, 0, 0, 640, 360, 0, 0, 640, 360);
      ctx.restore();

      // Bottom-left: flipped vertical
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 360, 640, 360);
      ctx.clip();
      ctx.translate(0, 720);
      ctx.scale(1, -1);
      ctx.drawImage(videoEl, 0, 0, 640, 360, 0, 0, 640, 360);
      ctx.restore();

      // Bottom-right: flipped both axes
      ctx.save();
      ctx.beginPath();
      ctx.rect(640, 360, 640, 360);
      ctx.clip();
      ctx.translate(1280, 720);
      ctx.scale(-1, -1);
      ctx.drawImage(videoEl, 0, 0, 640, 360, 0, 0, 640, 360);
      ctx.restore();
    } else if (this.mode === MODE_KALEIDOSCOPE) {
      this.kalaAngle += 0.003 * dt;

      // Draw 6 wedges around center
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(640, 360);
        ctx.rotate(this.kalaAngle + (Math.PI / 3) * i);

        // Clip to 60° wedge
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 800, -Math.PI / 6, Math.PI / 6);
        ctx.closePath();
        ctx.clip();

        // Draw video into wedge
        ctx.drawImage(videoEl, 320 - 400, 360 - 400, 800, 800, -400, -400, 800, 800);
        ctx.restore();
      }
    }
  },

  destroy() {
    // No cleanup needed
  },
};

export default mirrorEffect;
