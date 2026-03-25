/**
 * Modern Button Component
 * Premium button styles with loading states
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = true,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: Colors.primary,
            ...Shadows.colored,
          },
          text: { color: Colors.textInverse },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: Colors.secondary,
            ...Shadows.md,
          },
          text: { color: Colors.textInverse },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: Colors.primary,
          },
          text: { color: Colors.primary },
        };
      case 'ghost':
        return {
          container: {
            backgroundColor: Colors.backgroundSecondary,
          },
          text: { color: Colors.textPrimary },
        };
      case 'danger':
        return {
          container: {
            backgroundColor: Colors.error,
            ...Shadows.md,
          },
          text: { color: Colors.textInverse },
        };
      default:
        return { container: {}, text: {} };
    }
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: {
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.md,
            borderRadius: BorderRadius.sm,
          },
          text: { fontSize: 14 },
        };
      case 'md':
        return {
          container: {
            paddingVertical: Spacing.md,
            paddingHorizontal: Spacing.lg,
            borderRadius: BorderRadius.md,
          },
          text: { fontSize: 16 },
        };
      case 'lg':
        return {
          container: {
            paddingVertical: Spacing.md + 2,
            paddingHorizontal: Spacing.xl,
            borderRadius: BorderRadius.lg,
          },
          text: { fontSize: 18 },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <View style={styles.loadingContent}>
          <ActivityIndicator
            color={variantStyles.text.color}
            size="small"
          />
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              styles.loadingText,
              textStyle,
            ]}
          >
            {children}
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              variantStyles.text,
              sizeStyles.text,
              textStyle,
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingText: {
    marginLeft: Spacing.sm,
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});

export default Button;
