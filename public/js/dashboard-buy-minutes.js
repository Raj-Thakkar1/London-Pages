// ...JS extracted from creator-buy-minutes.html <script> tag...
function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
    document.getElementById('theme-toggle-nav').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  }
}
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  } else {
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  }
}
window.onload = function() {
  initTheme();
};
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  hamburger.addEventListener("click", function () {
    navMenu.classList.toggle("active");
  });
});
