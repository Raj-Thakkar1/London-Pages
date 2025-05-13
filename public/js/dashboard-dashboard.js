// Notification handler
function showNotification(type, message) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`; // Ensure you have CSS for .notification, .success, .info, .error, .show
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}"></i>
    </div>
    <div class="notification-message">${message}</div>
  `;
  document.body.appendChild(notification);
  // Trigger reflow to ensure transition is applied
  notification.getBoundingClientRect(); 
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 300); // Wait for fade out transition
  }, 5000);
}

// Load translation minutes
async function loadTranslationMinutes() {
  try {
    const response = await fetch('/dashboard/api/translation-minutes');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const minutes = data.translationMinutes !== undefined ? data.translationMinutes : 'N/A';
    const seconds = data.translationSeconds !== undefined ? data.translationSeconds : '0';
    
    ['dashboard-minutes', 'plan-minutes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = minutes;
    });
    ['dashboard-seconds', 'plan-seconds'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = seconds;
    });
  } catch (error) {
    console.error('Error loading translation minutes:', error);
    showNotification('error', 'Could not load your translation minutes.');
    ['dashboard-minutes', 'plan-minutes', 'dashboard-seconds', 'plan-seconds'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }
}

// Load submitted videos
async function loadSubmittedVideos() {
  try {
    const response = await fetch('/dashboard/api/creator-videos-submitted');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('Received non-JSON response type:', contentType);
      const textResponse = await response.text();
      console.warn('Non-JSON response text:', textResponse);
      throw new Error('Invalid response content type, expected JSON.');
    }
    
    const data = await response.json();
    const videos = data.videos || [];
    const container = document.getElementById('videos-container');
    const noVideosMsg = document.getElementById('no-videos-message');

    if (!container) {
      console.error("Error: 'videos-container' element not found in the DOM.");
      return;
    }

    if (videos.length === 0) {
      const message = 'No videos uploaded. Upload now!';
      if (noVideosMsg) noVideosMsg.textContent = message;
      container.innerHTML = `<div class="text-gray-500">${message}</div>`;
      return;
    }

    container.innerHTML = ''; // Clear previous videos

    videos.forEach((video) => {
      const div = document.createElement('div');
      div.className = 'video-list-item card mb-2 p-3'; // Assuming 'card' provides base styling
      const videoTitle = video.projectName || video.fileName || 'Untitled Video';
      
      div.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full actions-grid-mobile items-center">
          <div class="flex flex-col gap-2 w-full md:w-auto">
            <div class="mb-1">
              <strong>${videoTitle}</strong>
            </div>
            ${video.assignedStatus === 'translated' ? `
              <div class="dropdown w-full md:w-auto relative">
                <button class="btn-actions" type="button" data-toggle="dropdown" aria-expanded="false">
                  Actions <i class="fas fa-chevron-down"></i>
                </button>
                <div class="dropdown-menu" role="menu">
                  <a class="dropdown-item" href="#" data-action="download-video" data-video-id="${video.id}">
                    <i class="fas fa-download mr-2"></i>Download Translated Video
                  </a>
                  <a class="dropdown-item" href="#" data-action="download-audio" data-video-id="${video.id}">
                    <i class="fas fa-volume-up mr-2"></i>Download Audio
                  </a>
                  <a class="dropdown-item" href="#" data-action="download-transcript" data-video-id="${video.id}">
                    <i class="fas fa-file-alt mr-2"></i>Download Transcript
                  </a>
                </div>
              </div>
            ` : `
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Status: ${video.assignedStatus || 'Processing'}
              </div>
            `}
          </div>

          ${video.assignedStatus === 'translated' ? `
            <div class="custom-responsive-btn-grid grid grid-cols-2 lg:grid-cols-3 gap-3 w-full md:w-auto md:justify-self-end">
              <button class="custom-responsive-btn ai-proofread-btn bg-indigo-600 text-white rounded-lg px-4 py-2 text-base font-semibold shadow hover:bg-indigo-700 transition w-full" data-video-id="${video.id}">
                AI Proofread
              </button>` : ''}
          ${video.assignedStatus === 'translated' ? `
            <button class="custom-responsive-btn human-proofread-btn bg-indigo-600 text-white rounded-lg px-4 py-2 text-base font-semibold shadow hover:bg-indigo-700 transition w-full" data-video-id="${video.id}"${video.hybridRequested ? ' disabled' : ''}>
                Hybrid Proofread
              </button>` : ''}
          ${video.assignedStatus === 'translated' ? `
              <button class="custom-responsive-btn video-editor-btn bg-indigo-600 text-white rounded-lg px-4 py-2 text-base font-semibold shadow hover:bg-indigo-700 transition w-full" data-video-id="${video.id}">
                Edit Video
              </button>
            </div>
          </div>` : ''}
        `;
      container.appendChild(div);

      // Add click handlers for dropdown items if video is translated
      // This event delegation is more efficient if you have many videos.
      // However, the original approach of adding listeners per item is fine too.
      // For simplicity, I'll stick to a similar pattern as original for dropdowns.
      if (video.assignedStatus === 'translated') {
        const dropdownItems = div.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
          item.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.getAttribute('data-action');
            const videoId = this.getAttribute('data-video-id'); // Get videoId from the item
            
            // Close dropdown if it's open (assuming Bootstrap-like behavior)
            const dropdownButton = this.closest('.dropdown').querySelector('[data-toggle="dropdown"]');
            if (dropdownButton && dropdownButton.getAttribute('aria-expanded') === 'true') {
                // This part depends on your dropdown implementation.
                // For Bootstrap, it might be $(dropdownButton).dropdown('toggle');
                // Or manually remove 'show' class from dropdown-menu and set aria-expanded to false.
            }

            switch(action) {
              case 'download-video':
                downloadVideo(videoId);
                break;
              case 'download-audio':
                downloadAudio(videoId);
                break;
              case 'download-transcript':
                downloadTranscript(videoId);
                break;
            }
          });
        });
         // Example: Toggle dropdown visibility (basic implementation)
        const dropdownButton = div.querySelector('.btn-actions[data-toggle="dropdown"]');
        if (dropdownButton) {
            dropdownButton.addEventListener('click', function() {
                const menu = this.nextElementSibling; // Assuming .dropdown-menu is the next sibling
                if (menu && menu.classList.contains('dropdown-menu')) {
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                    this.setAttribute('aria-expanded', menu.style.display === 'block');
                }
            });
            // Close dropdown if clicked outside
            document.addEventListener('click', function(event) {
                const dropdown = div.querySelector('.dropdown');
                if (dropdown && !dropdown.contains(event.target)) {
                    const menu = dropdown.querySelector('.dropdown-menu');
                    if (menu) menu.style.display = 'none';
                    const btn = dropdown.querySelector('[data-toggle="dropdown"]');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });
        }
      }
    });

  } catch (error) {
    const container = document.getElementById('videos-container');
    if (container) {
      container.innerHTML = `<div class="text-red-500">Failed to load videos. Error: ${error.message}</div>`;
    }
    console.error('Error loading videos:', error);
    showNotification('error', `Failed to load videos: ${error.message}`);
  }
}

// Function to download translated video
async function downloadVideo(videoId) {
  try {
    showNotification('info', 'Starting video download...');
    const response = await fetch(`/dashboard/download-video?fileId=${videoId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error downloading video');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none'; // Hide the anchor
    a.href = downloadUrl;
    a.download = `translated-video-${videoId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a); // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    showNotification('success', 'Video downloaded successfully!');
  } catch (error) {
    console.error('Video download failed for ID:', videoId, error);
    showNotification('error', `Error downloading video: ${error.message}. Please try again later.`);
  }
}

// Function to download audio
async function downloadAudio(videoId) {
  try {
    showNotification('info', 'Starting audio download...');
    const response = await fetch(`/dashboard/download-audio?fileId=${videoId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error downloading audio');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none'; // Hide the anchor
    a.href = downloadUrl;
    a.download = `translated-audio-${videoId}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a); // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    showNotification('success', 'Audio downloaded successfully!');
  } catch (error) {
    console.error('Audio download failed for ID:', videoId, error);
    showNotification('error', `Error downloading audio: ${error.message}. Please try again later.`);
  }
}

// Function to download transcript (now downloads both as zip)
async function downloadTranscript(videoId) {
  try {
    showNotification('info', 'Preparing transcripts for download...');
    const response = await fetch(`/dashboard/download-transcripts-zip?fileId=${videoId}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Error downloading transcripts');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = `transcripts-${videoId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);
    showNotification('success', 'Transcripts (original & translated) downloaded as zip!');
  } catch (error) {
    console.error('Transcript zip download failed for ID:', videoId, error);
    showNotification('error', `Error downloading transcripts: ${error.message}. Please try again later.`);
  }
}

// Theme handling
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
  try {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  } catch (e) {
    console.warn('localStorage is not available. Theme preference will not be saved.');
  }
}

function initTheme() {
  let darkMode;
  try {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    darkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
  } catch (e) {
    console.warn('localStorage is not available. Using system preference for theme.');
    darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  setTheme(darkMode);
  
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function(e) {
      e.preventDefault();
      const currentDarkMode = document.documentElement.classList.contains('dark');
      setTheme(!currentDarkMode);
    });
  } else {
    console.warn("Theme toggle button ('theme-toggle') not found.");
  }
}

// === AI Proofread Modal Helper ===
function showAICostModal(cost, segments, onConfirm, onCancel) {
  let modal = document.getElementById('ai-proofread-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ai-proofread-modal';
    modal.innerHTML = `
      <div class="ai-modal-backdrop" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:9998;"></div>
      <div class="ai-modal-content" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:2rem;border-radius:1rem;z-index:9999;max-width:90vw;width:400px;box-shadow:0 2px 16px rgba(0,0,0,0.2);">
        <h2 class="text-lg font-bold mb-2">AI Proofread Cost</h2>
        <p class="mb-2">Segments to regenerate: <strong>${segments}</strong></p>
        <p class="mb-4">This will cost <strong>${cost}</strong> translation minutes from your plan.</p>
        <div class="flex justify-end gap-2">
          <button id="ai-modal-cancel" class="bg-gray-300 px-4 py-2 rounded">Cancel</button>
          <button id="ai-modal-confirm" class="bg-indigo-600 text-white px-4 py-2 rounded">Proceed</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  } else {
    modal.querySelector('.ai-modal-content p').innerHTML = `Segments to regenerate: <strong>${segments}</strong>`;
    modal.querySelectorAll('.ai-modal-content p')[1].innerHTML = `This will cost <strong>${cost}</strong> translation minutes from your plan.`;
    modal.style.display = '';
  }
  // Add listeners
  modal.querySelector('#ai-modal-cancel').onclick = function() {
    modal.style.display = 'none';
    if (onCancel) onCancel();
  };
  modal.querySelector('#ai-modal-confirm').onclick = function() {
    modal.style.display = 'none';
    if (onConfirm) onConfirm();
  };
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
  loadTranslationMinutes();
  loadSubmittedVideos();
  initTheme();
  // Example: Basic Dropdown Toggle (if not using a framework like Bootstrap)
  // This is a very basic example. You might have a more robust solution.
  document.body.addEventListener('click', function(event) {
    let target = event.target;
    // Only handle dropdowns for .btn-actions[data-toggle="dropdown"]
    if (target.closest('.btn-actions[data-toggle="dropdown"]')) {
      // Always use the closest button as the dropdown trigger
      const dropdownBtn = target.closest('.btn-actions[data-toggle="dropdown"]');
      event.preventDefault();
      // Hide all other open dropdowns first
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
      document.querySelectorAll('[data-toggle="dropdown"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
      // Toggle current dropdown
      const dropdownMenu = dropdownBtn.nextElementSibling;
      if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
        const isVisible = dropdownMenu.style.display === 'block';
        if (!isVisible) {
          dropdownMenu.style.display = 'block';
          dropdownBtn.setAttribute('aria-expanded', 'true');
        } else {
          dropdownMenu.style.display = 'none';
          dropdownBtn.setAttribute('aria-expanded', 'false');
        }
      }
    } else if (!target.closest('.dropdown')) {
      // Clicked outside of any dropdown
      document.querySelectorAll('.dropdown-menu').forEach(menu => menu.style.display = 'none');
      document.querySelectorAll('[data-toggle="dropdown"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    }
  });

  document.body.addEventListener('click', async function(event) {
    // AI Proofread button handler
    if (event.target.classList.contains('ai-proofread-btn')) {
      event.preventDefault();
      const btn = event.target;
      const videoId = btn.getAttribute('data-video-id');
      if (!videoId) {
        showNotification('error', 'Video ID not found for AI Proofread.');
        return;
      }
      showNotification('info', 'Analyzing transcript for AI proofread...');
      try {
        // Step 1: Ask backend to analyze transcript and return segments & cost
        const resp = await fetch(`/dashboard/api/ai-proofread-init?videoId=${encodeURIComponent(videoId)}`);
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const { segmentsToRegenerate, costPerSegment, totalCost } = data;
        if (!segmentsToRegenerate || !totalCost) {
          showNotification('error', 'AI analysis failed. Please try again.');
          return;
        }
        // Step 2: Show modal for user confirmation
        showAICostModal(totalCost, segmentsToRegenerate, async function onConfirm() {
          showNotification('info', 'Regenerating segments and deducting minutes...');
          // Step 3: Proceed with deduction and regeneration
          try {
            const proceedResp = await fetch(`/dashboard/api/ai-proofread-proceed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId })
            });
            if (!proceedResp.ok) throw new Error(await proceedResp.text());
            const proceedData = await proceedResp.json();
            if (proceedData.success) {
              showNotification('success', 'AI Proofread started! You will be notified when it is complete.');
            } else {
              showNotification('error', proceedData.message || 'Failed to start AI proofread.');
            }
          } catch (err) {
            showNotification('error', 'Error: ' + err.message);
          }
        }, function onCancel() {
          showNotification('info', 'AI Proofread cancelled.');
        });
      } catch (err) {
        showNotification('error', 'AI Proofread failed: ' + err.message);
      }
    }
    // Hybrid Proofread button handler
    if (event.target.classList.contains('human-proofread-btn')) {
      event.preventDefault();
      const btn = event.target;
      const videoId = btn.getAttribute('data-video-id');
      if (!videoId) {
        showNotification('error', 'Video ID not found for Hybrid Proofread.');
        return;
      }
      // Redirect to the hybrid proofread form, passing the videoId as a query param
      window.location.href = `/dashboard/hybrid-proofread?videoId=${videoId}`;
    }
    // Video Editor button handler
    if (event.target.classList.contains('video-editor-btn')) {
      event.preventDefault();
      const btn = event.target;
      const videoId = btn.getAttribute('data-video-id');
      if (!videoId) {
        showNotification('error', 'Video ID not found for Video Editor.');
        return;
      }
      // Redirect to the video editor page with videoId as query param
      window.location.href = `/dashboard/video-editor?videoId=${videoId}`;
    }
  });
});
