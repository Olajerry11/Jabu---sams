function verifyPin() {
  const pin = document.getElementById('pin-input').value;
  const errorMessage = document.getElementById('error-message');
  
  // Set our Master Security PIN
  if (pin === "1234") {
    errorMessage.classList.add('hidden');
    
    // Success! Send them securely to the Scanner Gate
    window.location.href = "scanner.html";
  } else {
    // Wrong PIN! Flash the error and clear the box
    errorMessage.classList.remove('hidden');
    document.getElementById('pin-input').value = ""; 
  }
}