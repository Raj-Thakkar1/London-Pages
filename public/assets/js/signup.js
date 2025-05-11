import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

// Country names list
const countries = [
  'Afghanistan', 'Åland Islands', 'Albania', 'Algeria', 'American Samoa', 'Andorra',
  'Angola', 'Anguilla', 'Antarctica', 'Antigua and Barbuda', 'Argentina', 'Armenia',
  'Aruba', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh',
  'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia',
  'Bonaire', 'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil',
  'British Indian Ocean Territory', 'Brunei Darussalam', 'Bulgaria', 'Burkina Faso',
  'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Cayman Islands',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Christmas Island',
  'Cocos (Keeling) Islands', 'Colombia', 'Comoros', 'Congo', 'Cook Islands',
  'Costa Rica', "Côte d'Ivoire", 'Croatia', 'Cuba', 'Curaçao', 'Cyprus', 'Czechia',
  'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
  'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Falkland Islands', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana',
  'French Polynesia', 'French Southern Territories', 'Gabon', 'Gambia', 'Georgia',
  'Germany', 'Ghana', 'Gibraltar', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe',
  'Guam', 'Guatemala', 'Guernsey', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti',
  'Heard Island and McDonald Islands', 'Holy See', 'Honduras', 'Hong Kong', 'Hungary',
  'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jersey', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Korea', 'Kuwait', 'Kyrgyzstan', "Lao People's Democratic Republic", 'Latvia',
  'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Macao', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
  'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius', 'Mayotte', 'Mexico',
  'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat', 'Morocco',
  'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Caledonia',
  'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island',
  'North Macedonia', 'Northern Mariana Islands', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Pitcairn', 'Poland', 'Portugal', 'Puerto Rico', 'Qatar', 'Réunion', 'Romania',
  'Russian Federation', 'Rwanda', 'Saint Barthélemy', 'Saint Helena',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Martin', 'Saint Pierre and Miquelon',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
  'Sint Maarten', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
  'South Georgia and the South Sandwich Islands', 'South Sudan', 'Spain', 'Sri Lanka',
  'Sudan', 'Suriname', 'Svalbard and Jan Mayen', 'Sweden', 'Switzerland',
  'Syrian Arab Republic', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand',
  'Timor-Leste', 'Togo', 'Tokelau', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Turks and Caicos Islands', 'Tuvalu', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States',
  'United States Minor Outlying Islands', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Venezuela', 'Viet Nam', 'Virgin Islands (British)', 'Virgin Islands (U.S.)',
  'Wallis and Futuna', 'Western Sahara', 'Yemen', 'Zambia', 'Zimbabwe'
];

const select = document.getElementById('country');
countries.forEach(countryName => {
  const option = document.createElement('option');
  option.value = countryName;
  option.textContent = countryName;
  select.appendChild(option);
});

const signupForm = document.getElementById("signupForm");
const signupButton = document.getElementById("signupButton");
const signupSpinner = document.getElementById("signupSpinner");
const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const passwordError = document.getElementById("passwordError");
const termsError = document.getElementById("termsError");
const passwordInput = document.getElementById("password");

// Password strength meter
passwordInput.addEventListener("input", updatePasswordStrength);

function updatePasswordStrength() {
  const password = passwordInput.value;
  const strength = calculatePasswordStrength(password);
  // Update meter segments
  const meterSegments = document.querySelectorAll(".meter-segment");
  meterSegments.forEach(segment => {
    const segmentStrength = parseInt(segment.getAttribute("data-strength"));
    if (segmentStrength <= strength) {
      segment.className = "meter-segment active " + getStrengthClass(strength);
    } else {
      segment.className = "meter-segment";
    }
  });
  // Update text
  const strengthText = document.getElementById("strengthText");
  strengthText.textContent = getStrengthText(strength);
  strengthText.className = getStrengthClass(strength);
}

function calculatePasswordStrength(password) {
  if (!password) return 0;
  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;
  return Math.min(4, strength);
}

function getStrengthText(strength) {
  switch (strength) {
    case 0: return "None";
    case 1: return "Weak";
    case 2: return "Fair";
    case 3: return "Good";
    case 4: return "Strong";
    default: return "";
  }
}

function getStrengthClass(strength) {
  switch (strength) {
    case 1: return "weak";
    case 2: return "fair";
    case 3: return "good";
    case 4: return "strong";
    default: return "";
  }
}

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!window.firebaseReady) {
    alert('Firebase not ready');
    return;
  }
  // Clear previous errors
  nameError.textContent = "";
  emailError.textContent = "";
  passwordError.textContent = "";
  termsError.textContent = "";
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const termsAccepted = document.getElementById("termsAccepted").checked;
  // Basic validation
  let isValid = true;
  if (!name) {
    nameError.textContent = "Name is required";
    isValid = false;
  }
  if (!email) {
    emailError.textContent = "Email is required";
    isValid = false;
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    emailError.textContent = "Email is invalid";
    isValid = false;
  }
  const countryName = document.getElementById("country").value.trim();
  if (!countryName) {
    document.getElementById("countryError").textContent = "Please select your country";
    isValid = false;
  }
  if (!password) {
    passwordError.textContent = "Password is required";
    isValid = false;
  } else if (password.length < 6) {
    passwordError.textContent = "Password must be at least 6 characters";
    isValid = false;
  }
  if (!termsAccepted) {
    termsError.textContent = "You must accept the terms and conditions";
    isValid = false;
  }
  if (!isValid) {
    resetForm();
    return;
  }
  // Show loading state
  signupButton.disabled = true;
  signupButton.querySelector("span").textContent = "Creating account";
  signupSpinner.style.display = "block";
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: new Date(),
      userType: "creator",
      translationMinutes: 0,
      country: countryName,
    });
    showNotification("success", "Account created successfully! Redirecting to login page.");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      showNotification("info", "Email id is already registered. Please log in.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } else {
      showNotification("error", "Error signing up: " + error.message);
      resetForm();
    }
    console.error("Error signing up: ", error);
  }
});

function resetForm() {
  signupButton.disabled = false;
  signupButton.querySelector("span").textContent = "Create Account";
  signupSpinner.style.display = "none";
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
