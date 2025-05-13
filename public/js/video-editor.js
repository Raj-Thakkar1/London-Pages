// Video Editor Page JS
function showNotification(msg, type = 'info') {
  const notif = document.getElementById('notification');
  notif.textContent = msg;
  notif.style.background = type === 'success' ? '#22c55e' : (type === 'error' ? '#ef4444' : '#6366f1');
  notif.classList.add('show');
  setTimeout(() => notif.classList.remove('show'), 3500);
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
const videoId = getQueryParam('videoId');
if (!videoId) {
  showNotification('No videoId provided in URL.', 'error');
  throw new Error('No videoId');
}

async function fetchTranscriptAndVideo() {
  try {
    const resp = await fetch(`/dashboard/api/video-editor-data?videoId=${encodeURIComponent(videoId)}`);
    if (!resp.ok) throw new Error(await resp.text());
    return await resp.json();
  } catch (err) {
    showNotification('Failed to load transcript: ' + err.message, 'error');
    throw err;
  }
}

function renderSegments(segments) {
  const list = document.getElementById('segments-list');
  list.innerHTML = '';
  segments.forEach((seg, idx) => {
    const row = document.createElement('div');
    row.className = 'segment-row';
    row.innerHTML = `
      <div class="segment-time">${seg.start} - ${seg.end}</div>
      <textarea class="segment-textarea" data-segment-idx="${idx}">${seg.text}</textarea>
    `;
    list.appendChild(row);
  });
}

let transcriptSegments = [];
let videoUrl = '';
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const data = await fetchTranscriptAndVideo();
    transcriptSegments = data.segments;
    videoUrl = data.videoUrl;
    renderSegments(transcriptSegments);
    if (videoUrl) {
      document.getElementById('video-preview').src = videoUrl;
    }
  } catch {}
});

document.getElementById('transcript-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const textareas = document.querySelectorAll('.segment-textarea');
  const editedSegments = Array.from(textareas).map((ta, idx) => ({
    ...transcriptSegments[idx],
    text: ta.value.trim()
  }));
  showNotification('Saving edits...');
  try {
    const resp = await fetch('/dashboard/api/video-editor-save', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, segments: editedSegments })
    });
    if (!resp.ok) throw new Error(await resp.text());
    showNotification('Transcript saved successfully!', 'success');
  } catch (err) {
    showNotification('Failed to save: ' + err.message, 'error');
  }
});
