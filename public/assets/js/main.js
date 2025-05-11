// Main JavaScript for general functionality

document.addEventListener('DOMContentLoaded', function() {
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('nav');
  const authButtons = document.querySelector('.auth-buttons');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      const isExpanded = this.getAttribute('aria-expanded') === 'true';
      this.setAttribute('aria-expanded', !isExpanded);
      
      // Create/show mobile menu
      if (!document.querySelector('.mobile-menu')) {
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        mobileMenu.innerHTML = `
          ${nav ? `<div class="mobile-nav">${nav.innerHTML}</div>` : ''}
          ${authButtons ? `<div class="mobile-auth">${authButtons.innerHTML}</div>` : ''}
        `;
        document.body.appendChild(mobileMenu);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'mobile-menu-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.addEventListener('click', closeMobileMenu);
        mobileMenu.prepend(closeBtn);
        
        // Prevent body scrolling when menu is open
        document.body.style.overflow = 'hidden';
        
        // Add animation class after a small delay for animation to work
        setTimeout(() => {
          mobileMenu.classList.add('open');
        }, 10);
      } else {
        closeMobileMenu();
      }
    });
  }
  
  function closeMobileMenu() {
    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
      
      // Wait for animation to complete before removing from DOM
      setTimeout(() => {
        mobileMenu.remove();
        document.body.style.overflow = '';
      }, 300);
      
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }
  
  // Dark mode detection and handling
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // If no saved preference, use system preference
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    const dropdowns = document.querySelectorAll('.dropdown.open');
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  });
  
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      if (href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth'
          });
        }
      }
    });
  });
  
  // Add styles for mobile menu
  const style = document.createElement('style');
  style.textContent = `
    .mobile-menu {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: var(--background-color);
      z-index: 100;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    }
    
    .mobile-menu.open {
      transform: translateX(0);
    }
    
    .mobile-menu-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-color);
      cursor: pointer;
    }
    
    .mobile-nav {
      margin-top: 3rem;
      margin-bottom: 2rem;
    }
    
    .mobile-nav ul {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .mobile-auth {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .mobile-auth a {
      text-align: center;
    }
    
    @media (min-width: 769px) {
      .mobile-menu {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
});