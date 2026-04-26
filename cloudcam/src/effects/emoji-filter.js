const MODE_CLASSIC = 'classic';
const MODE_FULL_FACE = 'full-face';
const MODE_CROWN = 'crown';
const MODE_SUNGLASSES = 'sunglasses';

const emojiFilterEffect = {
  name: 'emoji-filter',
  offscreenCanvas: null,
  offscreenCtx: null,
  videoEl: null,
  detectionInterval: 80,
  detectionTimeout: null,
  lastDetections: [],
  emojiMode: MODE_CLASSIC,
  faceIndex: 0,
  faceRotateTime: 0,
  isReady: false,
  isDetecting: false,
  scriptLoaded: false,

  emojiOverlays: {
    leftEye: '🕶',
    rightEye: '🕶',
    mouth: '🤐',
    nose: '🐷',
    face: ['🐸', '🤖', '👻', '🐱', '🦊', '😈'],
  },

  async init(canvas, analyser) {
    this.isReady = false;
    this.scriptLoaded = false;

    // Load face-api.js once
    if (!window.faceapi) {
      const existingScript = document.querySelector('script[data-face-api="true"]');

      if (existingScript) {
        await new Promise((resolve, reject) => {
          if (window.faceapi) {
            resolve();
            return;
          }
          existingScript.addEventListener('load', resolve, { once: true });
          existingScript.addEventListener('error', reject, { once: true });
        });
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        script.dataset.faceApi = 'true';

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    }

    this.scriptLoaded = true;

    // Load models from local public/models folder
    const modelUrl = '/models';
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
    await faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl);

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 1280;
    this.offscreenCanvas.height = 720;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    if (!this.offscreenCtx) {
      throw new Error('Failed to create offscreen 2D context for emoji filter.');
    }

    this.isReady = true;
  },

  startDetectionLoop(videoEl) {
    if (!this.isReady || this.isDetecting) return;
    this.videoEl = videoEl;
    this.isDetecting = true;
    this.runDetection();
  },

  async runDetection() {
    if (!this.isReady || !this.videoEl || !this.offscreenCtx || !this.offscreenCanvas) {
      this.isDetecting = false;
      return;
    }

    try {
      this.offscreenCtx.drawImage(this.videoEl, 0, 0, 1280, 720);

      const detections = await faceapi
        .detectAllFaces(this.offscreenCanvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);

      this.lastDetections = detections;
    } catch (error) {
      console.error('Emoji filter detection failed:', error);
    }

    this.detectionTimeout = setTimeout(() => this.runDetection(), this.detectionInterval);
  },

  setEmojiMode(mode) {
    this.emojiMode = mode;
  },

  setEmojiOverlay(slot, emoji) {
    if (slot === 'face' && Array.isArray(emoji)) {
      this.emojiOverlays.face = emoji;
    } else {
      this.emojiOverlays[slot] = emoji;
    }
  },

  getCentroid(points) {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  },

  render(ctx, videoEl, dt) {
    if (!this.isReady) return;

    if (!this.videoEl) {
      this.startDetectionLoop(videoEl);
    }

    this.faceRotateTime += dt;

    for (const detection of this.lastDetections) {
      const landmarks = detection.landmarks;
      const box = detection.detection.box;

      const leftEye = this.getCentroid(landmarks.getLeftEye());
      const rightEye = this.getCentroid(landmarks.getRightEye());
      const mouth = this.getCentroid(landmarks.getMouth());
      const nose = this.getCentroid(landmarks.getNose());
      const jawOutline = landmarks.getJawOutline();

      const faceWidth = jawOutline[16].x - jawOutline[0].x;
      const emojiSize = faceWidth * 0.35;

      if (this.emojiMode === MODE_CLASSIC) {
        ctx.font = emojiSize + 'px serif';
        ctx.fillText(this.emojiOverlays.leftEye, leftEye.x - emojiSize / 2, leftEye.y + emojiSize / 3);
        ctx.fillText(this.emojiOverlays.rightEye, rightEye.x - emojiSize / 2, rightEye.y + emojiSize / 3);
        ctx.fillText(this.emojiOverlays.mouth, mouth.x - emojiSize / 2, mouth.y + emojiSize / 3);
        ctx.fillText(this.emojiOverlays.nose, nose.x - emojiSize / 2, nose.y + emojiSize / 3);
      } else if (this.emojiMode === MODE_FULL_FACE) {
        const faceEmojis = this.emojiOverlays.face;
        this.faceIndex = Math.floor(this.faceRotateTime / 2) % faceEmojis.length;
        const faceEmoji = faceEmojis[this.faceIndex];

        const fullSize = faceWidth * 1.1;
        ctx.font = fullSize + 'px serif';
        ctx.fillText(faceEmoji, box.x + box.width / 2 - fullSize / 2, box.y + box.height / 2 + fullSize / 3);
      } else if (this.emojiMode === MODE_CROWN) {
        const crownSize = emojiSize;
        ctx.font = crownSize + 'px serif';
        const crownY = box.y - crownSize * 0.4;
        ctx.fillText('👑', box.x + box.width / 2 - crownSize / 2, crownY + crownSize / 3);

        ctx.font = emojiSize * 0.5 + 'px serif';
        for (let i = 0; i < 5; i++) {
          const sparkleX = box.x + Math.random() * box.width;
          const sparkleY = box.y + Math.random() * (box.height * 0.2);
          ctx.fillText('✨', sparkleX, sparkleY);
        }
      } else if (this.emojiMode === MODE_SUNGLASSES) {
        const eyeSpan = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
        const glassesSize = eyeSpan * 1.4;
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        const centerX = (leftEye.x + rightEye.x) / 2;
        const centerY = (leftEye.y + rightEye.y) / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(angle);
        ctx.font = glassesSize + 'px serif';
        ctx.fillText('🕶', -glassesSize / 2, glassesSize / 3);
        ctx.restore();
      }
    }
  },

  destroy() {
    if (this.detectionTimeout) {
      clearTimeout(this.detectionTimeout);
      this.detectionTimeout = null;
    }

    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    this.videoEl = null;
    this.lastDetections = [];
    this.isDetecting = false;
    this.isReady = false;
  },
};

export default emojiFilterEffect;