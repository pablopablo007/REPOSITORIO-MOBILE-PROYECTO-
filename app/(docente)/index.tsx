import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { SERVER_BASE_URL } from '../../services/api';

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

  const getFileIconData = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { color: '#dc2626', icon: 'document-text' as const };
    if (ext === 'doc' || ext === 'docx') return { color: '#2563eb', icon: 'document' as const };
    return { color: '#16a34a', icon: 'image' as const };
  };

  const getStatusColor = (status: string) => {
    if (status === 'Validado') return '#15803d';
    if (status === 'Observado') return '#dc2626';
    return '#d97706';
  };

  let firstName = 'Prof.';
  let lastName = 'Pablo';
  
  if (user?.name) {
    const parts = user.name.split(' ').filter(Boolean);
    if (parts.length >= 3) {
      // Formato: Apellido1 Apellido2 Nombre1 [Nombre2...]
      lastName = parts[0];
      firstName = parts[2];
    } else if (parts.length === 2) {
      firstName = parts[0];
      lastName = parts[1];
    } else if (parts.length === 1) {
      firstName = parts[0];
      lastName = '';
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Hero Card Superior */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View>
            <Text style={styles.greeting}>
              ¡Hola,{"\n"}{firstName} {lastName}! 👋
            </Text>
            <Text style={styles.dateText}>{currentDateString}</Text>
          </View>
          
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(docente)/perfil')}>
            {user?.avatar ? (
              <Image 
                source={{ uri: user.avatar.startsWith('file') ? user.avatar : `${SERVER_BASE_URL}${user.avatar}` }} 
                style={styles.heroAvatar} 
              />
            ) : (
              <View style={styles.heroAvatarPlaceholder}>
                <Text style={styles.heroAvatarInitials}>{user?.initials || 'PM'}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        
        {/* Progress Card (Floats over the dark blue) */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View style={styles.progressIconBox}>
              <Ionicons name="trending-up" size={18} color="#2563eb" />
            </View>
            <Text style={styles.progressCardTitle}>Progreso del Período</Text>
          </View>
          
          <View style={styles.heroProgressBarBg}>
            <View style={[styles.heroProgressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          
          <Text style={styles.heroProgressText}>
            Has completado <Text style={{fontWeight: 'bold', color: '#0f172a'}}>{completedTasksCount} de {totalTasksCount}</Text> tareas asignadas.
          </Text>
        </View>

        {/* Stats Row (Unified style) */}
        <View style={styles.unifiedStatsCard}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="time" size={18} color="#d97706" />
            </View>
            <Text style={styles.statNum}>{pendientesCount}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="checkmark-circle" size={18} color="#15803d" />
            </View>
            <Text style={styles.statNum}>{validadasCount}</Text>
            <Text style={styles.statLabel}>Validados</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBadge, { backgroundColor: '#fee2e2' }]}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
            </View>
            <Text style={styles.statNum}>{observadosCount}</Text>
            <Text style={styles.statLabel}>Observados</Text>
          </View>
        </View>

        {/* Actividades Pendientes */}
        <Text style={styles.sectionTitle}>ACTIVIDADES PENDIENTES</Text>
        
        {pendingTasks.map((task) => {
          const daysLeft = getDaysRemaining(task.deadline);
          const isUrgent = daysLeft <= 3;
          const urgencyColor = isUrgent ? '#dc2626' : '#f59e0b';
          const badgeIcon = isUrgent ? '🔴' : '🟡';
          
          return (
            <TouchableOpacity 
              key={task.id} 
              style={[styles.taskCard, { borderLeftColor: urgencyColor }]} 
              activeOpacity={0.8}
              onPress={() => router.push('/(docente)/actividades')}
            >
              <View style={styles.taskCardContent}>
                <View style={[styles.taskIconBox, { backgroundColor: urgencyColor + '15' }]}>
                  <Ionicons name="document-text" size={20} color={urgencyColor} />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                  <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '10' }]}>
                    <Text style={[styles.taskDays, { color: urgencyColor }]}>{badgeIcon} Vence en {daysLeft} días</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
              </View>
            </TouchableOpacity>
          );
        })}
        
        {pendingTasks.length === 0 && (
          <View style={styles.emptyStateBox}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="leaf-outline" size={32} color="#10b981" />
            </View>
            <Text style={styles.emptyStateTitle}>¡Todo al día!</Text>
            <Text style={styles.emptyStateText}>No tienes actividades pendientes por el momento.</Text>
          </View>
        )}

        {/* Último archivo subido */}
        {ultimoArchivo && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 28 }]}>ÚLTIMO ARCHIVO SUBIDO</Text>
            <TouchableOpacity 
              style={styles.lastFileCard} 
              activeOpacity={0.8}
              onPress={() => router.push('/(docente)/archivos')}
            >
              <View style={[styles.lastFileIconBox, { backgroundColor: getFileIconData(ultimoArchivo.fileName).color + '15' }]}>
                <Ionicons 
                  name={getFileIconData(ultimoArchivo.fileName).icon} 
                  size={24} 
                  color={getFileIconData(ultimoArchivo.fileName).color} 
                />
              </View>
              <View style={styles.lastFileInfo}>
                <Text style={styles.lastFileTitle} numberOfLines={1}>{ultimoArchivo.fileName}</Text>
                <Text style={styles.lastFileMeta}>
                  {getDaysAgo(ultimoArchivo.date)}  •  <Text style={{ color: getStatusColor(ultimoArchivo.status), fontWeight: '700' }}>{ultimoArchivo.status}</Text>
                </Text>
              </View>
              {ultimoArchivo.fileUrl && (
                <Ionicons name="cloud-done" size={20} color="#16a34a" />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Botón Ver Todas */}
        <TouchableOpacity 
          style={styles.viewAllBtn} 
          activeOpacity={0.8}
          onPress={() => router.push('/(docente)/actividades')}
        >
          <Text style={styles.viewAllText}>Ver todas las actividades</Text>
          <Ionicons name="arrow-forward" size={18} color="#2563eb" />
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
    paddingTop: 40,
    paddingBottom: 70, // Espacio extra para que la tarjeta de progreso se superponga
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: 36,
  },
  dateText: {
    fontSize: 14,
    color: '#aac4e8',
    marginTop: 8,
    fontWeight: '500',
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  heroAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  
  mainContent: {
    paddingHorizontal: 20,
  },
  
  progressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginTop: -40, // Superposición
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 5,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  heroProgressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroProgressBarFill: {
    height: 10,
    backgroundColor: '#2563eb', // Azul vibrante
    borderRadius: 5,
  },
  heroProgressText: {
    fontSize: 13,
    color: '#64748b',
  },

  unifiedStatsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 3,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#f1f5f9',
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.2,
    marginBottom: 16,
    marginLeft: 4,
  },
  
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  taskIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskDays: {
    fontSize: 11,
    fontWeight: '700',
  },
  
  emptyStateBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  
  lastFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  lastFileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastFileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  lastFileTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  lastFileMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  
  viewAllBtn: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  viewAllText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
});
