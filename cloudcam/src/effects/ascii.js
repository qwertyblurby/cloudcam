const asciiEffect = {
  name: 'ascii',
  offscreenCanvas: null,
  offscreenCtx: null,
  charLookup: null,
  width: 160,
  height: 90,
  fontSize: 8,
  colorMode: 'green',
  invertBrightness: false,
  time: 0,

  init(canvas, analyser) {
    // Create persistent 160×90 offscreen canvas for downsampling
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.width;
    this.offscreenCanvas.height = this.height;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // Precompute char lookup as Uint8ClampedArray for performance
    // ' .·:-=+*#%@' (11 chars)
    this.charLookup = new Uint8ClampedArray(256);
    const chars = ' .·:-=+*#%@';
    for (let i = 0; i < 256; i++) {
      const brightness = i / 255;
      const charIndex = Math.floor(brightness * 10);
      this.charLookup[i] = charIndex;
    }
  },

  setFontSize(px) {
    this.fontSize = px;
  },

  setColorMode(mode) {
    this.colorMode = mode;
  },

  setInvert(bool) {
    this.invertBrightness = bool;
  },

  render(ctx, videoEl, dt) {
    this.time += dt;

    // Draw video into the 160×90 offscreen canvas
    this.offscreenCtx.drawImage(videoEl, 0, 0, this.width, this.height);

    // Get imageData from offscreen canvas
    const imageData = this.offscreenCtx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    // Fill compositor ctx with black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1280, 720);

    // Set font
    ctx.font = this.fontSize + 'px monospace';
    ctx.textBaseline = 'bottom';

    const chars = ' .·:-=+*#%@';
    const cellW = 1280 / this.width;
    const cellH = 720 / this.height;

    // Process each cell
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pixelIdx = (y * this.width + x) * 4;
        const r = data[pixelIdx];
        const g = data[pixelIdx + 1];
        const b = data[pixelIdx + 2];

        // Compute brightness
        const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

        // Map to char using precomputed lookup
        let charIndex = this.charLookup[Math.floor(brightness * 255)];

        // Invert if needed
        if (this.invertBrightness) {
          charIndex = 10 - charIndex;
        }

        const char = chars[charIndex];

        // Set color based on mode
        if (this.colorMode === 'green') {
          ctx.fillStyle = '#00ff41';
        } else if (this.colorMode === 'white') {
          ctx.fillStyle = '#ffffff';
        } else if (this.colorMode === 'rainbow') {
          const hue = (x / this.width) * 360 + this.time * 20;
          ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
        }

        // Draw character
        ctx.fillText(char, x * cellW, y * cellH + cellH);
      }
    }
  },

  destroy() {
    if (this.offscreenCanvas) {
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
    this.charLookup = null;
  },
};

export default asciiEffect;
