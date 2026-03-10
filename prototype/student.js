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

// --- 2. STUDENT TO DISPLAY ---
// For this prototype, we are logging in as John Doe
const myMatricNumber = "JABU/ACC/25/089"; 
const docId = myMatricNumber.replace(/\//g, '-');

// --- 3. GENERATE THE SCANNABLE QR CODE ---
// This takes John Doe's matric number and turns it into a scannable barcode
const qrcode = new QRCode(document.getElementById("qrcode"), {
    text: myMatricNumber,
    width: 150,
    height: 150,
    colorDark : "#003366", // JABU Blue
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.H
});

// --- 4. REAL-TIME STATUS LISTENER ---
// This listens to Google's servers. If an admin suspends John Doe, his card updates instantly!
db.collection("students").doc(docId).onSnapshot((doc) => {
    if (doc.exists) {
        const student = doc.data();
        
        // Update the text on the card
        document.getElementById("student-name").textContent = student.name;
        document.getElementById("student-matric").textContent = `Matric: ${student.matric}`;
        
        // Update the status badge color and text
        const statusBadge = document.getElementById("student-status");
        statusBadge.textContent = `Status: ${student.status.toUpperCase()}`;
        
        if (student.status === 'active') {
            statusBadge.className = "status-badge status-active";
        } else {
            statusBadge.className = "status-badge status-suspended";
        }
    } else {
        document.getElementById("student-name").textContent = "User Not Found";
    }
});