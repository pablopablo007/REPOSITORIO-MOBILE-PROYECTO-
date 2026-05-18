import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useData } from '../../contexts/DataContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function CoordinadorPanel() {
  const { evidences } = useData();
  const router = useRouter();

  const pendientes = evidences.filter(e => e.status === 'Pendiente' || e.status === 'Generado con IA');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>6</Text>
          <Text style={styles.statLabel}>Categorías</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Ind. Críticos</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>45</Text>
          <Text style={styles.statLabel}>Docentes</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Sin Evidencia</Text>
        </Card>
      </View>

      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>Pendientes de revisión ({pendientes.length})</Text>
          <TouchableOpacity onPress={() => router.push('/(coordinador)/revisar')}>
            <Text style={styles.linkText}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        
        {pendientes.slice(0, 3).map(ev => (
          <View key={ev.id} style={styles.evidenceRow}>
            <View style={styles.evidenceInfo}>
              <Text style={styles.evidenceName}>{ev.fileName}</Text>
              <Text style={styles.evidenceSubtitle}>{ev.docenteName} • {ev.indicador}</Text>
            </View>
            <View style={styles.actions}>
              <Ionicons name="checkmark-circle" size={28} color="#22c55e" style={{marginRight: 8}} />
              <Ionicons name="close-circle" size={28} color="#ef4444" />
            </View>
          </View>
        ))}
        {pendientes.length === 0 && (
          <Text style={styles.emptyText}>No hay evidencias pendientes de revisión.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Estado por categoría</Text>
        {[
          { name: '1. Organización', val: 85, color: '#22c55e' },
          { name: '2. Academia', val: 60, color: '#f59e0b' },
          { name: '3. Investigación', val: 30, color: '#ef4444' },
        ].map(cat => (
          <View key={cat.name} style={styles.catRow}>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={[styles.catVal, { color: cat.color }]}>{cat.val}%</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 16 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#0f766e' },
  statLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  linkText: { color: '#0f766e', fontWeight: '500' },
  evidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  evidenceInfo: { flex: 1, marginRight: 12 },
  evidenceName: { fontSize: 14, fontWeight: 'bold', color: '#374151' },
  evidenceSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  actions: { flexDirection: 'row' },
  emptyText: { color: '#6b7280', fontStyle: 'italic', textAlign: 'center', padding: 16 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  catName: { fontSize: 14, color: '#4b5563' },
  catVal: { fontSize: 14, fontWeight: 'bold' }
});
