// ...JS extracted from creator-upload-error.html <script> tag...
const params = new URLSearchParams(window.location.search);
const errorMessage = params.get('message');
if (errorMessage) {
  document.getElementById('error-message').textContent = "Error: " + errorMessage;
}
