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

// --- Vertical Navbar Responsive & Hover/Toggle Logic ---
document.addEventListener('DOMContentLoaded', function () {
  const verticalNavbar = document.getElementById('vertical-navbar');
  const mobileBtn = document.querySelector('.navbar-mobile-btn');
  const desktopToggleDiv = document.getElementById('navbar-toggle-desktop');
  const closeBtn = document.getElementById('close-navbar-mobile');
  const mobileToggleDiv = document.getElementById('navbar-toggle-mobile');
  const body = document.body;

  // Helper: open/close for desktop
  function setNavbarState(open) {
    if (open) {
      verticalNavbar.classList.add('open');
      verticalNavbar.classList.remove('closed');
      body.classList.add('navbar-open');
    } else {
      verticalNavbar.classList.remove('open');
      verticalNavbar.classList.add('closed');
      body.classList.remove('navbar-open');
    }
  }

  // --- Desktop logic ---
  function enableDesktopNavbar() {
    setNavbarState(false);
    verticalNavbar.classList.remove('mobile-navbar');
    verticalNavbar.style.transform = '';
    mobileToggleDiv.style.display = 'none';
    desktopToggleDiv.style.display = 'block';
    closeBtn.style.display = 'none';
    // Only attach once
    if (!verticalNavbar._desktopListeners) {
      verticalNavbar.addEventListener('mouseenter', desktopMouseEnter);
      verticalNavbar.addEventListener('mouseleave', desktopMouseLeave);
      desktopToggleDiv.addEventListener('click', desktopToggleClick);
      verticalNavbar._desktopListeners = true;
    }
  }
  function disableDesktopNavbar() {
    if (verticalNavbar._desktopListeners) {
      verticalNavbar.removeEventListener('mouseenter', desktopMouseEnter);
      verticalNavbar.removeEventListener('mouseleave', desktopMouseLeave);
      desktopToggleDiv.removeEventListener('click', desktopToggleClick);
      verticalNavbar._desktopListeners = false;
    }
  }
  function desktopMouseEnter() { setNavbarState(true); }
  function desktopMouseLeave() { setNavbarState(false); }
  function desktopToggleClick() { setNavbarState(!verticalNavbar.classList.contains('open')); }

  // --- Mobile logic ---
  function enableMobileNavbar() {
    verticalNavbar.classList.add('mobile-navbar');
    verticalNavbar.classList.remove('open', 'closed');
    verticalNavbar.style.transform = 'translateX(-100%)';
    mobileToggleDiv.style.display = 'block';
    desktopToggleDiv.style.display = 'none';
    closeBtn.style.display = 'none';
    if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
    // Remove previous listeners to avoid duplicates
    if (mobileBtn) mobileBtn.onclick = null;
    if (closeBtn) closeBtn.onclick = null;
    // Hamburger click
    if (mobileBtn) {
      mobileBtn.onclick = function (e) {
        e.stopPropagation();
        verticalNavbar.style.transform = 'translateX(0)';
        mobileBtn.setAttribute('aria-expanded', 'true');
        body.style.overflow = 'hidden';
        mobileToggleDiv.style.display = 'none';
        closeBtn.style.display = 'block';
      };
    }
    // Cross click
    if (closeBtn) {
      closeBtn.onclick = function (e) {
        e.stopPropagation();
        verticalNavbar.style.transform = 'translateX(-100%)';
        if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
        mobileToggleDiv.style.display = 'block';
        closeBtn.style.display = 'none';
      };
    }
    // Hide navbar when clicking outside
    document.addEventListener('click', mobileOutsideClick);
  }
  function disableMobileNavbar() {
    if (mobileBtn) mobileBtn.onclick = null;
    if (closeBtn) closeBtn.onclick = null;
    document.removeEventListener('click', mobileOutsideClick);
  }
  function mobileOutsideClick(e) {
    if (window.innerWidth < 770 && verticalNavbar.classList.contains('mobile-navbar')) {
      if (!verticalNavbar.contains(e.target) && !mobileBtn.contains(e.target)) {
        verticalNavbar.style.transform = 'translateX(-100%)';
        if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
        body.style.overflow = '';
        mobileToggleDiv.style.display = 'block';
        closeBtn.style.display = 'none';
      }
    }
  }

  // --- Responsive switch ---
  function handleResize() {
    if (window.innerWidth < 770) {
      disableDesktopNavbar();
      enableMobileNavbar();
    } else {
      disableMobileNavbar();
      enableDesktopNavbar();
    }
  }
  handleResize();
  window.addEventListener('resize', handleResize);
});