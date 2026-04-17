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
import { getFirestore, collection, addDoc, getDocs, getDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// ---- YOUR FIREBASE CONFIG ----
// Replace the placeholder values below with your actual Firebase credentials.
// Never commit real API keys to a public repository.
const firebaseConfig = {
  apiKey: "AIzaSyBdkU-JwarklAHvsJrpiT8-fyUa2flqWnE",
  authDomain: "yogabinds-faa6f.firebaseapp.com",
  projectId: "yogabinds-faa6f",
  storageBucket: "yogabinds-faa6f.firebasestorage.app",
  messagingSenderId: "149493449941",
  appId: "1:149493449941:web:0a3a8614c73c2bfc71ce5c",
  measurementId: "G-2PXFN0XL1R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ---- Auth ----
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: cred.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function signupUser(email, password, profile) {
  email = String(email || '').trim().toLowerCase();
  if (profile) {
    if (profile.firstName) profile.firstName = String(profile.firstName).trim().slice(0, 50);
    if (profile.lastName) profile.lastName = String(profile.lastName).trim().slice(0, 50);
    if (profile.phone) profile.phone = String(profile.phone).trim().slice(0, 30);
  }
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Set display name
    if (profile && profile.firstName) {
      await updateProfile(cred.user, {
        displayName: profile.firstName + ' ' + profile.lastName
      });
    }
    // Save profile to Firestore
    if (profile) {
      await addDoc(collection(db, "users"), {
        uid: cred.user.uid,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: email,
        phone: profile.phone || '',
        createdAt: serverTimestamp()
      });
    }
    return { success: true, user: cred.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    // Error signing out
    return false;
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function googleSignIn() {
  try {
    var provider = new GoogleAuthProvider();
    var result = await signInWithPopup(auth, provider);
    return { success: true, user: result.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ---- Save Feedback ----
export async function saveFeedback(name, email, message) {
  name = String(name || '').trim().slice(0, 100);
  email = String(email || '').trim().toLowerCase().slice(0, 200);
  message = String(message || '').trim().slice(0, 2000);
  if (!name || !email || !message) return false;
  try {
    await addDoc(collection(db, "feedback"), {
      name: name,
      email: email,
      message: message,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    // Silent failure — caller handles error
    return false;
  }
}

// ---- Save Booking ----
export async function saveBooking(bookingData) {
  try {
    var user = auth.currentUser;
    // Sanitize string fields
    if (bookingData.fullName) bookingData.fullName = String(bookingData.fullName).trim().slice(0, 100);
    if (bookingData.email) bookingData.email = String(bookingData.email).trim().toLowerCase().slice(0, 200);
    if (bookingData.phone) bookingData.phone = String(bookingData.phone).trim().slice(0, 30);
    await addDoc(collection(db, "bookings"), {
      ...bookingData,
      uid: user ? user.uid : null,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    // Silent failure — caller handles error
    return false;
  }
}

// ---- Fetch User Bookings ----
export async function getUserBookings(uid) {
  try {
    const q = query(collection(db, "bookings"), where("uid", "==", uid), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // Silent failure — return empty
    return [];
  }
}

// ---- Cancel Booking ----
export async function cancelBooking(bookingId) {
  try {
    await deleteDoc(doc(db, "bookings", bookingId));
    return { success: true };
  } catch (error) {
    // Silent failure — caller handles error
    return { success: false, error: error.message };
  }
}

// ---- Get current user ----
export function getCurrentUser() {
  return auth.currentUser;
}

// ---- Save Contact Message ----
export async function saveContact(name, email, message) {
  name = String(name || '').trim().slice(0, 100);
  email = String(email || '').trim().toLowerCase().slice(0, 200);
  message = String(message || '').trim().slice(0, 2000);
  if (!name || !email || !message) return false;
  try {
    await addDoc(collection(db, "contacts"), {
      name: name,
      email: email,
      message: message,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    // Silent failure — caller handles error
    return false;
  }
}

// ---- Fetch Bookings ----
export async function getBookings() {
  try {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // Silent failure — return empty
    return [];
  }
}

// ---- Fetch Feedback ----
export async function getFeedback() {
  try {
    const q = query(collection(db, "feedback"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // Silent failure — return empty
    return [];
  }
}

// ---- Get Firebase Auth ID Token (for authenticated API calls) ----
export async function getAuthToken() {
  var user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    return null;
  }
}

// ---- Fetch Contact Messages ----
export async function getContacts() {
  try {
    const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    // Silent failure — return empty
    return [];
  }
}
