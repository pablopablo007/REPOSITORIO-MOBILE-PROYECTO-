import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { ProgressBar } from '../../components/ProgressBar';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export default function DocenteDashboard() {
  const { evidences } = useData();
  const { user } = useAuth();

  const myEvidences = evidences.filter(e => e.docenteId === user?.id);
  const validadas = myEvidences.filter(e => e.status === 'Validado').length;
  const observadas = myEvidences.filter(e => e.status === 'Observado').length;
  const pendientes = myEvidences.filter(e => e.status === 'Pendiente').length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.grid}>
        <Card style={[styles.statCard, { borderTopWidth: 4, borderTopColor: '#2563eb' }]}>
          <Text style={styles.statNumber}>{myEvidences.length}</Text>
          <Text style={styles.statLabel}>Subidas</Text>
        </Card>
        <Card style={[styles.statCard, { borderTopWidth: 4, borderTopColor: '#f59e0b' }]}>
          <Text style={styles.statNumber}>{pendientes}</Text>
          <Text style={styles.statLabel}>Pendientes</Text>
        </Card>
        <Card style={[styles.statCard, { borderTopWidth: 4, borderTopColor: '#22c55e' }]}>
          <Text style={styles.statNumber}>{validadas}</Text>
          <Text style={styles.statLabel}>Validadas</Text>
        </Card>
        <Card style={[styles.statCard, { borderTopWidth: 4, borderTopColor: '#ef4444' }]}>
          <Text style={styles.statNumber}>{observadas}</Text>
          <Text style={styles.statLabel}>Observadas</Text>
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>Mis evidencias recientes</Text>
        {myEvidences.slice(0, 5).map(ev => (
          <View key={ev.id} style={styles.evidenceRow}>
            <View style={styles.evidenceInfo}>
              <Text style={styles.evidenceName}>{ev.fileName}</Text>
              <Text style={styles.evidenceDate}>{new Date(ev.date).toLocaleDateString()}</Text>
            </View>
            <Badge status={ev.status} />
          </View>
        ))}
        {myEvidences.length === 0 && (
          <Text style={styles.emptyText}>No has subido evidencias aún.</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Mi Progreso</Text>
        <ProgressBar progress={85} label="1. Organización" />
        <ProgressBar progress={60} label="2. Academia" />
        <ProgressBar progress={30} label="3. Investigación" />
        <ProgressBar progress={100} label="4. Vinculación" />
        <ProgressBar progress={75} label="5. Recursos" />
        <ProgressBar progress={50} label="6. Estudiantes" />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3f4f6',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  evidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  evidenceInfo: {
    flex: 1,
    marginRight: 12,
  },
  evidenceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  evidenceDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  emptyText: {
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
});
