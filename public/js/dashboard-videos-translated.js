// ...JS extracted from creator-videos-translated.html <script> tag...
const demoVideos = [
  {
    id: "video1",
    name: "Introduction to Artificial Intelligence (Spanish).mp4",
    publicUrl: "#video1",
    language: "es",
    createdDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    freeEditRequested: false,
    audioUrl: "#audio1"
  },
  {
    id: "video2",
    name: "Machine Learning Fundamentals (French).mp4",
    publicUrl: "#video2",
    language: "fr",
    createdDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    freeEditRequested: true,
    audioUrl: "#audio2"
  },
  {
    id: "video3",
    name: "Deep Learning Tutorial (German).mp4",
    publicUrl: "#video3",
    language: "de",
    createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    freeEditRequested: false,
    audioUrl: "#audio3"
  }
];

const demoFreeEditStatus = {
  "video1": false,
  "video2": true,
  "video3": false
};

function showNotification(type, message) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}"></i>
    </div>
    <div class="notification-message">${message}</div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

async function loadTranslatedVideos() {
  try {
    const response = await fetch('/dashboard/api/translated-videos');
    const data = await response.json();
    const freeEditResponse = await fetch('/dashboard/api/free-edit-status');
    const freeEditData = await freeEditResponse.json();
    if (data.files && data.files.length > 0) {
      displayVideos(data.files, freeEditData.freeEditStatus || {});
    } else {
      displayVideos(demoVideos, demoFreeEditStatus);
    }
  } catch (error) {
    console.error('Error loading videos:', error);
    showNotification('error', 'Could not load your translated videos. Please check your connection or try again later.');
    displayVideos(demoVideos, demoFreeEditStatus);
  }
}

function displayVideos(videos, freeEditStatus) {
  const container = document.getElementById('video-list');
  const noVideos = document.getElementById('no-videos');
  container.innerHTML = '';
  if (videos && videos.length > 0) {
    videos.forEach(video => {
      const videoItem = createVideoItem(video, freeEditStatus[video.id] || false);
      container.appendChild(videoItem);
    });
    container.style.display = 'block';
    noVideos.style.display = 'none';
  } else {
    container.style.display = 'none';
    noVideos.style.display = 'block';
  }
}

function createVideoItem(video, freeEditRequested) {
  const div = document.createElement('div');
  div.className = 'video-item p-3 border-b dark:border-gray-700';
  const simpleName = video.name.replace(/\([^)]*\)/g, '').replace(/\.[^/.]+$/, '').trim();
  const truncatedName = simpleName.length > 10 ? simpleName.substring(0, 10) + '...' : simpleName;
  const spinnerId = `download-spinner-${video.id}`;
  div.innerHTML = `
    <div class="overflow-hidden text-ellipsis">
      <div class="video-item-info">
        <div class="video-item-title text-sm md:text-base font-medium break-words dark:text-white">
          <h3>${truncatedName}</h3>
        </div>
        <div class="video-item-meta text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          <div class="video-item-actions flex flex-wrap flex-col md:flex-row gap-1 md:gap-4">
            <a href="${video.publicUrl}" target="_blank" class="button btn-xs md:btn-sm btn-outline px-2 py-1 text-xs md:text-sm w-full md:w-auto flex items-center justify-center min-w-0">
              <i class="fas fa-download"></i>
            </a>
            <button class="button btn-xs md:btn-sm btn-outline px-2 py-1 text-xs md:text-sm w-full md:w-auto flex items-center justify-center min-w-0 download-audio-btn" data-video-id="${video.id}">
              <i class="fas fa-volume-up"></i>
            </button>
            <div id="${spinnerId}" class="spinner w-6 h-6 md:w-9 md:h-9 place-self-center"></div>
            ${
              freeEditRequested
                ? `<button disabled class="button btn-xs md:btn-sm btn-secondary request-btn px-2 py-1 text-xs md:text-sm w-full md:w-auto flex items-center justify-center min-w-0">
                     <i class="fas fa-check mr-1"></i> Edit Requested
                   </button>`
                : `<button class="button btn-xs md:btn-sm btn-success request-btn px-2 py-1 text-xs md:text-sm w-full md:w-auto flex items-center justify-center min-w-0 request-edit-btn" data-video-id="${video.id}">
                     <i class="fas fa-edit mr-1"></i> Request Edit
                   </button>`
            }
          </div>
        </div>
      </div>
    </div>
  `;
  // Attach event listeners for download and request edit
  setTimeout(() => {
    const downloadBtn = div.querySelector('.download-audio-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', function() {
        downloadAudio(video.id);
      });
    }
    const requestEditBtn = div.querySelector('.request-edit-btn');
    if (requestEditBtn) {
      requestEditBtn.addEventListener('click', function() {
        requestFreeEdit(video.id);
      });
    }
  }, 0);
  return div;
}

