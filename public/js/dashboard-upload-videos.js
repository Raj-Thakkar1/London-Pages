// ...JS extracted from creator-upload-videos.html <script> tag...
document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById('videoFile');
  const fileNameSpan = document.getElementById('videoFileName');
  if (fileInput && fileNameSpan) {
    fileInput.addEventListener('change', () => {
      fileNameSpan.textContent = fileInput.files.length
        ? fileInput.files[0].name
        : '';
    });
  }

  const languagesLP1o = [
    "English","Spanish","Portuguese","French","German","Japanese","Russian",
    "Korean","Indonesian","Italian","Dutch","Turkish","Polish","Swedish",
    "Malay","Romanian","Ukrainian","Hindi","Arabic","Filipino","Tamil",
    "Croatian","Bulgarian","Czech","Greek","Slovak","Danish","Finnish","Chinese"
  ];
  const languagesLP2o = [
    "English","Spanish","Portuguese","French","German","Japanese","Russian",
    "Korean","Indonesian","Italian","Dutch","Turkish","Polish","Swedish",
    "Malay","Romanian","Ukrainian"
  ];

  function populateLanguages(list, selectEl) {
    selectEl.innerHTML = `<option value="">Select ${selectEl === sourceLanguage ? 'Source' : 'Target'} Language</option>`;
    list.forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = lang;
      selectEl.appendChild(opt);
    });
  }

  const modelSelect = document.getElementById('modelSelect');
  const sourceLanguage = document.getElementById('sourceLanguage');
  const targetLanguage = document.getElementById('targetLanguage');

  if (modelSelect && sourceLanguage && targetLanguage) {
    modelSelect.addEventListener('change', () => {
      if (modelSelect.value === 'LP 1o') {
        populateLanguages(languagesLP1o, sourceLanguage);
        populateLanguages(languagesLP1o, targetLanguage);
      } else if (modelSelect.value === 'LP 2o') {
        populateLanguages(languagesLP2o, sourceLanguage);
        populateLanguages(languagesLP2o, targetLanguage);
      } else {
        sourceLanguage.innerHTML = `<option value="">Select Source Language</option>`;
        targetLanguage.innerHTML = `<option value="">Select Target Language</option>`;
      }
    });
  }

  const uploadForm = document.getElementById('uploadForm');
  const uploadStatus = document.getElementById('uploadStatus');
  const progressFill = document.querySelector('.progress-bar-fill');

  // Helper to get cookie value by name
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return '';
  }

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

  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      uploadStatus.style.display = 'block';
      progressFill.style.width = '0%';

      const formData = new FormData(uploadForm);
      const xhr = new XMLHttpRequest();

      xhr.open('POST', uploadForm.action, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Accept', 'application/json'); // Tell backend we want JSON

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          progressFill.style.width = percentComplete + '%';
          if (event.total > 1024 * 1024 * 1024) {
            const gbLoaded = (event.loaded / (1024 * 1024 * 1024)).toFixed(2);
            const gbTotal = (event.total / (1024 * 1024 * 1024)).toFixed(2);
            uploadStatus.querySelector('span').textContent = 
              `Uploading large file: ${gbLoaded}GB / ${gbTotal}GB uploaded...`;
          }
        }
      };

      xhr.onload = function() {
        let response = {};
        try {
          response = JSON.parse(xhr.responseText);
        } catch (e) {
          // If not JSON, fallback to old behavior
          response = {};
        }
        if (xhr.status === 200 && response.success) {
          window.location.href = '/dashboard/creator-upload-successful';
        } else {
          const error = response.message || xhr.responseText || 'Upload failed';
          showNotification('error', 'Upload failed: ' + error);
          window.location.href = '/dashboard/creator-upload-error?message=' + encodeURIComponent(error);
        }
      };

      xhr.onerror = function() {
        showNotification('error', 'Network error occurred during upload.');
        window.location.href = '/dashboard/creator-upload-error?message=' + encodeURIComponent('Network error occurred');
      };

      xhr.send(formData);
    });
  }

  async function loadTranslationMinutes() {
    try {
      const response = await fetch('/dashboard/api/translation-minutes');
      const data = await response.json();
      document.getElementById('translation-minutes').textContent =
        data.translationMinutes ?? '--';
      document.getElementById('translation-seconds').textContent =
        data.translationSeconds ?? '--';
    } catch (error) {
      console.error('Error loading translation minutes:', error);
      showNotification('error', 'Could not load your translation minutes.');
      document.getElementById('translation-minutes').textContent = '0';
      document.getElementById('translation-seconds').textContent = '0';
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
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  loadTranslationMinutes();
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
      hamburger.classList.toggle("open");
      // Update aria-expanded for accessibility
      const expanded = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', !expanded);
    });
    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove("active");
        hamburger.classList.remove("open");
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
    // Optional: Close menu when a nav link is clicked
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove("active");
        hamburger.classList.remove("open");
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });
    // Set initial aria attributes
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Toggle navigation menu');
  }
});
