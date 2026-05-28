import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificacionesModal } from '../../components/NotificacionesModal';

export default function DocenteLayout() {
  const { user } = useAuth();
  const { unreadCount } = useData();
  const router = useRouter();
  const [showNotifs, setShowNotifs] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#1e2d4a' },
          headerTintColor: '#fff',
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#6b7280',
          headerRight: () => (
            <View style={hStyles.headerRight}>
              {/* Bell icon with badge */}
              <TouchableOpacity style={hStyles.headerIcon} onPress={() => setShowNotifs(true)}>
                <Ionicons name="notifications" size={24} color="#fff" />
                {unreadCount > 0 && (
                  <View style={hStyles.badge}>
                    <Text style={hStyles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {/* Avatar */}
              <TouchableOpacity style={hStyles.avatar} onPress={() => router.push('/(docente)/perfil')}>
                <Text style={hStyles.avatarText}>{user?.initials || '??'}</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
            headerTitle: 'EduSudamericano',
          }}
        />
        <Tabs.Screen
          name="actividades"
          options={{
            title: 'Actividades',
            tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
            headerTitle: 'Mis Actividades',
          }}
        />
        <Tabs.Screen
          name="archivos"
          options={{
            title: 'Mis Archivos',
            tabBarIcon: ({ color }) => <Ionicons name="folder" size={24} color={color} />,
            headerTitle: 'Mis Archivos',
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>

      <NotificacionesModal visible={showNotifs} onClose={() => setShowNotifs(false)} />
    </>
  );
}

const hStyles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 12, gap: 12 },
  headerIcon: { position: 'relative', marginRight: 4 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
