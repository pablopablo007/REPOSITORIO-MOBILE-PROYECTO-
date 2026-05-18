import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    const success = await login(email);
    if (success) {
      // Redirection is handled in the _layout or we can force it here
      const userStr = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('@user'));
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.role === 'docente') router.replace('/(docente)');
        if (user.role === 'coordinador') router.replace('/(coordinador)');
        if (user.role === 'admin') router.replace('/(admin)');
      }
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const selectRole = (roleEmail: string) => {
    setEmail(roleEmail);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Ionicons name="school" size={80} color="#2563eb" />
          <Text style={styles.title}>EduSudamericano</Text>
          <Text style={styles.subtitle}>Gestión de Evidencias CACES</Text>
        </View>

        <View style={styles.roleSelector}>
          <Text style={styles.label}>Selecciona un rol para pruebas:</Text>
          
          <TouchableOpacity 
            style={[styles.roleButton, email === 'docente@edu.ec' && styles.roleActiveDocente]} 
            onPress={() => selectRole('docente@edu.ec')}
          >
            <Ionicons name="person" size={24} color={email === 'docente@edu.ec' ? '#fff' : '#2563eb'} />
            <View style={styles.roleInfo}>
              <Text style={[styles.roleName, email === 'docente@edu.ec' && {color: '#fff'}]}>Docente</Text>
              <Text style={[styles.roleEmail, email === 'docente@edu.ec' && {color: '#e0e7ff'}]}>docente@edu.ec</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleButton, email === 'coordinador@edu.ec' && styles.roleActiveCoordinador]} 
            onPress={() => selectRole('coordinador@edu.ec')}
          >
            <Ionicons name="shield-checkmark" size={24} color={email === 'coordinador@edu.ec' ? '#fff' : '#0f766e'} />
            <View style={styles.roleInfo}>
              <Text style={[styles.roleName, email === 'coordinador@edu.ec' && {color: '#fff'}]}>Coordinador</Text>
              <Text style={[styles.roleEmail, email === 'coordinador@edu.ec' && {color: '#ccfbf1'}]}>coordinador@edu.ec</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.roleButton, email === 'admin@edu.ec' && styles.roleActiveAdmin]} 
            onPress={() => selectRole('admin@edu.ec')}
          >
            <Ionicons name="settings" size={24} color={email === 'admin@edu.ec' ? '#fff' : '#7c3aed'} />
            <View style={styles.roleInfo}>
              <Text style={[styles.roleName, email === 'admin@edu.ec' && {color: '#fff'}]}>Administrador</Text>
              <Text style={[styles.roleEmail, email === 'admin@edu.ec' && {color: '#ede9fe'}]}>admin@edu.ec</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="correo@edu.ec"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Ingresar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  roleSelector: {
    marginBottom: 32,
    gap: 12,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  roleActiveDocente: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  roleActiveCoordinador: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  roleActiveAdmin: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  roleInfo: {
    marginLeft: 16,
  },
  roleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  roleEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
