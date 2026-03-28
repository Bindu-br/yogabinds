// ============================================
// YogaBinds — Firebase Configuration
// ============================================
// INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a project (or select existing one)
// 3. Go to Project Settings > General > Your apps > Add web app
// 4. Copy the firebaseConfig values below
// 5. Enable Firestore Database in the Firebase console
//    (Build > Firestore Database > Create database > Start in test mode)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";

// ---- YOUR FIREBASE CONFIG ----
// Replace the placeholder values below with your actual Firebase credentials.
// Never commit real API keys to a public repository.
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// ---- Save Feedback ----
export async function saveFeedback(name, email, message) {
  try {
    await addDoc(collection(db, "feedback"), {
      name: name,
      email: email,
      message: message,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving feedback:", error);
    return false;
  }
}

// ---- Save Booking ----
export async function saveBooking(bookingData) {
  try {
    await addDoc(collection(db, "bookings"), {
      ...bookingData,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving booking:", error);
    return false;
  }
}

// ---- Save Contact Message ----
export async function saveContact(name, email, message) {
  try {
    await addDoc(collection(db, "contacts"), {
      name: name,
      email: email,
      message: message,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error("Error saving contact:", error);
    return false;
  }
}
