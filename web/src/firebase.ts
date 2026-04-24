import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserPopupRedirectResolver 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Firebase Client Configuration
const app = initializeApp(firebaseConfig);

// Initialize Auth with maximum persistence
export const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with OFFLINE persistence enabled
const dbId = firebaseConfig.firestoreDatabaseId;
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, (dbId && dbId !== '(default)' && !dbId.includes('ai-studio-')) ? dbId : undefined);

// Initialize Realtime Database
const url = (firebaseConfig as any).databaseURL;
export const rtdb = (url && !url.includes('PASTE_YOUR_DATABASE_URL_HERE')) 
  ? getDatabase(app) 
  : null;

// Test connection silently - doesn't block if offline
async function testConnection() {
  if (!navigator.onLine) return; // Skip if clearly offline
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase online check successful!");
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (!errorMessage.includes('offline')) {
       console.warn("Firebase Online Sync Check:", errorMessage);
    }
  }
}
testConnection();
