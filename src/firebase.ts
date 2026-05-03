import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
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
  get, // Eksik olan buydu
  type DatabaseReference,
} from "firebase/database";

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

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getDatabase(app);

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
  get, // Dışarıya aktarımı sağlandı
};
export type { DatabaseReference };
