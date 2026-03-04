/**
 * Firebase Configuration
 * 
 * To enable Firebase in this Expo app:
 * 
 * 1. Install Firebase packages:
 *    npm install firebase
 * 
 * 2. Copy your Firebase config from Firebase Console:
 *    - Go to Firebase Console > Project Settings
 *    - Under "Your apps", select web app (or create one)
 *    - Copy the firebaseConfig object
 * 
 * 3. Replace the config below with your values
 * 
 * Note: For real SMS OTP authentication, you'll need to:
 *    - Enable Phone Authentication in Firebase Console
 *    - Use Firebase Phone Auth (requires native module)
 *    - Consider using Expo's development builds or EAS
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Firebase configuration from your existing project
// Replace these with your actual values from Firebase Console
const firebaseConfig = {
  apiKey: 'AIzaSyAGTZmGgwhwymtvct0ZIXVdg3PvZzbiWkQ',
  authDomain: 'finstability-3e71d.firebaseapp.com',
  projectId: 'finstability-3e71d',
  storageBucket: 'finstability-3e71d.firebasestorage.app',
  messagingSenderId: '793985902050',
  appId: '1:793985902050:web:YOUR_WEB_APP_ID', // Update this with your web app ID
};

// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics (only supported in browser environment)
export const initAnalytics = async () => {
  const supported = await isSupported();
  if (supported) {
    return getAnalytics(app);
  }
  return null;
};

export default app;

/**
 * IMPORTANT: Firebase Phone Auth in React Native
 * 
 * Expo Managed Workflow:
 * - Firebase Phone Auth doesn't work directly in Expo Go
 * - You need to use Expo Development Builds or eject to bare workflow
 * - Alternatively, use a backend service for OTP verification
 * 
 * For development, the app uses simulated OTP (see authService.ts)
 * 
 * To implement real Firebase Phone Auth:
 * 1. Create a development build: npx expo prebuild
 * 2. Install @react-native-firebase/app and @react-native-firebase/auth
 * 3. Configure native modules following react-native-firebase docs
 * 
 * Resources:
 * - https://docs.expo.dev/guides/using-firebase/
 * - https://rnfirebase.io/
 */
