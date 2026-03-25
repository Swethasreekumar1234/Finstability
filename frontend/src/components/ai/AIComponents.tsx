/**
 * AI UI Components
 * Futuristic glassmorphism components for AI Financial Platform
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import {
  AIColors,
  AISpacing,
  AIRadius,
  AIShadows,
  AITypography,
  AIAnimations,
} from '../../theme/aiTheme';

// ============================================================================
// GLASS CARD - Glassmorphism container with glow effects
// ============================================================================
interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'glow' | 'outline';
  onPress?: () => void;
  animated?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  animated = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: AIAnimations.normal,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: AIAnimations.spring.tension,
          friction: AIAnimations.spring.friction,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
    }
  }, []);

  const cardStyle = [
    styles.glassCard,
    variant === 'elevated' && styles.glassCardElevated,
    variant === 'glow' && styles.glassCardGlow,
    variant === 'outline' && styles.glassCardOutline,
    style,
  ];

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Container
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </Container>
    </Animated.View>
  );
};

// ============================================================================
// AI BUTTON - Gradient button with glow effects
// ============================================================================
interface AIButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const AIButton: React.FC<AIButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const buttonStyles = [
    styles.button,
    styles[`button_${size}`],
    styles[`button_${variant}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${size}`],
    styles[`buttonText_${variant}`],
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={buttonStyles}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
      >
        {loading ? (
          <Text style={textStyles}>Loading...</Text>
        ) : (
          <View style={styles.buttonContent}>
            {icon && <View style={styles.buttonIcon}>{icon}</View>}
            <Text style={textStyles}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ============================================================================
// AI INPUT - Modern input field with glow focus state
// ============================================================================
interface AIInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

export const AIInput: React.FC<AIInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  leftIcon,
  rightIcon,
  secureTextEntry,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  style,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: AIAnimations.fast,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [AIColors.border, AIColors.primary],
  });

  return (
    <View style={[styles.inputContainer, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor },
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        {leftIcon && <View style={styles.inputIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            multiline ? styles.inputMultiline : undefined,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={AIColors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightIcon && <View style={styles.inputIcon}>{rightIcon}</View>}
      </Animated.View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
};

// ============================================================================
// METRIC CARD - Display key metrics with animation
// ============================================================================
interface MetricCardProps {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  color?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  prefix = '',
  suffix = '',
  trend,
  trendValue,
  icon,
  color = AIColors.primary,
}) => {
  const countAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(countAnim, {
      toValue: 1,
      duration: AIAnimations.slow,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <GlassCard style={styles.metricCard}>
      <View style={styles.metricHeader}>
        {icon && (
          <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
            {icon}
          </View>
        )}
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Animated.View style={{ opacity: countAnim }}>
        <Text style={[styles.metricValue, { color }]}>
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </Text>
      </Animated.View>
      {trend && trendValue && (
        <View style={styles.metricTrend}>
          <Text style={[
            styles.metricTrendText,
            trend === 'up' && styles.trendUp,
            trend === 'down' && styles.trendDown,
          ]}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

// ============================================================================
// SELECTION CARD - Selectable option card
// ============================================================================
interface SelectionCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  selected?: boolean;
  onPress: () => void;
  style?: ViewStyle;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  title,
  description,
  icon,
  selected = false,
  onPress,
  style,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        style={[
          styles.selectionCard,
          selected && styles.selectionCardSelected,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {icon && (
          <View style={[
            styles.selectionIcon,
            selected && styles.selectionIconSelected,
          ]}>
            {icon}
          </View>
        )}
        <View style={styles.selectionContent}>
          <Text style={[
            styles.selectionTitle,
            selected && styles.selectionTitleSelected,
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={styles.selectionDescription}>{description}</Text>
          )}
        </View>
        <View style={[
          styles.selectionRadio,
          selected && styles.selectionRadioSelected,
        ]}>
          {selected && <View style={styles.selectionRadioInner} />}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ============================================================================
// PROGRESS BAR - Animated progress indicator
// ============================================================================
interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  height?: number;
  animated?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = AIColors.primary,
  height = 4,
  animated = true,
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(widthAnim, {
        toValue: progress,
        duration: AIAnimations.slow,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(progress);
    }
  }, [progress]);

  const width = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.progressContainer, { height }]}>
      <Animated.View
        style={[
          styles.progressBar,
          { width, backgroundColor: color },
        ]}
      />
    </View>
  );
};

// ============================================================================
// SECTION HEADER - Section title with optional action
// ============================================================================
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  action,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon && <View style={styles.sectionIcon}>{icon}</View>}
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action && <View>{action}</View>}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Glass Card
  glassCard: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    padding: AISpacing.lg,
    borderWidth: 1,
    borderColor: AIColors.border,
    ...AIShadows.md,
  },
  glassCardElevated: {
    backgroundColor: AIColors.surfaceLight,
    ...AIShadows.lg,
  },
  glassCardGlow: {
    borderColor: AIColors.borderGlow,
    ...AIShadows.glow,
  },
  glassCardOutline: {
    backgroundColor: 'transparent',
    borderColor: AIColors.borderLight,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AIRadius.lg,
  },
  button_sm: {
    paddingVertical: AISpacing.sm,
    paddingHorizontal: AISpacing.md,
  },
  button_md: {
    paddingVertical: AISpacing.md,
    paddingHorizontal: AISpacing.lg,
  },
  button_lg: {
    paddingVertical: AISpacing.lg,
    paddingHorizontal: AISpacing.xl,
  },
  button_primary: {
    backgroundColor: AIColors.primary,
  },
  button_secondary: {
    backgroundColor: AIColors.secondary,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: AIColors.primary,
  },
  button_ghost: {
    backgroundColor: AIColors.primaryDim,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: AISpacing.sm,
  },
  buttonText: {
    ...AITypography.button,
  },
  buttonText_sm: {
    ...AITypography.buttonSmall,
  },
  buttonText_md: {
    ...AITypography.button,
  },
  buttonText_lg: {
    ...AITypography.button,
    fontSize: 17,
  },
  buttonText_primary: {
    color: AIColors.background,
  },
  buttonText_secondary: {
    color: '#FFFFFF',
  },
  buttonText_outline: {
    color: AIColors.primary,
  },
  buttonText_ghost: {
    color: AIColors.primary,
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },

  // Input
  inputContainer: {
    marginBottom: AISpacing.md,
  },
  inputLabel: {
    ...AITypography.label,
    color: AIColors.textSecondary,
    marginBottom: AISpacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    paddingHorizontal: AISpacing.md,
  },
  inputWrapperFocused: {
    backgroundColor: AIColors.surfaceLight,
  },
  inputWrapperError: {
    borderColor: AIColors.error,
  },
  input: {
    flex: 1,
    ...AITypography.bodyLarge,
    color: AIColors.text,
    paddingVertical: AISpacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: AISpacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: AISpacing.sm,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputIcon: {
    marginHorizontal: AISpacing.xs,
  },
  inputError: {
    ...AITypography.bodySmall,
    color: AIColors.error,
    marginTop: AISpacing.xs,
  },

  // Metric Card
  metricCard: {
    flex: 1,
    minWidth: 140,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: AISpacing.sm,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: AIRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AISpacing.sm,
  },
  metricLabel: {
    ...AITypography.label,
    color: AIColors.textMuted,
    flex: 1,
  },
  metricValue: {
    ...AITypography.displaySmall,
    color: AIColors.text,
  },
  metricTrend: {
    marginTop: AISpacing.sm,
  },
  metricTrendText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  trendUp: {
    color: AIColors.success,
  },
  trendDown: {
    color: AIColors.error,
  },

  // Selection Card
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.lg,
    padding: AISpacing.md,
    borderWidth: 1.5,
    borderColor: AIColors.border,
    marginBottom: AISpacing.sm,
  },
  selectionCardSelected: {
    borderColor: AIColors.primary,
    backgroundColor: AIColors.primaryDim,
  },
  selectionIcon: {
    width: 44,
    height: 44,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: AISpacing.md,
  },
  selectionIconSelected: {
    backgroundColor: AIColors.primaryDim,
  },
  selectionContent: {
    flex: 1,
  },
  selectionTitle: {
    ...AITypography.body,
    color: AIColors.text,
    fontWeight: '500',
  },
  selectionTitleSelected: {
    color: AIColors.primary,
  },
  selectionDescription: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginTop: 2,
  },
  selectionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AIColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionRadioSelected: {
    borderColor: AIColors.primary,
  },
  selectionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: AIColors.primary,
  },

  // Progress Bar
  progressContainer: {
    width: '100%',
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.full,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: AIRadius.full,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: AISpacing.md,
    paddingHorizontal: AISpacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: AISpacing.sm,
  },
  sectionTitle: {
    ...AITypography.h3,
    color: AIColors.text,
  },
  sectionSubtitle: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
    marginTop: 2,
  },
});

export default {
  GlassCard,
  AIButton,
  AIInput,
  MetricCard,
  SelectionCard,
  ProgressBar,
  SectionHeader,
};
