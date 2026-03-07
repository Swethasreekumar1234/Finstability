/**
 * Google Sign-In Configuration for Expo
 * Uses expo-auth-session for OAuth flow
 */

import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

// Enable browser dismissal for auth sessions
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
// Get these from Google Cloud Console -> APIs & Services -> Credentials
// Create OAuth 2.0 Client IDs for Android, iOS, and Web
export const GOOGLE_CONFIG = {
  // Web Client ID (required for Firebase)
  webClientId: '793985902050-fh14tv9v63afmojstglvmh7a4sfr2vti.apps.googleusercontent.com',
  // Android Client ID (from google-services.json)
  androidClientId: '793985902050-hm0bu890qe1f2hi5dbvfr9re7lp7pq0e.apps.googleusercontent.com',
  // iOS Client ID
  iosClientId: '793985902050-YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
};

/**
 * Hook for Google Sign-In
 * Usage: const [request, response, promptAsync] = useGoogleAuth();
 */
export const useGoogleAuth = () => {
  const redirectUri = makeRedirectUri({
    native: 'com.trishajanath.finstability://',
  });

  console.log('Redirect URI:', redirectUri);

  return Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
  });
};

/**
 * Google Sign-In Configuration Guide
 * 
 * 1. Go to Google Cloud Console (console.cloud.google.com)
 * 2. Select your Firebase project
 * 3. Go to APIs & Services -> Credentials
 * 4. Create OAuth 2.0 Client IDs:
 *    
 *    For Web:
 *    - Application type: Web application
 *    - Authorized redirect URIs: https://finstability-3e71d.firebaseapp.com/__/auth/handler
 *    
 *    For Android:
 *    - Package name: com.trishajanath.finstability
 *    - SHA-1 certificate fingerprint: (get from your keystore)
 *    
 *    For iOS:
 *    - Bundle ID: com.trishajanath.finstability
 * 
 * 5. Copy the Client IDs to GOOGLE_CONFIG above
 * 
 * 6. Enable Google Sign-In in Firebase Console:
 *    - Authentication -> Sign-in method -> Google -> Enable
 *    - Add the Web Client ID
 */

export default GOOGLE_CONFIG;
