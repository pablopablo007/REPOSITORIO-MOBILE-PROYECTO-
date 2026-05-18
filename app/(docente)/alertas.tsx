import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `Hace ${days} días`;
  return new Date(dateStr).toLocaleDateString('es-EC');
}

export default function AlertasScreen() {
  const { notifications, markNotificationRead } = useData();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const myNotifs = notifications.filter(n => n.userId === user?.id);

  const handlePress = (id: string, read: boolean) => {
    if (!read) markNotificationRead(id);
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Notificaciones</Text>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{myNotifs.length}</Text>
        </View>
      </View>

      {myNotifs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={56} color="#d1d5db" />
          <Text style={styles.emptyText}>No tienes notificaciones recientes.</Text>
        </View>
      ) : (
        myNotifs.map(n => {
          const isExpanded = expandedId === n.id;
          return (
            <TouchableOpacity key={n.id} onPress={() => handlePress(n.id, n.read)} activeOpacity={0.7}>
              <Card style={[styles.card, !n.read && styles.unreadCard]}>
                <View style={styles.notifRow}>
                  {/* Status dot */}
                  <View style={[styles.statusDot, { backgroundColor: n.read ? '#d1d5db' : '#3b82f6' }]} />

                  {/* Icon */}
                  <View style={[styles.iconCircle, {
                    backgroundColor: n.type === 'success' ? '#dcfce7' : n.type === 'warning' ? '#fef3c7' : '#e0f2fe',
                  }]}>
                    {n.type === 'success' && <Ionicons name="checkmark-circle" size={22} color="#22c55e" />}
                    {n.type === 'warning' && <Ionicons name="warning" size={22} color="#f59e0b" />}
                    {n.type === 'info' && <Ionicons name="information-circle" size={22} color="#3b82f6" />}
                  </View>

                  {/* Content */}
                  <View style={styles.content}>
                    <View style={styles.headerContent}>
                      <Text style={[styles.title, !n.read && styles.unreadTitle]} numberOfLines={isExpanded ? undefined : 1}>
                        {n.title}
                      </Text>
                      <Text style={styles.timeAgo}>{getTimeAgo(n.date)}</Text>
                    </View>
                    <Text style={styles.message} numberOfLines={isExpanded ? undefined : 2}>
                      {n.message}
                    </Text>

                    {/* Read status label */}
                    <View style={styles.statusRow}>
                      <Text style={[styles.statusLabel, { color: n.read ? '#9ca3af' : '#3b82f6' }]}>
                        {n.read ? 'Leída' : 'No leída'}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9ca3af"
                      />
                    </View>
                  </View>
                </View>

                {/* Expanded detail */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.divider} />
                    <Text style={styles.detailLabel}>Detalle completo:</Text>
                    <Text style={styles.detailMessage}>{n.message}</Text>
                    <Text style={styles.detailDate}>
                      {new Date(n.date).toLocaleString('es-EC', {
                        dateStyle: 'full',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        })
      )}
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  counterBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginLeft: 10,
  },
  counterText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { textAlign: 'center', marginTop: 16, color: '#6b7280', fontStyle: 'italic', fontSize: 15 },
  card: { marginBottom: 6, padding: 14 },
  unreadCard: { backgroundColor: '#f0f9ff', borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginTop: 8, marginRight: 8 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: { flex: 1 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600', color: '#374151', flex: 1, marginRight: 8 },
  unreadTitle: { color: '#111827', fontWeight: 'bold' },
  timeAgo: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  message: { fontSize: 13, color: '#4b5563', lineHeight: 19 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  statusLabel: { fontSize: 11, fontWeight: '600' },
  expandedSection: { marginTop: 8 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginBottom: 12 },
  detailLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  detailMessage: { fontSize: 14, color: '#4b5563', lineHeight: 22, marginBottom: 8 },
  detailDate: { fontSize: 12, color: '#9ca3af' },
});
