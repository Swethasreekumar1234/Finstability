import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailSignup'>;
};

export default function EmailSignupScreen({ navigation }: Props) {
  const { signUpWithEmail, isGoogleLoading, authError, clearError } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const handleSignUp = async () => {
    clearError();
    const res = await signUpWithEmail(fullName, email);
    if (res.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'FinancialInput', params: { fromOnboarding: true } }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <GridBackdrop />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <ScreenHeader
            title="Sign Up"
            subtitle="Create account with name and email"
            onBack={() => navigation.goBack()}
          />

          <View style={styles.card}>
            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={AIColors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={AIColors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSignUp} disabled={isGoogleLoading}>
              {isGoogleLoading ? (
                <ActivityIndicator color={AIColors.background} />
              ) : (
                <Text style={styles.primaryText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AIColors.background },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: AISpacing.md },
  card: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    marginTop: AISpacing.sm,
  },
  label: {
    ...AITypography.label,
    color: AIColors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.backgroundSecondary,
    color: AIColors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtn: {
    marginTop: AISpacing.lg,
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryText: {
    ...AITypography.button,
    color: AIColors.background,
  },
  errorText: {
    ...AITypography.bodySmall,
    color: AIColors.error,
    marginBottom: AISpacing.sm,
  },
});
