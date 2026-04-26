const glitchEffect = {
  name: 'glitch',
  offscreenCanvas: null,
  offscreenCtx: null,
  frameCounter: 0,
  glitchIntensity: 0.5,

  init(canvas, analyser) {
    // Create offscreen canvas for pixel manipulation
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 1280;
    this.offscreenCanvas.height = 720;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  },

  setGlitchIntensity(value) {
    this.glitchIntensity = Math.max(0, Math.min(1, value));
  },

  render(ctx, videoEl, dt) {
    this.frameCounter++;

    // Draw video to offscreen canvas
    this.offscreenCtx.drawImage(videoEl, 0, 0, 1280, 720);

    // Get image data
    let imageData = this.offscreenCtx.getImageData(0, 0, 1280, 720);
    const data = imageData.data;
    const width = 1280;
    const height = 720;

    // Slice shift corruption
    const sliceInterval = Math.round(8 - this.glitchIntensity * 6);
    if (this.frameCounter % sliceInterval === 0) {
      const numSlices = 3 + Math.floor(Math.random() * 6); // 3-8 slices

      for (let i = 0; i < numSlices; i++) {
        const sliceY = Math.floor(Math.random() * (height - 20));
        const sliceHeight = 4 + Math.floor(Math.random() * 17); // 4-20px
        const shift = (10 + this.glitchIntensity * 30) * (Math.random() < 0.5 ? 1 : -1);

        // Shift pixel rows by copying data
        for (let y = sliceY; y < sliceY + sliceHeight && y < height; y++) {
          const rowStart = y * width * 4;
          const rowEnd = rowStart + width * 4;

          // Create a copy of the row
          const rowCopy = new Uint8ClampedArray(data.slice(rowStart, rowEnd));

          // Shift and copy back
          for (let x = 0; x < width; x++) {
            const sourceX = (x - shift + width) % width;
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

    // Channel bleed corruption
    const bleedCount = Math.floor(width * height * 0.0005 * this.glitchIntensity);
    for (let i = 0; i < bleedCount; i++) {
      const pixelIdx = Math.floor(Math.random() * (width * height)) * 4;
      data[pixelIdx] = 240; // Set R channel to 240
    }

    // Apply modified image data
    this.offscreenCtx.putImageData(imageData, 0, 0);

    // Scanline effect
    if (Math.random() < this.glitchIntensity * 0.15) {
      // Draw normal
      ctx.drawImage(this.offscreenCanvas, 0, 0);

      // Draw offset with blue tint
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
      ctx.drawImage(this.offscreenCanvas, 0, 2);
      ctx.restore();
    } else {
      ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
  },

  destroy() {
    if (this.offscreenCanvas) {
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  },
};

export default glitchEffect;
