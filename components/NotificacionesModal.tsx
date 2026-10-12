import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Dimensions, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function NotificacionesModal({ visible, onClose }: Props) {
  const { notifications, markNotificationRead } = useData();
  const router = useRouter();

  // Animación del Bottom Sheet
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.bezier(0.25, 0.1, 0.25, 1)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const handlePress = (item: any) => {
    markNotificationRead(item.id);
    if (item.evidenceId) {
      onClose();
      router.push(`/detalle-archivo?id=${item.evidenceId}`);
    } else if (item.taskId) {
      onClose();
      router.push(`/actividades`);
    }
  };

  const handleMarkAllRead = () => {
    const unread = notifications.filter(n => !n.read);
    unread.forEach(n => markNotificationRead(n.id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // if (!visible) return null; // Modal handles visibility
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        </TouchableOpacity>

        <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.dragHandleContainer} {...{onTouchStart: onClose}}>
             <View style={styles.dragHandle} />
          </View>
          
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Notificaciones</Text>
              <Text style={styles.subtitle}>
                {unreadCount === 0 ? 'Estás al día' : `Tienes ${unreadCount} nueva${unreadCount > 1 ? 's' : ''}`}
              </Text>
            </View>
            
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllRead}>
                <Ionicons name="checkmark-done" size={16} color="#3b82f6" />
                <Text style={styles.markReadText}>Marcar leídas</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
                onPress={() => handlePress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, !item.read && styles.unreadIconContainer]}>
                  {item.type === 'warning' ? (
                    <Ionicons name="alert-circle" size={24} color={item.read ? "#94a3b8" : "#ea580c"} />
                  ) : item.type === 'success' ? (
                    <Ionicons name="checkmark-circle" size={24} color={item.read ? "#94a3b8" : "#16a34a"} />
                  ) : (
                    <Ionicons name="information-circle" size={24} color={item.read ? "#94a3b8" : "#3b82f6"} />
                  )}
                </View>
                
                <View style={styles.content}>
                  <Text style={[styles.notifTitle, !item.read && styles.unreadText]}>{item.title}</Text>
                  <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>

                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>¡Todo en orden!</Text>
                <Text style={styles.emptyText}>No tienes notificaciones recientes.</Text>
              </View>
            }
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.7, // 70% de la pantalla
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    paddingBottom: 20, // safe area
  },
  dragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  markReadText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
    alignItems: 'center',
  },
  unreadCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  unreadIconContainer: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '800',
    color: '#0f172a',
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
  },
});
