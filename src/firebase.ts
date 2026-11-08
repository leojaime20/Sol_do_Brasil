import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import config from './firebase-config.json';

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
export async function signIn() {
  await setPersistence(auth, browserLocalPersistence);
  try { await signInWithPopup(auth, provider); }
  catch (error) {
    if ((error as { code?: string }).code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
    } else throw error;
  }
}
