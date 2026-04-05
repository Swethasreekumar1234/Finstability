import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { apiService } from '../services/apiService';
import { useAuthStore } from '../store/authStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'AddTransaction'>;
};

const CATEGORIES = ['food', 'transport', 'shopping', 'entertainment', 'salary', 'other'];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddTransactionScreen({ navigation }: Props) {
  const firebaseUid = useAuthStore((s) => s.firebaseUid);
  const currentUser = useAuthStore((s) => s.currentUser);
  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('other');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || !merchant.trim() || !date) {
      Alert.alert('Missing fields', 'Please fill date, amount, and merchant.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter an amount greater than 0.');
      return;
    }

    setLoading(true);
    try {
      await apiService.addTransaction({
        user_id: firebaseUid || currentUser?.email || 'demo-user',
        date,
        amount: parsedAmount,
        type,
        merchant: merchant.trim(),
        category,
      });
      Alert.alert('Saved', 'Transaction added successfully.');
      navigation.goBack();
    } catch (error: any) {
      const message = String(error?.message || 'Unable to save transaction. Please try again.');
      if (message.toLowerCase().includes('duplicate transaction detected')) {
        Alert.alert('Already saved', 'This transaction already exists.');
        navigation.goBack();
        return;
      }
      Alert.alert('Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <GridBackdrop />
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Add Transaction"
          subtitle="Log expenses and income manually."
          onBack={() => navigation.goBack()}
        />

        <View style={styles.card}>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-04-01"
            placeholderTextColor={AIColors.textMuted}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="450"
            placeholderTextColor={AIColors.textMuted}
          />

          <Text style={styles.label}>Merchant</Text>
          <TextInput
            style={styles.input}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="Swiggy"
            placeholderTextColor={AIColors.textMuted}
          />

          <Text style={styles.label}>Type</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.chip, type === 'expense' && styles.activeChip]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.chipText, type === 'expense' && styles.activeChipText]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, type === 'income' && styles.activeChip]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.chipText, type === 'income' && styles.activeChipText]}>Income</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.rowWrap}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, category === item && styles.activeChip]}
                onPress={() => setCategory(item)}
              >
                <Text style={[styles.chipText, category === item && styles.activeChipText]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Saving...' : 'Save Transaction'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md, paddingBottom: 96 },
  card: {
    backgroundColor: AIColors.surface,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.xl,
    padding: AISpacing.md,
  },
  label: { ...AITypography.label, color: AIColors.text, marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: AIColors.backgroundSecondary,
    color: AIColors.text,
  },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: AIColors.backgroundSecondary,
  },
  activeChip: {
    borderColor: AIColors.primary,
    backgroundColor: `${AIColors.primary}20`,
  },
  chipText: { ...AITypography.labelSmall, color: AIColors.textSecondary, textTransform: 'capitalize' },
  activeChipText: { color: AIColors.primary },
  submitBtn: {
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 18,
  },
  submitText: { ...AITypography.button, color: AIColors.background },
});
