import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDFvCKvXVB4geUAlGPUaH601Y7vaJluuCg",
  authDomain: "jabu--sams.firebaseapp.com",
  projectId: "jabu--sams",
  storageBucket: "jabu--sams.firebasestorage.app",
  messagingSenderId: "493197354",
  appId: "1:493197354:web:039351fcc3046e0fb5cb53"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
