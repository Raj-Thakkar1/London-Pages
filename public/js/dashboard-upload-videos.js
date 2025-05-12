document.addEventListener("DOMContentLoaded", function () {
  var fileInput = document.getElementById('videoFile');
  var fileNameSpan = document.getElementById('videoFileName');
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

  // Hide upload status/progress bar initially
  if (uploadStatus) {
    uploadStatus.style.display = 'none';
  }
  if (progressFill) {
    progressFill.style.width = '0%';
  }

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
          uploadStatus.style.display = 'none'; // Hide progress bar on error
          progressFill.style.width = '0%';
          window.location.href = '/dashboard/creator-upload-error?message=' + encodeURIComponent(error);
        }
      };

      xhr.onerror = function() {
        showNotification('error', 'Network error occurred during upload.');
        uploadStatus.style.display = 'none'; // Hide progress bar on error
        progressFill.style.width = '0%';
        window.location.href = '/dashboard/creator-upload-error?message=' + encodeURIComponent('Network error occurred');
      };

      xhr.send(formData);
    });
  }

  // Hide progress bar if form is reset or closed
  const closeBtn = document.getElementById('closeUploadModal');
  const cancelBtn = document.getElementById('cancelUploadModal');
  function hideUploadStatus() {
    if (uploadStatus) uploadStatus.style.display = 'none';
    if (progressFill) progressFill.style.width = '0%';
  }
  if (closeBtn) closeBtn.addEventListener('click', hideUploadStatus);
  if (cancelBtn) cancelBtn.addEventListener('click', hideUploadStatus);

  async function loadTranslationMinutes() {
    try {
      const response = await fetch('/dashboard/api/translation-minutes');
      const data = await response.json();
      const el = document.getElementById('translation-minutes');
      const elSec = document.getElementById('translation-seconds');
      if (el) el.textContent = data.translationMinutes ?? '--';
      if (elSec) elSec.textContent = data.translationSeconds ?? '--';
    } catch (error) {
      console.error('Error loading translation minutes:', error);
      const el = document.getElementById('translation-minutes');
      const elSec = document.getElementById('translation-seconds');
      if (el) el.textContent = '0';
      if (elSec) elSec.textContent = '0';
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

  // Initial theme set
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
});
