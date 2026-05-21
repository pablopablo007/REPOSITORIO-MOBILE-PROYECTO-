import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';

type FlashMode = 'off' | 'auto' | 'on';

const FLASH_CYCLE: FlashMode[] = ['off', 'auto', 'on'];
const FLASH_ICONS: Record<FlashMode, keyof typeof Ionicons.glyphMap> = {
  off: 'flash-off',
  auto: 'flash-outline',
  on: 'flash',
};
const FLASH_LABELS: Record<FlashMode, string> = {
  off: 'OFF',
  auto: 'AUTO',
  on: 'ON',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GUIDE_WIDTH = SCREEN_WIDTH * 0.82;
const GUIDE_HEIGHT = GUIDE_WIDTH / 0.707;
const CORNER_LEN = 20;
const CORNER_WIDTH = 3;

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
  const [, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [mensajeError, setMensajeError] = useState('');
  const [capturando, setCapturando] = useState(false);
  const tomandoFoto = useRef(false);

  const existingPages: string[] = params.existingPages ? JSON.parse(params.existingPages) : [];
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (isWeb) return;

    const pedirPermisos = async () => {
      try {
        if (Platform.OS === 'ios') {
          const resultado = await requestPermission();
          if (!resultado.granted) {
            setPermissionDenied(true);
          }
        } else {
          const { status } = await Camera.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            setPermissionDenied(true);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo solicitar el permiso de cámara.';
        setMensajeError(message);
      }
    };

    pedirPermisos();
  }, [isWeb, requestPermission]);

  const cycleFlash = () => {
    const currentIndex = FLASH_CYCLE.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % FLASH_CYCLE.length;
    setFlashMode(FLASH_CYCLE[nextIndex]);
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

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady || tomandoFoto.current || capturando) return;

    tomandoFoto.current = true;
    setCapturando(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: true,
        exif: false,
      });

      if (photo?.uri) {
        navigateToPreview(photo.uri);
      }
    } catch (error) {
      if (Platform.OS === 'ios' && error instanceof Error && error.message.includes('unmounted')) {
        try {
          const resultado = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsEditing: false,
          });
          
          if (!resultado.canceled && resultado.assets[0]) {
            navigateToPreview(resultado.assets[0].uri);
          }
        } catch (fallbackError) {
          const message = fallbackError instanceof Error ? fallbackError.message : 'Error al abrir la cámara nativa.';
          Alert.alert('Error', `No se pudo tomar la foto: ${message}`);
        }
      } else {
        const message = error instanceof Error ? error.message : 'Error desconocido.';
        Alert.alert('Error', `No se pudo tomar la foto: ${message}`);
      }
    } finally {
      tomandoFoto.current = false;
      setCapturando(false);
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

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets.length > 0) {
        navigateToPreview(result.assets[0].uri);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la galería.' });
    }
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

  const CameraComponent = useMemo(() => (
    <CameraView
      ref={cameraRef}
      style={StyleSheet.absoluteFillObject}
      facing="back"
      flash={flashMode}
      onCameraReady={() => setCameraReady(true)}
      onMountError={(error) => {
        console.error('Camera mount error:', error);
        setMensajeError(`Error al iniciar la cámara: ${error.message}`);
      }}
    />
  ), [flashMode]);

  if (isWeb || permissionDenied || mensajeError) {
    return (
      <View style={styles.fallbackContainer}>
        <View style={styles.fallbackCard}>
          <View style={styles.fallbackIconCircle}>
            <Ionicons
              name={permissionDenied ? 'lock-closed-outline' : 'camera-outline'}
              size={52}
              color="#9ca3af"
            />
          </View>
          <Text style={styles.fallbackTitle}>
            {mensajeError ? 'Error al iniciar la cámara' : permissionDenied ? 'Permiso de cámara denegado' : 'Cámara no disponible'}
          </Text>
          <Text style={styles.fallbackText}>
            {mensajeError ||
              (permissionDenied
                ? 'Ve a la configuración del dispositivo para habilitar el permiso de cámara.'
                : 'La cámara no está disponible en este dispositivo. Puedes importar una imagen desde la galería.')}
          </Text>

          {permissionDenied && (
            <TouchableOpacity style={styles.settingsBtn} onPress={() => Linking.openSettings()}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
              <Text style={styles.settingsBtnText}>Abrir configuración</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
            <Ionicons name="images" size={22} color="#fff" />
            <Text style={styles.galleryBtnText}>Importar desde galería</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {CameraComponent}

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.topBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>

          {existingPages.length > 0 && (
            <View style={styles.pageCounter}>
              <Text style={styles.pageCounterText}>
                {existingPages.length} página{existingPages.length > 1 ? 's' : ''} capturada{existingPages.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <View style={styles.topRightBtns}>
            <TouchableOpacity onPress={pickFromGallery} style={styles.topBtn}>
              <Ionicons name="images" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={cycleFlash} style={styles.topBtn}>
              <Ionicons name={FLASH_ICONS[flashMode]} size={22} color="#fff" />
              <Text style={styles.flashLabel}>{FLASH_LABELS[flashMode]}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.guideArea}>
          <View style={styles.guideFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.guideText}>Encuadra el documento en el marco</Text>
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.captureBtn, (!cameraReady || capturando) && { opacity: 0.4 }]}
            onPress={handleCapture}
            disabled={!cameraReady || capturando}
          >
            {capturando ? (
              <ActivityIndicator color="#000" size="large" style={styles.captureBtnInner} />
            ) : (
              <View style={styles.captureBtnInner} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightBtns: { flexDirection: 'row', gap: 10 },
  flashLabel: {
    position: 'absolute',
    bottom: -14,
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  pageCounter: {
    backgroundColor: 'rgba(37,99,235,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pageCounterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  guideArea: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  guideFrame: {
    width: GUIDE_WIDTH,
    height: GUIDE_HEIGHT > SCREEN_HEIGHT * 0.5 ? SCREEN_HEIGHT * 0.5 : GUIDE_HEIGHT,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 4,
    position: 'relative',
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: 'rgba(0,0,0,0)',
    overflow: 'visible',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopColor: '#fff',
    borderLeftColor: '#fff',
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopColor: '#fff',
    borderRightColor: '#fff',
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomColor: '#fff',
    borderLeftColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomColor: '#fff',
    borderRightColor: '#fff',
    borderBottomRightRadius: 4,
  },
  guideText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 18,
    textAlign: 'center',
  },
  bottomBar: {
    alignItems: 'center',
    paddingBottom: 44,
    paddingHorizontal: 24,
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
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
  fallbackIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
  },
  fallbackText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  settingsBtn: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
    justifyContent: 'center',
  },
  settingsBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  galleryBtn: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    justifyContent: 'center',
  },
  galleryBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  backBtn: { marginTop: 16 },
  backBtnText: { color: '#6b7280', fontSize: 15 },
});
