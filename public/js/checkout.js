// Helper to get query param
function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

// Handle checkout form submission
const checkoutForm = document.getElementById('checkoutForm');
if (checkoutForm) {
  checkoutForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('userEmail').value;
    const plan = getQueryParam('plan');
    if (!plan) {
      alert('No plan selected.');
      return;
    }
    const key = 'plan_' + plan.toLowerCase().replace(/\s+/g, '');
    const planData = localStorage.getItem(key);
    if (!planData) {
      alert('Plan details not found.');
      return;
    }
    const details = JSON.parse(planData);
    // Extract numeric price and currency
    let priceStr = details.price || "";
    let amount = 0;
    let currency = "USD"; // Default

    if (priceStr.includes("$")) {
      currency = "USD";
      amount = Math.round(parseFloat(priceStr.replace(/[^0-9.]/g, "")) * 100);
    } else if (priceStr.includes("₹")) {
      currency = "INR";
      amount = Math.round(parseFloat(priceStr.replace(/[^0-9.]/g, "")) * 100);
    } else {
      // fallback: try to parse as number and use INR
      amount = Math.round(parseFloat(priceStr.replace(/[^0-9.]/g, "")) * 100);
    }

    if (!amount || isNaN(amount)) {
      alert('Plan amount is invalid.');
      return;
    }

    // Send data to backend
    const response = await fetch('/api/check-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount,
        currency,
        plan: plan // Add plan parameter
      })
    });
    const result = await response.json();
    // Handle result (proceed to payment, show errors, etc.)
    if (result.exists && result.proceedToPayment && result.order) {
      // Proceed to payment (integrate Razorpay here)
      const options = {
        key: result.order.razorpayKey || 'rzp_test_YourKeyHere', // Replace with your Razorpay key or get from backend
        amount: result.order.amount, // Amount in paise
        currency: result.order.currency,
        name: 'London Pages',
        description: details.name + ' - ' + details.description,
        order_id: result.order.id, // Razorpay order ID from backend
        handler: function (response) {
          alert('Payment successful! We will email you on your email id as soon as we successfully process your payment. After that you can successfully dub videos.\nPayment ID: ' + response.razorpay_payment_id);
        },
        prefill: {
          email: email
        },
        theme: {
          color: '#1a202c'
        }
      };
      const rzp = new Razorpay(options);
      rzp.open();
    } else if (!result.exists) {
      // Redirect to signup and show message
      alert(result.message || 'Please signup before paying.');
      window.location.href = result.registerUrl || '/signup';
    } else {
      alert(result.error || 'An error occurred.');
    }
  });
}

// Display selected plan from URL and show full details from localStorage
const plan = getQueryParam('plan');
const planDetailsDiv = document.getElementById('planDetails');
if (plan) {
  // Try to get full plan details from localStorage
  const key = 'plan_' + plan.toLowerCase().replace(/\s+/g, '');
  const planData = localStorage.getItem(key);
  if (planData) {
    const details = JSON.parse(planData);
    planDetailsDiv.innerHTML = `
      <strong>${details.name}</strong><br>
      <span>${details.description}</span><br>
      <strong>Price:</strong> ${details.price} <span class="plan-period">${details.period}</span><br>
      <strong>Minutes:</strong> ${details.minutes}<br>
      <strong>Features:</strong>
      <ul class="plan-features-list">
        ${details.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    `;
  } else {
    planDetailsDiv.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
  }
} else {
  planDetailsDiv.textContent = 'No plan selected.';
}
