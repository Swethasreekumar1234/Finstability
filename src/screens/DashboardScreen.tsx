/**
 * Dashboard Screen
 * Main screen after successful authentication.
 * Displays user profile information and provides logout functionality.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  RootStackParamList,
  UserTypeLabels,
  RiskToleranceLabels,
} from '../types';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

export default function DashboardScreen({ navigation }: Props) {
  const { currentUser, loadUserProfile, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await loadUserProfile();
      setIsLoading(false);
    };
    loadData();
  }, []);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'PhoneLogin' }],
            });
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (isLoading || !currentUser) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{currentUser.fullName}</Text>
          <Text style={styles.welcomeText}>Welcome to Finstability!</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statTitle}>Income</Text>
            <Text style={styles.statValue}>
              {formatCurrency(currentUser.monthlyIncome)}
            </Text>
            <Text style={styles.statSubtitle}>per month</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📈</Text>
            <Text style={styles.statTitle}>Risk Profile</Text>
            <Text style={styles.statValue}>
              {RiskToleranceLabels[currentUser.riskTolerance].split(' ')[0]}
            </Text>
            <Text style={styles.statSubtitle}>tolerance</Text>
          </View>
        </View>

        {/* Profile Details Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Text style={styles.profileIcon}>👤</Text>
            <Text style={styles.profileTitle}>Profile Details</Text>
          </View>

          <View style={styles.profileDivider} />

          <ProfileRow label="Phone" value={`+91 ${currentUser.phoneNumber}`} />
          <ProfileRow
            label="Email"
            value={currentUser.email || 'Not provided'}
          />
          <ProfileRow
            label="Profile Type"
            value={UserTypeLabels[currentUser.userType]}
          />
          <ProfileRow
            label="Monthly Income"
            value={formatCurrency(currentUser.monthlyIncome)}
          />
          <ProfileRow
            label="Risk Tolerance"
            value={RiskToleranceLabels[currentUser.riskTolerance]}
          />
          <ProfileRow
            label="Member Since"
            value={formatDate(currentUser.createdAt)}
          />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Coming Soon</Text>
            <Text style={styles.infoText}>
              Financial tracking, budgeting tools, and personalized insights
              based on your profile will be available soon!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileLabel}>{label}</Text>
      <Text style={styles.profileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.onPrimary,
  },
  logoutButton: {
    padding: 8,
  },
  logoutIcon: {
    fontSize: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  welcomeSection: {
    backgroundColor: Colors.primaryContainer,
    padding: 24,
  },
  greeting: {
    fontSize: 16,
    color: Colors.onPrimaryContainer,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.onPrimaryContainer,
    marginTop: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: Colors.onPrimaryContainer,
    opacity: 0.8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.onSurface,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  profileDivider: {
    height: 1,
    backgroundColor: Colors.secondaryLight,
    marginBottom: 12,
    opacity: 0.3,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  profileLabel: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  profileValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.onSurface,
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  infoCard: {
    backgroundColor: Colors.secondaryContainer,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.onSecondaryContainer,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: Colors.onSecondaryContainer,
    lineHeight: 20,
  },
});
