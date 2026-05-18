import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function AdminLayout() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#2d1b69' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#7c3aed',
        tabBarInactiveTintColor: '#6b7280',
        headerRight: () => (
          <View style={hStyles.headerRight}>
            <TouchableOpacity style={hStyles.avatar} onPress={() => router.push('/perfil')}>
              <Text style={hStyles.avatarText}>{user?.initials || '??'}</Text>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Panel',
          tabBarIcon: ({ color }) => <Ionicons name="apps" size={24} color={color} />,
          headerTitle: 'Panel de Administración',
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="periodos"
        options={{
          title: 'Períodos',
          tabBarIcon: ({ color }) => <Ionicons name="calendar" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color }) => <Ionicons name="construct" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const hStyles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#c4b5fd',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
