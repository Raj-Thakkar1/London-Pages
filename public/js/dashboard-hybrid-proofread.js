// JS for Hybrid Proofread form (renamed from request free edit)
const params = new URLSearchParams(window.location.search);
const videoId = params.get('videoId');
if (videoId) {
  document.getElementById('videoId').value = videoId;
}

const form = document.getElementById('hybridProofreadForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  submitBtn.disabled = true;

  // Collect form data
  const formData = new FormData(form);
  const data = {};
  formData.forEach((value, key) => {
    data[key] = value;
  });
  data.videoId = videoId;

  try {
    const response = await fetch('/dashboard/api/hybrid-proofread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (result.success) {
      // Prevent multiple submissions for this video only after success
      localStorage.setItem('proofread_submitted_' + videoId, 'true');
      window.location.href = '/dashboard/creator-dashboard-upload.html';
    } else {
      alert('Error submitting request: ' + (result.message || 'Unknown error'));
      submitBtn.disabled = false;
    }
  } catch (error) {
    alert('Error submitting request: ' + error.message);
    submitBtn.disabled = false;
  }
});

// On page load, check if already submitted for this video
if (videoId) {
  // Always enable the button on load
  submitBtn.disabled = false;
  // If already submitted, show a message and keep disabled
  if (localStorage.getItem('proofread_submitted_' + videoId) === 'true') {
    submitBtn.disabled = true;
    // Optionally, show a message to the user
    if (!document.getElementById('alreadySubmittedMsg')) {
      const msg = document.createElement('div');
      msg.id = 'alreadySubmittedMsg';
      msg.className = 'form-group';
      msg.style.color = '#d9534f';
      msg.style.marginTop = '1rem';
      msg.textContent = 'You have already submitted a hybrid proofread request for this video.';
      form.appendChild(msg);
    }
  } else {
    // Remove any previous message if present
    const prevMsg = document.getElementById('alreadySubmittedMsg');
    if (prevMsg) prevMsg.remove();
  }
} else {
  // If no videoId, always enable
  submitBtn.disabled = false;
}

// Modern dark mode toggle functionality
document.addEventListener('DOMContentLoaded', function () {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  // Check for saved theme in localStorage
  if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark', 'darkbg');
  } else if (localStorage.getItem('theme') === 'light') {
    body.classList.remove('dark', 'darkbg');
  }
  themeToggle && themeToggle.addEventListener('click', function () {
    body.classList.toggle('dark');
    body.classList.toggle('darkbg');
    // Save preference
    if (body.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });
});
