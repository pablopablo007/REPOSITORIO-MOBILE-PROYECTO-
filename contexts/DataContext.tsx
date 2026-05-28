import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { BadgeStatus } from '../components/Badge';

export type DocumentType =
  | 'Académico'
  | 'Título/Certificado'
  | 'Informe'
  | 'Acta'
  | 'Generado con IA'
  | 'Escaneado'
  | 'Otro';

export interface Evidence {
  id: string;
  docenteId: string;
  docenteName: string;
  documentType: DocumentType;
  periodo: string;
  fileName: string;
  date: string;
  status: BadgeStatus;
  comment?: string;
  description?: string;
  iaGenerated?: boolean;
  scanned?: boolean;
  [key: string]: any;
}

export interface EvidenceDraft {
  docenteId: string;
  docenteName: string;
  documentType: DocumentType;
  periodo: string;
  fileName: string;
  comment?: string;
  description?: string;
  iaGenerated?: boolean;
  scanned?: boolean;
  [key: string]: any;
}

export interface Task {
  id: string;
  docenteId: string;
  title: string;
  description: string;
  deadline: string; // ISO date
  documentType: DocumentType;
  completed: boolean;
  completedEvidenceId?: string;
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

interface DataContextData {
  evidences: Evidence[];
  notifications: Notification[];
  tasks: Task[];
  isLoading: boolean;
  unreadCount: number;
  uploadEvidence: (evidence: EvidenceDraft) => Promise<string>;
  reviewEvidence: (id: string, status: BadgeStatus, comment?: string) => Promise<void>;
  deleteEvidence: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  completeTask: (taskId: string, evidenceId: string) => Promise<void>;
  clearData: () => Promise<void>;
}

const DataContext = createContext<DataContextData>({} as DataContextData);

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'seed-1',
    userId: '1',
    title: 'Documento observado',
    message: "Tu documento 'Acta_Reunion_Marzo.docx' fue observado. Comentario: Falta firma del director.",
    date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
    type: 'warning',
  },
  {
    id: 'seed-2',
    userId: '1',
    title: 'Nueva actividad asignada',
    message: "Certificado de capacitación",
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    type: 'info',
  },
  {
    id: 'seed-3',
    userId: '1',
    title: 'Documento validado',
    message: "Tu documento 'Titulo_Posgrado.pdf' fue validado por RRHH.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    type: 'success',
  },
];

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const specificDate = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();

const SEED_TASKS: Task[] = [
  {
    id: 'task-1',
    docenteId: '1',
    title: 'Subir título de cuarto nivel',
    description: 'Sube tu título de maestría en PDF firmado y sellado',
    deadline: daysFromNow(2),
    documentType: 'Título/Certificado',
    completed: false,
  },
  {
    id: 'task-2',
    docenteId: '1',
    title: 'Syllabus período 2025',
    description: 'Sube el syllabus de todas tus materias actualizadas',
    deadline: daysFromNow(6),
    documentType: 'Académico',
    completed: false,
  },
  {
    id: 'task-3',
    docenteId: '1',
    title: 'Certificado de capacitación docente',
    description: 'Sube certificados de cursos realizados',
    deadline: daysFromNow(10),
    documentType: 'Título/Certificado',
    completed: false,
  },
];

const SEED_EVIDENCES: Evidence[] = [
  {
    id: 'doc-acad-1',
    docenteId: '1',
    docenteName: 'Prof. Pablo Mora',
    documentType: 'Académico',
    periodo: '2024',
    fileName: 'Syllabus_Biologia_2024.pdf',
    date: specificDate(2025, 3, 15),
    status: 'Validado',
  },
  {
    id: 'doc-cert-1',
    docenteId: '1',
    docenteName: 'Prof. Pablo Mora',
    documentType: 'Título/Certificado',
    periodo: '2025',
    fileName: 'Titulo_Maestria.pdf',
    date: specificDate(2025, 5, 20),
    status: 'Pendiente',
    scanned: true,
  },
  {
    id: 'doc-acta-1',
    docenteId: '1',
    docenteName: 'Prof. Pablo Mora',
    documentType: 'Acta',
    periodo: '2025',
    fileName: 'Acta_Reunion_Marzo.docx',
    date: specificDate(2025, 3, 15),
    status: 'Observado',
    comment: 'Falta firma del director',
  },
];

