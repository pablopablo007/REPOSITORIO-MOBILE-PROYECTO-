import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  active: boolean;
  phone?: string;
  department?: string;
  period?: string;
  initials?: string;
  degree?: string;
  role?: string;
}

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar sesión al iniciar la app
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        if (token) {
          const res = await api.get('/users/me');
          if (res.success) {
            setUser(res.data.user);
          } else {
            await AsyncStorage.removeItem('@auth_token');
          }
        }
      } catch (error) {
        console.error('Error cargando sesión', error);
        await AsyncStorage.removeItem('@auth_token'); // Ensure token is cleared on error
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', { email, password });
      
      if (res.success) {
        const { accessToken, user: userData } = res.data;
        setUser(userData);
        await AsyncStorage.setItem('@auth_token', accessToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@auth_token');
  };

  const updateUser = async (data: Partial<User>) => {
    try {
      let res;
      // Si hay un avatar nuevo (local URI), enviarlo como FormData al endpoint /me/avatar
      if (data.avatar && !data.avatar.startsWith('/uploads')) {
        const formData = new FormData();
        
        // Agregar la imagen
        formData.append('avatar', {
          uri: data.avatar,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        } as any);

        // Agregar el resto de los campos
        if (data.name) formData.append('name', data.name);
        if (data.phone !== undefined) formData.append('phone', data.phone);
        if (data.department !== undefined) formData.append('department', data.department);
        if (data.period !== undefined) formData.append('period', data.period);
        if (data.degree !== undefined) formData.append('degree', data.degree);

        res = await api.put('/users/me/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Petición normal sin archivo
        res = await api.put('/users/me', data);
      }

      if (res.success) {
        setUser(res.data.user);
      }
    } catch (error) {
      console.error('Error actualizando usuario', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
