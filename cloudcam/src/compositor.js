const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 720;

const activeEffects = new Map();
let videoEl = null;
let audioAnalyser = null;
let ctx = null;
let running = false;
let rafId = null;
let lastTime = 0;

let canvas = document.getElementById('output-canvas');
if (!(canvas instanceof HTMLCanvasElement)) {
  canvas = document.createElement('canvas');
  canvas.id = 'output-canvas';
  document.body.appendChild(canvas);
}
canvas.width = OUTPUT_WIDTH;
canvas.height = OUTPUT_HEIGHT;
ctx = canvas.getContext('2d');

function validateEffect(module) {
  const hasValidName = module && typeof module.name === 'string' && module.name.length > 0;
  const hasInit = module && typeof module.init === 'function';
  const hasRender = module && typeof module.render === 'function';
  const hasDestroy = module && typeof module.destroy === 'function';

  if (!hasValidName || !hasInit || !hasRender || !hasDestroy) {
    throw new Error(
      'Invalid effect module. Expected { name: string, init(canvas, analyser), render(ctx, videoEl, dt), destroy() }.'
    );
  }
}

function frame(now) {
  if (!running || !ctx || !videoEl) {
    return;
  }

  const deltaTime = lastTime === 0 ? 0 : (now - lastTime) / 1000;
  lastTime = now;

  ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  ctx.drawImage(videoEl, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  // All non-drawing effects first.
  for (const [name, effect] of activeEffects) {
    if (name === 'drawing') {
      continue;
    }
    effect.render(ctx, videoEl, deltaTime);
  }

  // Drawing layer always renders last, if active.
  const drawingEffect = activeEffects.get('drawing');
  if (drawingEffect) {
    drawingEffect.render(ctx, videoEl, deltaTime);
  }

  rafId = requestAnimationFrame(frame);
}

function start() {
  if (running || !videoEl || !ctx) {
    return;
  }
  running = true;
  lastTime = 0;
  rafId = requestAnimationFrame(frame);
}

function stop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function init(inputVideoEl, inputAudioAnalyser) {
  if (!(inputVideoEl instanceof HTMLVideoElement)) {
    throw new Error('init(videoEl, audioAnalyser?) requires a valid HTMLVideoElement.');
  }

  videoEl = inputVideoEl;
  audioAnalyser = inputAudioAnalyser || null;
  start();
}

function enableEffect(name, module) {
  if (!name || typeof name !== 'string') {
    throw new Error('enableEffect(name, module) requires a non-empty string name.');
  }

  validateEffect(module);

  if (activeEffects.has(name)) {
    disableEffect(name);
  }

  module.init(canvas, audioAnalyser);
  activeEffects.set(name, module);
}

function disableEffect(name) {
  const effect = activeEffects.get(name);
  if (!effect) {
    return;
  }

  effect.destroy();
  activeEffects.delete(name);
}

export { init, enableEffect, disableEffect, start, stop, canvas };
