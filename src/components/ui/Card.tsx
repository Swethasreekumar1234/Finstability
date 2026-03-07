/**
 * Modern Card Component
 * Glassmorphism and elevated card styles
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../theme/colors';

type CardVariant = 'elevated' | 'outlined' | 'glass' | 'filled';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: keyof typeof Spacing | number;
  borderRadius?: keyof typeof BorderRadius | number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  style,
  onPress,
  padding = 'md',
  borderRadius = 'lg',
}) => {
  const paddingValue = typeof padding === 'number' ? padding : Spacing[padding];
  const radiusValue = typeof borderRadius === 'number' ? borderRadius : BorderRadius[borderRadius];

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.surface,
          ...Shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: Colors.surface,
          borderWidth: 1,
          borderColor: Colors.cardBorder,
        };
      case 'glass':
        return {
          backgroundColor: Colors.cardBackgroundGlass,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          ...Shadows.sm,
        };
      case 'filled':
        return {
          backgroundColor: Colors.backgroundSecondary,
        };
      default:
        return {};
    }
  };

  const cardStyle = [
    styles.base,
    { padding: paddingValue, borderRadius: radiusValue },
    getVariantStyle(),
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

interface GradientCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  colors?: string[];
}

export const GradientCard: React.FC<GradientCardProps> = ({
  children,
  style,
}) => {
  return (
    <View style={[styles.gradientCard, style]}>
      <View style={styles.gradientOverlay} />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  gradientCard: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
});

export default Card;
