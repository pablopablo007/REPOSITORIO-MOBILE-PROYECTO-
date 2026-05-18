import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type BadgeStatus = 'Pendiente' | 'Validado' | 'Observado' | 'Generado con IA' | 'Escaneado' | string;

interface BadgeProps {
  status: BadgeStatus;
  label?: string;
}

export function Badge({ status, label }: BadgeProps) {
  let backgroundColor = '#e5e7eb'; // Default gray
  let textColor = '#374151';

  switch (status) {
    case 'Pendiente':
      backgroundColor = '#fef3c7'; // Amber background
      textColor = '#d97706'; // Amber text
      break;
    case 'Validado':
      backgroundColor = '#dcfce7'; // Green background
      textColor = '#15803d'; // Green text
      break;
    case 'Observado':
      backgroundColor = '#fee2e2'; // Red background
      textColor = '#b91c1c'; // Red text
      break;
    case 'Generado con IA':
      backgroundColor = '#ede9fe'; // Purple background
      textColor = '#7c3aed'; // Purple text
      break;
    case 'Escaneado':
      backgroundColor = '#e0f2fe'; // Blue background
      textColor = '#0369a1'; // Blue text
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
