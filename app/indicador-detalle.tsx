import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

export default function IndicadorDetalleScreen() {
  const params = useLocalSearchParams<{
    year: string;
    category: string;
    subcategory: string;
    indicatorId: string;
    indicatorName: string;
  }>();
  const router = useRouter();
  const { evidences } = useData();
  const { user } = useAuth();

  const { year, category, subcategory, indicatorId, indicatorName } = params;

  const myEvidences = evidences.filter(
    e => e.docenteId === user?.id && e.indicador === indicatorName
  );

  const compliance = myEvidences.length > 0
    ? Math.min(100, Math.round((myEvidences.filter(e => e.status === 'Validado').length / Math.max(1, myEvidences.length)) * 100))
    : 0;

  const handleSubirAqui = () => {
    router.push({
      pathname: '/(docente)/subir',
      params: {
        fromIndicator: 'true',
        indicatorName: indicatorName || '',
        criterio: category || '',
        year: year || '',
        breadcrumb: `Año ${year} → ${category} → ${subcategory}`,
      },
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* Breadcrumb */}
      <View style={styles.breadcrumbCard}>
        <Ionicons name="navigate" size={16} color="#2563eb" />
        <Text style={styles.breadcrumbText}>
          Año {year} → {category} → {subcategory}
        </Text>
      </View>

      {/* Indicator Info */}
      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="document-text" size={28} color="#2563eb" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.indicatorName}>{indicatorName}</Text>
            <Text style={styles.indicatorPeriod}>Período: {year}</Text>
          </View>
        </View>

        <View style={styles.complianceRow}>
          <Text style={styles.complianceLabel}>Cumplimiento</Text>
          <View style={styles.complianceBarBg}>
            <View
              style={[
                styles.complianceBarFill,
                {
                  width: `${compliance}%`,
                  backgroundColor: compliance >= 70 ? '#22c55e' : compliance >= 40 ? '#f59e0b' : '#ef4444',
                },
              ]}
            />
          </View>
          <Text style={[styles.compliancePercent, {
            color: compliance >= 70 ? '#15803d' : compliance >= 40 ? '#b45309' : '#b91c1c',
          }]}>
            {compliance}%
          </Text>
        </View>

        <Text style={styles.descTitle}>¿Qué subir?</Text>
        <Text style={styles.descText}>
          Suba archivos PDF, imágenes o documentos escaneados que evidencien el cumplimiento
          del indicador {indicatorId}. Incluya certificados, actas, informes o cualquier
          documento oficial que respalde la información.
        </Text>
      </Card>

      {/* Files list */}
      <Card>
        <Text style={styles.sectionTitle}>
          Archivos Subidos ({myEvidences.length})
        </Text>
        {myEvidences.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-upload-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No hay archivos en este indicador.</Text>
            <Text style={styles.emptySubtext}>Toca "Subir aquí" para agregar evidencias.</Text>
          </View>
        ) : (
          myEvidences.map(ev => (
            <View key={ev.id} style={styles.fileRow}>
              <Ionicons name="document-attach" size={22} color="#6b7280" />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{ev.fileName}</Text>
                <Text style={styles.fileDate}>
                  {new Date(ev.date).toLocaleDateString('es-EC', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <Badge status={ev.status} />
            </View>
          ))
        )}
      </Card>

      {/* Upload button */}
      <TouchableOpacity style={styles.uploadButton} onPress={handleSubirAqui} activeOpacity={0.8}>
        <Ionicons name="cloud-upload" size={22} color="#fff" />
        <Text style={styles.uploadButtonText}>Subir aquí</Text>
      </TouchableOpacity>

      {/* Scanner button */}
      <TouchableOpacity
        style={styles.scanButton}
        activeOpacity={0.8}
        onPress={() => {
          router.push({
            pathname: '/escaner',
            params: {
              fromIndicator: 'true',
              indicatorName: indicatorName || '',
              criterio: category || '',
              year: year || '',
              breadcrumb: `Año ${year} → ${category} → ${subcategory}`,
            },
          });
        }}
      >
        <Ionicons name="scan" size={22} color="#2563eb" />
        <Text style={styles.scanButtonText}>Escanear y subir aquí</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  breadcrumbCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  breadcrumbText: { fontSize: 13, color: '#1e40af', marginLeft: 8, flex: 1 },
  infoCard: { marginBottom: 4 },
  infoHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  indicatorName: { fontSize: 17, fontWeight: 'bold', color: '#1f2937' },
  indicatorPeriod: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  complianceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  complianceLabel: { fontSize: 13, color: '#6b7280', width: 90 },
  complianceBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  complianceBarFill: { height: 8, borderRadius: 4 },
  compliancePercent: { fontSize: 14, fontWeight: 'bold', width: 40, textAlign: 'right' },
  descTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  descText: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 24 },
  emptyText: { color: '#6b7280', fontStyle: 'italic', marginTop: 12, fontSize: 14 },
  emptySubtext: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fileInfo: { flex: 1, marginLeft: 12 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  fileDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  scanButtonText: { color: '#2563eb', fontSize: 16, fontWeight: 'bold' },
});
