import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ── Resolución automática de la URL del backend ─────────────
//
// CÓMO FUNCIONA:
//  • Desarrollo (Expo Go / dev client):
//      Expo expone la IP de tu PC en Constants.expoConfig.hostUri
//      (ej: "192.168.1.15:8081"). Tomamos esa IP y le ponemos el
//      puerto del backend (:3000) → automático, sin tocar nada.
//
//  • App compilada (EAS Build - producción / preview):
//      Lee la variable de entorno EXPO_PUBLIC_API_URL que defines
//      en el dashboard de EAS o en el archivo .env.local del proyecto.
//      Ejemplo: EXPO_PUBLIC_API_URL=https://api.miuniversidad.com

const getServerBaseUrl = (): string => {
  // 1. Si hay una variable de entorno definida (EAS producción), úsala.
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. En desarrollo, Expo expone la IP del servidor de desarrollo.
  //    Tomamos esa IP y la apuntamos al puerto del backend (3000).
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]; // quita el puerto :8081
    return `http://${host}:3000`;
  }

  // 3. Fallback para emulador Android (accede a localhost del PC)
  return 'http://10.0.2.2:3000';
};

export const SERVER_BASE_URL = getServerBaseUrl();
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

// Interceptor para manejar errores de red y respuesta
api.interceptors.response.use(
  (response) => response.data as any,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error.response?.data || { message: 'Error de conexión con el servidor' });
  }
);

// Override API type to allow success property
const typedApi = api as any;
export default typedApi;

