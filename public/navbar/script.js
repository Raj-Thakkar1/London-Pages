// Navbar specific JS for hamburger and theme toggle

document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", function () {
      navMenu.classList.toggle("active");
    });
  } else {
    if (!hamburger) console.warn('Hamburger button not found!');
    if (!navMenu) console.warn('Nav menu (nav ul) not found!');
  }

  // Improved theme toggle logic
  const themeToggle = document.getElementById('theme-toggle');
  const setTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
    } else {
      document.documentElement.classList.remove('dark');
      if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
    }
    localStorage.setItem('theme', theme);
  };

  // Detect initial theme
  const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // Set initial theme
  setTheme(getPreferredTheme());

  // Toggle theme on click
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'light' : 'dark');
    });
  }
});
