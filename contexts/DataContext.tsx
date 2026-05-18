import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { BadgeStatus } from '../components/Badge';

export interface Evidence {
  id: string;
  docenteId: string;
  docenteName: string;
  criterio: string;
  indicador: string;
  periodo: string;
  fileName: string;
  date: string;
  status: BadgeStatus;
  comment?: string;
  iaGenerated?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'success' | 'warning' | 'info';
}

export interface Config {
  thresholdGreen: number;
  thresholdAmber: number;
  allowIA: boolean;
  autoNotifications: boolean;
}

interface DataContextData {
  evidences: Evidence[];
  notifications: Notification[];
  config: Config;
  isLoading: boolean;
  unreadCount: number;
  uploadEvidence: (evidence: Omit<Evidence, 'id' | 'date' | 'status'>) => Promise<void>;
  reviewEvidence: (id: string, status: BadgeStatus, comment?: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  updateConfig: (newConfig: Partial<Config>) => Promise<void>;
  clearData: () => Promise<void>;
}

const DataContext = createContext<DataContextData>({} as DataContextData);

const INITIAL_CONFIG: Config = {
  thresholdGreen: 70,
  thresholdAmber: 40,
  allowIA: true,
  autoNotifications: true,
};

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'seed-1',
    userId: '1',
    title: 'Evidencia Observada',
    message: "Tu evidencia 'Syllabus_Biologia_2024.pdf' fue OBSERVADA por Coordinación. Comentario: Falta firma del director.",
    date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
    type: 'warning',
  },
  {
    id: 'seed-2',
    userId: '1',
    title: 'Recordatorio de Indicador',
    message: 'Recordatorio: El indicador 4.1.1 no tiene evidencias cargadas. Fecha límite: 30 mayo 2025.',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    type: 'warning',
  },
  {
    id: 'seed-3',
    userId: '1',
    title: 'Evidencia Validada',
    message: "Tu evidencia 'Titulo_Posgrado.pdf' fue VALIDADA por RRHH.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    type: 'success',
  },
  {
    id: 'seed-4',
    userId: '1',
    title: 'Bienvenida',
    message: 'Bienvenido al sistema EduSudamericano. Completa tu perfil para comenzar.',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    type: 'info',
  },
  {
    id: 'seed-5',
    userId: '1',
    title: 'Período Abierto',
    message: 'El período 2025 está abierto. Puedes comenzar a subir evidencias.',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    type: 'info',
  },
];

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [config, setConfig] = useState<Config>(INITIAL_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => n.userId === user?.id && !n.read).length;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storedEvidences = await AsyncStorage.getItem('@evidences');
      const storedNotifications = await AsyncStorage.getItem('@notifications');
      const storedConfig = await AsyncStorage.getItem('@config');

      if (storedEvidences) setEvidences(JSON.parse(storedEvidences));
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      } else {
        setNotifications(SEED_NOTIFICATIONS);
        await saveData('@notifications', SEED_NOTIFICATIONS);
      }
      if (storedConfig) setConfig(JSON.parse(storedConfig));
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to save ${key}`, e);
    }
  };

  const uploadEvidence = async (evidenceData: Omit<Evidence, 'id' | 'date' | 'status'>) => {
    const newEvidence: Evidence = {
      ...evidenceData,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      status: evidenceData.iaGenerated ? 'Generado con IA' : 'Pendiente',
    };
    const updated = [newEvidence, ...evidences];
    setEvidences(updated);
    await saveData('@evidences', updated);
  };

  const reviewEvidence = async (id: string, status: BadgeStatus, comment?: string) => {
    const updated = evidences.map(e => (e.id === id ? { ...e, status, comment } : e));
    setEvidences(updated);
    await saveData('@evidences', updated);

    const evidence = evidences.find(e => e.id === id);
    if (evidence) {
      const newNotif: Notification = {
        id: Date.now().toString(),
        userId: evidence.docenteId,
        title: status === 'Validado' ? 'Evidencia Validada' : 'Evidencia Observada',
        message: status === 'Validado'
          ? `Tu evidencia ${evidence.fileName} para el indicador ${evidence.indicador} ha sido validada.`
          : `Tu evidencia ${evidence.fileName} tiene observaciones: ${comment}`,
        date: new Date().toISOString(),
        read: false,
        type: status === 'Validado' ? 'success' : 'warning',
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      await saveData('@notifications', updatedNotifs);
    }
  };

  const markNotificationRead = async (id: string) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    await saveData('@notifications', updated);
  };

  const updateConfig = async (newConfig: Partial<Config>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await saveData('@config', updated);
  };

  const clearData = async () => {
    setEvidences([]);
    setNotifications(SEED_NOTIFICATIONS);
    setConfig(INITIAL_CONFIG);
    await AsyncStorage.multiRemove(['@evidences', '@notifications', '@config']);
  };

  return (
    <DataContext.Provider value={{
      evidences,
      notifications,
      config,
      isLoading,
      unreadCount,
      uploadEvidence,
      reviewEvidence,
      markNotificationRead,
      updateConfig,
      clearData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
