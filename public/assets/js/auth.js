// Authentication pages functionality

document.addEventListener('DOMContentLoaded', function() {
  // Dark mode toggle
  const darkModeToggle = document.getElementById('darkModeToggle');
  const moonIcon = '<i class="fas fa-moon"></i>';
  const sunIcon = '<i class="fas fa-sun"></i>';
  
  // Check for saved theme preference or use system preference
  const savedTheme = localStorage.getItem('theme');
  let isDarkMode = false;
  
  if (savedTheme) {
    isDarkMode = savedTheme === 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // If no saved preference, use system preference
    isDarkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Update dark mode toggle icon based on current theme
  darkModeToggle.innerHTML = isDarkMode ? sunIcon : moonIcon;
  
  // Add click event to dark mode toggle
  darkModeToggle.addEventListener('click', function() {
    isDarkMode = !isDarkMode;
    const theme = isDarkMode ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    darkModeToggle.innerHTML = isDarkMode ? sunIcon : moonIcon;
  });
  
  // Password toggle visibility
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
      const passwordInput = this.parentElement.querySelector('input');
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
      // Toggle icon
      const icon = this.querySelector('i');
      if (type === 'text') {
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
  
  // Enhanced focus states with floating labels
  const authInputs = document.querySelectorAll('.auth-form input');
  
  authInputs.forEach(input => {
    // Add focus event
    input.addEventListener('focus', function() {
      this.parentElement.classList.add('focused');
    });
    
    // Add blur event
    input.addEventListener('blur', function() {
      if (!this.value) {
        this.parentElement.classList.remove('focused');
      }
    });
    
    // Check initial state (for when fields are pre-filled)
    if (input.value) {
      input.parentElement.classList.add('focused');
    }
  });
  
  // Enhance form submission experience with button state management
  const authForms = document.querySelectorAll('.auth-form');
  
  authForms.forEach(form => {
    const submitButton = form.querySelector('button[type="submit"]');
    
    form.addEventListener('input', function() {
      const isValid = form.checkValidity();
      submitButton.disabled = !isValid;
    });
  });
});