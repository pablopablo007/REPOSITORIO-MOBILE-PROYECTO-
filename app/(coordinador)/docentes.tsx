import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Ionicons } from '@expo/vector-icons';

const DOCENTES = [
  { id: '1', name: 'Dr. Juan Pérez', count: 12, progress: 85 },
  { id: '2', name: 'MSc. Ana López', count: 8, progress: 60 },
  { id: '3', name: 'Ing. Pedro Torres', count: 3, progress: 25 },
];

export default function DocentesScreen() {
  return (
    <ScrollView style={styles.container}>
      {DOCENTES.map(doc => (
        <Card key={doc.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={24} color="#0f766e" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{doc.name}</Text>
              <Text style={styles.count}>{doc.count} evidencias subidas</Text>
            </View>
          </View>
          <ProgressBar progress={doc.progress} label="Cumplimiento global" />
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ccfbf1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  count: { fontSize: 14, color: '#6b7280' },
});
