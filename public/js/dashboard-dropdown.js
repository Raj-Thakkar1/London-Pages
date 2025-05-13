document.addEventListener('DOMContentLoaded', function() {
  // Function to close all dropdowns
  function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
    });
    document.querySelectorAll('[data-toggle="dropdown"]').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  // Handle dropdown toggle
  document.addEventListener('click', function(event) {
    const dropdownToggle = event.target.closest('[data-toggle="dropdown"]');
    if (dropdownToggle) {
      event.preventDefault();
      event.stopPropagation();
      
      const currentDropdown = dropdownToggle.nextElementSibling;
      const isCurrentlyOpen = currentDropdown.classList.contains('show');
      
      // Close all dropdowns first
      closeAllDropdowns();
      
      // If the clicked dropdown wasn't open, open it
      if (!isCurrentlyOpen) {
        currentDropdown.classList.add('show');
        dropdownToggle.setAttribute('aria-expanded', 'true');
      }
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', function(event) {
    if (!event.target.closest('.dropdown')) {
      closeAllDropdowns();
    }
  });

  // Close dropdowns when clicking on a dropdown item
  document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', function() {
      closeAllDropdowns();
    });
  });
});
