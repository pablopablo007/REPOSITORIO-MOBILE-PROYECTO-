import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - COLUMN_GAP) / 2; // 2 columns with padding

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
  const [swapSource, setSwapSource] = useState<number | null>(null);

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

  // LongPress swap reordering
  const handleLongPress = useCallback((index: number) => {
    if (swapSource === null) {
      setSwapSource(index);
    } else {
      // Swap positions
      const updated = [...pages];
      const temp = updated[swapSource];
      updated[swapSource] = updated[index];
      updated[index] = temp;
      setPages(updated);
      setSwapSource(null);
    }
  }, [swapSource, pages]);

  const addMorePages = () => {
    setSwapSource(null);
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
        {/* Title */}
        <Text style={styles.title}>Páginas del documento ({pages.length})</Text>

        {/* Swap mode indicator */}
        {swapSource !== null && (
          <View style={styles.swapBanner}>
            <Ionicons name="swap-horizontal" size={18} color="#1e40af" />
            <Text style={styles.swapBannerText}>
              Página {swapSource + 1} seleccionada. Toca otra página para intercambiar posición.
            </Text>
            <TouchableOpacity onPress={() => setSwapSource(null)}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.instruction}>
          Mantén presionada una imagen para reordenar
        </Text>

        {/* Pages grid — 2 columns */}
        <View style={styles.grid}>
          {pages.map((uri, index) => (
            <TouchableOpacity
              key={`${index}-${uri.slice(-10)}`}
              style={[
                styles.pageCard,
                swapSource === index && styles.pageCardSelected,
              ]}
              activeOpacity={0.8}
              onLongPress={() => handleLongPress(index)}
              onPress={() => {
                if (swapSource !== null && swapSource !== index) {
                  handleLongPress(index);
                }
              }}
              delayLongPress={400}
            >
              <Image source={{ uri }} style={styles.thumbnail} resizeMode="cover" />

              {/* Page number badge */}
              <View style={styles.pageNumBadge}>
                <Text style={styles.pageNumText}>{index + 1}</Text>
              </View>

              {/* Delete button */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removePage(index)}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
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
          <Text style={styles.convertBtnText}>Convertir a PDF →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { padding: 16, paddingBottom: 110 },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  instruction: { fontSize: 13, color: '#6b7280', marginBottom: 16 },

  // Swap banner
  swapBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dbeafe',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  swapBannerText: { flex: 1, fontSize: 13, color: '#1e40af', fontWeight: '500' },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: COLUMN_GAP },

  pageCard: {
    width: CARD_WIDTH,
    aspectRatio: 0.707,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  pageCardSelected: {
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  thumbnail: { width: '100%', height: '100%' },

  pageNumBadge: {
    position: 'absolute', top: 8, left: 8,
    backgroundColor: '#2563eb', width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
  },
  pageNumText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  deleteBtn: { position: 'absolute', top: 6, right: 6 },

  addPageCard: {
    width: CARD_WIDTH,
    aspectRatio: 0.707,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addPageText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },

  // Bottom
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
    paddingVertical: 16, backgroundColor: '#2563eb', borderRadius: 12,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  convertBtnText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});
