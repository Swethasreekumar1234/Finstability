/**
 * Modern Fintech UI Color System
 * Inspired by Stripe, CRED, and Apple-style minimal design
 */

export const Colors = {
  // Primary colors - Emerald Green (financial growth)
  primary: '#10B981',
  primaryDark: '#059669',
  primaryLight: '#34D399',
  primaryGradientStart: '#10B981',
  primaryGradientEnd: '#059669',
  
  // Secondary colors - Slate Blue
  secondary: '#6366F1',
  secondaryLight: '#818CF8',
  accent: '#14B8A6',
  
  // Background colors - Modern neutral
  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Card styles
  cardBackground: 'rgba(255, 255, 255, 0.9)',
  cardBackgroundGlass: 'rgba(255, 255, 255, 0.7)',
  cardBorder: '#E2E8F0',
  
  // Status colors
  error: '#EF4444',
  errorContainer: '#FEF2F2',
  errorLight: '#FCA5A5',
  success: '#10B981',
  successContainer: '#ECFDF5',
  warning: '#F59E0B',
  warningContainer: '#FFFBEB',
  info: '#3B82F6',
  infoContainer: '#EFF6FF',
  
  // Text colors - Dark slate
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',
  
  // Legacy support (mapped to new system)
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onBackground: '#0F172A',
  onSurface: '#0F172A',
  onSurfaceVariant: '#64748B',
  
  // Container colors
  primaryContainer: '#ECFDF5',
  onPrimaryContainer: '#065F46',
  secondaryContainer: '#F1F5F9',
  onSecondaryContainer: '#334155',
  
  // Borders and dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#E2E8F0',
  
  // Shadows (for reference)
  shadowColor: '#0F172A',
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.5)',
  overlayLight: 'rgba(15, 23, 42, 0.1)',
};

// Spacing system (8px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius system
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

// Shadow presets
export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  colored: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Typography scale
export const Typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  bodySemibold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  smallMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};
