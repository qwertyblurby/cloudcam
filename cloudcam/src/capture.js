export async function getVideoStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720 },
      audio: false,
    });

    let videoEl = document.getElementById('webcam-source');
    if (!(videoEl instanceof HTMLVideoElement)) {
      videoEl = document.createElement('video');
      videoEl.id = 'webcam-source';
      videoEl.autoplay = true;
      videoEl.playsInline = true;
      videoEl.muted = true;
      videoEl.style.position = 'absolute';
      videoEl.style.width = '1px';
      videoEl.style.height = '1px';
      videoEl.style.opacity = '0';
      videoEl.style.pointerEvents = 'none';
      videoEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(videoEl);
    }

    videoEl.srcObject = stream;
    await videoEl.play();
    return videoEl;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
    ) {
      console.error('Camera permission denied. Please allow camera access in your browser settings.');
    } else {
      console.error('Failed to initialize webcam video stream.', error);
    }
    throw error;
  }
}

export async function getAudioAnalyser() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    return analyser;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
    ) {
      console.error('Microphone permission denied. Please allow microphone access in your browser settings.');
    } else {
      console.error('Failed to initialize microphone analyser.', error);
    }
    throw error;
  }
}
