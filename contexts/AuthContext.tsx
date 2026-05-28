import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  active: boolean;
  phone: string;
  department: string;
  period: string;
  initials: string;
  degree?: string;
}

const MOCK_USER: User = {
  id: '1',
  name: 'Prof. Pablo Mora',
  email: 'docente@edu.ec',
  active: true,
  phone: '+593 98 765 4321',
  department: 'Ciencias Biológicas',
  period: '2025',
  initials: 'PM',
};

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
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password?: string): Promise<boolean> => {
    // Aceptamos el usuario de prueba
    if (email === MOCK_USER.email && password === '123456') {
      setUser(MOCK_USER);
      await AsyncStorage.setItem('@user', JSON.stringify(MOCK_USER));
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@user');
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    await AsyncStorage.setItem('@user', JSON.stringify(updated));
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
