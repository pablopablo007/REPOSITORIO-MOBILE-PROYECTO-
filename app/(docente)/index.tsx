import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const getDaysRemaining = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getDaysAgo = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days <= 0 ? 'Hace un momento' : `Hace ${days} días`;
};

export default function DocenteDashboard() {
  const { evidences, tasks } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const currentDateString = useMemo(() => {
    const d = new Date();
    const str = d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const myEvidences = useMemo(
    () => evidences.filter(e => e.docenteId === user?.id),
    [evidences, user?.id]
  );
  
  const pendientesCount = useMemo(
    () => myEvidences.filter(e => e.status === 'Pendiente').length,
    [myEvidences]
  );
  
  const validadasCount = useMemo(
    () => myEvidences.filter(e => e.status === 'Validado').length,
    [myEvidences]
  );

  const observadosCount = useMemo(
    () => myEvidences.filter(e => e.status === 'Observado').length,
    [myEvidences]
  );

  const myTasks = useMemo(() => tasks.filter(t => t.docenteId === user?.id), [tasks, user?.id]);
  const completedTasksCount = myTasks.filter(t => t.completed).length;
  const totalTasksCount = myTasks.length;
  const progressPercent = totalTasksCount === 0 ? 0 : (completedTasksCount / totalTasksCount) * 100;

  const pendingTasks = useMemo(() => {
    return myTasks
      .filter(t => !t.completed)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 2);
  }, [myTasks]);

  const ultimoArchivo = useMemo(() => {
    if (myEvidences.length === 0) return null;
    return [...myEvidences].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [myEvidences]);

  const firstName = user?.name?.split(' ')[0] || 'Prof.';
  const lastName = user?.name?.split(' ')[1] || 'Pablo';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* Hero Card Superior */}
      <View style={styles.heroCard}>
        <Text style={styles.greeting}>
          ¡Hola,{"\n"}{firstName} {lastName}! 👋
        </Text>
        <Text style={styles.dateText}>{currentDateString}</Text>

        <View style={styles.heroProgressBox}>
          <View style={styles.heroProgressBarBg}>
            <View style={[styles.heroProgressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.heroProgressText}>{completedTasksCount} de {totalTasksCount} tareas completadas este período</Text>
        </View>
      </View>

      <View style={styles.mainContent}>
        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={[styles.statBox, { borderTopColor: '#f59e0b' }]}>
            <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{pendientesCount}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: '#10b981' }]}>
            <Text style={[styles.statNumber, { color: '#10b981' }]}>{validadasCount}</Text>
            <Text style={styles.statLabel}>Validados</Text>
          </View>
          <View style={[styles.statBox, { borderTopColor: '#ef4444' }]}>
            <Text style={[styles.statNumber, { color: '#ef4444' }]}>{observadosCount}</Text>
            <Text style={styles.statLabel}>Observados</Text>
          </View>
        </View>

        {/* Actividades Pendientes */}
        <Text style={styles.sectionTitle}>ACTIVIDADES PENDIENTES</Text>
        {pendingTasks.map((task) => {
          const daysLeft = getDaysRemaining(task.deadline);
          const isUrgent = daysLeft <= 3;
          const urgencyColor = isUrgent ? '#dc2626' : '#f59e0b';
          
          return (
            <TouchableOpacity 
              key={task.id} 
              style={[styles.taskCard, { borderLeftColor: urgencyColor }]} 
              activeOpacity={0.8}
              onPress={() => router.push('/(docente)/actividades')}
            >
              <View style={styles.taskCardContent}>
                <Ionicons name="ellipse" size={12} color={urgencyColor} style={styles.taskIcon} />
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskDays}>Vence en {daysLeft} días</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          );
        })}
        {pendingTasks.length === 0 && (
          <Text style={styles.emptyText}>No tienes actividades urgentes.</Text>
        )}

        {/* Último archivo subido */}
        {ultimoArchivo && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ÚLTIMO ARCHIVO SUBIDO</Text>
            <TouchableOpacity 
              style={styles.lastFileCard} 
              activeOpacity={0.8}
              onPress={() => router.push('/(docente)/archivos')}
            >
              <Ionicons name="document-text" size={24} color="#dc2626" />
              <View style={styles.lastFileInfo}>
                <Text style={styles.lastFileTitle} numberOfLines={1}>{ultimoArchivo.fileName}</Text>
                <Text style={styles.lastFileMeta}>
                  {getDaysAgo(ultimoArchivo.date)}  •  {ultimoArchivo.status}
                </Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Botón Ver Todas */}
        <TouchableOpacity 
          style={styles.viewAllBtn} 
          activeOpacity={0.8}
          onPress={() => router.push('/(docente)/actividades')}
        >
          <Text style={styles.viewAllText}>Ver todas las actividades →</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#1e2d4a',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 34,
  },
  dateText: {
    fontSize: 13,
    color: '#aac4e8',
    marginTop: 8,
    marginBottom: 24,
  },
  heroProgressBox: {
    marginTop: 8,
  },
  heroProgressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  heroProgressBarFill: {
    height: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  heroProgressText: {
    fontSize: 13,
    color: '#ffffff',
    marginTop: 12,
  },
  mainContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  taskIcon: {
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  taskDays: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  lastFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  lastFileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lastFileTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  lastFileMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  viewAllBtn: {
    backgroundColor: '#eff6ff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  viewAllText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
