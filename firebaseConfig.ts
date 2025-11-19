
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// --- IMPORTANT: DEPLOYMENT CONFIGURATION ---
// To make this platform 100% online and cooperative, you must replace the values below
// with your actual Firebase project credentials.
// 1. Go to console.firebase.google.com
// 2. Create/Open a project -> Project Settings -> General -> Your Apps -> SDK Setup/Configuration
// 3. Copy the values and paste them here.

const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// We wrap initialization in a try-catch to prevent the app from crashing white-screen
// if the user hasn't configured it yet.
let app;
let db: any;
let auth: any;
let googleProvider: any;

try {
    // Check if config is still the placeholder
    if (firebaseConfig.apiKey === "PASTE_YOUR_API_KEY_HERE") {
        console.warn("Firebase is not configured. Please update firebaseConfig.ts");
        // Try to load from localStorage as a fallback for the preview environment
        const savedConfig = localStorage.getItem('firebaseConfig');
        if (savedConfig) {
            app = initializeApp(JSON.parse(savedConfig));
        } else {
            // Initialize with dummy data to prevent crash, but functionality will fail gracefully
             app = initializeApp(firebaseConfig); 
        }
    } else {
        app = initializeApp(firebaseConfig);
    }
    
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();

} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

export { db, auth, googleProvider };
