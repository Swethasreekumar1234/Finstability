/**
 * Bottom Tab Navigator
 * Five-tab layout: Home · Health · Schemes · Invest · Profile
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList } from '../types';
import { AIColors, AIRadius, AITypography } from '../theme/aiTheme';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import FinancialHealthScoreScreen from '../screens/FinancialHealthScoreScreen';
import GovSchemesScreen from '../screens/GovSchemesScreen';
import InvestmentRecommendationsScreen from '../screens/InvestmentRecommendationsScreen';
import FinancialProfileScreen from '../screens/FinancialProfileScreen';

const Tab = createBottomTabNavigator<TabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof TabParamList, { active: IoniconsName; inactive: IoniconsName }> = {
  Home:    { active: 'home',              inactive: 'home-outline' },
  Health:  { active: 'heart',             inactive: 'heart-outline' },
  Schemes: { active: 'shield-checkmark',  inactive: 'shield-checkmark-outline' },
  Invest:  { active: 'trending-up',       inactive: 'trending-up-outline' },
  Profile: { active: 'person',            inactive: 'person-outline' },
};

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: AIColors.primary,
        tabBarInactiveTintColor: AIColors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <View style={styles.tabBackground} />,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name as keyof TabParamList];
          const iconName = focused ? icons.active : icons.inactive;
          return (
            <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"    component={DashboardScreen}               options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Health"  component={FinancialHealthScoreScreen}    options={{ tabBarLabel: 'Health' }} />
      <Tab.Screen name="Schemes" component={GovSchemesScreen}              options={{ tabBarLabel: 'Schemes' }} />
      <Tab.Screen name="Invest"  component={InvestmentRecommendationsScreen} options={{ tabBarLabel: 'Invest' }} />
      <Tab.Screen name="Profile" component={FinancialProfileScreen}        options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: AIColors.border,
    height: 72,
    paddingTop: 8,
    paddingBottom: 12,
    elevation: 0,
  },
  tabBackground: {
    flex: 1,
    backgroundColor: AIColors.surface,
    borderTopWidth: 1,
    borderTopColor: `${AIColors.primary}20`,
  },
  tabLabel: {
    ...(AITypography.label as object),
    marginTop: 2,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 32,
    borderRadius: AIRadius.md,
  },
  iconWrapperActive: {
    backgroundColor: `${AIColors.primary}18`,
  },
});
