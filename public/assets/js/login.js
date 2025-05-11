import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

async function getFirebaseConfig() {
  const res = await fetch('/api/firebase-config');
  if (!res.ok) throw new Error('Failed to load Firebase config');
  return await res.json();
}

let app, auth, db;
getFirebaseConfig().then(config => {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  window.firebaseReady = true;
}).catch(err => {
  alert('Could not initialize Firebase: ' + err.message);
});

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginSpinner = document.getElementById("loginSpinner");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.firebaseReady) {
    alert('Firebase not ready');
    return;
  }
  // Clear previous errors
  emailError.textContent = "";
  passwordError.textContent = "";
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  // Basic validation
  let isValid = true;
  if (!email) {
    emailError.textContent = "Email is required";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    emailError.textContent = "Email is invalid";
    isValid = false;
  }
  if (!password) {
    passwordError.textContent = "Password is required";
    isValid = false;
  }
  if (!isValid) return;
  // Show loading state
  loginButton.disabled = true;
  loginButton.querySelector("span").textContent = "Logging in";
  loginSpinner.style.display = "block";
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.userType === "creator") {
        showNotification("success", "Login successful! Redirecting to Creator Dashboard.");
        document.cookie = "loggedIn=true; path=/";
        document.cookie = `userEmail=${encodeURIComponent(user.email)}; path=/`;
        setTimeout(() => {
          window.location.href = "/dashboard/creator-dashboard";
        }, 1500);
      } else {
        showNotification("info", "Login successful! But your account is not a creator account.");
        resetForm();
      }
    } else {
      showNotification("info", "Login successful! No additional user data found.");
      resetForm();
    }
  } catch (error) {
    if (error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      showNotification("error", "Invalid login credentials");
    } else {
      showNotification("error", "Error logging in: " + error.message);
    }
    console.error("Error logging in: ", error);
    resetForm();
  }
});

function resetForm() {
  loginButton.disabled = false;
  loginButton.querySelector("span").textContent = "Log In";
  loginSpinner.style.display = "none";
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
