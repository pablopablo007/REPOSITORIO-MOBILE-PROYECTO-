import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { DataProvider } from '../contexts/DataContext';
import Toast from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error capturado por ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Ocurrió un error</Text>
          <Text style={ebStyles.message}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fef2f2' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#b91c1c', marginBottom: 12 },
  message: { fontSize: 14, color: '#7f1d1d', textAlign: 'center' },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="(docente)" />
            <Stack.Screen
              name="indicador-detalle"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#1e2d4a' },
                headerTintColor: '#fff',
                headerTitle: 'Detalle del Indicador',
                presentation: 'card',
              }}
            />

            <Stack.Screen
              name="escaner"
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="escaner-preview"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#1e2d4a' },
                headerTintColor: '#fff',
                headerTitle: 'Revisar Imagen',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="escaner-paginas"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#1e2d4a' },
                headerTintColor: '#fff',
                headerTitle: 'Páginas Escaneadas',
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="escaner-guardar"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#1e2d4a' },
                headerTintColor: '#fff',
                headerTitle: 'Guardar Documento',
                presentation: 'card',
              }}
            />
          </Stack>
          <Toast />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
