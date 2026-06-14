import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    const stored = localStorage.getItem('rapor_5nk_google_access_token');
    const expiry = localStorage.getItem('rapor_5nk_google_access_token_expiry');
    if (stored && expiry && Date.now() < Number(expiry)) {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load access token from storage', e);
  }
  return null;
})();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      let token = cachedAccessToken;
      if (!token) {
        try {
          const stored = localStorage.getItem('rapor_5nk_google_access_token');
          const expiry = localStorage.getItem('rapor_5nk_google_access_token_expiry');
          if (stored && expiry && Date.now() < Number(expiry)) {
            token = stored;
            cachedAccessToken = stored;
          }
        } catch (e) {}
      }
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem('rapor_5nk_google_access_token');
        localStorage.removeItem('rapor_5nk_google_access_token_expiry');
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem('rapor_5nk_google_access_token', cachedAccessToken);
      localStorage.setItem('rapor_5nk_google_access_token_expiry', String(Date.now() + 3500 * 1000));
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    const stored = localStorage.getItem('rapor_5nk_google_access_token');
    const expiry = localStorage.getItem('rapor_5nk_google_access_token_expiry');
    if (stored && expiry && Date.now() < Number(expiry)) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch (e) {}
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    localStorage.removeItem('rapor_5nk_google_access_token');
    localStorage.removeItem('rapor_5nk_google_access_token_expiry');
  } catch (e) {}
};
