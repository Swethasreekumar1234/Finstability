import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuthStore } from '../store/authStore';
import { AIColors, AISpacing, AIRadius, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { useLanguage } from '../i18n/LanguageContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EmailSignin'>;
};

export default function EmailSigninScreen({ navigation }: Props) {
  const { signInWithEmail, isGoogleLoading, authError, clearError } = useAuthStore();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');

  const handleContinue = async () => {
    clearError();
    const res = await signInWithEmail(email);
    if (res.success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  };

  return (
    <View style={styles.container}>
      <GridBackdrop />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <ScreenHeader
            title={t('auth.emailTitle')}
            subtitle={t('auth.emailSubtitle')}
            onBack={() => navigation.goBack()}
          />

          <View style={styles.card}>
            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <Text style={styles.label}>{t('auth.emailLabel')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.emailPlaceholder')}
              placeholderTextColor={AIColors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue} disabled={isGoogleLoading}>
              {isGoogleLoading ? (
                <ActivityIndicator color={AIColors.background} />
              ) : (
                <Text style={styles.primaryText}>{t('auth.emailContinue')}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linkRow}>
              <Text style={styles.linkText}>{t('auth.emailNoAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('EmailSignup')}>
                <Text style={styles.linkCta}>{t('auth.emailCreateAccount')}</Text>
              </TouchableOpacity>
            </View>
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
    marginTop: AISpacing.sm,
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
  },
  label: {
    ...AITypography.label,
    color: AIColors.text,
    marginBottom: 6,
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
    marginTop: AISpacing.md,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: AIColors.primary,
  },
  primaryText: {
    ...AITypography.button,
    color: AIColors.background,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: AISpacing.md,
  },
  linkText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  linkCta: {
    ...AITypography.bodySmall,
    color: AIColors.text,
    textDecorationLine: 'underline',
  },
  errorText: {
    ...AITypography.bodySmall,
    color: AIColors.error,
    marginBottom: AISpacing.sm,
  },
});
