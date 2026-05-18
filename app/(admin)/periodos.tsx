import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

const PERIODOS = [
  { id: '1', year: '2025', status: 'Abierto' },
  { id: '2', year: '2024', status: 'Cerrado' },
  { id: '3', year: '2023', status: 'Cerrado' },
];

export default function PeriodosScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {PERIODOS.map(p => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.year}>Período {p.year}</Text>
                <View style={[styles.badge, p.status === 'Abierto' ? styles.badgeOpen : styles.badgeClosed]}>
                  <Text style={[styles.badgeText, p.status === 'Abierto' ? styles.badgeTextOpen : styles.badgeTextClosed]}>
                    {p.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionText}>Ver Resumen</Text>
                <Ionicons name="chevron-forward" size={20} color="#7c3aed" />
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  list: { padding: 16 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  info: { flex: 1 },
  year: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeOpen: { backgroundColor: '#dcfce7' },
  badgeClosed: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  badgeTextOpen: { color: '#15803d' },
  badgeTextClosed: { color: '#6b7280' },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionText: { color: '#7c3aed', fontWeight: '500', marginRight: 4 },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});
