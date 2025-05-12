// Theme toggle logic for notifications.html

document.addEventListener('DOMContentLoaded', function () {
  const themeToggle = document.getElementById('theme-toggle');
  const body = document.body;
  const THEME_KEY = 'theme';

  // Load saved theme
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'dark') {
    body.classList.add('dark');
  } else if (savedTheme === 'light') {
    body.classList.remove('dark');
  }

  // Toggle theme on click
  themeToggle.addEventListener('click', function () {
    body.classList.toggle('dark');
    if (body.classList.contains('dark')) {
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      localStorage.setItem(THEME_KEY, 'light');
    }
  });
});


// Navbar specific JS for hamburger menu only

document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", function () {
      navMenu.classList.toggle("active");
    });
  }
});
