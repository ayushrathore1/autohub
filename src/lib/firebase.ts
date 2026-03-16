import { initializeApp } from "firebase/app";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    memoryLocalCache,
    CACHE_SIZE_UNLIMITED
} from "firebase/firestore";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ---------------------------------------------------------
// ? CONFIGURATION
// ---------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDDer9o6DqRuFVSQwRcq0BqvDkc72oKSRk",
    authDomain: "arvindregister-353e5.firebaseapp.com",
    projectId: "arvindregister-353e5",
    storageBucket: "arvindregister-353e5.firebasestorage.app",
    messagingSenderId: "557116649734",
    appId: "1:557116649734:web:822bbad24cca3274012e87",
    measurementId: "G-79C2SNJC56"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with modern cache settings (fixes deprecation warning)
let db: ReturnType<typeof getFirestore>;

try {
    // Try persistent multi-tab cache first with explicit long polling to prevent QUIC issues
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
    });
    console.info('🛡️ Firestore initialized with persistent multi-tab cache (Long Polling)');
} catch (err: any) {
    // If IndexedDB has version issues, clear it and use memory cache
    if (err?.message?.includes('not compatible') || err?.code === 'failed-precondition') {
        console.warn('⚠️ Clearing incompatible IndexedDB cache...');
        try {
            // Clear the problematic IndexedDB - attempt multiple common paths
            const dbName = `firestore/[DEFAULT]/${firebaseConfig.projectId}/main`;
            const deleteRequest = indexedDB.deleteDatabase(dbName);

            deleteRequest.onsuccess = () => {
                console.info('✅ Incompatible Firestore cache cleared successfully');
            };

            deleteRequest.onerror = () => {
                console.error('❌ Failed to clear Firestore cache');
            };

            // Fall back to memory cache for this session
            db = initializeFirestore(app, {
                experimentalForceLongPolling: true,
                localCache: memoryLocalCache()
            });
            console.info('✅ Firestore initialized with memory cache (cleared old data)');
        } catch (innerErr) {
            console.error('Failed to recover from Firestore error:', innerErr);
            db = getFirestore(app);
            console.info('⚠️ Firestore initialized with default settings');
        }
    } else {
        // Default fallback
        console.error('Firestore initialization error:', err);
        db = getFirestore(app);
        console.info('⚠️ Firestore initialized with default settings');
    }
}

const auth = getAuth(app);

// ✅ FIX: Explicitly set auth persistence to LOCAL (survives browser refresh & restart)
setPersistence(auth, browserLocalPersistence)
  .then(() => console.info('✅ Auth persistence set to LOCAL (IndexedDB)'))
  .catch((err) => console.warn('⚠️ Auth persistence setting failed:', err));

const storage = getStorage(app);

export { app, db, auth, storage };
