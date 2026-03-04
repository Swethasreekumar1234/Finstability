/**
 * Login Screen (Auth Selection)
 * Entry point for authentication - choose between Phone or Google sign-in
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';
import { GOOGLE_CONFIG } from '../config/google';

// Enable browser dismissal
WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { signInWithGoogle, isGoogleLoading, authError, clearError } = useAuthStore();

  // Google Sign-In hook - request ID token for Firebase
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
  });

  // Log the redirect URI for debugging
  useEffect(() => {
    if (request?.redirectUri) {
      console.log('Google Auth Redirect URI:', request.redirectUri);
    }
  }, [request]);

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { params } = response;
      if (params.id_token) {
        console.log('Got ID token, signing in with Firebase...');
        handleGoogleSignIn(params.id_token);
      }
    } else if (response?.type === 'error') {
      console.error('Google Sign-In error:', response.error);
    }
  }, [response]);

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, []);

  const handleGoogleSignIn = async (idToken: string) => {
    const result = await signInWithGoogle(idToken);
    if (result.success) {
      if (result.isNewUser) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ProfileSetup' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }
    }
  };

  const handlePhoneLogin = () => {
    clearError();
    navigation.navigate('PhoneLogin');
  };

  const handleGooglePress = async () => {
    clearError();
    try {
      await promptAsync();
    } catch (error) {
      console.error('Google prompt error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>₹</Text>
          </View>
          <Text style={styles.appName}>Finstability</Text>
          <Text style={styles.tagline}>Your personal finance companion</Text>
        </View>

        {/* Auth Buttons */}
        <View style={styles.buttonSection}>
          {authError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}

          {/* Continue with Phone */}
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={handlePhoneLogin}
          >
            <Text style={styles.phoneIcon}>📱</Text>
            <Text style={styles.phoneButtonText}>Continue with Phone</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Continue with Google */}
          <TouchableOpacity
            style={[styles.googleButton, !request && styles.buttonDisabled]}
            onPress={handleGooglePress}
            disabled={!request || isGoogleLoading}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color={Colors.onSurface} size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <View style={styles.termsSection}>
          <Text style={styles.termsText}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    color: Colors.onPrimary,
    fontWeight: 'bold',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  buttonSection: {
    paddingBottom: 24,
  },
  errorContainer: {
    backgroundColor: Colors.errorContainer,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  phoneButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  phoneIcon: {
    fontSize: 20,
  },
  phoneButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.secondaryLight,
  },
  dividerText: {
    color: Colors.onSurfaceVariant,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
    gap: 12,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: Colors.onSurface,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  termsSection: {
    paddingBottom: 24,
  },
  termsText: {
    textAlign: 'center',
    color: Colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '500',
  },
});
