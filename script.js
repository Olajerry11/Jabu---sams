const countdownElement = document.getElementById('countdown');
const qrImage = document.querySelector('.qr-box img');
const statusBadge = document.querySelector('.status');

let timeLeft = 30;

function updateTimer() {
  timeLeft--;
  countdownElement.textContent = timeLeft < 10 ? '0' + timeLeft : timeLeft;

  if (timeLeft === 0) {
    refreshQRCode();
    timeLeft = 30; 
  }
}

function refreshQRCode() {
  const randomToken = Math.random().toString(36).substring(2, 10).toUpperCase();
  qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=JABU-TOTP-${randomToken}`;
  
  qrImage.style.opacity = 0.2;
  setTimeout(() => {
    // Only bring opacity back if they aren't suspended
    if (localStorage.getItem('jabu_student_status') !== 'suspended') {
      qrImage.style.opacity = 1;
    }
  }, 300);
}

// NEW: Function to check the Admin's database
function checkAdminStatus() {
  const status = localStorage.getItem('jabu_student_status');

  if (status === 'suspended') {
    // Lock down the ID card!
    statusBadge.className = 'status suspended';
    statusBadge.textContent = 'Status: SUSPENDED';
    qrImage.style.opacity = '0.1'; // Hide the QR code
    countdownElement.textContent = "--"; // Stop the timer display
  } else {
    // Restore access
    statusBadge.className = 'status active';
    statusBadge.textContent = 'Status: ACTIVE';
    if(timeLeft !== 0) qrImage.style.opacity = '1';
  }
}

// Run the timer AND the security check every 1 second
setInterval(() => {
  const currentStatus = localStorage.getItem('jabu_student_status');
  
  // Only tick the timer if the student is active
  if (currentStatus !== 'suspended') {
    updateTimer();
  }
  
  // Always check for Admin updates
  checkAdminStatus();
}, 1000);

// Run a check immediately when the app opens
checkAdminStatus();