import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, Animated, Easing, 
  ActivityIndicator, Keyboard, TouchableWithoutFeedback 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('docente@edu.ec');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFocusedEmail, setIsFocusedEmail] = useState(false);
  const [isFocusedPass, setIsFocusedPass] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  // Animation values
  const entranceAnim = useRef(new Animated.Value(0)).current; // 0 to 1
  const exitAnim = useRef(new Animated.Value(0)).current; // 0 to 1
  const btnScale = useRef(new Animated.Value(1)).current;
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const passBorderAnim = useRef(new Animated.Value(0)).current;

  // Background circles
  const circleAnims = useRef(Array(6).fill(0).map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // 1. Círculos decorativos animados
    circleAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { 
            toValue: 1.15, 
            duration: 3000, 
            delay: i * 400,
            useNativeDriver: true 
          }),
          Animated.timing(anim, { 
            toValue: 1.0, 
            duration: 3000, 
            useNativeDriver: true 
          }),
        ])
      ).start();
    });

    // 2. Animación de entrada
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // Animaciones de focus para los inputs
  useEffect(() => {
    Animated.timing(emailBorderAnim, {
      toValue: isFocusedEmail ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocusedEmail]);

  useEffect(() => {
    Animated.timing(passBorderAnim, {
      toValue: isFocusedPass ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocusedPass]);

  const handleLogin = async () => {
    Keyboard.dismiss();
    
    // Scale btn down and up
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

    setIsLoading(true);

    const success = await login(email, password);
    
    if (success) {
      // 1. Botón muestra spinner (ya está en isLoading) 1.5s
      setTimeout(() => {
        // 2. Card hace fade out hacia arriba
        Animated.timing(exitAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          // 4. Navegar a /(docente)
          router.replace('/(docente)');
        });
      }, 1500);
    } else {
      setIsLoading(false);
      alert('Credenciales incorrectas');
    }
  };

  // Interpolaciones de entrada
  const translateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0]
  });
  
  const opacity = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  // Interpolaciones de salida
  const exitTranslateY = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30]
  });
  
  const exitOpacity = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  });

  const whiteFadeOpacity = exitAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  // Interpolaciones de bordes (Note: backgroundColor/borderColor requires useNativeDriver: false)
  const emailBorderColor = emailBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e2e8f0', '#2563eb']
  });
  
  const passBorderColor = passBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e2e8f0', '#2563eb']
  });

  const circulos = [
    { size: 200, top: -50, left: -50, color: 'rgba(37,99,235,0.15)' },
    { size: 150, top: 100, right: -30, color: 'rgba(99,102,241,0.1)' },
    { size: 100, top: 300, left: 20, color: 'rgba(37,99,235,0.08)' },
    { size: 180, bottom: 100, right: -40, color: 'rgba(99,102,241,0.12)' },
    { size: 80, bottom: 200, left: 60, color: 'rgba(37,99,235,0.1)' },
    { size: 120, bottom: -30, left: -20, color: 'rgba(99,102,241,0.08)' },
  ];

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0f172a' }]} />

        {/* Círculos decorativos de fondo */}
        {circulos.map((c, i) => (
          <Animated.View 
            key={i}
            style={[
              styles.circle,
              {
                width: c.size,
                height: c.size,
                borderRadius: c.size / 2,
                backgroundColor: c.color,
                top: c.top,
                bottom: c.bottom,
                left: c.left,
                right: c.right,
                transform: [{ scale: circleAnims[i] }]
              }
            ]}
          />
        ))}

        <Animated.View style={[styles.contentWrapper, { opacity, transform: [{ translateY }, { translateY: exitTranslateY }] }]}>
          <Animated.View style={{ opacity: exitOpacity }}>
            <View style={styles.header}>
              <Ionicons name="school" size={60} color="#fff" />
              <Text style={styles.title}>EduSudamericano</Text>
              <Text style={styles.subtitle}>Gestión Académica</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Bienvenido</Text>
              <Text style={styles.cardSubtitle}>Inicia sesión para continuar</Text>

              {/* Email Input */}
              <Animated.View style={[styles.inputContainer, { borderColor: emailBorderColor }]}>
                <Ionicons name="mail-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="correo@edu.ec"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  onFocus={() => setIsFocusedEmail(true)}
                  onBlur={() => setIsFocusedEmail(false)}
                />
              </Animated.View>

              {/* Password Input */}
              <Animated.View style={[styles.inputContainer, { borderColor: passBorderColor }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="********"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  onFocus={() => setIsFocusedPass(true)}
                  onBlur={() => setIsFocusedPass(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94a3b8" />
                </TouchableOpacity>
              </Animated.View>

              {/* Login Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity activeOpacity={1} onPress={handleLogin} disabled={isLoading}>
                  <View style={[styles.loginButton, { backgroundColor: '#2563eb' }]}>
                    {isLoading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>

            <Text style={styles.footerText}>© 2025 EduSudamericano · Universidad Sudamericana</Text>
          </Animated.View>
        </Animated.View>

        {/* Fade a blanco final */}
        <Animated.View 
          pointerEvents="none" 
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f4f6f9', opacity: whiteFadeOpacity, zIndex: 10 }]} 
        />
        
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  circle: {
    position: 'absolute',
    zIndex: 0,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 32,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  loginButton: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
