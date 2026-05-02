// Firebase Entegrasyonu
// =====================================
// 🔧 KENDİ FIREBASE PROJENİZİN CONFIG'İNİ AŞAĞIDAKİ firebaseConfig OBJESİNE YAPIŞTIRIN
// Firebase Console → Project Settings → Your apps → Web app → SDK config
//
// Gerekli servisler:
// 1. Realtime Database (databaseURL şart)
// 2. Authentication → Anonymous sign-in açık olmalı
// 3. (Opsiyonel) Analytics
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
  type DatabaseReference,
} from "firebase/database";

// 👇 BURAYA KENDİ CONFIG'İNİZİ YAPIŞTIRIN 👇
const firebaseConfig = {
  apiKey: "AIzaSyAAB7U_wsFCloR2mg_vI5JEq5akFaxjmTI",
  authDomain: "sohbetgo-d2e75.firebaseapp.com",
  databaseURL: "https://sohbetgo-d2e75-default-rtdb.firebaseio.com",
  projectId: "sohbetgo-d2e75",
  storageBucket: "sohbetgo-d2e75.firebasestorage.app",
  messagingSenderId: "81583987228",
  appId: "1:81583987228:web:37892ca712e87721aa9dd9",
  measurementId: "G-PGR831BDL2"
};

// =====================================
// Firebase başlatma — TEK SEFERLİK
// =====================================
let app: FirebaseApp | null = null;
let firebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  firebaseReady =
    firebaseConfig.apiKey !== "AIzaSyAAB7U_wsFCloR2mg_vI5JEq5akFaxjmTI" &&
    !!firebaseConfig.databaseURL;
} catch (e) {
  console.warn("[SohbetGo] Firebase init error:", e);
}

// Analytics opsiyonel — sadece browser'da ve config gerçekse
// Eğer analytics kullanmak istersen bu bloğu aç:
//
// if (app && firebaseReady && typeof window !== "undefined") {
//   import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
//     isSupported().then((ok) => {
//       if (ok && app) getAnalytics(app);
//     });
//   }).catch(() => {});
// }

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
  signInAnonymously,
  onAuthStateChanged,
};
export type { User, DatabaseReference };