const normalizeEvidence = (evidence: Evidence): Evidence => {
  const docType = (evidence.documentType || evidence.tipo || (evidence.iaGenerated || evidence.origen === 'ia' ? 'Generado con IA' : 'Académico')) as DocumentType;
  const status = (evidence.status || evidence.estado || 'Pendiente') as BadgeStatus;
  const fileName = evidence.fileName || evidence.nombre || 'Sin_nombre.pdf';
  const date = evidence.date || evidence.fecha || new Date().toISOString();
  const scanned = evidence.scanned || evidence.origen === 'escaneado';
  const iaGenerated = evidence.iaGenerated || evidence.origen === 'ia';
  const docenteId = evidence.docenteId || '1';
  const docenteName = evidence.docenteName || evidence.subidoPor || 'Prof. Pablo Mora';

  return {
    ...evidence,
    id: evidence.id || Date.now().toString(),
    docenteId,
    docenteName,
    subidoPor: docenteName,
    documentType: docType,
    tipo: docType,
    periodo: evidence.periodo || '2025',
    fileName,
    nombre: fileName,
    date,
    fecha: date,
    status,
    estado: status,
    scanned,
    iaGenerated,
    origen: scanned ? 'escaneado' : iaGenerated ? 'ia' : 'subido',
  };
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => n.userId === user?.id && !n.read).length;

  useEffect(() => {
    loadData();
  }, [user?.id]); 

  const loadData = async () => {
    try {
      const userId = user?.id || '1';
      const userEvidencesKey = `@evidencias_${userId}`;
      const storedEvidences = await AsyncStorage.getItem(userEvidencesKey) || await AsyncStorage.getItem('@evidences');
      const storedNotifications = await AsyncStorage.getItem('@notifications');
      const storedTasks = await AsyncStorage.getItem('@tasks');

      if (storedEvidences) {
        const parsedEvidences = JSON.parse(storedEvidences).map(normalizeEvidence);
        setEvidences(parsedEvidences);
        await saveData(userEvidencesKey, parsedEvidences);
      } else {
        const normalizedSeed = SEED_EVIDENCES.map(normalizeEvidence);
        setEvidences(normalizedSeed);
        await saveData(userEvidencesKey, normalizedSeed);
      }

      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      } else {
        setNotifications(SEED_NOTIFICATIONS);
        await saveData('@notifications', SEED_NOTIFICATIONS);
      }

      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      } else {
        setTasks(SEED_TASKS);
        await saveData('@tasks', SEED_TASKS);
      }
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

  const uploadEvidence = async (evidenceData: EvidenceDraft): Promise<string> => {
    const newId = evidenceData.id || Date.now().toString();
    const newEvidence = normalizeEvidence({
      ...evidenceData,
      id: newId,
    } as any);
    const updated = [newEvidence, ...evidences];
    setEvidences(updated);
    
    const userId = user?.id || '1';
    await saveData(`@evidencias_${userId}`, updated);
    await saveData('@evidences', updated);
    return newId;
  };

  const completeTask = useCallback(async (taskId: string, evidenceId: string) => {
    setTasks(current => {
      const updated = current.map(t =>
        t.id === taskId ? { ...t, completed: true, completedEvidenceId: evidenceId } : t
      );
      saveData('@tasks', updated);
      return updated;
    });
  }, []);

  const reviewEvidence = async (id: string, status: BadgeStatus, comment?: string) => {
    const updated = evidences.map(e => (e.id === id ? normalizeEvidence({ ...e, status, comment }) : e));
    setEvidences(updated);
    
    const userId = user?.id || '1';
    await saveData(`@evidencias_${userId}`, updated);
    await saveData('@evidences', updated);

    const evidence = evidences.find(e => e.id === id);
    if (evidence) {
      const newNotif: Notification = {
        id: Date.now().toString(),
        userId: evidence.docenteId,
        title: status === 'Validado' ? 'Documento validado' : 'Tu archivo fue observado',
        message: status === 'Validado'
          ? `Tu documento ${evidence.fileName} ha sido validado.`
          : `Tu documento ${evidence.fileName} tiene observaciones: ${comment}`,
        date: new Date().toISOString(),
        read: false,
        type: status === 'Validado' ? 'success' : 'warning',
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);
      await saveData('@notifications', updatedNotifs);
    }
  };

  const deleteEvidence = async (id: string) => {
    const updated = evidences.filter(e => e.id !== id);
    setEvidences(updated);
    const userId = user?.id || '1';
    await saveData(`@evidencias_${userId}`, updated);
    await saveData('@evidences', updated);
  };

  const markNotificationRead = async (id: string) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    await saveData('@notifications', updated);
  };

  const clearData = async () => {
    const normalizedSeed = SEED_EVIDENCES.map(normalizeEvidence);
    setEvidences(normalizedSeed);
    setNotifications(SEED_NOTIFICATIONS);
    setTasks(SEED_TASKS);
    const userId = user?.id || '1';
    await AsyncStorage.multiRemove([`@evidencias_${userId}`, '@evidences', '@notifications', '@tasks']);
    await saveData(`@evidencias_${userId}`, normalizedSeed);
    await saveData('@evidences', normalizedSeed);
    await saveData('@notifications', SEED_NOTIFICATIONS);
    await saveData('@tasks', SEED_TASKS);
  };

  return (
    <DataContext.Provider value={{
      evidences,
      notifications,
      tasks,
      isLoading,
      unreadCount,
      uploadEvidence,
      reviewEvidence,
      deleteEvidence,
      markNotificationRead,
      completeTask,
      clearData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}

