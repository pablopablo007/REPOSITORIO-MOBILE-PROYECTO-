import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

let CameraView: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch (e) {
  // expo-camera not available (web)
}

export default function EscanerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
    existingPages?: string;
  }>();

  const cameraRef = useRef<any>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const existingPages: string[] = params.existingPages ? JSON.parse(params.existingPages) : [];

  const isWeb = Platform.OS === 'web';
  const noCameraAvailable = isWeb || !CameraView;

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        navigateToPreview(photo.uri);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo capturar la foto.' });
    }
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({ type: 'error', text1: 'Permiso denegado', text2: 'Se necesita acceso a la galería.' });
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) {
        navigateToPreview(result.assets[0].uri);
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la galería.' });
    }
  };

  const navigateToPreview = (uri: string) => {
    router.push({
      pathname: '/escaner-preview',
      params: {
        imageUri: uri,
        existingPages: JSON.stringify(existingPages),
        fromIndicator: params.fromIndicator || '',
        indicatorName: params.indicatorName || '',
        criterio: params.criterio || '',
        year: params.year || '',
        breadcrumb: params.breadcrumb || '',
      },
    });
  };

  const handleClose = () => {
    if (existingPages.length > 0) {
      Alert.alert(
        'Descartar escaneo',
        '¿Descartar el escaneo actual? Se perderán todas las páginas capturadas.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // No camera fallback (web or no permissions)
  if (noCameraAvailable || permissionDenied) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <Ionicons name="camera-outline" size={64} color="#9ca3af" />
          <Text style={styles.fallbackTitle}>
            {permissionDenied ? 'Permiso de cámara denegado' : 'Cámara no disponible'}
          </Text>
          <Text style={styles.fallbackText}>
            {permissionDenied
              ? 'Ve a la configuración del dispositivo para habilitar el permiso de cámara.'
              : 'La cámara no está disponible en este dispositivo. Puedes importar una imagen desde la galería.'}
          </Text>
          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
            <Ionicons name="images" size={22} color="#fff" />
            <Text style={styles.galleryBtnText}>Importar desde galería</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Native camera view
  return (
    <View style={styles.container}>
      {CameraView && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={flashOn ? 'on' : 'off'}
          onCameraReady={() => setCameraReady(true)}
        />
      )}

      {/* Overlay guide */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.topBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {existingPages.length > 0 && (
            <View style={styles.pageCounter}>
              <Text style={styles.pageCounterText}>{existingPages.length} página(s) capturada(s)</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => setFlashOn(!flashOn)} style={styles.topBtn}>
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Document guide frame */}
        <View style={styles.guideArea}>
          <View style={styles.guideFrame}>
            {/* Corners */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.guideText}>Encuadra el documento dentro del marco</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.sideBtn} onPress={pickFromGallery}>
            <Ionicons name="images" size={26} color="#fff" />
            <Text style={styles.sideBtnText}>Galería</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.captureBtn, !cameraReady && { opacity: 0.5 }]}
            onPress={handleCapture}
            disabled={!cameraReady}
          >
            <View style={styles.captureBtnInner} />
          </TouchableOpacity>

          <View style={styles.sideBtn}>
            <Ionicons name="scan" size={26} color="#fff" />
            <Text style={styles.sideBtnText}>Escáner</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 30;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageCounter: {
    backgroundColor: 'rgba(37,99,235,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  guideArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  guideFrame: {
    width: '82%',
    aspectRatio: 0.707, // A4 ratio
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: -1, left: -1,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderTopColor: '#fff', borderLeftColor: '#fff',
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -1, right: -1,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderTopColor: '#fff', borderRightColor: '#fff',
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -1, left: -1,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
    borderBottomColor: '#fff', borderLeftColor: '#fff',
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -1, right: -1,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
    borderBottomColor: '#fff', borderRightColor: '#fff',
    borderBottomRightRadius: 8,
  },
  guideText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sideBtn: { alignItems: 'center', width: 60 },
  sideBtnText: { color: '#fff', fontSize: 11, marginTop: 4 },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#fff',
  },
  // Fallback styles
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  fallbackTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 16, textAlign: 'center' },
  fallbackText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  galleryBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  galleryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { marginTop: 16 },
  cancelBtnText: { color: '#6b7280', fontSize: 15 },
});
