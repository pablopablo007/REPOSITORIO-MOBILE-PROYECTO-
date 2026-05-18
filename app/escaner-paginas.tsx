import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function EscanerPaginasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pages: string;
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
  }>();

  const [pages, setPages] = useState<string[]>(params.pages ? JSON.parse(params.pages) : []);

  const forwardParams = () => ({
    fromIndicator: params.fromIndicator || '',
    indicatorName: params.indicatorName || '',
    criterio: params.criterio || '',
    year: params.year || '',
    breadcrumb: params.breadcrumb || '',
  });

  const removePage = (index: number) => {
    Alert.alert('Eliminar página', `¿Eliminar la página ${index + 1}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          const updated = pages.filter((_, i) => i !== index);
          if (updated.length === 0) {
            router.back();
          } else {
            setPages(updated);
          }
        },
      },
    ]);
  };

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length) return;
    const updated = [...pages];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setPages(updated);
  };

  const addMorePages = () => {
    router.push({
      pathname: '/escaner',
      params: {
        existingPages: JSON.stringify(pages),
        ...forwardParams(),
      },
    });
  };

  const handleConvertPdf = () => {
    router.push({
      pathname: '/escaner-guardar',
      params: {
        pages: JSON.stringify(pages),
        ...forwardParams(),
      },
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Descartar escaneo',
      '¿Descartar el escaneo actual? Se perderán todas las páginas capturadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => router.dismissAll() },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header info */}
        <View style={styles.infoCard}>
          <Ionicons name="documents" size={22} color="#2563eb" />
          <Text style={styles.infoText}>{pages.length} página(s) capturada(s)</Text>
        </View>

        <Text style={styles.instruction}>Toca las flechas para reordenar o la X para eliminar.</Text>

        {/* Pages grid */}
        <View style={styles.grid}>
          {pages.map((uri, index) => (
            <View key={`${index}-${uri.slice(-10)}`} style={styles.pageCard}>
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

              {/* Page number badge */}
              <View style={styles.pageNumBadge}>
                <Text style={styles.pageNumText}>{index + 1}</Text>
              </View>

              {/* Delete button */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removePage(index)}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>

              {/* Reorder arrows */}
              <View style={styles.reorderRow}>
                <TouchableOpacity
                  style={[styles.arrowBtn, index === 0 && { opacity: 0.3 }]}
                  onPress={() => movePage(index, index - 1)}
                  disabled={index === 0}
                >
                  <Ionicons name="arrow-back" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.arrowBtn, index === pages.length - 1 && { opacity: 0.3 }]}
                  onPress={() => movePage(index, index + 1)}
                  disabled={index === pages.length - 1}
                >
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Add page button */}
          <TouchableOpacity style={styles.addPageCard} onPress={addMorePages}>
            <Ionicons name="add-circle-outline" size={40} color="#2563eb" />
            <Text style={styles.addPageText}>Agregar página</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.convertBtn} onPress={handleConvertPdf}>
          <Ionicons name="document-text" size={20} color="#fff" />
          <Text style={styles.convertBtnText}>Convertir a PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { padding: 16, paddingBottom: 100 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', padding: 14, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  infoText: { fontSize: 15, color: '#1e40af', fontWeight: '600' },
  instruction: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pageCard: {
    width: '47%', aspectRatio: 0.707,
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 3,
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  pageNumBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#2563eb', width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  pageNumText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  deleteBtn: { position: 'absolute', top: 6, right: 6 },
  reorderRow: {
    position: 'absolute', bottom: 8, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  arrowBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  addPageCard: {
    width: '47%', aspectRatio: 0.707,
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 2, borderColor: '#bfdbfe', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addPageText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, gap: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingBottom: 32,
  },
  cancelBtn: {
    paddingVertical: 14, paddingHorizontal: 20,
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  convertBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, backgroundColor: '#2563eb', borderRadius: 12,
  },
  convertBtnText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});
