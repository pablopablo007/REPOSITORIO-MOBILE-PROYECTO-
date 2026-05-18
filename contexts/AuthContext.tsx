import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Role = 'docente' | 'coordinador' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  active: boolean;
  phone: string;
  department: string;
  period: string;
  initials: string;
}

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Prof. Pablo Mora',
    email: 'docente@edu.ec',
    role: 'docente',
    active: true,
    phone: '+593 98 765 4321',
    department: 'Ciencias Biológicas',
    period: '2025',
    initials: 'PM',
  },
  {
    id: '2',
    name: 'MSc. María Gómez',
    email: 'coordinador@edu.ec',
    role: 'coordinador',
    active: true,
    phone: '+593 99 876 5432',
    department: 'Coordinación Académica',
    period: '2025',
    initials: 'MG',
  },
  {
    id: '3',
    name: 'Ing. Carlos Ruiz',
    email: 'admin@edu.ec',
    role: 'admin',
    active: true,
    phone: '+593 97 654 3210',
    department: 'Dirección de Sistemas',
    period: '2025',
    initials: 'CR',
  },
];

interface AuthContextData {
  user: User | null;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string): Promise<boolean> => {
    const foundUser = MOCK_USERS.find(u => u.email === email && u.active);
    if (foundUser) {
      setUser(foundUser);
      await AsyncStorage.setItem('@user', JSON.stringify(foundUser));
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@user');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
