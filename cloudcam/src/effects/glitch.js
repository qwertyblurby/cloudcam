const glitchEffect = {
  name: 'glitch',
  offscreenCanvas: null,
  offscreenCtx: null,
  frameCounter: 0,
  glitchIntensity: 0.5,

  init(canvas, analyser) {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 1280;
    this.offscreenCanvas.height = 720;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  },

  setGlitchIntensity(value) {
    this.glitchIntensity = Math.max(0, Math.min(1, Number(value)));
  },

  render(ctx, videoEl, dt) {
    if (!this.offscreenCtx) return;

    this.frameCounter++;

    const intensity = this.glitchIntensity;
    const width = 1280;
    const height = 720;

    this.offscreenCtx.drawImage(videoEl, 0, 0, width, height);

    let imageData = this.offscreenCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Make glitch happen much more often as intensity goes up
    const sliceInterval = Math.max(1, Math.floor(10 - intensity * 9));

    if (this.frameCounter % sliceInterval === 0) {
      const numSlices = Math.max(1, Math.floor(2 + intensity * 14));

      for (let i = 0; i < numSlices; i++) {
        const sliceY = Math.floor(Math.random() * (height - 20));
        const sliceHeight = Math.floor(2 + Math.random() * (8 + intensity * 28));
        const maxShift = 5 + intensity * 80;
        const shift = Math.floor((Math.random() * maxShift) * (Math.random() < 0.5 ? -1 : 1));

        for (let y = sliceY; y < sliceY + sliceHeight && y < height; y++) {
          const rowStart = y * width * 4;
          const rowEnd = rowStart + width * 4;
          const rowCopy = new Uint8ClampedArray(data.slice(rowStart, rowEnd));

          for (let x = 0; x < width; x++) {
            let sourceX = (x - shift) % width;
            if (sourceX < 0) sourceX += width;

            const targetIdx = rowStart + x * 4;
            const sourceIdx = sourceX * 4;

            data[targetIdx] = rowCopy[sourceIdx];
            data[targetIdx + 1] = rowCopy[sourceIdx + 1];
            data[targetIdx + 2] = rowCopy[sourceIdx + 2];
            data[targetIdx + 3] = rowCopy[sourceIdx + 3];
          }
        }
      }
    }

    // Stronger channel corruption
    const bleedCount = Math.floor(width * height * 0.0002 * intensity * 25);
    for (let i = 0; i < bleedCount; i++) {
      const pixelIdx = Math.floor(Math.random() * width * height) * 4;

      if (Math.random() < 0.5) {
        data[pixelIdx] = 255; // red spike
      } else {
        data[pixelIdx + 2] = 255; // blue spike
      }
    }

    // Random color channel offset bands
    if (intensity > 0.15) {
      const bandCount = Math.floor(intensity * 6);
      for (let b = 0; b < bandCount; b++) {
        const bandY = Math.floor(Math.random() * height);
        const bandH = Math.floor(2 + Math.random() * 10);

        for (let y = bandY; y < bandY + bandH && y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            data[idx] = Math.min(255, data[idx] + intensity * 80);
            data[idx + 2] = Math.min(255, data[idx + 2] + intensity * 120);
          }
        }
      }
    }

    this.offscreenCtx.putImageData(imageData, 0, 0);

    ctx.save();
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    // Add offset ghost layers as intensity rises
    if (intensity > 0.05) {
      ctx.globalAlpha = 0.15 + intensity * 0.35;
      ctx.drawImage(this.offscreenCanvas, Math.floor(intensity * 12), 0);

      ctx.globalAlpha = 0.08 + intensity * 0.25;
      ctx.drawImage(this.offscreenCanvas, -Math.floor(intensity * 18), Math.floor(intensity * 4));
    }

    // Scanlines
    if (intensity > 0.1) {
      ctx.globalAlpha = 0.08 + intensity * 0.18;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      const lineGap = Math.max(2, Math.floor(8 - intensity * 5));

      for (let y = 0; y < height; y += lineGap) {
        ctx.fillRect(0, y, width, 1);
      }
    }

    ctx.restore();
  },

  destroy() {
    if (this.offscreenCanvas) {
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  },
};

export default glitchEffect;