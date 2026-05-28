import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../contexts/DataContext';
import { Badge } from './Badge';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export function NotificacionesModal({ visible, onClose }: Props) {
  const { notifications, markNotificationRead } = useData();

  const handlePress = (id: string) => {
    markNotificationRead(id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Notificaciones</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.notificationCard, !item.read && styles.unreadCard]}
                onPress={() => handlePress(item.id)}
              >
                <View style={styles.iconContainer}>
                  {item.type === 'warning' ? (
                    <Ionicons name="warning" size={20} color="#ea580c" />
                  ) : item.type === 'success' ? (
                    <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                  ) : (
                    <Ionicons name="information-circle" size={20} color="#2563eb" />
                  )}
                </View>
                <View style={styles.content}>
                  <Text style={[styles.notifTitle, !item.read && styles.unreadText]}>{item.title}</Text>
                  <Text style={styles.message}>{item.message}</Text>
                  <Text style={styles.date}>{new Date(item.date).toLocaleDateString()}</Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No tienes notificaciones recientes.</Text>
            }
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 10,
  },
  container: {
    width: width * 0.85,
    maxHeight: height * 0.6,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  list: {
    padding: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  unreadCard: {
    backgroundColor: '#f8fafc',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: 'bold',
    color: '#0f172a',
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 6,
  },
  date: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginTop: 6,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: 24,
    fontStyle: 'italic',
  },
});
