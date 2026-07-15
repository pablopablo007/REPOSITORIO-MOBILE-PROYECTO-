import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Si pruebas en Android Emulator usa 10.0.2.2 en lugar de localhost
// Si pruebas en dispositivo físico usando Expo Go, usa la IP de tu PC (ej: 192.168.1.15)
export const SERVER_BASE_URL = 'http://172.20.10.11:3000';
const API_URL = `${SERVER_BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor para inyectar el token en cada petición
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor opcional para manejar expiración de token, etc.
api.interceptors.response.use(
  (response) => response.data, // Solo devolvemos la data, asumiendo estructura { success, data: {...} }
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: 'Error de conexión con el servidor' });
  }
);

export default api;
