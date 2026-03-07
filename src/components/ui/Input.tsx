/**
 * Modern Input Component
 * Clean, accessible input fields with focus states
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Animated,
} from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing, Typography } from '../../theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return Colors.error;
    if (isFocused) return Colors.primary;
    return Colors.border;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View
        style={[
          styles.inputContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

interface PhoneInputProps extends Omit<InputProps, 'leftIcon'> {
  countryCode?: string;
  flag?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  countryCode = '+91',
  flag = '🇮🇳',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (props.error) return Colors.error;
    if (isFocused) return Colors.primary;
    return Colors.border;
  };

  return (
    <View style={[styles.container, props.containerStyle]}>
      {props.label && <Text style={styles.label}>{props.label}</Text>}
      
      <View
        style={[
          styles.phoneContainer,
          { borderColor: getBorderColor() },
          isFocused && styles.inputFocused,
          props.error && styles.inputError,
        ]}
      >
        <View style={styles.countryCode}>
          <Text style={styles.flag}>{flag}</Text>
          <Text style={styles.countryCodeText}>{countryCode}</Text>
        </View>
        
        <View style={styles.phoneDivider} />
        
        <TextInput
          style={[styles.phoneInput, props.style]}
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
      </View>
      
      {props.error && <Text style={styles.error}>{props.error}</Text>}
      {props.hint && !props.error && <Text style={styles.hint}>{props.hint}</Text>}
    </View>
  );
};

interface OtpInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  length?: number;
  editable?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChangeText,
  error,
  length = 6,
  editable = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.otpContainer}>
      <TextInput
        style={[
          styles.otpInput,
          isFocused && styles.otpInputFocused,
          error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        maxLength={length}
        textAlign="center"
        editable={editable}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholderTextColor={Colors.textMuted}
        placeholder="••••••"
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.captionMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  inputFocused: {
    borderWidth: 2,
    ...Shadows.md,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  leftIcon: {
    paddingLeft: Spacing.md,
  },
  rightIcon: {
    paddingRight: Spacing.md,
  },
  error: {
    ...Typography.small,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  hint: {
    ...Typography.small,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  // Phone input styles
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  flag: {
    fontSize: 20,
  },
  countryCodeText: {
    ...Typography.bodySemibold,
    color: Colors.textPrimary,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  // OTP input styles
  otpContainer: {
    alignItems: 'center',
  },
  otpInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    fontSize: 28,
    color: Colors.textPrimary,
    letterSpacing: 12,
    fontWeight: '600',
    minWidth: 200,
    ...Shadows.sm,
  },
  otpInputFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    ...Shadows.md,
  },
});

export default Input;
