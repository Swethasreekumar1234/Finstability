import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AIColors, AIRadius, AISpacing, AITypography } from '../../theme/aiTheme';

export interface PriorityActionItem {
  id: string;
  title: string;
  note?: string;
  ctaLabel?: string;
  onPress?: () => void;
}

type Props = {
  title?: string;
  items: PriorityActionItem[];
};

export function PriorityActionsQueue({ title = 'Priority Actions', items }: Props) {
  if (!items.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item, index) => (
        <View key={item.id} style={[styles.row, index !== items.length - 1 && styles.rowDivider]}>
          <View style={styles.indexPill}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <View style={styles.content}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
            {item.ctaLabel && item.onPress ? (
              <TouchableOpacity style={styles.linkBtn} onPress={item.onPress}>
                <Text style={styles.linkText}>{item.ctaLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
    marginBottom: AISpacing.md,
  },
  title: {
    ...AITypography.h3,
    color: AIColors.text,
    marginBottom: AISpacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: AISpacing.sm,
    paddingVertical: AISpacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: AIColors.border,
  },
  indexPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AIColors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  indexText: {
    ...AITypography.labelSmall,
    color: AIColors.primary,
  },
  content: {
    flex: 1,
  },
  itemTitle: {
    ...AITypography.body,
    color: AIColors.text,
    marginBottom: 2,
  },
  itemNote: {
    ...AITypography.bodySmall,
    color: AIColors.textSecondary,
  },
  linkBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  linkText: {
    ...AITypography.buttonSmall,
    color: AIColors.primary,
  },
});
