import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useData } from '../../contexts/DataContext';
import { Badge } from '../../components/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function DetalleArchivoScreen() {
  const { id } = useLocalSearchParams();
  const { evidences } = useData();

  const evidence = evidences.find(e => e.id === id);

  if (!evidence) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Archivo no encontrado</Text>
      </View>
    );
  }

  const isReviewed = evidence.status === 'Validado' || evidence.status === 'Observado';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={40} color="#2563eb" />
        </View>
        <Text style={styles.title}>{evidence.fileName}</Text>
        <Badge status={evidence.status} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Tipo de documento:</Text>
          <Text style={styles.value}>{evidence.documentType}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Fecha de publicación:</Text>
          <Text style={styles.value}>{new Date(evidence.date).toLocaleDateString()}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Descripción:</Text>
          <Text style={styles.value}>{evidence.description || 'Sin descripción'}</Text>
        </View>
      </View>

      {isReviewed && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detalles de Revisión</Text>
          
          <View style={styles.row}>
            <Text style={styles.label}>Revisado por:</Text>
            <Text style={styles.value}>{evidence.reviewerName || 'Dirección Académica / RRHH'}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>Comentarios:</Text>
          <View style={[styles.commentBox, evidence.status === 'Observado' ? styles.commentObserved : styles.commentValidated]}>
            <Text style={styles.commentText}>
              {evidence.comment || (evidence.status === 'Validado' ? 'Documento aprobado sin observaciones.' : 'El documento requiere correcciones.')}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  commentBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 4,
    borderLeftColor: '#cbd5e1',
  },
  commentValidated: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#22c55e',
  },
  commentObserved: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  commentText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  }
});
