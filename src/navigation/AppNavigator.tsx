/**
 * App Navigator
 * Main navigation configuration for the Finstability app
 */

import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, View, StyleSheet, Text, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import {
  LoginScreen,
  PhoneLoginScreen,
  OtpVerificationScreen,
  ProfileSetupScreen,
  DashboardScreen,
  FinancialInputScreen,
} from '../screens';
import { useAuthStore } from '../store/authStore';
import { AIColors, AITypography, AISpacing, AIRadius, AIShadows } from '../theme/aiTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { isLoggedIn, isInitialized, initialize } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsReady(true);
    };
    init();

    // Pulse animation for loading
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  if (!isReady || !isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.glowOrb, { opacity: pulseAnim }]} />
        <View style={styles.logoContainer}>
          <Text style={styles.loadingLogo}>₹</Text>
        </View>
        <Text style={styles.loadingTitle}>FINSTABILITY</Text>
        <Text style={styles.loadingSubtitle}>AI Financial Intelligence</Text>
        <ActivityIndicator size="large" color={AIColors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isLoggedIn ? 'Dashboard' : 'Login'}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: AIColors.background },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PhoneLogin" component={PhoneLoginScreen} />
        <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen 
          name="FinancialInput" 
          component={FinancialInputScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AIColors.background,
  },
  glowOrb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: AIColors.primary,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: AIRadius.xl,
    backgroundColor: AIColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: AISpacing.lg,
    ...AIShadows.glow,
  },
  loadingLogo: {
    fontSize: 48,
    color: AIColors.background,
    fontWeight: '700',
  },
  loadingTitle: {
    ...AITypography.h1,
    color: AIColors.text,
    letterSpacing: 4,
    marginBottom: AISpacing.xs,
  },
  loadingSubtitle: {
    ...AITypography.body,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.xl,
  },
  spinner: {
    marginBottom: AISpacing.md,
  },
  loadingText: {
    ...AITypography.bodySmall,
    color: AIColors.textMuted,
  },
});
