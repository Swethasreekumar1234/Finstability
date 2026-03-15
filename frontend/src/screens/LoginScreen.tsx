/**
 * Login Screen - Futuristic AI Financial Platform
 * Apple/Stripe inspired dark theme with glassmorphism
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AIShadows, AITypography } from '../theme/aiTheme';
import { GOOGLE_CONFIG } from '../config/google';
import { GlassCard, AIButton } from '../components/ai';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export default function LoginScreen({ navigation }: Props) {
  const { signInWithGoogle, isGoogleLoading, authError, clearError } = useAuthStore();
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
    androidClientId: GOOGLE_CONFIG.androidClientId,
    iosClientId: GOOGLE_CONFIG.iosClientId,
  });

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Glow pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { params } = response;
      if (params.id_token) {
        handleGoogleSignIn(params.id_token);
      }
    }
  }, [response]);

  useEffect(() => {
    clearError();
  }, []);

  const handleGoogleSignIn = async (idToken: string) => {
    const result = await signInWithGoogle(idToken);
    if (result.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: result.isNewUser ? 'ProfileSetup' : 'Dashboard' }],
      });
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
    <View style={styles.container}>
      {/* Background Grid Pattern */}
      <View style={styles.gridPattern}>
        {[...Array(20)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.gridHorizontal, { top: i * 50 }]} />
        ))}
        {[...Array(10)].map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.gridVertical, { left: i * 50 }]} />
        ))}
      </View>

      {/* Glow Orbs */}
      <Animated.View style={[styles.glowOrb, styles.glowOrbPrimary, { opacity: glowAnim }]} />
      <Animated.View style={[styles.glowOrb, styles.glowOrbSecondary, { opacity: glowAnim }]} />

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header with AI Branding */}
          <View style={styles.header}>
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
              <View style={styles.logoBg}>
                <Text style={styles.logoSymbol}>₹</Text>
              </View>
              <View style={styles.logoRing} />
            </Animated.View>
            
            <Text style={styles.appName}>FINSTABILITY</Text>
            <Text style={styles.tagline}>AI-Powered Financial Intelligence</Text>

            {/* Feature Pills */}
            <View style={styles.featureRow}>
              <View style={styles.featurePill}>
                <Text style={styles.featureDot}>●</Text>
                <Text style={styles.featureText}>Smart Analytics</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featureDot}>●</Text>
                <Text style={styles.featureText}>AI Insights</Text>
              </View>
              <View style={styles.featurePill}>
                <Text style={styles.featureDot}>●</Text>
                <Text style={styles.featureText}>Secure</Text>
              </View>
            </View>
          </View>

          {/* Auth Section */}
          <View style={styles.authSection}>
            {authError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>!</Text>
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            )}

            {/* Phone Login - Primary */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePhoneLogin}
              activeOpacity={0.85}
            >
              <View style={styles.buttonGlow} />
              <Text style={styles.buttonIcon}>→</Text>
              <Text style={styles.primaryButtonText}>Continue with Phone</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login - Secondary */}
            <TouchableOpacity
              style={[styles.secondaryButton, !request && styles.buttonDisabled]}
              onPress={handleGooglePress}
              disabled={!request || isGoogleLoading}
              activeOpacity={0.85}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={AIColors.text} size="small" />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={styles.secondaryButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Terms</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
            
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v1.0 • Powered by AI</Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AIColors.background,
  },
  safeArea: {
    flex: 1,
  },
  
  // Grid Pattern Background
  gridPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: AIColors.border,
  },
  gridHorizontal: {
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  gridVertical: {
    top: 0,
    bottom: 0,
    width: 1,
    opacity: 0.3,
  },

  // Glow Effects
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbPrimary: {
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    backgroundColor: AIColors.primary,
    opacity: 0.15,
  },
  glowOrbSecondary: {
    bottom: -100,
    left: -150,
    width: 350,
    height: 350,
    backgroundColor: AIColors.secondary,
    opacity: 0.1,
  },

  content: {
    flex: 1,
    paddingHorizontal: AISpacing.xl,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: AISpacing.xxl,
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: AISpacing.lg,
  },
  logoBg: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...AIShadows.glow,
  },
  logoSymbol: {
    fontSize: 48,
    fontWeight: '700',
    color: AIColors.background,
  },
  logoRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: AIColors.primaryGlow,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: AIColors.text,
    letterSpacing: 3,
    marginBottom: AISpacing.xs,
  },
  tagline: {
    ...AITypography.body,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.xl,
  },

  // Features
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AISpacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.sm,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
    gap: AISpacing.xs,
  },
  featureDot: {
    fontSize: 6,
    color: AIColors.primary,
  },
  featureText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },

  // Auth Section
  authSection: {
    paddingBottom: AISpacing.lg,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.errorDim,
    padding: AISpacing.md,
    borderRadius: AIRadius.lg,
    marginBottom: AISpacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIcon: {
    fontSize: 16,
    marginRight: AISpacing.sm,
  },
  errorText: {
    ...AITypography.bodySmall,
    color: AIColors.error,
    flex: 1,
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIColors.primary,
    paddingVertical: AISpacing.lg,
    borderRadius: AIRadius.lg,
    position: 'relative',
    overflow: 'hidden',
    ...AIShadows.glow,
  },
  buttonGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: AISpacing.sm,
  },
  primaryButtonText: {
    ...AITypography.button,
    color: AIColors.background,
    fontWeight: '600',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AISpacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AIColors.border,
  },
  dividerText: {
    ...AITypography.bodySmall,
    color: AIColors.textMuted,
    marginHorizontal: AISpacing.md,
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AIColors.surface,
    paddingVertical: AISpacing.lg,
    borderRadius: AIRadius.lg,
    borderWidth: 1.5,
    borderColor: AIColors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AIColors.text,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: AISpacing.sm,
  },
  googleG: {
    fontSize: 14,
    fontWeight: '700',
    color: AIColors.background,
  },
  secondaryButtonText: {
    ...AITypography.button,
    color: AIColors.text,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: AISpacing.lg,
  },
  termsText: {
    ...AITypography.bodySmall,
    color: AIColors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: AIColors.primary,
  },
  versionBadge: {
    marginTop: AISpacing.md,
    paddingHorizontal: AISpacing.md,
    paddingVertical: AISpacing.xs,
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
  },
  versionText: {
    ...AITypography.labelSmall,
    color: AIColors.textMuted,
  },
});
