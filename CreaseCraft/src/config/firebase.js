import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getMessaging } from "firebase/messaging"; // 1. Import getMessaging

const firebaseConfig = {
  apiKey: "AIzaSyB5cdGz5r8auVa0htWK7ESA9t5lg8F7hHc",
  authDomain: "creasecraft-23140.firebaseapp.com",
  projectId: "creasecraft-23140",
  storageBucket: "creasecraft-23140.firebasestorage.app",
  messagingSenderId: "497055289673",
  appId: "1:497055289673:web:f959e7161f17ab339b0a98",
  measurementId: "G-PEPWCDX2WB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// `npm run dev:emulators` points the app at the local Auth + Firestore
// emulators (started with `firebase emulators:start --only auth,firestore`).
if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
export const messaging = getMessaging(app); // 2. Export messaging