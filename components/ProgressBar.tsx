import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface ProgressBarProps {
  progress: number; // 0 to 100
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, label, showPercentage = true }: ProgressBarProps) {
  let color = '#ef4444'; // Red < 40%
  if (progress >= 70) {
    color = '#22c55e'; // Green >= 70%
  } else if (progress >= 40) {
    color = '#f59e0b'; // Amber 40-69%
  }

  const validProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={styles.container}>
      {label || showPercentage ? (
        <View style={styles.header}>
          {label ? <Text style={styles.label}>{label}</Text> : <View />}
          {showPercentage && <Text style={styles.percentage}>{Math.round(validProgress)}%</Text>}
        </View>
      ) : null}
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${validProgress}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  percentage: {
    fontSize: 14,
    color: '#6b7280',
  },
  track: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
});
