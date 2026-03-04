/**
 * Profile Setup Screen
 * Collects user profile information after successful OTP verification.
 * First-time users must complete this before accessing the dashboard.
 */

import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  RootStackParamList,
  UserType,
  UserTypeLabels,
  RiskTolerance,
  RiskToleranceLabels,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileSetup'>;
};

export default function ProfileSetupScreen({ navigation }: Props) {
  const {
    fullName,
    email,
    selectedUserType,
    monthlyIncome,
    selectedRiskTolerance,
    profileError,
    isProfileSaving,
    updateFullName,
    updateEmail,
    updateUserType,
    updateMonthlyIncome,
    updateRiskTolerance,
    saveProfile,
  } = useAuthStore();

  const handleSaveProfile = async () => {
    const success = await saveProfile();
    if (success) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <Text style={styles.sectionSubtitle}>
                Help us personalize your experience
              </Text>
            </View>
          </View>

          {/* Error Message */}
          {profileError && (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>{profileError}</Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={updateFullName}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.onSurfaceVariant}
              editable={!isProfileSaving}
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={updateEmail}
              placeholder="Enter your email"
              placeholderTextColor={Colors.onSurfaceVariant}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isProfileSaving}
            />
          </View>

          {/* User Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>I am a... *</Text>
            {Object.values(UserType).map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.radioOption}
                onPress={() => updateUserType(type)}
                disabled={isProfileSaving}
              >
                <View
                  style={[
                    styles.radioCircle,
                    selectedUserType === type && styles.radioCircleSelected,
                  ]}
                >
                  {selectedUserType === type && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>{UserTypeLabels[type]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Monthly Income */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Monthly Income *</Text>
            <View style={styles.incomeInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.incomeInput}
                value={monthlyIncome}
                onChangeText={updateMonthlyIncome}
                placeholder="Enter amount"
                placeholderTextColor={Colors.onSurfaceVariant}
                keyboardType="numeric"
                editable={!isProfileSaving}
              />
            </View>
          </View>

          {/* Risk Tolerance Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Risk Tolerance *</Text>
            <Text style={styles.inputHint}>
              How comfortable are you with investment risk?
            </Text>
            {Object.values(RiskTolerance).map((risk) => (
              <TouchableOpacity
                key={risk}
                style={styles.radioOption}
                onPress={() => updateRiskTolerance(risk)}
                disabled={isProfileSaving}
              >
                <View
                  style={[
                    styles.radioCircle,
                    selectedRiskTolerance === risk && styles.radioCircleSelected,
                  ]}
                >
                  {selectedRiskTolerance === risk && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>
                  {RiskToleranceLabels[risk]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.button, isProfileSaving && styles.buttonDisabled]}
            onPress={handleSaveProfile}
            disabled={isProfileSaving}
          >
            {isProfileSaving ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={Colors.onPrimary} size="small" />
                <Text style={styles.buttonText}>Saving Profile...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.onSurface,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: Colors.errorContainer,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorCardText: {
    color: Colors.error,
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.onSurface,
  },
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.secondaryLight,
  },
  currencySymbol: {
    fontSize: 20,
    color: Colors.onSurface,
    paddingLeft: 16,
    fontWeight: '500',
  },
  incomeInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.onSurface,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.secondaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  radioLabel: {
    fontSize: 16,
    color: Colors.onSurface,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.primaryLight,
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
