import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  TextInput, Alert, Image, Switch 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

export default function PerfilScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const { evidences } = useData();

  const [isEditing, setIsEditing] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Stats
  const subidos = evidences.filter(e => e.docenteId === user?.id).length;
  const entregados = evidences.filter(e => e.docenteId === user?.id && e.status !== 'Observado').length;
  const validados = evidences.filter(e => e.docenteId === user?.id && e.status === 'Validado').length;

  // Form states
  const [phone, setPhone] = useState(user?.phone || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [period, setPeriod] = useState(user?.period || '');
  const [degree, setDegree] = useState(user?.degree || '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar || '');

  useEffect(() => {
    // Load notif pref
    AsyncStorage.getItem('@notif_pref').then(val => {
      if (val !== null) setNotifEnabled(val === 'true');
    });
  }, []);

  const toggleNotif = async (val: boolean) => {
    setNotifEnabled(val);
    await AsyncStorage.setItem('@notif_pref', String(val));
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas cerrar la sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Cerrar sesión', 
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        }
      }
    ]);
  };

  const handleSave = async () => {
    await updateUser({
      phone,
      department,
      period,
      degree,
      avatar: avatarUri,
    });
    setIsEditing(false);
    Toast.show({ type: 'success', text1: 'Perfil actualizado ✓' });
  };

  const handleCancel = () => {
    // Reset to user data
    setPhone(user?.phone || '');
    setDepartment(user?.department || '');
    setPeriod(user?.period || '');
    setDegree(user?.degree || '');
    setAvatarUri(user?.avatar || '');
    setIsEditing(false);
  };

  const pickImage = async () => {
    if (!isEditing) return;
    
    Alert.alert('Cambiar foto', 'Elige una opción', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Tomar foto', 
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return alert('Se requiere permiso para la cámara');
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.5 });
          if (!result.canceled) setAvatarUri(result.assets[0].uri);
        }
      },
      { 
        text: 'Elegir de galería', 
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return alert('Se requiere permiso para la galería');
          const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.5 });
          if (!result.canceled) setAvatarUri(result.assets[0].uri);
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.headerTop}>
            {isEditing ? (
              <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
                <Text style={styles.headerCancelText}>Cancelar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
                <Ionicons name="chevron-back" size={28} color="#fff" />
              </TouchableOpacity>
            )}

            <Text style={styles.headerTitle}>{isEditing ? 'Editar Perfil' : 'Mi Perfil'}</Text>

            {isEditing ? (
              <TouchableOpacity onPress={handleSave} style={styles.headerBtn}>
                <Text style={styles.headerSaveText}>Guardar</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerBtn}>
                <Ionicons name="create-outline" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} activeOpacity={isEditing ? 0.7 : 1}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{user?.initials || '??'}</Text>
                </View>
              )}
              {isEditing && (
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.heroName}>{user?.name}</Text>
            <Text style={styles.heroEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Docente</Text>
            </View>
          </View>
        </View>

        {/* STATS */}
        {!isEditing && (
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { borderTopColor: '#3b82f6' }]}>
              <Text style={styles.statNum}>{subidos}</Text>
              <Text style={styles.statLabel}>Subidos</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: '#d97706' }]}>
              <Text style={styles.statNum}>{entregados}</Text>
              <Text style={styles.statLabel}>Entregados</Text>
            </View>
            <View style={[styles.statCard, { borderTopColor: '#15803d' }]}>
              <Text style={styles.statNum}>{validados}</Text>
              <Text style={styles.statLabel}>Validados</Text>
            </View>
          </View>
        )}

        {/* INFO SECTION */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Correo electrónico</Text>
              <Text style={styles.infoText}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              ) : (
                <Text style={styles.infoText}>{phone}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="business-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Departamento</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={department} onChangeText={setDepartment} />
              ) : (
                <Text style={styles.infoText}>{department}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Período activo</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={period} onChangeText={setPeriod} keyboardType="number-pad" />
              ) : (
                <Text style={styles.infoText}>{period}</Text>
              )}
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.infoIconBox}>
              <Ionicons name="school-outline" size={20} color="#64748b" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Título</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={degree} onChangeText={setDegree} />
              ) : (
                <Text style={styles.infoText}>{degree || 'No especificado'}</Text>
              )}
            </View>
          </View>
        </View>

        {/* SETTINGS SECTION */}
        <View style={styles.settingsSection}>
          <View style={styles.settingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
              <Text style={styles.settingLabel}>Notificaciones</Text>
            </View>
            <Switch 
              value={notifEnabled} 
              onValueChange={toggleNotif}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={notifEnabled ? '#2563eb' : '#f8fafc'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="information-circle-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
              <Text style={styles.settingLabel}>Versión de la app</Text>
            </View>
            <Text style={styles.versionText}>v1.0.0</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  hero: {
    backgroundColor: '#1e2d4a',
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerBtn: {
    padding: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerCancelText: {
    color: '#fff',
    fontSize: 16,
  },
  headerSaveText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    bottom: 12,
    right: 0,
    backgroundColor: '#1e293b',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1e2d4a',
  },
  heroName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  heroEmail: {
    color: '#aac4e8',
    fontSize: 13,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    width: '31%',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 36,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    paddingLeft: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#0f172a',
  },
  settingsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  versionText: {
    fontSize: 14,
    color: '#64748b',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
