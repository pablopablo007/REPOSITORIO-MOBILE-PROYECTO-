import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Ionicons } from '@expo/vector-icons';

const USERS = [
  { id: '1', name: 'Dr. Juan Pérez', email: 'docente@edu.ec', role: 'docente', active: true },
  { id: '2', name: 'MSc. María Gómez', email: 'coordinador@edu.ec', role: 'coordinador', active: true },
  { id: '3', name: 'Ing. Carlos Ruiz', email: 'admin@edu.ec', role: 'admin', active: true },
  { id: '4', name: 'Lcda. Ana Silva', email: 'docente2@edu.ec', role: 'docente', active: false },
];

export default function UsuariosScreen() {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'docente': return '#2563eb';
      case 'coordinador': return '#0f766e';
      case 'admin': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {USERS.map(u => (
          <Card key={u.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name}>{u.name}</Text>
                <Text style={styles.email}>{u.email}</Text>
                <View style={styles.badges}>
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(u.role) }]}>
                    <Text style={styles.roleText}>{u.role.toUpperCase()}</Text>
                  </View>
                  {!u.active && (
                    <View style={[styles.roleBadge, { backgroundColor: '#ef4444', marginLeft: 8 }]}>
                      <Text style={styles.roleText}>INACTIVO</Text>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity>
                <Ionicons name="create-outline" size={24} color="#6b7280" />
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
  name: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  email: { fontSize: 14, color: '#6b7280', marginBottom: 8 },
  badges: { flexDirection: 'row' },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
});
