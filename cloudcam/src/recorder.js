let chunks = [];
let mediaRecorder = null;
let startTime = null;
let isRecording = false;
let onComplete = null;

function setOnComplete(callback) {
  onComplete = callback;
}

function startRecording(stream) {
  if (isRecording) {
    console.warn('Recording is already in progress');
    return;
  }

  chunks = [];

  let mimeType = 'video/webm;codecs=vp9';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  mediaRecorder = new MediaRecorder(stream, { mimeType });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const duration = (Date.now() - startTime) / 1000;

    if (onComplete) {
      onComplete({
        blob,
        duration,
        sizeBytes: blob.size,
      });
    }
  };

  mediaRecorder.start(1000);
  startTime = Date.now();
  isRecording = true;
}

function stopRecording() {
  if (!mediaRecorder || !isRecording) {
    return;
  }

  mediaRecorder.stop();
  isRecording = false;
}

function getDuration() {
  if (!startTime || !isRecording) {
    return 0;
  }
  return (Date.now() - startTime) / 1000;
}

export {
  startRecording,
  stopRecording,
  isRecording,
  setOnComplete,
  getDuration,
};