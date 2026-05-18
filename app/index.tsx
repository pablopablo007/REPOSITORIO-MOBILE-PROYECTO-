import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      // Siempre limpiar sesión al abrir la app - forzar login
      await AsyncStorage.removeItem('@user');
      router.replace('/login');
    };
    init();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.text}>Cargando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  text: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 14,
  },
});
