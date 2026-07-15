import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { BadgeStatus } from '../components/Badge';
import api from '../services/api';
import { SERVER_BASE_URL } from '../services/api';

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
  fileUrl?: string;
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
  fileUri?: string; // For FormData
  taskId?: string; // Link to task if applicable
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
  loadData: () => Promise<void>;
  clearData: () => Promise<void>;
}

const DataContext = createContext<DataContextData>({} as DataContextData);

// Convierte fileUrl relativa (/uploads/...) a URL absoluta del servidor
const buildFullFileUrl = (fileUrl?: string | null): string | undefined => {
  if (!fileUrl) return undefined;
  if (fileUrl.startsWith('http')) return fileUrl; // Ya es absoluta
  return `${SERVER_BASE_URL}${fileUrl}`; // /uploads/file.pdf → http://server:3000/uploads/file.pdf
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadData();
    } else {
      setEvidences([]);
      setNotifications([]);
      setTasks([]);
      setUnreadCount(0);
    }
  }, [user?.id]); 

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [evidencesRes, tasksRes, notifsRes, unreadRes] = await Promise.all([
        api.get('/evidences').catch(() => ({ success: false, data: { evidences: [] } })),
        api.get('/tasks').catch(() => ({ success: false, data: { tasks: [] } })),
        api.get('/notifications').catch(() => ({ success: false, data: { notifications: [] } })),
        api.get('/notifications/unread-count').catch(() => ({ success: false, data: { count: 0 } }))
      ]);

      if (evidencesRes.success) {
        const mapped = evidencesRes.data.evidences.map((e: Evidence) => ({
          ...e,
          fileUrl: buildFullFileUrl(e.fileUrl),
        }));
        setEvidences(mapped);
      }
      if (tasksRes.success) setTasks(tasksRes.data.tasks);
      if (notifsRes.success) setNotifications(notifsRes.data.notifications);
      if (unreadRes.success) setUnreadCount(unreadRes.data.count);
      
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadEvidence = async (evidenceData: EvidenceDraft): Promise<string> => {
    try {
      const formData = new FormData();
      
      formData.append('documentType', evidenceData.documentType);
      formData.append('periodo', evidenceData.periodo);
      formData.append('fileName', evidenceData.fileName);
      
      if (evidenceData.description) formData.append('description', evidenceData.description);
      if (evidenceData.iaGenerated) formData.append('iaGenerated', String(evidenceData.iaGenerated));
      if (evidenceData.scanned) formData.append('scanned', String(evidenceData.scanned));
      if (evidenceData.taskId) formData.append('taskId', evidenceData.taskId);

      if (evidenceData.fileUri) {
         const filename = evidenceData.fileUri.split('/').pop() || evidenceData.fileName;
         const match = /\.(\w+)$/.exec(filename);
         const type = match ? (match[1].toLowerCase() === 'pdf' ? 'application/pdf' : `image/${match[1]}`) : `application/pdf`;
         
         formData.append('file', {
            uri: evidenceData.fileUri,
            name: filename,
            type
         } as any);
      }

      const res = await api.post('/evidences', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.success) {
        const uploaded = {
          ...res.data.evidence,
          fileUrl: buildFullFileUrl(res.data.evidence.fileUrl),
        };
        console.log('[uploadEvidence] Backend returned evidence:', uploaded.id, 'fileUrl:', uploaded.fileUrl);
        setEvidences([uploaded, ...evidences]);
        return uploaded.id;
      }
      console.log('[uploadEvidence] Failed, returning empty string');
      return '';
    } catch (error) {
       console.error("Error al subir evidencia:", error);
       throw error;
    }
  };

  const completeTask = useCallback(async (taskId: string, evidenceId: string) => {
    try {
      const res = await api.put(`/tasks/${taskId}/complete`, { evidenceId });
      if (res.success) {
        setTasks(current => 
          current.map(t =>
            t.id === taskId ? { ...t, completed: true, completedEvidenceId: evidenceId } : t
          )
        );
      }
    } catch (error) {
       console.error("Error al completar tarea:", error);
    }
  }, []);

  const reviewEvidence = async (id: string, status: BadgeStatus, comment?: string) => {
    try {
      const res = await api.put(`/evidences/${id}/review`, { status, comment });
      if (res.success) {
         setEvidences(evidences.map(e => e.id === id ? res.data.evidence : e));
         loadData();
      }
    } catch (error) {
      console.error("Error revisando evidencia:", error);
    }
  };

  const deleteEvidence = async (id: string) => {
    try {
      const res = await api.delete(`/evidences/${id}`);
      if (res.success) {
         setEvidences(evidences.filter(e => e.id !== id));
      }
    } catch (error) {
       console.error("Error eliminando evidencia:", error);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const res = await api.put(`/notifications/${id}/read`);
      if (res.success) {
         setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
         setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
       console.error("Error marcando notif como leída:", error);
    }
  };

  const clearData = async () => {};

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
      loadData,
      clearData,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
