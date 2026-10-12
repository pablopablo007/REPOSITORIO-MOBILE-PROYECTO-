import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { NotificacionesModal } from '../../components/NotificacionesModal';

const AnimatedBell = ({ unreadCount, onPress }: { unreadCount: number, onPress: () => void }) => {
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (unreadCount > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
          Animated.delay(2000), // Wait 2 seconds before shaking again
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      shakeAnim.setValue(0);
    }
  }, [unreadCount]);

  const spin = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg']
  });

  return (
    <TouchableOpacity style={hStyles.headerIcon} onPress={onPress}>
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <Ionicons name="notifications" size={24} color="#fff" />
      </Animated.View>
      {unreadCount > 0 && (
        <View style={hStyles.badge}>
          <Text style={hStyles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

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
              {/* Animated Bell icon with badge */}
              <AnimatedBell unreadCount={unreadCount} onPress={() => setShowNotifs(true)} />
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
        <Tabs.Screen
          name="detalle-archivo"
          options={{
            href: null,
            headerTitle: 'Detalles',
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
    backgroundColor: '#ff3b30', // Brighter red
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
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
