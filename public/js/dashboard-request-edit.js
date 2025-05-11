// ...JS extracted from creator-request-edit.html <script> tag...
const params = new URLSearchParams(window.location.search);
const videoId = params.get('videoId');
if (videoId) {
  document.getElementById('videoId').value = videoId;
}

document.getElementById('requestEditForm').addEventListener('submit', function(e) {
  // Removed CSRF token header logic
  document.getElementById('submitBtn').disabled = true;
});
