import { getGallery, buildTransformedUrl, TRANSFORMATION_PRESETS } from './cloudinary.js';
import { showToast } from './ui/toast.js';

const quickTransforms = [
  { label: 'Aurora', t: 'e_art:aurora,q_auto' },
  { label: 'Zorro', t: 'e_art:zorro,q_auto' },
  { label: 'Cartoon', t: 'e_cartoonify,q_auto' },
  { label: 'Original', t: 'q_auto,f_auto' },
];

function renderGallery() {
  const gallery = getGallery();
  const grid = document.getElementById('gallery-grid');
  const countBadge = document.getElementById('clip-count');
  
  countBadge.textContent = `${gallery.length} clip${gallery.length !== 1 ? 's' : ''} published`;

  if (gallery.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
        <p style="font-size: 18px; margin-bottom: 20px;">No clips yet — go record something</p>
        <a href="index.html" style="color: #3b82f6; text-decoration: none; font-size: 16px;">Back to studio →</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  gallery.forEach((clip, index) => {
    const card = document.createElement('div');
    card.className = 'clip-card';
    card.innerHTML = `
      <div class="clip-thumbnail">
        <video src="${clip.secure_url}" class="preview-video" muted loop playsinline autoplay></video>
        <div class="duration-badge">${formatDuration(clip.duration)}</div>
        <button class="play-preview-btn" title="Open video" data-url="${clip.secure_url}">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      </div>
      <div class="clip-info">
        <h3 class="clip-title">${clip.title}</h3>
        <div class="transform-buttons">
          ${quickTransforms.map((t) => `
            <button class="transform-btn" data-transformation="${t.t}" data-public-id="${clip.public_id}">${t.label}</button>
          `).join('')}
        </div>
        <div class="clip-actions">
          <button class="action-btn copy-btn" data-url="${clip.secure_url}" title="Copy link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="action-btn delete-btn" data-index="${index}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Play button click to open video in new tab
    const playBtn = card.querySelector('.play-preview-btn');
    const video = card.querySelector('.preview-video');
    
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = playBtn.dataset.url;
      window.open(url, '_blank');
    });

    // Transformation buttons
    card.querySelectorAll('.transform-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const transformation = btn.dataset.transformation;
        const publicId = btn.dataset.publicId;
        const url = buildTransformedUrl(publicId, transformation);
        video.src = url;
        video.play();
      });
    });

    // Copy link button
    card.querySelector('.copy-btn').addEventListener('click', () => {
      const url = card.querySelector('.copy-btn').dataset.url;
      navigator.clipboard.writeText(url);
      showToast('Link copied!', 'success');
    });

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', () => {
      const indexToDelete = parseInt(card.querySelector('.delete-btn').dataset.index);
      deleteClip(indexToDelete);
    });

    grid.appendChild(card);
  });
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function deleteClip(index) {
  const gallery = getGallery();
  gallery.splice(index, 1);
  localStorage.setItem('vcam_gallery', JSON.stringify(gallery));
  renderGallery();
  showToast('Clip deleted', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
  renderGallery();
});
