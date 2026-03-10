// --- 1. FIREBASE SETUP & CONNECTION ---
const firebaseConfig = {
    apiKey: "AIzaSyDFvCKvXVB4geUAlGPUaH6O1Y7vaJluuCg",
    authDomain: "jabu--sams.firebaseapp.com",
    projectId: "jabu--sams",
    storageBucket: "jabu--sams.firebasestorage.app",
    messagingSenderId: "493197354",
    appId: "1:493197354:web:039351fcc3046e0fb5cb53"
};

// Initialize Firebase and Firestore
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
console.log("Gate Scanner connected to Firebase Cloud!");

// --- 2. QR CODE SCANNER ENGINE ---
let html5QrcodeScanner;

function startScanner() {
    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", { fps: 10, qrbox: {width: 250, height: 250} }, /* verbose= */ false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

// Start the camera when the page loads
document.addEventListener("DOMContentLoaded", () => {
    startScanner();
});

// --- 3. CLOUD VERIFICATION LOGIC ---
async function verifyStudent(matricNumber) {
    // Clean up the input and format it to match the Cloud Document IDs
    const formattedMatric = matricNumber.trim().toUpperCase();
    const docId = formattedMatric.replace(/\//g, '-'); 
    
    try {
        console.log(`Checking cloud database for: ${docId}`);
        // Read directly from Google Servers
        const docRef = db.collection("students").doc(docId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const studentData = docSnap.data();
            
            if (studentData.status === 'active') {
                showResult("ACCESS GRANTED", `Verified: ${studentData.name} (${studentData.matric})`, "granted");
            } else if (studentData.status === 'suspended') {
                showResult("ACCESS DENIED", `Suspended: ${studentData.name} (${studentData.matric})`, "denied");
            }
        } else {
            // Student does not exist in the database at all
            showResult("INVALID ID", `No record found for ${formattedMatric}`, "denied");
        }
    } catch (error) {
        console.error("Error connecting to cloud database:", error);
        showResult("SYSTEM ERROR", "Could not connect to database. Check network.", "denied");
    }
}

// --- 4. SCAN & BUTTON TRIGGERS ---
function onScanSuccess(decodedText, decodedResult) {
    // Pause scanner so it doesn't scan 100 times in a row
    if (html5QrcodeScanner) html5QrcodeScanner.pause();
    verifyStudent(decodedText);
}

function onScanFailure(error) {
    // Silently ignore background scan failures
}

function manualVerify() {
    const input = document.getElementById('matric-input').value;
    if (input) {
        if (html5QrcodeScanner) html5QrcodeScanner.pause();
        verifyStudent(input);
    } else {
        alert("Please enter a matric number first.");
    }
}

// --- 5. UI CONTROL (Green/Red Screens) ---
function showResult(title, message, type) {
    document.getElementById('main-scanner').style.display = 'none';
    document.getElementById('nav-links').style.display = 'none';
    
    const resultScreen = document.getElementById('result-screen');
    resultScreen.style.display = 'flex'; // Use flex to center everything
    resultScreen.className = type; // Applies the .granted or .denied CSS
    
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-message').textContent = message;
}

function resetScanner() {
    document.getElementById('result-screen').style.display = 'none';
    document.getElementById('main-scanner').style.display = 'block';
    document.getElementById('nav-links').style.display = 'flex';
    document.getElementById('matric-input').value = '';
    
    // Resume the camera
    if (html5QrcodeScanner) {
        html5QrcodeScanner.resume();
    }
}