import { initializeApp, getApps } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDZnIAwfl_H3QcIxKJSx3HUsiH3HXrrwfQ",
  authDomain: "getnear-189b3.firebaseapp.com",
  projectId: "getnear-189b3",
  storageBucket: "getnear-189b3.firebasestorage.app",
  messagingSenderId: "1046766585451",
  appId: "1:1046766585451:web:e300e546f346fcc4d7532e",
  measurementId: "G-XFG1FKV529",
}

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)

// Google provider
const googleProvider = new GoogleAuthProvider()

export { auth, googleProvider, RecaptchaVerifier, signInWithPhoneNumber, signInWithPopup }
