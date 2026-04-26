const CLOUD_NAME = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME || window.__ENV__?.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET || window.__ENV__?.CLOUDINARY_UPLOAD_PRESET;

const CHUNK_SIZE = 6 * 1024 * 1024; // 6MB chunks
const SMALL_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB

const TRANSFORMATION_PRESETS = [
  { label: 'Original', t: 'q_auto,f_auto' },
  { label: 'Aurora', t: 'e_art:aurora,q_auto' },
  { label: 'Zorro', t: 'e_art:zorro,q_auto' },
  { label: 'Cartoon', t: 'e_cartoonify,q_auto' },
  { label: 'Neon glow', t: 'e_viesus_correct,e_vibrance:80,q_auto' },
  { label: 'B&W grain', t: 'e_grayscale,e_noise:20,q_auto' },
  { label: 'Glitch art', t: 'e_pixelate:3,e_viesus_correct,q_auto' },
];

async function uploadVideo(blob, options = {}) {
  const { title = '', tags = [], onProgress } = options;

  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary CLOUD_NAME and UPLOAD_PRESET must be configured');
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
  const fileSize = blob.size;

  if (fileSize < SMALL_FILE_THRESHOLD) {
    return await simpleUpload(endpoint, blob, title, tags, onProgress);
  } else {
    return await chunkedUpload(endpoint, blob, title, tags, onProgress);
  }
}

async function simpleUpload(endpoint, blob, title, tags, onProgress) {
  const formData = new FormData();
  formData.append('file', blob);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('resource_type', 'video');
  
  if (tags.length > 0) {
    formData.append('tags', tags.join(','));
  }
  
  if (title) {
    formData.append('context', `title=${encodeURIComponent(title)}`);
  }

  if (onProgress) onProgress(50);

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }

  if (onProgress) onProgress(100);

  const data = await response.json();
  return formatUploadResponse(data);
}

async function chunkedUpload(endpoint, blob, title, tags, onProgress) {
  const uploadId = generateUploadId();
  const fileSize = blob.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  let uploadedBytes = 0;

  const formData = new FormData();
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('resource_type', 'video');
  formData.append('file', blob);
  formData.append('public_id', uploadId);
  
  if (tags.length > 0) {
    formData.append('tags', tags.join(','));
  }
  
  if (title) {
    formData.append('context', `title=${encodeURIComponent(title)}`);
  }

  // For chunked upload, we use X-Unique-Upload-Id header
  const headers = {
    'X-Unique-Upload-Id': uploadId,
  };

  let currentByte = 0;
  let chunkIndex = 0;

  while (currentByte < fileSize) {
    const endByte = Math.min(currentByte + CHUNK_SIZE, fileSize);
    const chunk = blob.slice(currentByte, endByte);

    const chunkFormData = new FormData();
    chunkFormData.append('file', chunk);
    chunkFormData.append('upload_preset', UPLOAD_PRESET);
    chunkFormData.append('resource_type', 'video');
    chunkFormData.append('public_id', uploadId);
    chunkFormData.append('chunk', chunkIndex);
    chunkFormData.append('total_chunks', totalChunks);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: chunkFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `Chunk ${chunkIndex} upload failed`);
    }

    uploadedBytes += chunk.size;
    currentByte = endByte;
    chunkIndex++;

    const progress = Math.min(100, (uploadedBytes / fileSize) * 100);
    if (onProgress) onProgress(progress);
  }

  // Finalize upload
  const finalizeFormData = new FormData();
  finalizeFormData.append('upload_preset', UPLOAD_PRESET);
  finalizeFormData.append('resource_type', 'video');
  finalizeFormData.append('public_id', uploadId);
  finalizeFormData.append('finalize', 'true');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: finalizeFormData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload finalization failed');
  }

  if (onProgress) onProgress(100);

  const data = await response.json();
  return formatUploadResponse(data);
}

function formatUploadResponse(data) {
  return {
    public_id: data.public_id,
    secure_url: data.secure_url,
    duration: data.duration,
    format: data.format,
    thumbnail_url: buildThumbnailUrl(data.public_id),
    player_url: buildPlayerUrl(data.public_id),
  };
}

function buildThumbnailUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_auto,w_640,h_360,c_fill/${publicId}`;
}

function buildPlayerUrl(publicId) {
  return `https://player.cloudinary.com/embed/?public_id=${publicId}&cloud_name=${CLOUD_NAME}`;
}

function buildTransformedUrl(publicId, transformation) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/${transformation}/${publicId}`;
}

function generateUploadId() {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

let playerLoaded = false;

async function initVideoPlayer(containerId, publicId, transformation = 'q_auto,f_auto') {
  if (!CLOUD_NAME) {
    throw new Error('Cloudinary CLOUD_NAME must be configured');
  }

  if (!playerLoaded) {
    await loadScript('https://unpkg.com/cloudinary-video-player@1.9.0/dist/cld-video-player.min.js');
    await loadStylesheet('https://unpkg.com/cloudinary-video-player@1.9.0/dist/cld-video-player.min.css');
    playerLoaded = true;
  }

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container not found: ${containerId}`);
  }

  container.innerHTML = '';

  const video = document.createElement('video');
  video.id = `${containerId}-video`;
  video.className = 'cld-video-player cld-fluid';
  video.controls = true;
  container.appendChild(video);

  const cld = cloudinary.Cloudinary.new({ cloud_name: CLOUD_NAME });
  const player = cld.videoPlayer(video.id, {
    fluid: true,
    controls: true,
  });

  player.source(publicId, {
    transformation: [{ raw_transformation: transformation }],
  });

  return player;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

function saveToGallery(record) {
  const gallery = getGallery();
  record.uploadedAt = record.uploadedAt || Date.now();
  gallery.push(record);

  // Keep max 50 items, evict oldest
  if (gallery.length > 50) {
    gallery.sort((a, b) => a.uploadedAt - b.uploadedAt);
    gallery.shift();
  }

  localStorage.setItem('vcam_gallery', JSON.stringify(gallery));
  return gallery;
}

function getGallery() {
  try {
    const stored = localStorage.getItem('vcam_gallery');
    if (!stored) return [];
    const gallery = JSON.parse(stored);
    // Sort by uploadedAt desc
    return gallery.sort((a, b) => b.uploadedAt - a.uploadedAt);
  } catch (error) {
    console.error('Failed to read gallery from localStorage:', error);
    return [];
  }
}

export {
  uploadVideo,
  buildThumbnailUrl,
  buildTransformedUrl,
  TRANSFORMATION_PRESETS,
  initVideoPlayer,
  saveToGallery,
  getGallery,
};
