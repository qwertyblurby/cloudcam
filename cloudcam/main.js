import { getVideoStream, getAudioAnalyser } from './src/capture.js';
import * as compositor from './src/compositor.js';
import { startRecording, stopRecording, isRecording, setOnComplete, getDuration } from './src/recorder.js';
import { uploadVideo, buildTransformedUrl, TRANSFORMATION_PRESETS, initVideoPlayer, saveToGallery } from './src/cloudinary.js';
import { startVirtualCam, stopVirtualCam, getStream, getOBSInstructions } from './src/virtualcam.js';
import { showToast } from './src/ui/toast.js';
import trackingService from './src/tracking/tracking-service.js';

import drawingEffect from './src/effects/drawing.js';
import glitchEffect from './src/effects/glitch.js';
import mirrorEffect from './src/effects/mirror.js';
import asciiEffect from './src/effects/ascii.js';
import emojiFilterEffect from './src/effects/emoji-filter.js';
import trackingMarkersEffect from './src/effects/tracking-markers.js';
import avatarRigEffect from './src/effects/avatar-rig.js';

const effects = {
  [drawingEffect.name]: drawingEffect,
  [glitchEffect.name]: glitchEffect,
  [mirrorEffect.name]: mirrorEffect,
  [asciiEffect.name]: asciiEffect,
  [emojiFilterEffect.name]: emojiFilterEffect,
  [trackingMarkersEffect.name]: trackingMarkersEffect,
  [avatarRigEffect.name]: avatarRigEffect,
};

function enableEffect(name) {
  const effect = effects[name];
  if (!effect) {
    console.error(`Unknown effect "${name}".`);
    return;
  }
  compositor.enableEffect(name, effect);
}

function disableEffect(name) {
  compositor.disableEffect(name);
}

window.app = {
  compositor,
  effects,
  enableEffect,
  disableEffect,
  startRecording,
  stopRecording,
  isRecording,
  getDuration,
  startVirtualCam,
  stopVirtualCam,
  getStream,
  getOBSInstructions,
  TRANSFORMATION_PRESETS,
  lastFaceDetections: [],
  trackingService,
};

// Recording completion handler
setOnComplete(async ({ blob, duration, sizeBytes }) => {
  showPublishModal(blob, duration);
});

let currentUploadResult = null;
let currentPlayer = null;
let selectedTransformation = 'q_auto,f_auto';

function showPublishModal(blob, duration) {
  const modal = document.getElementById('publish-modal');
  if (!modal) {
    console.error('Publish modal not found in DOM');
    return;
  }

  const videoPreview = document.getElementById('video-preview');
  const titleInput = document.getElementById('video-title');
  const publishBtn = document.getElementById('publish-btn');
  const discardBtn = document.getElementById('discard-btn');
  const progressBar = document.getElementById('upload-progress');
  const progressContainer = document.getElementById('progress-container');
  const successContainer = document.getElementById('success-container');
  const videoPlayerContainer = document.getElementById('video-player-container');
  const transformationButtons = document.getElementById('transformation-buttons');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const saveGalleryBtn = document.getElementById('save-gallery-btn');

  // Reset modal state
  videoPreview.src = URL.createObjectURL(blob);
  titleInput.value = `Session ${new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')}`;
  progressContainer.style.display = 'none';
  successContainer.style.display = 'none';
  videoPlayerContainer.innerHTML = '';
  transformationButtons.innerHTML = '';
  currentUploadResult = null;
  currentPlayer = null;
  selectedTransformation = 'q_auto,f_auto';

  modal.style.display = 'flex';

  publishBtn.onclick = async () => {
    const title = titleInput.value || 'Untitled';
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    publishBtn.disabled = true;
    discardBtn.disabled = true;

    try {
      const result = await uploadVideo(blob, {
        title,
        tags: ['cloudcam'],
        onProgress: (pct) => {
          progressBar.style.width = `${pct}%`;
        },
      });

      currentUploadResult = result;
      progressContainer.style.display = 'none';
      successContainer.style.display = 'block';

      // Initialize video player
      currentPlayer = await initVideoPlayer(
  'video-player-container',
  result.public_id,
  selectedTransformation
);

      // Create transformation preset buttons
      TRANSFORMATION_PRESETS.forEach((preset) => {
        const btn = document.createElement('button');
        btn.textContent = preset.label;
        btn.style.cssText = `
          padding: 8px 16px;
          margin: 4px;
          border: 1px solid #ccc;
          border-radius: 4px;
          background: white;
          cursor: pointer;
        `;
        btn.onclick = () => {
          selectedTransformation = preset.t;
          if (currentPlayer) {
            currentPlayer.source(result.public_id, {
              transformation: [{ raw_transformation: preset.t }],
            });
          }
        };
        transformationButtons.appendChild(btn);
      });

      // Auto-save to gallery
      saveToGallery({
        public_id: result.public_id,
        secure_url: result.secure_url,
        thumbnail_url: result.thumbnail_url,
        title,
        duration: result.duration,
      });

      showToast('Video uploaded successfully!', 'success');
    } catch (error) {
      progressContainer.style.display = 'none';
      showToast(`Upload failed: ${error.message}`, 'error');
      publishBtn.disabled = false;
      discardBtn.disabled = false;
    }
  };

  discardBtn.onclick = () => {
    modal.style.display = 'none';
    URL.revokeObjectURL(videoPreview.src);
  };

  copyLinkBtn.onclick = () => {
    if (!currentUploadResult) return;
    const url = buildTransformedUrl(currentUploadResult.public_id, selectedTransformation);
    navigator.clipboard.writeText(url);
    showToast('Link copied!', 'success');
  };

  saveGalleryBtn.onclick = () => {
    if (!currentUploadResult) return;
    const title = titleInput.value || 'Untitled';
    saveToGallery({
      public_id: currentUploadResult.public_id,
      secure_url: currentUploadResult.secure_url,
      thumbnail_url: currentUploadResult.thumbnail_url,
      title,
      duration: currentUploadResult.duration,
    });
    showToast('Saved to gallery!', 'success');
  };

  const closeModalBtn = document.getElementById('close-modal-btn');
  closeModalBtn.onclick = () => {
    modal.style.display = 'none';
    URL.revokeObjectURL(videoPreview.src);
  };
}

document.addEventListener('DOMContentLoaded', async () => {
  const videoEl = await getVideoStream();

  let audio;
  try {
    audio = await getAudioAnalyser();
  } catch (error) {
    console.error('Audio analyser unavailable. Continuing without audio reactivity.', error);
    audio = undefined;
  }

  compositor.init(videoEl, audio);
  compositor.start();

  // Initialize tracking service (always runs in background)
  try {
    await trackingService.init();
    trackingService.startDetectionLoop(videoEl);
    console.log('[Main] Tracking service started');
  } catch (error) {
    console.error('[Main] Failed to initialize tracking service:', error);
  }

  // Enable tracking-markers effect so it can render markers
  // The TRACKING pill controls marker visibility via showMarkers
  compositor.enableEffect('tracking-markers', trackingMarkersEffect);

  // Connect tracking service to avatar-rig effect
  avatarRigEffect.setTrackingEffect(trackingService);
});
