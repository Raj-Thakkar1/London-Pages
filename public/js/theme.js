// Check if a theme is stored in localStorage
document.addEventListener('DOMContentLoaded', function() {
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