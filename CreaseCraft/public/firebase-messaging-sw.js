// Give the service worker access to Firebase Messaging.
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Initialize the Firebase app in the background service worker
firebase.initializeApp({
  apiKey: "AIzaSyB5cdGz5r8auVa0htWK7ESA9t5lg8F7hHc",
  authDomain: "creasecraft-23140.firebaseapp.com",
  projectId: "creasecraft-23140",
  storageBucket: "creasecraft-23140.firebasestorage.app",
  messagingSenderId: "497055289673",
  appId: "1:497055289673:web:f959e7161f17ab339b0a98",
  measurementId: "G-PEPWCDX2WB"
});

firebase.messaging();
