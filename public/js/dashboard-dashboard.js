// Notification handler
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

// Load translation minutes
async function loadTranslationMinutes() {
  try {
    const response = await fetch('/dashboard/api/translation-minutes');
    const data = await response.json();
    const minutes = data.translationMinutes !== undefined ? data.translationMinutes : 'N/A';
    const seconds = data.translationSeconds !== undefined ? data.translationSeconds : '0';
    const dashMin = document.getElementById('dashboard-minutes');
    const dashSec = document.getElementById('dashboard-seconds');
    const planMin = document.getElementById('plan-minutes');
    const planSec = document.getElementById('plan-seconds');
    if (dashMin) dashMin.textContent = minutes;
    if (dashSec) dashSec.textContent = seconds;
    if (planMin) planMin.textContent = minutes;
    if (planSec) planSec.textContent = seconds;
  } catch (error) {
    console.error('Error loading translation minutes:', error);
    showNotification('error', 'Could not load your translation minutes.');
    ['dashboard-minutes', 'plan-minutes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
    ['dashboard-seconds', 'plan-seconds'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }
}

// Load submitted videos
async function loadSubmittedVideos() {
  try {
    const response = await fetch('/dashboard/api/creator-videos-submitted');
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response');
    }
    const data = await response.json();
    const videos = data.videos || [];
    const container = document.getElementById('videos-container');
    const noVideosMsg = document.getElementById('no-videos-message');
    if (!container) return;
    if (videos.length === 0) {
      if (noVideosMsg) noVideosMsg.textContent = 'No videos uploaded. Upload now!';
      container.innerHTML = '<div class="text-gray-500">No videos uploaded. Upload now!</div>';
      return;
    }
    container.innerHTML = '';
    videos.forEach(video => {
      const div = document.createElement('div');
      div.className = 'video-list-item card mb-2 p-3';
      // Format upload date (handle Firestore Timestamp)
      let formattedDate = 'Unknown';
      if (video.uploadDate) {
        let dateObj;
        if (typeof video.uploadDate === 'object' && video.uploadDate.seconds) {
          // Firestore Timestamp object
          dateObj = new Date(video.uploadDate.seconds * 1000);
        } else if (typeof video.uploadDate === 'string' || typeof video.uploadDate === 'number') {
          dateObj = new Date(video.uploadDate);
        } else if (typeof video.uploadDate === 'object' && video.uploadDate._seconds) {
          // Alternate Firestore Timestamp key
          dateObj = new Date(video.uploadDate._seconds * 1000);
        } else {
          dateObj = null;
        }
        if (dateObj && !isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          });
        }
      }
      div.innerHTML = `
        <div class="flex flex-col gap-2 w-full">
          <div class="mb-1">
            <strong>${video.projectName || video.fileName || 'Untitled Video'}</strong>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  } catch (error) {
    const container = document.getElementById('videos-container');
    if (container) container.innerHTML = '<div class="text-red-500">Failed to load videos.</div>';
    console.error('Error loading videos:', error);
  }
}

// Theme logic
function setTheme(dark) {
  const themeIcon = document.getElementById('theme-icon');
  if (dark) {
    document.documentElement.classList.add('dark');
    if (themeIcon) {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  } else {
    document.documentElement.classList.remove('dark');
    if (themeIcon) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  }
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let darkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
  setTheme(darkMode);
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function(e) {
      e.preventDefault();
      darkMode = !document.documentElement.classList.contains('dark');
      setTheme(darkMode);
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  // Load data and theme
  loadTranslationMinutes();
  loadSubmittedVideos();
  initTheme();
});