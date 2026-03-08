import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZmriHWdg7IUssFqzNe3Rq0oH1bGjFV0w",
  authDomain: "gameforge-hub-01.firebaseapp.com",
  projectId: "gameforge-hub-01",
  storageBucket: "gameforge-hub-01.firebasestorage.app",
  messagingSenderId: "690053252905",
  appId: "1:690053252905:web:f7122b124f03d8aa46d938",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
};
export type { FirebaseUser };
