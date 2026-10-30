import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const requiredConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(requiredConfig).filter(([, value]) => !value).map(([key]) => key);
if (typeof window !== "undefined" && missing.length) {
  console.error(`[Melodix] Firebase configuration is incomplete: ${missing.join(", ")}`);
}

const app = getApps().length ? getApp() : initializeApp(requiredConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
