import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function CoordinadorLayout() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f4c3a' },
        headerTintColor: '#fff',
        tabBarActiveTintColor: '#0f766e',
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
          tabBarIcon: ({ color }) => <Ionicons name="grid" size={24} color={color} />,
          headerTitle: `Panel Coordinador`,
        }}
      />
      <Tabs.Screen
        name="revisar"
        options={{
          title: 'Revisar',
          tabBarIcon: ({ color }) => <Ionicons name="checkmark-done-circle" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="docentes"
        options={{
          title: 'Docentes',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => <Ionicons name="bar-chart" size={24} color={color} />,
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
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#5eead4',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
});
