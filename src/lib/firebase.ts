import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAvOz6w5WnJfAcMDzXfXIK3czlWtKJwrEw",
  authDomain: "studio-4693874887-c194d.firebaseapp.com",
  projectId: "studio-4693874887-c194d",
  storageBucket: "studio-4693874887-c194d.firebasestorage.app",
  messagingSenderId: "495492585274",
  appId: "1:495492585274:web:b63b5b7717ff39a530e203",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);