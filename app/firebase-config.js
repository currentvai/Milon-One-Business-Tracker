import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "businesstracker-6c25a.firebaseapp.com",
  projectId: "businesstracker-6c25a",
  storageBucket: "businesstracker-6c25a.firebasestorage.app",
  messagingSenderId: "303495428682",
  appId: "1:303495428682:web:..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
