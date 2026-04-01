import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { AIColors, AIRadius, AISpacing, AITypography } from '../theme/aiTheme';
import { GridBackdrop, ScreenHeader } from '../components/ui';
import { apiService } from '../services/apiService';
import { useAuthStore } from '../store/authStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UploadStatement'>;
};

export default function UploadStatementScreen({ navigation }: Props) {
  const firebaseUid = useAuthStore((s) => s.firebaseUid);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('application/octet-stream');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('No file selected');

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'application/pdf'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    setFileUri(file.uri);
    setFileName(file.name);
    setMimeType(file.mimeType || 'application/octet-stream');
    setStatus('File selected. Ready to upload.');
  };

  const handleUpload = async () => {
    if (!fileUri || !fileName) {
      Alert.alert('No file', 'Please select a CSV or PDF statement first.');
      return;
    }

    setLoading(true);
    setStatus('Parsing and uploading statement...');

    try {
      const res = await apiService.uploadBankStatement(firebaseUid || 'demo-user', fileUri, fileName, mimeType);
      setStatus(`Uploaded: ${res.inserted} added, ${res.duplicates} duplicates skipped`);
      Alert.alert('Success', `Inserted ${res.inserted} transactions.`);
      navigation.goBack();
    } catch {
      setStatus('Upload failed. Check file format and required columns.');
      Alert.alert('Upload failed', 'Invalid format, missing columns, or duplicate-heavy file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <GridBackdrop />
      <View style={styles.content}>
        <ScreenHeader
          title="Upload Statement"
          subtitle="Import CSV or PDF bank statements."
          onBack={() => navigation.goBack()}
        />

        <View style={styles.card}>
          <Text style={styles.label}>Supported formats</Text>
          <Text style={styles.value}>CSV, PDF</Text>

          <Text style={styles.label}>Selected file</Text>
          <Text style={styles.value}>{fileName || 'None'}</Text>

          <TouchableOpacity style={styles.secondaryBtn} onPress={pickFile}>
            <Text style={styles.secondaryText}>Choose File</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={handleUpload} disabled={loading}>
            <Text style={styles.primaryText}>{loading ? 'Uploading...' : 'Upload & Parse'}</Text>
          </TouchableOpacity>

          <View style={styles.progressBox}>
            <Text style={styles.progressText}>{status}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AIColors.background },
  content: { padding: AISpacing.md },
  card: {
    backgroundColor: AIColors.surface,
    borderRadius: AIRadius.xl,
    borderWidth: 1,
    borderColor: AIColors.border,
    padding: AISpacing.md,
  },
  label: { ...AITypography.label, color: AIColors.textSecondary, marginTop: 8 },
  value: { ...AITypography.body, color: AIColors.text, marginTop: 2 },
  primaryBtn: {
    marginTop: 16,
    backgroundColor: AIColors.primary,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryText: { ...AITypography.button, color: AIColors.background },
  secondaryBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: AIColors.backgroundSecondary,
  },
  secondaryText: { ...AITypography.buttonSmall, color: AIColors.text },
  progressBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: AIColors.border,
    borderRadius: AIRadius.md,
    backgroundColor: AIColors.backgroundSecondary,
    padding: 12,
  },
  progressText: { ...AITypography.bodySmall, color: AIColors.textSecondary },
});