// Helper to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

async function requestFreeEdit(videoId) {
  if (!confirm('Are you sure you want to request a free edit for this video?')) return;
  try {
    const csrfToken = getCookie('x-csrf-token');
    const response = await fetch(`/dashboard/request-edit?videoId=${videoId}`, {
      method: 'POST',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined
    });
    if (response.ok) {
      showNotification('success', 'Edit requested successfully. Our team will make the adjustments within 48 hours.');
      loadTranslatedVideos();
    } else {
      const errText = await response.text();
      showNotification('error', 'Error requesting edit: ' + errText);
    }
  } catch (error) {
    console.error('Error requesting edit:', error);
    showNotification('error', 'Error requesting edit. Please try again later.');
    demoFreeEditStatus[videoId] = true;
    displayVideos(demoVideos, demoFreeEditStatus);
  }
}

function filterVideos() {
  const filter = document.getElementById('language-filter').value;
  const videoItems = document.querySelectorAll('.video-item');
  videoItems.forEach(item => {
    const meta = item.querySelector('.video-item-meta').textContent.toLowerCase();
    if (filter === 'all') {
      item.style.display = 'block';
    } else if ((filter === 'en' && meta.includes('english')) ||
      (filter === 'es' && meta.includes('spanish')) ||
      (filter === 'fr' && meta.includes('french')) ||
      (filter === 'other' && !meta.includes('english') && !meta.includes('spanish') && !meta.includes('french'))) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  }
}
document.getElementById('refresh-videos').addEventListener('click', loadTranslatedVideos);
async function loadTranslationMinutes() {
  try {
    const response = await fetch('/dashboard/api/translation-minutes');
    const data = await response.json();
    document.getElementById('translation-minutes').textContent = 
      data.translationMinutes !== undefined ? data.translationMinutes : '--';
    document.getElementById('translation-seconds').textContent = 
      data.translationSeconds !== undefined ? data.translationSeconds : '--';
  } catch (error) {
    console.error('Error loading translation minutes:', error);
    showNotification('error', 'Could not load your translation minutes.');
    document.getElementById('translation-minutes').textContent = '0';
    document.getElementById('translation-seconds').textContent = '0';
  }
}
loadTranslationMinutes();
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  }
}
window.onload = function () {
  initTheme();
  loadTranslatedVideos();
  loadTranslationMinutes();
};
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  hamburger.addEventListener("click", function () {
    navMenu.classList.toggle("active");
  });
});
async function downloadAudio(videoId) {
  const spinner = document.getElementById(`download-spinner-${videoId}`);
  spinner.style.display = 'block';
  const url = `/dashboard/download-audio?fileId=${videoId}`;
  try {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error('Network response was not ok or streaming not supported');
    }
    let loaded = 0;
    const reader = response.body.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      console.log(`Loaded ${loaded} bytes (total unknown)`);
    }
    const blob = new Blob(chunks, { type: 'audio/mpeg' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${videoId}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (error) {
    console.error('Download failed:', error);
    showNotification('error', 'Error downloading audio. Please try again later.');
  } finally {
    spinner.style.display = 'none';
  }
}
