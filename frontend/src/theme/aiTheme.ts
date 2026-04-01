/**
 * Futuristic AI Financial Intelligence Theme
 * Inspired by Apple, Stripe, and modern AI platforms
 */

export const AIColors = {
  // Background layers
  background: '#0E131B',
  backgroundSecondary: '#141B24',
  surface: '#1A2230',
  surfaceLight: '#222D3E',
  surfaceGlass: 'rgba(18, 24, 38, 0.8)',
  
  // Accent colors
  primary: '#10B981',        // Financial trust green
  primaryDim: 'rgba(16, 185, 129, 0.16)',
  primaryGlow: 'rgba(16, 185, 129, 0.28)',
  secondary: '#4A7CFF',
  secondaryDim: 'rgba(74, 124, 255, 0.14)',
  secondaryGlow: 'rgba(74, 124, 255, 0.28)',
  
  // Semantic colors
  success: '#10B981',
  successDim: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorDim: 'rgba(239, 68, 68, 0.15)',
  
  // Text colors
  text: '#E6EDF7',
  textSecondary: '#A6B2C2',
  textMuted: '#7C8A9C',
  textDim: '#5F6D80',
  
  // Border colors
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderGlow: 'rgba(16, 185, 129, 0.22)',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  
  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#10B981', '#0F9F70'],
  gradientSecondary: ['#4A7CFF', '#5368D8'],
  gradientDark: ['#0E131B', '#1A2230'],
  gradientGlass: ['rgba(18, 24, 38, 0.9)', 'rgba(18, 24, 38, 0.7)'],
};

export const AISchemeCategoryColors: Record<string, string> = {
  subsidy: AIColors.warning,
  pension: '#7C6CF0',
  insurance: AIColors.secondary,
  grant: AIColors.primary,
  loan_support: AIColors.error,
  scholarship: '#E56FA1',
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

export const AITypefaces = {
  display: 'SpaceGrotesk_700Bold',
  heading: 'SpaceGrotesk_500Medium',
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodyBold: 'DMSans_700Bold',
};

export const AITypography = {
  // Display - Large metrics
  displayLarge: {
    fontFamily: AITypefaces.display,
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  displayMedium: {
    fontFamily: AITypefaces.display,
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontFamily: AITypefaces.heading,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  
  // Headings
  h1: {
    fontFamily: AITypefaces.display,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h2: {
    fontFamily: AITypefaces.heading,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  h3: {
    fontFamily: AITypefaces.heading,
    fontSize: 18,
    lineHeight: 26,
  },
  
  // Body
  bodyLarge: {
    fontFamily: AITypefaces.body,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: AITypefaces.body,
    fontSize: 14,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: AITypefaces.body,
    fontSize: 13,
    lineHeight: 20,
  },
  
  // Labels
  label: {
    fontFamily: AITypefaces.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  labelSmall: {
    fontFamily: AITypefaces.bodyMedium,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  
  // Buttons
  button: {
    fontFamily: AITypefaces.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  buttonSmall: {
    fontFamily: AITypefaces.bodyMedium,
    fontSize: 13,
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
