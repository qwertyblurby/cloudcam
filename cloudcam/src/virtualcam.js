let stream = null;
let isActive = false;

function startVirtualCam(canvas) {
  if (isActive) {
    console.warn('Virtual camera is already active');
    return stream;
  }

  stream = canvas.captureStream(30);
  isActive = true;
  return stream;
}

function stopVirtualCam() {
  if (!stream) return;

  const tracks = stream.getTracks();
  for (const track of tracks) {
    track.stop();
  }

  stream = null;
  isActive = false;
}

function getStream() {
  return stream;
}

function getOBSInstructions() {
  return `1. Download OBS at obsproject.com
2. Add a Browser Source → URL: ${window.location.href}
   Width: 1280, Height: 720, FPS: 30
3. Enable OBS Virtual Camera (Tools menu → Start Virtual Camera)
4. In Discord: Settings → Voice & Video → Camera → select OBS Virtual Camera`;
}

export {
  startVirtualCam,
  stopVirtualCam,
  getStream,
  getOBSInstructions,
  isActive,
};
