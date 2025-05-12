// Dark/Light mode toggle logic for dashboard pages
// Adds/removes 'dark' class on <html> and persists preference in localStorage

document.addEventListener('DOMContentLoaded', function () {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  // Set initial theme
  const userPref = localStorage.getItem('theme');
  const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme = userPref || systemPref;
  setTheme(theme);
  // Ensure icon is correct on load
  updateIcon(theme === 'dark');

  themeToggle.addEventListener('click', function () {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateIcon(isDark);
  });

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      updateIcon(true);
    } else {
      document.documentElement.classList.remove('dark');
      updateIcon(false);
    }
  }

  function updateIcon(isDark) {
    const icon = themeToggle.querySelector('i');
    if (!icon) return;
    icon.classList.toggle('fa-moon', !isDark);
    icon.classList.toggle('fa-sun', isDark);
    icon.classList.toggle('text-yellow-400', isDark);
    icon.classList.toggle('text-gray-400', !isDark);
  }
});