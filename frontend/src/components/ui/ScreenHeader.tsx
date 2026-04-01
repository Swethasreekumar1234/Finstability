import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AIColors, AIRadius, AISpacing, AITypography } from '../../theme/aiTheme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
};

export function ScreenHeader({ title, subtitle, onBack, backLabel = 'Back' }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
            <Text style={styles.backText}>{backLabel}</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: AISpacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: AISpacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: AIColors.surface,
  },
  backIcon: {
    ...AITypography.body,
    color: AIColors.text,
  },
  backText: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  title: {
    ...AITypography.displaySmall,
    color: AIColors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
});
