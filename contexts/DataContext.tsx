import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { BadgeStatus } from '../components/Badge';

export type DocumentType =
  | 'Academico'
  | 'Titulo/Certificado'
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
  deadline: string;
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

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
const specificDate = (y: number, m: number, d: number) => new Date(y, m - 1, d).toISOString();

const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'seed-1',
    userId: '1',
    title: 'Documento con observaciones',
    message: "Tu evidencia 'Acta_Reunion_Marzo.docx' requiere correccion. Observacion: falta la firma institucional.",
    date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    read: false,
    type: 'warning',
  },
  {
    id: 'seed-2',
    userId: '1',
    title: 'Nueva tarea disponible',
    message: 'Debes subir tu certificado de capacitacion docente del periodo actual.',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    type: 'info',
  },
  {
    id: 'seed-3',
    userId: '1',
    title: 'Documento validado',
    message: "Tu evidencia 'Titulo_Maestria.pdf' ya aparece como validada en el sistema.",
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    type: 'success',
  },
];

const SEED_TASKS: Task[] = [
  {
    id: 'task-1',
    docenteId: '1',
    title: 'Subir titulo de cuarto nivel',
    description: 'Adjunta tu titulo de maestria en PDF legible.',
    deadline: daysFromNow(2),
    documentType: 'Titulo/Certificado',
    completed: false,
  },
  {
    id: 'task-2',
    docenteId: '1',
    title: 'Subir syllabus del periodo 2025',
    description: 'Carga la version actualizada del syllabus de tus materias.',
    deadline: daysFromNow(6),
    documentType: 'Academico',
    completed: false,
  },
  {
    id: 'task-3',
    docenteId: '1',
    title: 'Registrar certificado de capacitacion',
    description: 'Sube el respaldo del ultimo curso o seminario completado.',
    deadline: daysFromNow(10),
    documentType: 'Titulo/Certificado',
    completed: false,
  },
];

const SEED_EVIDENCES: Evidence[] = [
  {
    id: 'doc-acad-1',
    docenteId: '1',
    docenteName: 'Prof. Pablo Mora',
    documentType: 'Academico',
    periodo: '2024',
    fileName: 'Syllabus_Biologia_2024.pdf',
    date: specificDate(2025, 3, 15),
    status: 'Validado',
    description: 'Syllabus entregado para archivo docente.',
  },
  {
    id: 'doc-cert-1',
    docenteId: '1',
    docenteName: 'Prof. Pablo Mora',
    documentType: 'Titulo/Certificado',
    periodo: '2025',
    fileName: 'Titulo_Maestria.pdf',
    date: specificDate(2025, 5, 20),
    status: 'Pendiente',
    scanned: true,
    description: 'Documento escaneado pendiente de confirmacion.',
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
    comment: 'Falta la firma institucional en la ultima pagina.',
    description: 'Acta subida con observaciones de correccion.',
  },
];

const normalizeDocumentType = (value: any): DocumentType => {
  const normalized = String(value || '').trim();

  if (!normalized) return 'Academico';

  const aliases: Record<string, DocumentType> = {
    academico: 'Academico',
    'académico': 'Academico',
    'acadã©mico': 'Academico',
    'titulo/certificado': 'Titulo/Certificado',
    'título/certificado': 'Titulo/Certificado',
    'tã­tulo/certificado': 'Titulo/Certificado',
    informe: 'Informe',
    acta: 'Acta',
    'generado con ia': 'Generado con IA',
    escaneado: 'Escaneado',
    otro: 'Otro',
  };

  const key = normalized.toLowerCase();
  return aliases[key] || (normalized as DocumentType);
};

const normalizeEvidence = (evidence: Evidence): Evidence => {
  const docType = normalizeDocumentType(
    evidence.documentType || evidence.tipo || (evidence.iaGenerated || evidence.origen === 'ia' ? 'Generado con IA' : 'Academico')
  );
  const status = (evidence.status || evidence.estado || 'Pendiente') as BadgeStatus;
  const fileName = evidence.fileName || evidence.nombre || 'Sin_nombre.pdf';
  const date = evidence.date || evidence.fecha || new Date().toISOString();
  const scanned = Boolean(evidence.scanned || evidence.origen === 'escaneado');
  const iaGenerated = Boolean(evidence.iaGenerated || evidence.origen === 'ia');
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

  const unreadCount = notifications.filter((notification) => notification.userId === user?.id && !notification.read).length;

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
    } catch (error) {
      console.error('Failed to load docente data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveData = async (key: string, data: any) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${key}`, error);
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
    setTasks((current) => {
      const updated = current.map((task) =>
        task.id === taskId ? { ...task, completed: true, completedEvidenceId: evidenceId } : task
      );

      saveData('@tasks', updated);
      return updated;
    });
  }, []);

  const reviewEvidence = async (id: string, status: BadgeStatus, comment?: string) => {
    const updated = evidences.map((evidence) =>
      evidence.id === id ? normalizeEvidence({ ...evidence, status, comment }) : evidence
    );

    setEvidences(updated);

    const userId = user?.id || '1';
    await saveData(`@evidencias_${userId}`, updated);
    await saveData('@evidences', updated);

    const evidence = evidences.find((item) => item.id === id);
    if (!evidence) return;

    const newNotification: Notification = {
      id: Date.now().toString(),
      userId: evidence.docenteId,
      title: status === 'Validado' ? 'Documento validado' : 'Documento con observaciones',
      message:
        status === 'Validado'
          ? `Tu evidencia ${evidence.fileName} ya figura como validada en el sistema.`
          : `Tu evidencia ${evidence.fileName} requiere ajustes.${comment ? ` Observacion: ${comment}` : ''}`,
      date: new Date().toISOString(),
      read: false,
      type: status === 'Validado' ? 'success' : 'warning',
    };

    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    await saveData('@notifications', updatedNotifications);
  };

  const deleteEvidence = async (id: string) => {
    const updated = evidences.filter((evidence) => evidence.id !== id);
    setEvidences(updated);

    const userId = user?.id || '1';
    await saveData(`@evidencias_${userId}`, updated);
    await saveData('@evidences', updated);
  };

  const markNotificationRead = async (id: string) => {
    const updated = notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    );
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
    <DataContext.Provider
      value={{
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
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
