const demoNotifications = [
  {
    id: 1,
    message: "Your video 'Introduction to Machine Learning' has been successfully translated to Spanish.",
    timestamp: { seconds: Math.floor(Date.now() / 1000) - 3600 },
    read: false,
    type: "success"
  },
  {
    id: 2,
    message: "Your translation for 'Data Science Basics' is now processing. You will be notified when it's complete.",
    timestamp: { seconds: Math.floor(Date.now() / 1000) - 86400 },
    read: true,
    type: "info"
  },
  {
    id: 3,
    message: "Your account has been topped up with 60 translation minutes.",
    timestamp: { seconds: Math.floor(Date.now() / 1000) - 172800 },
    read: true,
    type: "success"
  }
];

function formatTimestamp(timestamp) {
  if (!timestamp || !timestamp.seconds) return '';
  const date = new Date(timestamp.seconds * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  } else {
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function createNotificationItem(notification) {
  const div = document.createElement('div');
  div.className = `notification-item ${notification.read ? 'opacity-75' : 'border-l-4 border-primary'}`;
  div.setAttribute('data-id', notification.id);
  let iconClass = 'fa-info-circle text-primary';
  if (notification.type === 'success') {
    iconClass = 'fa-check-circle text-success';
  } else if (notification.type === 'warning') {
    iconClass = 'fa-exclamation-triangle text-warning';
  } else if (notification.type === 'error') {
    iconClass = 'fa-exclamation-circle text-danger';
  }
  div.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="pt-1">
        <i class="fas ${iconClass} text-lg"></i>
      </div>
      <div class="flex-1">
        <p>${notification.message}</p>
        <p class="timestamp">${formatTimestamp(notification.timestamp)}</p>
      </div>
      <div>
        <button class="text-gray-400 hover:text-gray-600 mark-read" title="Mark as ${notification.read ? 'unread' : 'read'}">
          <i class="fas ${notification.read ? 'fa-envelope' : 'fa-envelope-open'}"></i>
        </button>
      </div>
    </div>
  `;
  return div;
}

function showNotification(type, message) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'}"></i>
    </div>
    <div class="notification-message">${message}</div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add("show");
  }, 10);
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

async function loadNotifications() {
  try {
    const response = await fetch('/dashboard/api/notifications');
    const data = await response.json();
    displayNotifications(data.notifications || []);
  } catch (error) {
    console.error('Error loading notifications:', error);
    showNotification('error', 'Could not load your notifications. Please check your connection or try again later.');
    displayNotifications(demoNotifications);
  }
}

function displayNotifications(notifications) {
  const container = document.getElementById('notifications-list');
  const noNotifications = document.getElementById('no-notifications');
  const notificationCount = document.getElementById('notification-count');
  container.innerHTML = '';
  if (notifications && notifications.length > 0) {
    notifications.forEach(notification => {
      const notificationItem = createNotificationItem(notification);
      container.appendChild(notificationItem);
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    notificationCount.textContent = unreadCount;
    container.style.display = 'block';
    noNotifications.style.display = 'none';
  } else {
    container.style.display = 'none';
    noNotifications.style.display = 'block';
    notificationCount.textContent = '0';
  }
}

document.getElementById('refresh-notifications').addEventListener('click', loadNotifications);
document.getElementById('mark-all-read').addEventListener('click', () => {
  const notificationItems = document.querySelectorAll('.notification-item');
  notificationItems.forEach(item => {
    item.classList.add('opacity-75');
    item.classList.remove('border-l-4', 'border-primary');
    const markReadBtn = item.querySelector('.mark-read');
    if (markReadBtn) {
      markReadBtn.innerHTML = '<i class="fas fa-envelope"></i>';
      markReadBtn.title = 'Mark as unread';
    }
  });
  document.getElementById('notification-count').textContent = '0';
});
document.getElementById('notification-filter').addEventListener('change', function() {
  const filter = this.value;
  const items = document.querySelectorAll('.notification-item');
  items.forEach(item => {
    if (filter === 'all') {
      item.style.display = 'block';
    } else if (filter === 'unread') {
      item.style.display = item.classList.contains('opacity-75') ? 'none' : 'block';
    } else if (filter === 'read') {
      item.style.display = item.classList.contains('opacity-75') ? 'block' : 'none';
    }
  });
});
document.addEventListener('click', function(e) {
  if (e.target.closest('.mark-read')) {
    const btn = e.target.closest('.mark-read');
    const item = btn.closest('.notification-item');
    if (item.classList.contains('opacity-75')) {
      item.classList.remove('opacity-75');
      item.classList.add('border-l-4', 'border-primary');
      btn.innerHTML = '<i class="fas fa-envelope-open"></i>';
      btn.title = 'Mark as read';
      const count = document.getElementById('notification-count');
      count.textContent = parseInt(count.textContent) + 1;
    } else {
      item.classList.add('opacity-75');
      item.classList.remove('border-l-4', 'border-primary');
      btn.innerHTML = '<i class="fas fa-envelope"></i>';
      btn.title = 'Mark as unread';
      const count = document.getElementById('notification-count');
      count.textContent = Math.max(0, parseInt(count.textContent) - 1);
    }
  }
});
async function loadTranslationMinutes() {
  try {
    const response = await fetch('/dashboard/api/translation-minutes');
    const data = await response.json();
    document.getElementById('translation-minutes').textContent = 
      data.translationMinutes !== undefined ? data.translationMinutes : 'N/A';
  } catch (error) {
    console.error('Error loading translation minutes:', error);
    showNotification('error', 'Could not load your translation minutes.');
    document.getElementById('translation-minutes').textContent = '0';
  }
}
function toggleTheme() {
  if (document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun text-gray-400"></i>';
  }
}
window.onload = function() {
  loadNotifications();
  loadTranslationMinutes();
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
};
document.addEventListener("DOMContentLoaded", function () {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.querySelector("nav ul");
  hamburger.addEventListener("click", function () {
    navMenu.classList.toggle("active");
  });
});