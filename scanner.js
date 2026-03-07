// --- 1. SET UP THE LIVE CAMERA ---
let html5QrcodeScanner;

document.addEventListener("DOMContentLoaded", () => {
  html5QrcodeScanner = new Html5QrcodeScanner(
    "reader",
    { fps: 10, qrbox: { width: 220, height: 220 } },
    false
  );
  html5QrcodeScanner.render(onScanSuccess, onScanError);
});

// --- 2. THE SYNTHETIC SOUND GENERATOR ---
function playSecuritySound(isSuccess) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isSuccess) {
      // Access Granted: A happy, high-pitched double beep
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Access Denied: A harsh, low-pitched buzzer
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    console.log("Audio not supported by this browser.");
  }
}

// --- 3. WHAT HAPPENS WHEN IT READS A CODE ---
function onScanSuccess(decodedText, decodedResult) {
  html5QrcodeScanner.pause(true);
  
  const studentStatus = localStorage.getItem('jabu_student_status') || 'active'; 
  const overlay = document.getElementById('result-overlay');
  const title = document.getElementById('result-title');
  const message = document.getElementById('result-message');

  overlay.classList.remove('hidden', 'granted', 'denied');

  if (studentStatus === 'suspended') {
    // Play harsh buzzer and triple vibrate
    playSecuritySound(false);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    
    overlay.classList.add('denied');
    title.textContent = "ACCESS DENIED";
    message.textContent = "Student Account is Suspended.";
  } else {
    // Play happy chime and quick vibrate
    playSecuritySound(true);
    if ("vibrate" in navigator) navigator.vibrate(200);
    
    overlay.classList.add('granted');
    title.textContent = "ACCESS GRANTED";
    message.textContent = `Token [${decodedText.substring(0, 10)}...] Verified.`;
  }
}

function onScanError(errorMessage) { }

// --- 4. RESET & MANUAL OVERRIDE ---
function resetScanner() {
  document.getElementById('result-overlay').classList.add('hidden');
  if(html5QrcodeScanner) html5QrcodeScanner.resume();
}

function simulateScan() {
  onScanSuccess("MANUAL-OVERRIDE-12345", null);
}