// ...JS extracted from creator-dashboard.html <script> tag...
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

async function loadTranslationMinutes() {
  try {
    const response = await fetch('/dashboard/api/translation-minutes');
    const data = await response.json();
    const minutes = data.translationMinutes !== undefined ? data.translationMinutes : 'N/A';
    const seconds = data.translationSeconds !== undefined ? data.translationSeconds : '0';
    document.getElementById('dashboard-minutes').textContent = minutes;
    document.getElementById('dashboard-seconds').textContent = seconds;
    document.getElementById('plan-minutes').textContent = minutes;
    document.getElementById('plan-seconds').textContent = seconds;
  } catch (error) {
    console.error('Error loading translation minutes:', error);
    showNotification('error', 'Could not load your translation minutes.');
    ['dashboard-minutes', 'plan-minutes'].forEach(id => {
      document.getElementById(id).textContent = '0';
    });
    ['dashboard-seconds', 'plan-seconds'].forEach(id => {
      document.getElementById(id).textContent = '0';
    });
  }
}

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
        } else {
          formattedDate = 'Unknown'; // fallback to a user-friendly value
        }
      }
      div.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full actions-grid-mobile">
          <div class="flex flex-col gap-2 w-full md:w-auto">
            <div class="mb-1">
              <strong>${video.projectName || video.fileName || 'Untitled Video'}</strong>
            </div>
            ${video.assignedStatus === 'translated' ? `
              <div class="dropdown w-full md:w-auto">
                <button
                  class="btn btn-indigo dropdown-toggle w-full md:w-auto px-8 py-6 text-lg font-semibold"
                  type="button"
                  id="actionsMenu"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Actions
                </button>
                <ul class="dropdown-menu w-full md:w-auto" aria-labelledby="actionsMenu">
                  <li><a class="dropdown-item" href="#">Download Translated Video</a></li>
                  <li><a class="dropdown-item" href="#">Download Audio</a></li>
                  <li><a class="dropdown-item" href="#">Download Transcript</a></li>
                </ul>
              </div>
            ` : ''}
          </div>
          ${video.assignedStatus === 'translated' ? `
            <div class="custom-responsive-btn-grid grid grid-cols-2 lg:grid-cols-4 gap-3 w-full md:w-auto">
              <button class="custom-responsive-btn ai-proofread-btn bg-indigo-600 text-white rounded-lg px-8 py-6 text-lg font-semibold shadow hover:bg-indigo-700 transition w-full">AI Proofread</button>
              <button class="custom-responsive-btn human-proofread-btn bg-indigo-600 text-white rounded-lg px-8 py-6 text-lg font-semibold shadow hover:bg-indigo-700 transition w-full">Hybrid Proofread</button>
              <button class="custom-responsive-btn video-editor-btn bg-indigo-600 text-white rounded-lg px-8 py-6 text-lg font-semibold shadow hover:bg-indigo-700 transition w-full">Edit Transcript</button>
              <button class="invisible lg:visible w-full">&nbsp;</button>
            </div>
          ` : ''}
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
function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    document.getElementById('theme-toggle-nav').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    document.getElementById('theme-toggle-nav').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  }
}
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-toggle-nav').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  } else {
    document.getElementById('theme-toggle-nav').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  }
}
window.onload = function () {
  loadTranslationMinutes();
  loadSubmittedVideos();
  initTheme();
  document.getElementById('theme-toggle-nav').addEventListener('click', toggleTheme);
};
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", function () {
      navMenu.classList.toggle("active");
    });
  }
});
// Sidebar open/close logic
const navbar = document.getElementById('vertical-navbar');
const toggleBtn = document.getElementById('navbar-toggle');
const body = document.body;
let isOpen = false;

function setNavbarState(open) {
  isOpen = open;
  if (open) {
    navbar.classList.add('open');
    navbar.classList.remove('closed');
    body.classList.add('navbar-open');
  } else {
    navbar.classList.remove('open');
    navbar.classList.add('closed');
    body.classList.remove('navbar-open');
  }
}

// Initial state
body.classList.add('with-navbar');
setNavbarState(false);

toggleBtn.addEventListener('click', () => setNavbarState(!isOpen));

// Hover to open when closed
navbar.addEventListener('mouseenter', () => {
  if (!isOpen) setNavbarState(true);
});
navbar.addEventListener('mouseleave', () => {
  if (isOpen) setNavbarState(false);
});

// Dark/Light mode toggle
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
function setTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  } else {
    document.documentElement.classList.remove('dark');
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  }
}
let darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
setTheme(darkMode);
themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  setTheme(darkMode);
});