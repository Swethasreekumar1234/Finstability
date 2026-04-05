/**
 * Google Sign-In Configuration for Expo
 * Uses expo-auth-session for OAuth flow
 */

import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

// Enable browser dismissal for auth sessions
WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = 'finstability';
const REDIRECT_PATH = 'oauthredirect';

const getProjectNameForProxy = (): string | null => {
  const owner = Constants.expoConfig?.owner?.replace(/^@/, '').trim();
  const slug = Constants.expoConfig?.slug?.trim();

  if (!owner || !slug) {
    return null;
  }

  return `@${owner}/${slug}`;
};

const buildProxyStartUrl = (authUrl: string, returnUrl: string): string => {
  const projectName = getProjectNameForProxy();
  if (!projectName) {
    throw new Error('Expo Go auth proxy requires expoConfig.owner and expoConfig.slug');
  }

  const query = new URLSearchParams({
    authUrl,
    returnUrl,
  });

  return `https://auth.expo.io/${projectName}/start?${query.toString()}`;
};

// Google OAuth Client IDs
// Get these from Google Cloud Console -> APIs & Services -> Credentials
// Create OAuth 2.0 Client IDs for Android, iOS, and Web
export const GOOGLE_CONFIG = {
  // Web Client ID (required for Firebase)
  webClientId: '793985902050-fh14tv9v63afmojstglvmh7a4sfr2vti.apps.googleusercontent.com',
  // Android Client ID (from google-services.json)
  androidClientId: '793985902050-hm0bu890qe1f2hi5dbvfr9re7lp7pq0e.apps.googleusercontent.com',
  // iOS client ID is required by expo-auth-session on iOS.
  // Use dedicated iOS client ID when available; fallback keeps Expo Go flow unblocked.
  iosClientId: '793985902050-fh14tv9v63afmojstglvmh7a4sfr2vti.apps.googleusercontent.com',
};

/**
 * Hook for Google Sign-In
 * Usage: const [request, response, promptAsync] = useGoogleAuth();
 */
export const useGoogleAuth = () => {
  const appRedirectUri = AuthSession.makeRedirectUri({
    scheme: APP_SCHEME,
    path: REDIRECT_PATH,
  });

  const isExpoGo = Platform.OS !== 'web' && Constants.appOwnership === 'expo';
  const projectNameForProxy = getProjectNameForProxy();
  const redirectUri = isExpoGo
    ? (() => {
        if (!projectNameForProxy) {
          throw new Error('Expo Go auth proxy requires expoConfig.owner and expoConfig.slug');
        }
        return `https://auth.expo.io/${projectNameForProxy}`;
      })()
    : appRedirectUri;

  console.log('Redirect URI:', redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CONFIG.webClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId || GOOGLE_CONFIG.webClientId,
    redirectUri,
    responseType: 'token',
    scopes: ['openid', 'profile', 'email'],
    usePKCE: false,
    extraParams: {
      prompt: 'select_account',
    },
  });

  const promptWithProxy = async (
    options: Parameters<typeof promptAsync>[0] = {}
  ): Promise<Awaited<ReturnType<typeof promptAsync>>> => {
    if (isExpoGo) {
      if (!request?.url) {
        throw new Error('Google auth request is not ready yet.');
      }

      const proxyUrl = buildProxyStartUrl(request.url, appRedirectUri);
      return promptAsync({
        ...options,
        url: proxyUrl,
      });
    }

    return promptAsync(options);
  };

  return [request, response, promptWithProxy] as const;
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
