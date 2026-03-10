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

console.log("Firebase Cloud Database successfully connected!");

// --- 2. DATABASE AUTO-SEEDER (Runs once if DB is empty) ---
const initialStudents = [
    { name: "Student Name", matric: "JABU/CSC/26/001", status: "active" },
    { name: "John Doe", matric: "JABU/ACC/25/089", status: "active" },
    { name: "Jane Smith", matric: "JABU/LAW/24/112", status: "suspended" }
];

async function seedDatabase() {
    const snapshot = await db.collection("students").get();
    if (snapshot.empty) {
        console.log("Database is empty. Uploading starter students to cloud...");
        initialStudents.forEach(student => {
            // Replace slashes with dashes so it can be used as a Document ID
            const docId = student.matric.replace(/\//g, '-'); 
            db.collection("students").doc(docId).set(student);
        });
    }
}
seedDatabase();

// --- 3. REAL-TIME CLOUD LISTENER ---
// This listens to Google servers. If ANY device changes a status, this updates instantly.
db.collection("students").onSnapshot((snapshot) => {
    const tableBody = document.getElementById('student-table-body');
    tableBody.innerHTML = ''; // Clear the table
    
    let totalCount = 0;
    let activeCount = 0;
    let suspendedCount = 0;

    snapshot.forEach((doc) => {
        const student = doc.data();
        const docId = doc.id;
        
        // Update Counters
        totalCount++;
        if (student.status === 'active') activeCount++;
        if (student.status === 'suspended') suspendedCount++;

        // Build Table Row
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.name}</td>
            <td>${student.matric}</td>
            <td class="status-${student.status}">${student.status.toUpperCase()}</td>
            <td>
            <button class="action-btn ${student.status === 'active' ? 'suspend-btn' : 'reactivate-btn'}" 
                    onclick="toggleStatus('${docId}', '${student.status}')">
                ${student.status === 'active' ? 'Suspend User' : 'Reactivate'}
            </button>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Update the Dashboard Numbers
    document.getElementById('total-students').textContent = totalCount.toLocaleString();
    document.getElementById('active-access').textContent = activeCount.toLocaleString();
    document.getElementById('suspended-users').textContent = suspendedCount.toLocaleString();
});

// --- 4. TOGGLE STATUS IN THE CLOUD ---
function toggleStatus(docId, currentStatus) {
    // Flip the status
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    // Tell Firebase to update the document on Google's servers
    db.collection("students").doc(docId).update({
        status: newStatus
    }).then(() => {
        console.log(`Successfully updated ${docId} to ${newStatus}`);
    }).catch((error) => {
        console.error("Error updating document: ", error);
    });
}