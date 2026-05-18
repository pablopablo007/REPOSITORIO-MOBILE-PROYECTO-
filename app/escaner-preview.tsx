import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// Try to import image manipulator for rotation
let manipulateAsync: any = null;
let SaveFormat: any = null;
try {
  const im = require('expo-image-manipulator');
  manipulateAsync = im.manipulateAsync;
  SaveFormat = im.SaveFormat;
} catch {}

export default function EscanerPreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri: string;
    existingPages?: string;
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
  }>();

  const imageUri = params.imageUri || '';
  const existingPages: string[] = params.existingPages ? JSON.parse(params.existingPages) : [];

  // Enhancement state — B/N active by default per user request
  const [bnActive, setBnActive] = useState(true);
  const [brightnessUp, setBrightnessUp] = useState(false);
  const [contrastUp, setContrastUp] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showRotationSlider, setShowRotationSlider] = useState(false);

  const totalPages = existingPages.length + 1;

  const forwardParams = () => ({
    fromIndicator: params.fromIndicator || '',
    indicatorName: params.indicatorName || '',
    criterio: params.criterio || '',
    year: params.year || '',
    breadcrumb: params.breadcrumb || '',
  });

  const handleRetake = () => {
    router.back();
  };

  const handleAddPage = () => {
    const updatedPages = [...existingPages, imageUri];
    router.push({
      pathname: '/escaner',
      params: {
        existingPages: JSON.stringify(updatedPages),
        ...forwardParams(),
      },
    });
  };

  const handleContinue = () => {
    const allPages = [...existingPages, imageUri];

    if (allPages.length > 1) {
      router.push({
        pathname: '/escaner-paginas',
        params: {
          pages: JSON.stringify(allPages),
          ...forwardParams(),
        },
      });
    } else {
      // Single page — skip to save
      router.push({
        pathname: '/escaner-guardar',
        params: {
          pages: JSON.stringify(allPages),
          ...forwardParams(),
        },
      });
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Descartar escaneo',
      '¿Descartar el escaneo actual? Se perderán todas las páginas capturadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            // Go back to the docente tabs
            router.dismissAll();
          },
        },
      ]
    );
  };

  const toggleEnhancement = (name: string) => {
    switch (name) {
      case 'bn': setBnActive(!bnActive); break;
      case 'brillo': setBrightnessUp(!brightnessUp); break;
      case 'contraste': setContrastUp(!contrastUp); break;
      case 'enderezar': setShowRotationSlider(!showRotationSlider); break;
      case 'recortar':
        Toast.show({ type: 'info', text1: 'Recorte', text2: 'Función de recorte disponible próximamente.' });
        break;
    }
  };

  const enhancementButtons = [
    { key: 'enderezar', icon: 'sync-outline' as const, label: 'Enderezar', active: showRotationSlider },
    { key: 'brillo', icon: 'sunny-outline' as const, label: 'Brillo+', active: brightnessUp },
    { key: 'contraste', icon: 'contrast-outline' as const, label: 'Contraste', active: contrastUp },
    { key: 'bn', icon: 'moon-outline' as const, label: 'B/N', active: bnActive },
    { key: 'recortar', icon: 'crop-outline' as const, label: 'Recortar', active: false },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Page counter */}
        <View style={styles.pageCounterRow}>
          <Ionicons name="document-text" size={18} color="#2563eb" />
          <Text style={styles.pageCounterText}>Página {totalPages} de {totalPages}</Text>
        </View>

        {/* Image preview with effects */}
        <View style={styles.imageContainer}>
          <View style={[styles.imageWrapper, { transform: [{ rotate: `${rotation}deg` }] }]}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
            {/* B/N overlay */}
            {bnActive && <View style={styles.bnOverlay} />}
            {/* Brightness overlay */}
            {brightnessUp && <View style={styles.brightnessOverlay} />}
            {/* Contrast overlay */}
            {contrastUp && <View style={styles.contrastOverlay} />}
          </View>
        </View>

        {/* Rotation slider */}
        {showRotationSlider && (
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Rotación: {rotation.toFixed(1)}°</Text>
            <View style={styles.webSliderRow}>
              <TouchableOpacity onPress={() => setRotation(Math.max(-15, rotation - 1))} style={styles.sliderBtn}>
                <Ionicons name="remove" size={20} color="#2563eb" />
              </TouchableOpacity>
              <View style={styles.webSliderTrack}>
                <View style={[styles.webSliderFill, { left: `${((rotation + 15) / 30) * 100}%` }]} />
              </View>
              <TouchableOpacity onPress={() => setRotation(Math.min(15, rotation + 1))} style={styles.sliderBtn}>
                <Ionicons name="add" size={20} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRotation(0)} style={styles.sliderBtn}>
                <Ionicons name="refresh" size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Enhancement buttons */}
        <View style={styles.enhancementsRow}>
          {enhancementButtons.map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[styles.enhBtn, btn.active && styles.enhBtnActive]}
              onPress={() => toggleEnhancement(btn.key)}
            >
              <Ionicons name={btn.icon} size={20} color={btn.active ? '#fff' : '#4b5563'} />
              <Text style={[styles.enhBtnText, btn.active && { color: '#fff' }]}>{btn.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Active effects indicator */}
        <View style={styles.activeEffects}>
          {bnActive && <View style={styles.effectTag}><Text style={styles.effectTagText}>B/N activo</Text></View>}
          {brightnessUp && <View style={styles.effectTag}><Text style={styles.effectTagText}>Brillo+</Text></View>}
          {contrastUp && <View style={styles.effectTag}><Text style={styles.effectTagText}>Contraste+</Text></View>}
        </View>
      </ScrollView>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
          <Ionicons name="refresh" size={20} color="#6b7280" />
          <Text style={styles.retakeBtnText}>Repetir foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPageBtn} onPress={handleAddPage}>
          <Ionicons name="add-circle" size={20} color="#2563eb" />
          <Text style={styles.addPageBtnText}>Agregar página</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { padding: 16, paddingBottom: 100 },
  pageCounterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, marginBottom: 12, gap: 6,
  },
  pageCounterText: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
  imageContainer: { alignItems: 'center', marginBottom: 16 },
  imageWrapper: {
    width: '100%', aspectRatio: 0.707,
    backgroundColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  bnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    // Simulates grayscale by darkening + desaturation feel
  },
  brightnessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  contrastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  sliderContainer: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  sliderLabel: { fontSize: 13, color: '#6b7280', marginBottom: 8, textAlign: 'center' },
  webSliderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sliderBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  webSliderTrack: {
    flex: 1, height: 4, backgroundColor: '#d1d5db', borderRadius: 2, position: 'relative',
  },
  webSliderFill: {
    position: 'absolute', width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#2563eb', top: -5,
  },
  enhancementsRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginBottom: 12,
  },
  enhBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#fff', borderRadius: 10, gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  },
  enhBtnActive: { backgroundColor: '#2563eb' },
  enhBtnText: { fontSize: 11, color: '#4b5563', fontWeight: '600' },
  activeEffects: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  effectTag: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  effectTagText: { fontSize: 11, color: '#1e40af', fontWeight: '600' },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', padding: 16, gap: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingBottom: 32,
  },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, backgroundColor: '#fff',
  },
  retakeBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  addPageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#2563eb', borderRadius: 10, backgroundColor: '#eff6ff',
  },
  addPageBtnText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  continueBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, backgroundColor: '#2563eb', borderRadius: 10,
  },
  continueBtnText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
});
