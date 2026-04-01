import React from 'react';
import { StyleSheet, View } from 'react-native';

const VERTICAL_LINES = new Array(14).fill(0);
const HORIZONTAL_LINES = new Array(22).fill(0);

export function GridBackdrop() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.glowOrbTop} />
      <View style={styles.glowOrbBottom} />

      <View style={styles.grid}>
        {VERTICAL_LINES.map((_, i) => (
          <View key={`v-${i}`} style={[styles.verticalLine, { left: `${(i * 100) / (VERTICAL_LINES.length - 1)}%` }]} />
        ))}
        {HORIZONTAL_LINES.map((_, i) => (
          <View key={`h-${i}`} style={[styles.horizontalLine, { top: `${(i * 100) / (HORIZONTAL_LINES.length - 1)}%` }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glowOrbTop: {
    position: 'absolute',
    top: -140,
    right: -120,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(46, 230, 166, 0.08)',
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -180,
    left: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.09)',
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
});
