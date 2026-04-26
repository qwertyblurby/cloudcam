import { startVirtualCam, stopVirtualCam, getStream, getOBSInstructions } from '../virtualcam.js';
import { startRecording, stopRecording, isRecording, getDuration } from '../recorder.js';
import { showToast } from './toast.js';

// State
let virtualCamActive = false;
let obsInstructionsShown = false;
let recordingInterval = null;
let drawerOpen = false;

// Effect state tracking
const activeEffects = new Set();

// Initialize UI
function initControls() {
  createBottomBar();
  createSideDrawer();
  createOBSOverlay();
  updateRecordingTimer();
}

function createBottomBar() {
  const bottomBar = document.createElement('div');
  bottomBar.id = 'bottom-bar';
  bottomBar.innerHTML = `
    <div class="bar-left">
      <button id="virtual-cam-btn" class="control-btn">
        <span class="status-dot"></span>
        Virtual Cam
      </button>
    </div>
    <div class="bar-center">
      <button class="effect-pill" data-effect="drawing">DRAW</button>
      <button class="effect-pill" data-effect="glitch">GLITCH</button>
      <button class="effect-pill" data-effect="mirror">MIRROR</button>
      <button class="effect-pill" data-effect="ascii">ASCII</button>
      <button class="effect-pill" data-effect="emoji-filter">EMOJI</button>
      <button class="effect-pill" data-effect="tracking-markers">TRACKING</button>
      <button class="effect-pill" data-effect="avatar-rig">AVATAR</button>
    </div>
    <div class="bar-right">
      <button id="rec-btn" class="control-btn rec-btn">
        <span class="rec-icon">⏺</span>
        <span class="rec-timer">0:00</span>
      </button>
      <a href="gallery.html" class="control-btn gallery-link">Gallery</a>
      <button id="drawer-toggle" class="control-btn gear-btn">⚙</button>
    </div>
  `;

  document.body.appendChild(bottomBar);

  // Virtual Cam button
  const virtualCamBtn = document.getElementById('virtual-cam-btn');
  virtualCamBtn.addEventListener('click', () => toggleVirtualCam());

  // Effect pills
  document.querySelectorAll('.effect-pill').forEach((pill) => {
    pill.addEventListener('click', () => toggleEffect(pill.dataset.effect));
  });

  // REC button
  const recBtn = document.getElementById('rec-btn');
  recBtn.addEventListener('click', () => toggleRecording());

  // Drawer toggle
  const drawerToggle = document.getElementById('drawer-toggle');
  drawerToggle.addEventListener('click', () => toggleDrawer());
}

function createSideDrawer() {
  const drawer = document.createElement('div');
  drawer.id = 'side-drawer';
  drawer.innerHTML = `
    <div class="drawer-header">
      <h2>Effect Controls</h2>
      <button id="close-drawer" class="close-btn">×</button>
    </div>
    <div class="drawer-content">
      <div class="theme-toggle-section">
        <button class="theme-toggle-btn" id="theme-toggle-btn">
          <span id="theme-toggle-icon">🌙</span>
          <span id="theme-toggle-text">Dark Mode</span>
        </button>
      </div>
      ${createDrawSection()}
      ${createGlitchSection()}
      ${createMirrorSection()}
      ${createAsciiSection()}
      ${createEmojiSection()}
    </div>
  `;

  document.body.appendChild(drawer);

  // Close drawer
  document.getElementById('close-drawer').addEventListener('click', () => toggleDrawer());

  // Theme toggle
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleText = document.getElementById('theme-toggle-text');

  function setTheme(isDark) {
    document.body.classList.toggle('dark', isDark);
    themeToggleIcon.textContent = isDark ? '☀️' : '🌙';
    themeToggleText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  themeToggleBtn.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark');
    setTheme(isDark);
  });

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    setTheme(true);
  }

  // Collapsible sections
  document.querySelectorAll('.section-header').forEach((header) => {
    header.addEventListener('click', () => {
      const section = header.parentElement;
      section.classList.toggle('collapsed');
    });
  });

  // Wire up all controls
  wireDrawControls();
  wireGlitchControls();
  wireMirrorControls();
  wireAsciiControls();
  wireEmojiControls();
}

function createOBSOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'obs-overlay';
  overlay.style.display = 'none';
  overlay.innerHTML = `
    <div class="obs-content">
      <h3>OBS Setup Instructions</h3>
      <pre id="obs-instructions"></pre>
      <button id="close-obs" class="close-btn">Got it</button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('close-obs').addEventListener('click', () => {
    overlay.style.display = 'none';
  });
}

function createDrawSection() {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  return `
    <div class="control-section" data-effect="drawing">
      <div class="section-header">
        <span>DRAW</span>
        <span class="collapse-icon">▼</span>
      </div>
      <div class="section-body">
        <label>Color</label>
        <div class="color-swatches">
          ${colors.map((c) => `<button class="color-swatch" style="background: ${c}" data-color="${c}"></button>`).join('')}
          <input type="color" id="draw-color-picker" value="#ff0000">
        </div>
        <label>Width</label>
        <input type="range" id="draw-width" min="2" max="20" step="1" value="4">
        <label>Mode</label>
        <div class="mode-buttons">
          <button class="mode-btn" data-mode="glow">Glow</button>
          <button class="mode-btn" data-mode="sparkle">Sparkle</button>
          <button class="mode-btn" data-mode="heartbeat">Heartbeat</button>
        </div>
        <label style="margin-top: 12px;">Input Mode</label>
        <div class="radio-group">
          <label><input type="radio" name="draw-input" value="mouse"> Mouse/Touch</label>
          <label><input type="radio" name="draw-input" value="finger" checked> Index Finger (requires Tracking)</label>
        </div>
        <button id="draw-clear" class="clear-btn">Clear all</button>
      </div>
    </div>
  `;
}

function createGlitchSection() {
  return `
    <div class="control-section" data-effect="glitch">
      <div class="section-header">
        <span>GLITCH</span>
        <span class="collapse-icon">▼</span>
      </div>
      <div class="section-body">
        <label>Intensity</label>
        <input type="range" id="glitch-intensity" min="0" max="1" step="0.01" value="0.5">
      </div>
    </div>
  `;
}

function createMirrorSection() {
  return `
    <div class="control-section" data-effect="mirror">
      <div class="section-header">
        <span>MIRROR</span>
        <span class="collapse-icon">▼</span>
      </div>
      <div class="section-body">
        <label>Mode</label>
        <div class="mode-buttons">
          <button class="mode-btn" data-mode="horizontal">Horizontal</button>
          <button class="mode-btn" data-mode="vertical">Vertical</button>
          <button class="mode-btn" data-mode="quad">Quad</button>
          <button class="mode-btn" data-mode="kaleidoscope">Kaleidoscope</button>
        </div>
      </div>
    </div>
  `;
}

function createAsciiSection() {
  return `
    <div class="control-section" data-effect="ascii">
      <div class="section-header">
        <span>ASCII</span>
        <span class="collapse-icon">▼</span>
      </div>
      <div class="section-body">
        <label>Font Size</label>
        <input type="range" id="ascii-font-size" min="8" max="16" step="1" value="10">
        <label>Color</label>
        <div class="radio-group">
          <label><input type="radio" name="ascii-color" value="green" checked> Green</label>
          <label><input type="radio" name="ascii-color" value="white"> White</label>
          <label><input type="radio" name="ascii-color" value="rainbow"> Rainbow</label>
        </div>
        <label>
          <input type="checkbox" id="ascii-invert"> Invert
        </label>
      </div>
    </div>
  `;
}

function createEmojiSection() {
  const faceEmojis = ['🐸', '🤖', '👻', '🐱', '🦊', '😈'];
  return `
    <div class="control-section" data-effect="emoji-filter">
      <div class="section-header">
        <span>EMOJI FILTER</span>
        <span class="collapse-icon">▼</span>
      </div>
      <div class="section-body">
        <label>Mode</label>
        <div class="mode-buttons">
          <button class="mode-btn" data-mode="classic">Classic</button>
          <button class="mode-btn" data-mode="full-face">Full Face</button>
          <button class="mode-btn" data-mode="crown">Crown</button>
          <button class="mode-btn" data-mode="sunglasses">Sunglasses</button>
        </div>
        <label>Emoji Slots</label>
        <div class="emoji-slots">
          <input type="text" id="emoji-left-eye" value="🕶" placeholder="Left eye">
          <input type="text" id="emoji-right-eye" value="🕶" placeholder="Right eye">
          <input type="text" id="emoji-mouth" value="🤐" placeholder="Mouth">
          <input type="text" id="emoji-nose" value="🐷" placeholder="Nose">
        </div>
        <label>Face Emojis</label>
        <div class="face-emojis">
          ${faceEmojis.map((e) => `<button class="face-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function createAvatarRigSection() {
  return `
    <div class="control-section" data-effect="avatar-rig">
      <div class="section-header">
        <span>AVATAR</span>
        <span class="collapse-icon">▼</span>
      </div>
      <div class="section-body">
        <label>Scale</label>
        <input type="range" id="avatar-scale" min="1.0" max="5.0" step="0.1" value="1.0">
        <label>Smoothing</label>
        <input type="range" id="avatar-smoothing" min="0.1" max="1.0" step="0.1" value="0.3">
        
        <label style="margin-top: 12px;">
          <input type="checkbox" id="avatar-auto-calib" checked> Auto-Calibration
        </label>
        <p class="note">Auto-calibration maps Po to your body position and orientation</p>
        <label>Auto-Calib Rotation Offset</label>
        <input type="range" id="avatar-auto-rot-offset" min="0" max="6.28" step="0.1" value="1.57">
        
        <label style="margin-top: 12px;">Manual Calibration</label>
        <label>Position X</label>
        <input type="range" id="avatar-pos-x" min="-5" max="5" step="0.1" value="0">
        <label>Position Y</label>
        <input type="range" id="avatar-pos-y" min="-5" max="5" step="0.1" value="0">
        <label>Position Z</label>
        <input type="range" id="avatar-pos-z" min="-10" max="2" step="0.1" value="-2">
        <label>Scale Multiplier</label>
        <input type="range" id="avatar-scale-mult" min="0.5" max="3" step="0.1" value="1.0">
        <label>Rotation X</label>
        <input type="range" id="avatar-rot-x" min="-3.14" max="3.14" step="0.1" value="0">
        <label>Rotation Y</label>
        <input type="range" id="avatar-rot-y" min="-3.14" max="3.14" step="0.1" value="0">
        <label>Rotation Z</label>
        <input type="range" id="avatar-rot-z" min="-3.14" max="3.14" step="0.1" value="0">
        
        <button id="avatar-reset-calib" class="clear-btn" style="margin-top: 12px;">Reset Calibration</button>
        
        <p class="note">Requires rigged GLB model in /public/models/avatar-rig.glb</p>
        <p class="note">Pose tracking runs in background when app loads</p>
      </div>
    </div>
  `;
}

function wireDrawControls() {
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const colorPicker = document.getElementById('draw-color-picker');
  const width = document.getElementById('draw-width');
  const modeBtns = document.querySelectorAll('.control-section[data-effect="drawing"] .mode-btn');
  const clearBtn = document.getElementById('draw-clear');
  const inputModeRadios = document.querySelectorAll('input[name="draw-input"]');

  colorSwatches.forEach((swatch) => {
    swatch.addEventListener('click', () => {
      const color = swatch.dataset.color;
      colorPicker.value = color;
      const effect = window.app?.effects?.drawing;
      if (effect?.setColor) effect.setColor(color);
    });
  });

  inputModeRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const effect = window.app?.effects?.drawing;
      if (effect) {
        const useFinger = e.target.value === 'finger';
        effect.setUseFingerTracking(useFinger);
        // Tracking data now comes from window.app.trackingService
        // No need to set trackingEffect anymore
      }
    });
  });

  // Set default to finger tracking mode
  const effect = window.app?.effects?.drawing;
  if (effect) {
    effect.setUseFingerTracking(true);
    // Tracking data now comes from window.app.trackingService
    // No need to set trackingEffect anymore
  }

  colorPicker.addEventListener('input', (e) => {
    const effect = window.app?.effects?.drawing;
    if (effect?.setColor) effect.setColor(e.target.value);
  });

  width.addEventListener('input', (e) => {
    const effect = window.app?.effects?.drawing;
    if (effect?.setWidth) effect.setWidth(parseFloat(e.target.value));
  });

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const effect = window.app?.effects?.drawing;
      if (effect?.setBrushMode) effect.setBrushMode(mode);
    });
  });

  clearBtn.addEventListener('click', () => {
    const effect = window.app?.effects?.drawing;
    if (effect?.clear) effect.clear();
  });
}

function wireGlitchControls() {
  const intensity = document.getElementById('glitch-intensity');

  intensity.addEventListener('input', (e) => {
    const effect = window.app?.effects?.glitch;
    if (effect?.setGlitchIntensity) {
      effect.setGlitchIntensity(parseFloat(e.target.value));
    }
  });
}

function wireMirrorControls() {
  const modeBtns = document.querySelectorAll('.control-section[data-effect="mirror"] .mode-btn');

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const effect = window.app?.effects?.mirror;
      if (effect?.setMirrorMode) effect.setMirrorMode(mode);
    });
  });
}

function wireAsciiControls() {
  const fontSize = document.getElementById('ascii-font-size');
  const colorRadios = document.querySelectorAll('input[name="ascii-color"]');
  const invert = document.getElementById('ascii-invert');

  fontSize.addEventListener('input', (e) => {
    const effect = window.app?.effects?.ascii;
    if (effect?.setFontSize) effect.setFontSize(parseFloat(e.target.value));
  });

  colorRadios.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      const effect = window.app?.effects?.ascii;
      if (effect?.setColorMode) effect.setColorMode(e.target.value);
    });
  });

  invert.addEventListener('change', (e) => {
    const effect = window.app?.effects?.ascii;
    if (effect?.setInvert) effect.setInvert(e.target.checked);
  });
}

function wireEmojiControls() {
  const modeBtns = document.querySelectorAll('.control-section[data-effect="emoji-filter"] .mode-btn');
  const leftEye = document.getElementById('emoji-left-eye');
  const rightEye = document.getElementById('emoji-right-eye');
  const mouth = document.getElementById('emoji-mouth');
  const nose = document.getElementById('emoji-nose');
  const faceEmojiBtns = document.querySelectorAll('.face-emoji-btn');

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const effect = window.app?.effects?.['emoji-filter'];
      if (effect?.setEmojiMode) effect.setEmojiMode(mode);
    });
  });

  const updateEmojiSlot = (slot, value) => {
    const effect = window.app?.effects?.['emoji-filter'];
    if (effect?.setEmojiOverlay) effect.setEmojiOverlay(slot, value);
  };

  leftEye.addEventListener('input', (e) => updateEmojiSlot('leftEye', e.target.value));
  rightEye.addEventListener('input', (e) => updateEmojiSlot('rightEye', e.target.value));
  mouth.addEventListener('input', (e) => updateEmojiSlot('mouth', e.target.value));
  nose.addEventListener('input', (e) => updateEmojiSlot('nose', e.target.value));

  faceEmojiBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      const effect = window.app?.effects?.['emoji-filter'];
      if (effect?.setEmojiOverlay) effect.setEmojiOverlay('face', [emoji]);
    });
  });
}

function wireAvatarRigControls() {
  const scale = document.getElementById('avatar-scale');
  const smoothing = document.getElementById('avatar-smoothing');
  
  // Auto-calibration toggle
  const autoCalib = document.getElementById('avatar-auto-calib');
  
  // Calibration controls
  const posX = document.getElementById('avatar-pos-x');
  const posY = document.getElementById('avatar-pos-y');
  const posZ = document.getElementById('avatar-pos-z');
  const scaleMult = document.getElementById('avatar-scale-mult');
  const rotX = document.getElementById('avatar-rot-x');
  const rotY = document.getElementById('avatar-rot-y');
  const rotZ = document.getElementById('avatar-rot-z');
  const resetBtn = document.getElementById('avatar-reset-calib');

  if (scale) {
    scale.addEventListener('input', (e) => {
      const effect = window.app?.effects?.['avatar-rig'];
      if (effect) {
        // Override automatic scale with manual scale
        effect.currentScale = parseFloat(e.target.value);
        effect.targetScale = parseFloat(e.target.value);
        if (effect.model) {
          effect.model.scale.set(effect.currentScale, effect.currentScale, effect.currentScale);
        }
      }
    });
  }

  if (smoothing) {
    smoothing.addEventListener('input', (e) => {
      const effect = window.app?.effects?.['avatar-rig'];
      if (effect) {
        effect.smoothingFactor = parseFloat(e.target.value);
      }
    });
  }

  // Auto-calibration toggle
  if (autoCalib) {
    autoCalib.addEventListener('change', (e) => {
      const effect = window.app?.effects?.['avatar-rig'];
      if (effect) {
        effect.setAutoCalibration(e.target.checked);
      }
    });
  }

  // Auto-calibration rotation offset slider
  const autoRotOffset = document.getElementById('avatar-auto-rot-offset');
  if (autoRotOffset) {
    autoRotOffset.addEventListener('input', (e) => {
      const effect = window.app?.effects?.['avatar-rig'];
      if (effect) {
        effect.autoCalibRotationOffset = parseFloat(e.target.value);
      }
    });
  }

  // Calibration position controls
  const updatePosition = () => {
    const effect = window.app?.effects?.['avatar-rig'];
    if (effect && posX && posY && posZ) {
      effect.setCalibrationPosition(
        parseFloat(posX.value),
        parseFloat(posY.value),
        parseFloat(posZ.value)
      );
    }
  };

  posX?.addEventListener('input', updatePosition);
  posY?.addEventListener('input', updatePosition);
  posZ?.addEventListener('input', updatePosition);

  // Calibration scale multiplier
  scaleMult?.addEventListener('input', (e) => {
    const effect = window.app?.effects?.['avatar-rig'];
    if (effect) {
      effect.setCalibrationScale(parseFloat(e.target.value));
    }
  });

  // Calibration rotation controls
  const updateRotation = () => {
    const effect = window.app?.effects?.['avatar-rig'];
    if (effect && rotX && rotY && rotZ) {
      effect.setCalibrationRotation(
        parseFloat(rotX.value),
        parseFloat(rotY.value),
        parseFloat(rotZ.value)
      );
    }
  };

  rotX?.addEventListener('input', updateRotation);
  rotY?.addEventListener('input', updateRotation);
  rotZ?.addEventListener('input', updateRotation);

  // Reset calibration button
  resetBtn?.addEventListener('click', () => {
    const effect = window.app?.effects?.['avatar-rig'];
    if (effect) {
      effect.resetCalibration();
      // Reset UI sliders to default values
      if (posX) posX.value = 0;
      if (posY) posY.value = 0;
      if (posZ) posZ.value = -2;
      if (scaleMult) scaleMult.value = 1.0;
      if (rotX) rotX.value = 0;
      if (rotY) rotY.value = 0;
      if (rotZ) rotZ.value = 0;
    }
  });
}

function toggleVirtualCam() {
  const btn = document.getElementById('virtual-cam-btn');
  const statusDot = btn.querySelector('.status-dot');

  if (!virtualCamActive) {
    // Show OBS instructions on first click
    if (!obsInstructionsShown) {
      const overlay = document.getElementById('obs-overlay');
      const instructions = document.getElementById('obs-instructions');
      instructions.textContent = getOBSInstructions();
      overlay.style.display = 'flex';
      obsInstructionsShown = true;
      return;
    }

    const canvas = document.getElementById('output-canvas');
    startVirtualCam(canvas);
    virtualCamActive = true;
    statusDot.classList.add('active');
    showToast('Virtual camera started', 'success');
  } else {
    stopVirtualCam();
    virtualCamActive = false;
    statusDot.classList.remove('active');
    showToast('Virtual camera stopped', 'info');
  }
}

function toggleEffect(effectName) {
  const pill = document.querySelector(`.effect-pill[data-effect="${effectName}"]`);
  const effect = window.app?.effects?.[effectName];

  // Special handling for tracking-markers: only toggles marker visibility
  // Tracking service always runs in background
  if (effectName === 'tracking-markers') {
    if (activeEffects.has(effectName)) {
      effect?.setShowMarkers(false);
      activeEffects.delete(effectName);
      pill.classList.remove('active');
    } else {
      effect?.setShowMarkers(true);
      activeEffects.add(effectName);
      pill.classList.add('active');
    }
    return;
  }

  if (activeEffects.has(effectName)) {
    window.app.disableEffect(effectName);
    activeEffects.delete(effectName);
    pill.classList.remove('active');
  } else {
    window.app.enableEffect(effectName);
    activeEffects.add(effectName);
    pill.classList.add('active');
  }
}

function toggleRecording() {
  const btn = document.getElementById('rec-btn');
  const timer = btn.querySelector('.rec-timer');

  if (!isRecording) {
    const stream = getStream();
    if (!stream) {
      // Start virtual cam first to get stream
      const canvas = document.getElementById('output-canvas');
      startVirtualCam(canvas);
    }
    startRecording(getStream() || startVirtualCam(document.getElementById('output-canvas')));
    btn.classList.add('recording');
    recordingInterval = setInterval(updateRecordingTimer, 1000);
    showToast('Recording started', 'info');
  } else {
    stopRecording();
    btn.classList.remove('recording');
    clearInterval(recordingInterval);
    timer.textContent = '0:00';
  }
}

function updateRecordingTimer() {
  if (!isRecording) return;
  const duration = getDuration();
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const timer = document.querySelector('.rec-timer');
  if (timer) {
    timer.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

function toggleDrawer() {
  const drawer = document.getElementById('side-drawer');
  drawerOpen = !drawerOpen;
  drawer.classList.toggle('open', drawerOpen);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initControls);
