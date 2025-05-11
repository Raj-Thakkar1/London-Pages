// Demo data for transcripts (if needed)
const demoTranscripts = [];

// Helper to get cookie value by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return '';
}

function createTranscriptItem(transcript) {
  const simpleTranscriptName = transcript.name.replace(/_/g, ' ').replace('.txt', '').trim();
  const truncatedTranscriptName = simpleTranscriptName.length > 10
    ? simpleTranscriptName.substring(0, 10) + '...'
    : simpleTranscriptName;
  const div = document.createElement('div');
  div.className = 'transcript-item';
  div.setAttribute('data-id', transcript.id);
  div.setAttribute('data-content', transcript.content || '');
  div.setAttribute('data-filename', transcript.name);
  div.innerHTML = `
    <div class="overflow-hidden text-ellipsis">
      <div class="video-item-info">
        <div class="video-item-title text-sm md:text-base font-medium break-words dark:text-white">
          <h3>${truncatedTranscriptName}</h3>
        </div>
        <div class="video-item-meta text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          <div class="video-item-actions flex flex-wrap flex-col md:flex-row gap-1 md:gap-4">
            <a href="${transcript.publicUrl}" download="${transcript.name}" class="button btn-xs md:btn-sm btn-outline px-2 py-1 text-xs md:text-sm w-full md:w-auto flex items-center justify-center min-w-0">
              <i class="fas fa-download"></i> Download
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  return div;
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

async function loadTranscripts() {
  try {
    const response = await fetch('/dashboard/api/creator-transcripts');
    const data = await response.json();
    if (data.files && data.files.length > 0) {
      displayTranscripts(data.files);
    } else {
      displayTranscripts(demoTranscripts);
    }
  } catch (error) {
    console.error('Error loading transcripts:', error);
    showNotification('error', 'Could not load your transcripts. Please check your connection or try again later.');
    displayTranscripts(demoTranscripts);
  }
}

function displayTranscripts(transcripts) {
  const container = document.getElementById('transcripts-list');
  const noTranscripts = document.getElementById('no-transcripts');
  container.innerHTML = '';
  if (transcripts && transcripts.length > 0) {
    transcripts.forEach(transcript => {
      const transcriptItem = createTranscriptItem(transcript);
      container.appendChild(transcriptItem);
    });
    container.style.display = 'block';
    noTranscripts.style.display = 'none';
  } else {
    container.style.display = 'none';
    noTranscripts.style.display = 'block';
  }
}

document.getElementById('refresh-transcripts').addEventListener('click', loadTranscripts);
document.addEventListener('click', function (e) {
  if (e.target.closest('.view-transcript')) {
    const btn = e.target.closest('.view-transcript');
    const id = btn.getAttribute('data-id');
    viewTranscript(id);
  }
});
document.getElementById('search-btn').addEventListener('click', function () {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();
  const transcriptItems = document.querySelectorAll('.transcript-item');
  transcriptItems.forEach(item => {
    const title = item.querySelector('.video-item-title').textContent.toLowerCase();
    if (title.includes(searchTerm) || searchTerm === '') {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
});
document.getElementById('search-input').addEventListener('keyup', function (e) {
  if (e.key === 'Enter') {
    document.getElementById('search-btn').click();
  }
});
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
window.onload = function () {
  loadTranscripts();
  loadTranslationMinutes();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
};
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  hamburger.addEventListener("click", function () {
    navMenu.classList.toggle("active");
  });
});

// If you add POST/PUT/DELETE requests in the future, use the CSRF token like this:
// const csrfToken = getCookie('x-csrf-token');
// fetch(url, { method: 'POST', headers: { 'x-csrf-token': csrfToken } })