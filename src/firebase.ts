// Firebase Entegrasyonu — SohbetGo
// =====================================
// Project: sohbetgo-d2e75
// Realtime Database + Anonymous Auth + Analytics
// =====================================

import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  serverTimestamp,
  query,
  limitToLast,
  onDisconnect,
  remove,
  off,
  get,
  type DatabaseReference,
} from "firebase/database";

// 🔥 Firebase Config — sohbetgo.net
const firebaseConfig = {
  apiKey: "AIzaSyAAB7U_wsFCloR2mg_vI5JEq5akFaxjmTI",
  authDomain: "sohbetgo-d2e75.firebaseapp.com",
  databaseURL: "https://sohbetgo-d2e75-default-rtdb.firebaseio.com",
  projectId: "sohbetgo-d2e75",
  storageBucket: "sohbetgo-d2e75.firebasestorage.app",
  messagingSenderId: "81583987228",
  appId: "1:81583987228:web:37892ca712e87721aa9dd9",
  measurementId: "G-PGR831BDL2",
};

// =====================================
// Firebase başlatma — TEK SEFERLİK
// =====================================
let app: FirebaseApp | null = null;
let firebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  // ✅ databaseURL varsa Firebase aktif
  firebaseReady = !!firebaseConfig.databaseURL && !!app;
  if (firebaseReady) {
    console.log("[SohbetGo] 🔥 Firebase Realtime aktif:", firebaseConfig.projectId);
  }
} catch (e) {
  console.error("[SohbetGo] Firebase init error:", e);
}

// 📊 Analytics — lazy load (browser'da, hata vermesin)
if (app && firebaseReady && typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics, isSupported }) => {
      isSupported()
        .then((ok) => {
          if (ok && app) {
            getAnalytics(app);
            console.log("[SohbetGo] 📊 Analytics aktif");
          }
        })
        .catch(() => {});
    })
    .catch(() => {});
}

export const isFirebaseConfigured = firebaseReady;
export const auth = app ? getAuth(app) : null;
export const db = app ? getDatabase(app) : null;

export {
  ref,
  push,
  set,
  onValue,
  onChildAdded,
  serverTimestamp,
  query,
  limitToLast,
  onDisconnect,
  remove,
  off,
  get,
  signInAnonymously,
  onAuthStateChanged,
};
export type { User, DatabaseReference };
