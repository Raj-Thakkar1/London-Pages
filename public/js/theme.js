// DEPRECATED: Use darkmode-toggle.js instead for theme toggling logic.

// Check if a theme is stored in localStorage
document.addEventListener('DOMContentLoaded', function () {
  // Initialize theme based on user preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    // Update any theme toggle buttons on the page
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
    }
  } else {
    // If toggle button exists, set to light mode icon
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
    }
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('theme-toggle');
  const hamburgerImg = document.getElementById('hamburger-img');

  const updateHamburgerImage = () => {
    const isDarkMode = document.body.classList.contains('dark-mode');
    hamburgerImg.src = isDarkMode
      ? '/assets/images/toggle_button_-_dark-removebg-preview.png'
      : '/assets/images/toggle button.png';
  };

  // Initial update
  updateHamburgerImage();

  // Update on theme toggle
  themeToggle.addEventListener('click', () => {
    setTimeout(updateHamburgerImage, 100); // Delay to allow theme class to update
  });
});