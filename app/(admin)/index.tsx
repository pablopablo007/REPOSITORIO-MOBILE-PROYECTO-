import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

export default function AdminPanel() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>3</Text>
          <Text style={styles.statLabel}>Roles</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>150</Text>
          <Text style={styles.statLabel}>Usuarios</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>1.2k</Text>
          <Text style={styles.statLabel}>Archivos</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statNumber}>2</Text>
          <Text style={styles.statLabel}>Períodos</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="person-add" size={24} color="#7c3aed" />
          <Text style={styles.actionText}>Agregar Usuario</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="calendar-outline" size={24} color="#7c3aed" />
          <Text style={styles.actionText}>Abrir Período</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="download-outline" size={24} color="#7c3aed" />
          <Text style={styles.actionText}>Exportar BD</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Ionicons name="build-outline" size={24} color="#7c3aed" />
          <Text style={styles.actionText}>Sistema</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Actividad Reciente</Text>
      <Card>
        {[
          { id: 1, text: 'Coordinador María Gómez validó 5 evidencias.', time: 'Hace 10 min' },
          { id: 2, text: 'Docente Carlos Ruiz subió 1 evidencia.', time: 'Hace 1 hora' },
          { id: 3, text: 'Período "Mar-Ago 2024" ha sido cerrado.', time: 'Hace 2 días' },
        ].map((act, idx) => (
          <View key={act.id} style={[styles.activityRow, idx === 2 && { borderBottomWidth: 0 }]}>
            <Ionicons name="time-outline" size={20} color="#9ca3af" />
            <View style={styles.activityInfo}>
              <Text style={styles.activityText}>{act.text}</Text>
              <Text style={styles.activityTime}>{act.time}</Text>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', paddingVertical: 16 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#7c3aed' },
  statLabel: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, marginTop: 8 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionText: { color: '#4b5563', fontWeight: '500' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  activityInfo: { marginLeft: 12, flex: 1 },
  activityText: { fontSize: 14, color: '#374151' },
  activityTime: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
