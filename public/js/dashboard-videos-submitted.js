const demoVideos = [
  {
    id: "video1",
    name: "Introduction to Artificial Intelligence.mp4",
    publicUrl: "#video1",
    status: "processing",
    createdTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: "video2",
    name: "Machine Learning Fundamentals.mp4",
    publicUrl: "#video2",
    status: "queued",
    createdTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
  },
  {
    id: "video3",
    name: "Deep Learning Tutorial.mp4",
    publicUrl: "#video3",
    status: "queued",
    createdTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString() // 8 hours ago (not deletable)
  }
];

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

async function loadSubmittedVideos() {
  try {
    const response = await fetch('/dashboard/api/creator-videos-submitted');
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      displayVideos(data.files);
      updateStatusCounts(data.files);
    } else {
      displayVideos(demoVideos);
      updateStatusCounts(demoVideos);
    }
  } catch (error) {
    console.error('Error loading videos:', error);
    showNotification('error', 'Could not load your submitted videos. Please check your connection or try again later.');
    displayVideos(demoVideos);
    updateStatusCounts(demoVideos);
  }
}

function displayVideos(videos) {
  const container = document.getElementById('video-list');
  const noVideos = document.getElementById('no-videos');
  container.innerHTML = '';
  if (videos && videos.length > 0) {
    videos.forEach(video => {
      const videoItem = createVideoItem(video);
      container.appendChild(videoItem);
    });
    container.style.display = 'block';
    noVideos.style.display = 'none';
  } else {
    container.style.display = 'none';
    noVideos.style.display = 'block';
  }
}

function createVideoItem(video) {
  const div = document.createElement('div');
  div.className = 'video-item';
  const createdTime = new Date(video.createdTime);
  const currentTime = new Date();
  const diffMs = currentTime - createdTime;
  const sixHoursMs = 6 * 60 * 60 * 1000;
  const isDeletable = diffMs < sixHoursMs;
  const formattedDate = createdTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const simpleVideoName = video.name.trim();
  const truncatedVideoName = simpleVideoName.length > 10
    ? simpleVideoName.substring(0, 10) + '...'
    : simpleVideoName;
  div.innerHTML = `
    <div class="overflow-hidden text-ellipsis">
      <div class="video-item-info">
        <div class="video-item-title text-sm md:text-base font-medium break-words dark:text-white">
          <h3>${truncatedVideoName}</h3>
        </div>
        <div class="video-item-meta text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          <span><i class="far fa-clock mr-1"></i> ${formattedDate}</span>
        </div>
        <div class="video-item-actions flex flex-wrap gap-2 mt-2">
          <!-- View button removed -->
          ${isDeletable ?
          `<button class="button btn-xs md:btn-sm btn-danger px-2 py-1 text-xs md:text-sm flex items-center justify-center min-w-0 delete-video-btn" data-video-id="${video.id}">
              <i class="fas fa-trash-alt mr-1"></i> Delete
            </button>` :
          `<button class="button btn-xs md:btn-sm btn-outline px-2 py-1 text-xs md:text-sm flex items-center justify-center min-w-0" disabled title="Videos can only be deleted within 6 hours of uploading">
              <i class="fas fa-trash-alt mr-1"></i> Delete
            </button>`
        }
        </div>
      </div>
    </div>
  `;
  // Attach event listener for delete
  setTimeout(() => {
    const deleteBtn = div.querySelector('.delete-video-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', function() {
        deleteVideo(video.id);
      });
    }
  }, 0);
  return div;
}

function updateStatusCounts(videos) {
  const queueCount = videos[0].inQueueNumberOfFiles;
  const processingCount = videos[0].inQueueNumberOfFiles - videos[0].completedNumberOfFiles;
  const completedCount = videos[0].completedNumberOfFiles;
  document.getElementById('queue-count').textContent = queueCount;
  document.getElementById('processing-count').textContent = processingCount;
  document.getElementById('completed-count').textContent = completedCount;
}

// Helper to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

async function deleteVideo(videoId) {
  if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) return;
  try {
    const csrfToken = getCookie('x-csrf-token');
    const response = await fetch(`/dashboard/delete-video?fileId=${videoId}`, {
      method: 'DELETE',
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined
    });
    if (response.ok) {
      alert('Video deleted successfully.');
      loadSubmittedVideos();
    } else {
      const errText = await response.text();
      alert('Error deleting video: ' + errText);
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    alert('Error deleting video. Please try again later.');
    const videos = demoVideos.filter(v => v.id !== videoId);
    displayVideos(videos);
    updateStatusCounts(videos);
  }
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
document.getElementById('refresh-videos').addEventListener('click', loadSubmittedVideos);
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
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
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  } else {
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  }
}
window.onload = function () {
  initTheme();
  loadSubmittedVideos();
  loadTranslationMinutes();
};
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  hamburger.addEventListener("click", function () {
    navMenu.classList.toggle("active");
  });
});