/**
 * Tips feed - daily, weekly, and long-term financial actions
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FinancialTip } from '../types';
import { AIColors, AIRadius, AISpacing } from '../theme/aiTheme';

const ALL_TIPS: FinancialTip[] = [
  {
    id: 'tip_1',
    title: 'Set Auto-Save on Salary Day',
    description: 'Move at least 20% of income into savings and SIPs immediately after salary credit. This protects your goals from lifestyle inflation.',
    category: 'saving',
    impact: 'high',
    timeframe: 'daily',
    tags: ['Quick Win', 'Automation'],
  },
  {
    id: 'tip_2',
    title: 'Track Spend in 3 Buckets',
    description: 'Tag expenses as needs, wants, and goals. If wants exceed 30%, trim subscriptions and impulse purchases first.',
    category: 'budgeting',
    impact: 'medium',
    timeframe: 'weekly',
    tags: ['Budgeting', 'Clarity'],
  },
  {
    id: 'tip_3',
    title: 'Build a 6-Month Emergency Fund',
    description: 'Prioritize liquid funds or high-yield savings until emergency corpus covers at least 6 months of expenses.',
    category: 'saving',
    impact: 'high',
    timeframe: 'long_term',
    tags: ['High Impact', 'Safety Net'],
  },
  {
    id: 'tip_4',
    title: 'Increase SIP by 10% Every Year',
    description: 'A small annual SIP step-up compounds significantly over long horizons without feeling heavy month to month.',
    category: 'investing',
    impact: 'high',
    timeframe: 'long_term',
    tags: ['Compounding', 'Long Term'],
  },
  {
    id: 'tip_5',
    title: 'Repay Highest-Interest Debt First',
    description: 'Use avalanche strategy: pay minimums on all loans, then aggressively close the highest-interest one.',
    category: 'debt',
    impact: 'high',
    timeframe: 'weekly',
    tags: ['Debt Free', 'Quick Win'],
  },
  {
    id: 'tip_6',
    title: 'Review EMI-to-Income Ratio',
    description: 'Keep total EMIs under 35% of income. If higher, refinance costly loans or delay new liabilities.',
    category: 'debt',
    impact: 'medium',
    timeframe: 'daily',
    tags: ['Risk Control'],
  },
];

const FILTERS: Array<'all' | 'daily' | 'weekly' | 'long_term'> = ['all', 'daily', 'weekly', 'long_term'];

function impactColor(v: FinancialTip['impact']): string {
  if (v === 'high') return AIColors.success;
  if (v === 'medium') return AIColors.warning;
  return AIColors.secondary;
}

export default function TipsScreen() {
  const [filter, setFilter] = useState<'all' | 'daily' | 'weekly' | 'long_term'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const tips = useMemo(() => {
    if (filter === 'all') return ALL_TIPS;
    return ALL_TIPS.filter((t) => t.timeframe === filter);
  }, [filter]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Smart Tips</Text>
        <Text style={styles.subtitle}>Actionable habits for daily, weekly, and long-term financial progress.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{f === 'all' ? 'All' : f.replace('_', ' ')}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {tips.map((tip, index) => {
          const open = expanded[tip.id] || false;
          const color = impactColor(tip.impact);
          return (
            <TouchableOpacity
              key={tip.id}
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => setExpanded((prev) => ({ ...prev, [tip.id]: !prev[tip.id] }))}
            >
              <View style={styles.cardTop}>
                <View style={styles.indexDot}><Text style={styles.indexText}>{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{tip.title}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.impactPill, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.impactText, { color }]}>{tip.impact.toUpperCase()} IMPACT</Text>
                    </View>
                    <Text style={styles.timeframe}>{tip.timeframe.replace('_', ' ')}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={open ? undefined : 2}>{tip.description}</Text>

              <View style={styles.tagRow}>
                {tip.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>
                ))}
              </View>

              <Text style={styles.toggleText}>{open ? 'Tap to collapse' : 'Tap to read more'}</Text>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 96 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  title: { fontSize: 28, color: AIColors.text, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 13, color: AIColors.textSecondary, marginBottom: AISpacing.md },
  filterRow: { marginBottom: AISpacing.md },
  filterChip: {
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
    paddingHorizontal: AISpacing.md,
    paddingVertical: 8,
    backgroundColor: AIColors.surface,
    marginRight: AISpacing.sm,
  },
  filterChipActive: { borderColor: AIColors.primary, backgroundColor: AIColors.primaryDim },
  filterText: { fontSize: 12, color: AIColors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: AIColors.primary },
  card: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
    marginBottom: AISpacing.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: AISpacing.sm, marginBottom: 8 },
  indexDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AIColors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: { color: AIColors.primary, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: AIColors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactPill: { borderRadius: AIRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  impactText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  timeframe: { fontSize: 11, color: AIColors.textMuted },
  description: { fontSize: 13, color: AIColors.textSecondary, lineHeight: 19, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tagPill: {
    borderRadius: AIRadius.full,
    borderWidth: 1,
    borderColor: AIColors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: AIColors.backgroundSecondary,
  },
  tagText: { fontSize: 10, color: AIColors.textSecondary, fontWeight: '600' },
  toggleText: { fontSize: 11, color: AIColors.textMuted },
});
