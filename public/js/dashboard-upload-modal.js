// Handles upload modal open/close and preserves upload form functionality
// Requires dashboard-upload-videos.js to be loaded for form logic

document.addEventListener('DOMContentLoaded', function () {
  const openBtn = document.getElementById('openUploadModal');
  const modalBg = document.getElementById('uploadModalBg');
  const closeBtn = document.getElementById('closeUploadModal');
  const cancelBtn = document.getElementById('cancelUploadModal');

  if (openBtn && modalBg && closeBtn && cancelBtn) {
    openBtn.addEventListener('click', () => {
      modalBg.classList.add('active');
    });
    closeBtn.addEventListener('click', () => {
      modalBg.classList.remove('active');
    });
    cancelBtn.addEventListener('click', () => {
      modalBg.classList.remove('active');
    });
    window.addEventListener('click', (event) => {
      if (event.target === modalBg) {
        modalBg.classList.remove('active');
      }
    });
  }
});
