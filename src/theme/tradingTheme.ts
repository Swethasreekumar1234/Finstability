/**
 * Wall Street Trading Terminal Theme
 * Bloomberg/TradingView inspired dark mode
 */

// Trading Terminal Color Palette
export const TradingColors = {
  // Backgrounds
  background: '#0A0F1C',
  backgroundAlt: '#0B0F19',
  panel: '#111827',
  panelAlt: '#1A1F2E',
  panelGlass: 'rgba(17, 24, 39, 0.85)',
  panelBorder: 'rgba(59, 130, 246, 0.2)',
  
  // Primary accents
  neonGreen: '#00FF9C',
  neonGreenDim: 'rgba(0, 255, 156, 0.7)',
  neonGreenGlow: 'rgba(0, 255, 156, 0.3)',
  neonGreenBg: 'rgba(0, 255, 156, 0.1)',
  
  // Secondary accents
  electricBlue: '#3B82F6',
  electricBlueDim: 'rgba(59, 130, 246, 0.7)',
  electricBlueGlow: 'rgba(59, 130, 246, 0.3)',
  electricBlueBg: 'rgba(59, 130, 246, 0.1)',
  
  // Tertiary
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  
  // Status colors
  positive: '#00FF9C',
  negative: '#EF4444',
  negativeGlow: 'rgba(239, 68, 68, 0.3)',
  negativeBg: 'rgba(239, 68, 68, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  
  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',
  
  // Grid and lines
  gridLine: 'rgba(59, 130, 246, 0.1)',
  gridLineBright: 'rgba(59, 130, 246, 0.2)',
  divider: 'rgba(148, 163, 184, 0.1)',
  
  // Gradients (as arrays for LinearGradient)
  gradientGreen: ['#00FF9C', '#00D084'],
  gradientBlue: ['#3B82F6', '#1D4ED8'],
  gradientPurple: ['#8B5CF6', '#6D28D9'],
  gradientDark: ['#111827', '#0A0F1C'],
};

// Trading Spacing System (4px base)
export const TradingSpacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Trading Border Radius
export const TradingRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Trading Shadows
export const TradingShadows = {
  panel: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: TradingColors.electricBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glowGreen: {
    shadowColor: TradingColors.neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glowRed: {
    shadowColor: TradingColors.negative,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Trading Typography
export const TradingTypography = {
  // Headers
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: TradingColors.textPrimary,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    color: TradingColors.textPrimary,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: TradingColors.textPrimary,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: TradingColors.textPrimary,
  },
  // Body
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: TradingColors.textSecondary,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: TradingColors.textSecondary,
  },
  // Labels
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: TradingColors.textMuted,
  },
  // Metrics (large numbers)
  metric: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -1,
    color: TradingColors.textPrimary,
  },
  metricMd: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    color: TradingColors.textPrimary,
  },
  metricSm: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: TradingColors.textPrimary,
  },
  // Small text
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: TradingColors.textMuted,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: TradingColors.textMuted,
  },
  // Mono (for numbers/data)
  mono: {
    fontSize: 14,
    fontWeight: '500' as const,
    fontFamily: 'monospace',
    color: TradingColors.textPrimary,
  },
  monoLarge: {
    fontSize: 20,
    fontWeight: '600' as const,
    fontFamily: 'monospace',
    color: TradingColors.textPrimary,
  },
};

export default TradingColors;
