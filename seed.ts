import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDFvCKvXVB4geUAlGPUaH601Y7vaJluuCg",
  authDomain: "jabu--sams.firebaseapp.com",
  projectId: "jabu--sams",
  storageBucket: "jabu--sams.firebasestorage.app",
  messagingSenderId: "493197354",
  appId: "1:493197354:web:039351fcc3046e0fb5cb53"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const seedData = async () => {
  console.log("Starting Firebase Seed...");
  
  const users = [
    {
      email: 'admin@jabu.edu.ng',
      password: 'password123',
      role: 'admin',
      name: 'System Admin',
      status: 'active'
    },
    {
      email: 'security@jabu.edu.ng',
      password: 'password123',
      role: 'security',
      name: 'Gate 1 Guard',
      status: 'active'
    },
    {
      email: 'student@jabu.edu.ng',
      password: 'password123',
      role: 'student',
      name: 'John Doe',
      matric: 'JABU/ACC/25/089',
      status: 'active'
    }
  ];

  for (const u of users) {
    try {
      console.log(`Creating user: ${u.email}...`);
      // 1. Create Auth Account
      const userCredential = await createUserWithEmailAndPassword(auth, u.email, u.password);
      const uid = userCredential.user.uid;
      
      // 2. Create Firestore Profile
      await setDoc(doc(db, 'users', uid), {
        email: u.email,
        role: u.role,
        name: u.name,
        status: u.status,
        ...(u.matric && { matric: u.matric }),
        createdAt: new Date().toISOString()
      });
      
      console.log(`✅ Successfully created ${u.email}`);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
         console.log(`⚠️ User ${u.email} already exists.`);
      } else {
         console.error(`❌ Error creating ${u.email}:`, e.message);
      }
    }
  }
  
  console.log("\nDone! You can now log into the app using:");
  console.log("Admin: admin@jabu.edu.ng / password123");
  console.log("Student: student@jabu.edu.ng / password123");
  process.exit(0);
};

seedData();
