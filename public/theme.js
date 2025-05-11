// Function to set the theme based on preference
function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }
}

// Check for saved theme preference or use the system preference
const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme) {
  setTheme(savedTheme);
} else {
  setTheme(systemPrefersDark ? 'dark' : 'light');
}

// Initialize theme toggle after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  const themeToggle = document.getElementById('theme-toggle');
  
  if (themeToggle) {
    // Update the toggle button based on the current theme
    updateToggleButton();
    
    // Add click event listener to toggle theme
    themeToggle.addEventListener('click', function() {
      const currentTheme = localStorage.getItem('theme') || 'light';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      
      setTheme(newTheme);
      updateToggleButton();
    });
  }
});

// Function to update the toggle button appearance
function updateToggleButton() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;
  
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  if (currentTheme === 'dark') {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    themeToggle.setAttribute('title', 'Switch to light mode');
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    themeToggle.setAttribute('title', 'Switch to dark mode');
  }
}

document.addEventListener('DOMContentLoaded', function() {
      // Mobile menu toggle
      const mobileMenuButton = document.querySelector('.mobile-menu-button');
      const mobileMenuClose = document.querySelector('.mobile-menu-close');
      const mobileMenu = document.querySelector('.mobile-menu');
      const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
      
      if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
          mobileMenu.classList.add('active');
          document.body.style.overflow = 'hidden';
        });
      }
      
      if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', function() {
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
        });
      }
      
      mobileMenuLinks.forEach(link => {
        link.addEventListener('click', function() {
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
        });
      });
      
      // Header scroll effect
      const header = document.querySelector('.header');
      
      window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      });
      
      // Smooth scroll for anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          
          const targetId = this.getAttribute('href');
          if (targetId === '#') return;
          
          const targetElement = document.querySelector(targetId);
          if (!targetElement) return;
          
          const headerHeight = header.offsetHeight;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        });
      });
      // --- Plan details to localStorage logic ---
      document.querySelectorAll('.pricing-card').forEach(function(card) {
        var btn = card.querySelector('a[href^="/payment/checkout"]');
        if (!btn) return;
        btn.addEventListener('click', function(e) {
          // Only run for real plans (not disabled/coming soon)
          if (btn.classList.contains('disabled')) return;
          var planName = card.querySelector('.pricing-name')?.textContent?.trim() || '';
          var planDescription = card.querySelector('.pricing-description')?.textContent?.trim() || '';
          var planPrice = card.querySelector('.pricing-price')?.textContent?.trim() || '';
          var planPeriod = card.querySelector('.pricing-period')?.innerText?.trim() || '';
          var planMinutes = card.querySelector('.pricing-minutes')?.textContent?.trim() || '';
          var features = Array.from(card.querySelectorAll('.pricing-feature span')).map(f => f.textContent.trim());
          var planDetails = {
            name: planName,
            description: planDescription,
            price: planPrice,
            period: planPeriod,
            minutes: planMinutes,
            features: features
          };
          // --- Updated key logic for annual plans ---
          var isAnnual = btn.href.includes('-annual');
          var key;
          if (isAnnual) {
            // e.g., plan_growth-annual
            key = 'plan_' + planName.toLowerCase().replace(/\s+/g, '') + '-annual';
          } else {
            key = 'plan_' + planName.toLowerCase().replace(/\s+/g, '');
          }
          localStorage.setItem(key, JSON.stringify(planDetails));
        });
      });
      // --- Toggle between Monthly and Annual plans ---
      const monthlyBtn = document.getElementById('monthlyBtn');
      const annualBtn = document.getElementById('annualBtn');
      const monthlyPlans = document.getElementById('monthlyPlans');
      const annualPlans = document.getElementById('annualPlans');
      
      monthlyBtn.addEventListener('click', () => {
        monthlyPlans.style.display = 'grid';
        annualPlans.style.display = 'none';
        monthlyBtn.classList.add('active');
        annualBtn.classList.remove('active');
      });
      
      annualBtn.addEventListener('click', () => {
        annualPlans.style.display = 'grid';
        monthlyPlans.style.display = 'none';
        annualBtn.classList.add('active');
        monthlyBtn.classList.remove('active');
      });
    });

document.addEventListener('DOMContentLoaded', function() {
      // Mobile menu toggle
      const mobileMenuButton = document.querySelector('.mobile-menu-button');
      const mobileMenuClose = document.querySelector('.mobile-menu-close');
      const mobileMenu = document.querySelector('.mobile-menu');
      const mobileMenuLinks = document.querySelectorAll('.mobile-menu-link');
      
      if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
          mobileMenu.classList.add('active');
          document.body.style.overflow = 'hidden';
        });
      }
      
      if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', function() {
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
        });
      }
      
      mobileMenuLinks.forEach(link => {
        link.addEventListener('click', function() {
          mobileMenu.classList.remove('active');
          document.body.style.overflow = '';
        });
      });
      
      // Header scroll effect
      const header = document.querySelector('.header');
      
      window.addEventListener('scroll', function() {
        if (window.scrollY > 10) {
          header.classList.add('scrolled');
        } else {
          header.classList.remove('scrolled');
        }
      });
      
      // Smooth scroll for anchor links
      document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
          e.preventDefault();
          
          const targetId = this.getAttribute('href');
          if (targetId === '#') return;
          
          const targetElement = document.querySelector(targetId);
          if (!targetElement) return;
          
          const headerHeight = header.offsetHeight;
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        });
      });
    });