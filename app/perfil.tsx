import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

const ROLE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  docente: { bg: '#dbeafe', text: '#1e40af', label: 'Docente' },
  coordinador: { bg: '#ccfbf1', text: '#0f766e', label: 'Coordinador' },
  admin: { bg: '#ede9fe', text: '#7c3aed', label: 'Administrador' },
};

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const { evidences } = useData();
  const router = useRouter();

  if (!user) return null;

  const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.docente;
  const myEvidencesCount = evidences.filter(e => e.docenteId === user.id).length;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ],
    );
  };

  const handleEditProfile = () => {
    Toast.show({
      type: 'info',
      text1: 'Próximamente',
      text2: 'Función disponible próximamente.',
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarCircle, { borderColor: roleStyle.text }]}>
          <Text style={[styles.avatarInitials, { color: roleStyle.text }]}>{user.initials}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
          <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>{roleStyle.label}</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Correo electrónico</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="call" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Teléfono</Text>
            <Text style={styles.infoValue}>{user.phone}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="business" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Departamento</Text>
            <Text style={styles.infoValue}>{user.department}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Período activo</Text>
            <Text style={styles.infoValue}>{user.period}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <Ionicons name="stats-chart" size={22} color="#2563eb" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.statsNumber}>{myEvidencesCount}</Text>
          <Text style={styles.statsLabel}>evidencias subidas este período</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile} activeOpacity={0.8}>
        <Ionicons name="create-outline" size={20} color="#2563eb" />
        <Text style={styles.editBtnText}>Editar perfil</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 16,
  },
  avatarInitials: { fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  roleBadgeText: { fontSize: 14, fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  infoContent: { marginLeft: 14, flex: 1 },
  infoLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f3f4f6' },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  statsNumber: { fontSize: 24, fontWeight: 'bold', color: '#1e40af' },
  statsLabel: { fontSize: 13, color: '#6b7280' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    gap: 8,
    marginBottom: 12,
  },
  editBtnText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
