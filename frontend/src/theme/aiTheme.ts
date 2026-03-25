/**
 * Futuristic AI Financial Intelligence Theme
 * Inspired by Apple, Stripe, and modern AI platforms
 */

export const AIColors = {
  // Background layers
  background: '#0B0F1A',
  backgroundSecondary: '#0F1420',
  surface: '#121826',
  surfaceLight: '#1A2235',
  surfaceGlass: 'rgba(18, 24, 38, 0.8)',
  
  // Accent colors
  primary: '#2EE6A6',        // Neon teal
  primaryDim: 'rgba(46, 230, 166, 0.15)',
  primaryGlow: 'rgba(46, 230, 166, 0.4)',
  secondary: '#3B82F6',      // Electric blue
  secondaryDim: 'rgba(59, 130, 246, 0.15)',
  secondaryGlow: 'rgba(59, 130, 246, 0.4)',
  
  // Semantic colors
  success: '#10B981',
  successDim: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorDim: 'rgba(239, 68, 68, 0.15)',
  
  // Text colors
  text: '#E5E7EB',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  textDim: '#4B5563',
  
  // Border colors
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderGlow: 'rgba(46, 230, 166, 0.3)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  
  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#2EE6A6', '#10B981'],
  gradientSecondary: ['#3B82F6', '#6366F1'],
  gradientDark: ['#0B0F1A', '#121826'],
  gradientGlass: ['rgba(18, 24, 38, 0.9)', 'rgba(18, 24, 38, 0.7)'],
};

export const AISpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const AIRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const AIShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: AIColors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  glowBlue: {
    shadowColor: AIColors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const AITypography = {
  // Display - Large metrics
  displayLarge: {
    fontSize: 48,
    fontWeight: '700' as const,
    lineHeight: 56,
    letterSpacing: -1,
  },
  displayMedium: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  
  // Headings
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  
  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Labels
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontSize: 10,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  
  // Buttons
  button: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
};

// Animation configs
export const AIAnimations = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    tension: 100,
    friction: 8,
  },
};
