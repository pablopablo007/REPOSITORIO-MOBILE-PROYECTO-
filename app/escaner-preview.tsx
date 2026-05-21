import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { detectarMargenes, MargenesDetectados } from '../utils/detectarMargenes';

const getImageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

const htmlDeteccion = (base64Img: string) => `
<!DOCTYPE html>
<html>
<body>
<canvas id="c" style="display:none"></canvas>
<script>
const finish = (resultado) => {
  window.ReactNativeWebView.postMessage(JSON.stringify(resultado));
};

const img = new Image();
img.onerror = function() {
  finish({ left: 0, top: 0, right: 1, bottom: 1, confianza: 'baja' });
};

img.onload = function() {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = 200;
  const H = Math.max(1, Math.round(img.height * W / img.width));
  canvas.width = W;
  canvas.height = H;
  ctx.drawImage(img, 0, 0, W, H);

  const data = ctx.getImageData(0, 0, W, H).data;
  const cornerLum = (x, y) => {
    const i = (y * W + x) * 4;
    return (data[i] + data[i + 1] + data[i + 2]) / 3;
  };

  const fondoColor = (
    cornerLum(0, 0) +
    cornerLum(W - 1, 0) +
    cornerLum(0, H - 1) +
    cornerLum(W - 1, H - 1)
  ) / 4;

  let minX = W;
  let maxX = 0;
  let minY = H;
  let maxY = 0;
  let hits = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const diff = Math.abs(lum - fondoColor);

      if (diff > 40) {
        hits++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (hits < W * H * 0.02 || minX >= maxX || minY >= maxY) {
    finish({ left: 0, top: 0, right: 1, bottom: 1, confianza: 'baja' });
    return;
  }

  const margin = 0.02;
  const detectedWidth = maxX - minX;
  const detectedHeight = maxY - minY;
  const resultado = {
    left: Math.max(0, (minX / W) - margin),
    top: Math.max(0, (minY / H) - margin),
    right: Math.min(1, (maxX / W) + margin),
    bottom: Math.min(1, (maxY / H) + margin),
    confianza: detectedWidth > W * 0.3 && detectedHeight > H * 0.3 ? 'alta' : 'media'
  };

  finish(resultado);
};

img.src = 'data:image/jpeg;base64,${base64Img.replace(/[\r\n]/g, '')}';
</script>
</body>
</html>
`;

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

  const originalUri = params.imageUri || '';
  const existingPages: string[] = params.existingPages ? JSON.parse(params.existingPages) : [];

  const [currentUri, setCurrentUri] = useState(originalUri);
  const [bnActive, setBnActive] = useState(false);
  const [brightnessUp, setBrightnessUp] = useState(false);
  const [contrastUp, setContrastUp] = useState(false);
  const [rotationCount, setRotationCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState('Procesando...');
  const [detectando, setDetectando] = useState(false);
  const [base64ParaDeteccion, setBase64ParaDeteccion] = useState('');
  const [margenes, setMargenes] = useState<MargenesDetectados | null>(null);
  const [mostrarConfirmacionRecorte, setMostrarConfirmacionRecorte] = useState(false);

  const totalPages = existingPages.length + 1;
  const busy = isProcessing || detectando;

  const forwardParams = () => ({
    fromIndicator: params.fromIndicator || '',
    indicatorName: params.indicatorName || '',
    criterio: params.criterio || '',
    year: params.year || '',
    breadcrumb: params.breadcrumb || '',
  });

  const aplicarRecorteAutomatico = useCallback(async (margenesDetectados: MargenesDetectados, mostrarToast = true) => {
    if (!manipulateAsync || !SaveFormat) {
      Toast.show({ type: 'info', text1: 'Auto-recorte', text2: 'expo-image-manipulator no disponible.' });
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Recortando imagen...');
    try {
      const { width, height } = await getImageSize(currentUri);
      const originX = Math.max(0, Math.round(margenesDetectados.left * width));
      const originY = Math.max(0, Math.round(margenesDetectados.top * height));
      const cropWidth = Math.max(1, Math.round((margenesDetectados.right - margenesDetectados.left) * width));
      const cropHeight = Math.max(1, Math.round((margenesDetectados.bottom - margenesDetectados.top) * height));

      const recortada = await manipulateAsync(
        currentUri,
        [{
          crop: {
            originX,
            originY,
            width: Math.min(cropWidth, width - originX),
            height: Math.min(cropHeight, height - originY),
          },
        }],
        { format: SaveFormat.JPEG, compress: 0.9 }
      );

      setCurrentUri(recortada.uri);
      setMargenes(null);
      setMostrarConfirmacionRecorte(false);

      if (mostrarToast) {
        Toast.show({ type: 'success', text1: 'Márgenes detectados ✓', text2: 'Auto-recorte aplicado.' });
      }
    } catch (error) {
      console.error('Auto crop error:', error);
      Toast.show({ type: 'error', text1: 'Auto-recorte', text2: 'No se pudo aplicar el recorte.' });
    } finally {
      setIsProcessing(false);
      setProcessingLabel('Procesando...');
    }
  }, [currentUri]);

  const handleRotate = useCallback(async () => {
    if (!manipulateAsync || !SaveFormat) {
      Toast.show({ type: 'info', text1: 'Rotación', text2: 'expo-image-manipulator no disponible.' });
      return;
    }

    setIsProcessing(true);
    setProcessingLabel('Rotando imagen...');
    try {
      const result = await manipulateAsync(
        currentUri,
        [{ rotate: -90 }],
        { compress: 0.9, format: SaveFormat.JPEG }
      );
      setCurrentUri(result.uri);
      setRotationCount(current => current + 1);
    } catch (error) {
      console.error('Rotation error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo rotar la imagen.' });
    } finally {
      setIsProcessing(false);
      setProcessingLabel('Procesando...');
    }
  }, [currentUri]);

  const procesarMargenes = useCallback(async () => {
    if (busy) return;

    setDetectando(true);
    setProcessingLabel('Detectando bordes...');
    try {
      const base64 = await FileSystem.readAsStringAsync(currentUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setBase64ParaDeteccion(base64);
    } catch (error) {
      console.error('Detection read error:', error);
      setDetectando(false);
      setProcessingLabel('Procesando...');
      Toast.show({ type: 'error', text1: 'Auto-recorte', text2: 'No se pudo leer la imagen.' });
    }
  }, [busy, currentUri]);

  const handleResultadoDeteccion = useCallback(async (event: any) => {
    setBase64ParaDeteccion('');

    try {
      const resultado = JSON.parse(event.nativeEvent.data) as MargenesDetectados;
      setMargenes(resultado);

      if (resultado.confianza === 'baja') {
        setDetectando(false);
        setProcessingLabel('Procesando...');
        Toast.show({
          type: 'info',
          text1: 'Auto-recorte',
          text2: 'No se detectaron márgenes claros, ajusta la iluminación.',
        });
        return;
      }

      if (resultado.confianza === 'alta') {
        setDetectando(false);
        await aplicarRecorteAutomatico(resultado, false);
        Toast.show({ type: 'success', text1: 'Márgenes detectados ✓', text2: 'Recorte aplicado automáticamente.' });
        return;
      }

      setDetectando(false);
      setProcessingLabel('Procesando...');
      setMostrarConfirmacionRecorte(true);
    } catch (error) {
      console.error('Detection parse error:', error);
      setDetectando(false);
      setProcessingLabel('Procesando...');
      Toast.show({ type: 'error', text1: 'Auto-recorte', text2: 'No se pudo procesar la detección.' });
    }
  }, [aplicarRecorteAutomatico]);

  const handleDetectionWebViewError = useCallback(async () => {
    setBase64ParaDeteccion('');
    setDetectando(false);
    setProcessingLabel('Procesando...');

    const fallback = await detectarMargenes(currentUri);
    if (fallback.confianza === 'baja') {
      Toast.show({
        type: 'info',
        text1: 'Auto-recorte',
        text2: 'No se detectaron márgenes claros, ajusta la iluminación.',
      });
      return;
    }

    setMargenes(fallback);
    setMostrarConfirmacionRecorte(true);
  }, [currentUri]);

  const toggleBN = () => setBnActive(!bnActive);
  const toggleBrightness = () => setBrightnessUp(!brightnessUp);
  const toggleContrast = () => setContrastUp(!contrastUp);

  const handleRetake = () => {
    router.back();
  };

  const handleAddPage = () => {
    const updatedPages = [...existingPages, currentUri];
    router.push({
      pathname: '/escaner',
      params: {
        existingPages: JSON.stringify(updatedPages),
        ...forwardParams(),
      },
    });
  };

  const handleContinue = () => {
    const allPages = [...existingPages, currentUri];

    if (allPages.length > 1) {
      router.push({
        pathname: '/escaner-paginas',
        params: {
          pages: JSON.stringify(allPages),
          ...forwardParams(),
        },
      });
    } else {
      router.push({
        pathname: '/escaner-guardar',
        params: {
          pages: JSON.stringify(allPages),
          ...forwardParams(),
        },
      });
    }
  };

  const enhancementButtons = [
    { key: 'bn', icon: 'moon-outline' as const, label: 'B/N', active: bnActive, onPress: toggleBN },
    { key: 'brillo', icon: 'sunny-outline' as const, label: 'Brillo+', active: brightnessUp, onPress: toggleBrightness },
    { key: 'contraste', icon: 'contrast-outline' as const, label: 'Contraste', active: contrastUp, onPress: toggleContrast },
    { key: 'rotar', icon: 'refresh-outline' as const, label: 'Rotar↺', active: false, onPress: handleRotate },
    { key: 'auto', icon: 'scan-outline' as const, label: 'Auto-recorte', active: detectando, onPress: procesarMargenes },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.pageCounterRow}>
          <Ionicons name="document-text" size={18} color="#2563eb" />
          <Text style={styles.pageCounterText}>Página {totalPages} de {totalPages}</Text>
        </View>

        <View style={styles.imageContainer}>
          <View style={styles.imageWrapper}>
            <Image source={{ uri: currentUri }} style={styles.image} resizeMode="contain" />
            {bnActive && <View style={styles.bnOverlay} />}
            {brightnessUp && <View style={styles.brightnessOverlay} />}
            {contrastUp && <View style={styles.contrastOverlay} />}
          </View>

          {busy && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.processingText}>{processingLabel}</Text>
            </View>
          )}
        </View>

        <View style={styles.enhancementsRow}>
          {enhancementButtons.map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[styles.enhBtn, btn.active && styles.enhBtnActive]}
              onPress={btn.onPress}
              disabled={busy}
            >
              <Ionicons name={btn.icon} size={20} color={btn.active ? '#fff' : '#4b5563'} />
              <Text style={[styles.enhBtnText, btn.active && { color: '#fff' }]} numberOfLines={2}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(bnActive || brightnessUp || contrastUp || rotationCount > 0) && (
          <View style={styles.activeEffects}>
            {bnActive && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>B/N activo</Text>
              </View>
            )}
            {brightnessUp && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>Brillo+</Text>
              </View>
            )}
            {contrastUp && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>Contraste+</Text>
              </View>
            )}
            {rotationCount > 0 && (
              <View style={styles.effectTag}>
                <Text style={styles.effectTagText}>Rotado {(rotationCount * 90) % 360}°</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {base64ParaDeteccion ? (
        <WebView
          style={styles.hiddenWebView}
          source={{ html: htmlDeteccion(base64ParaDeteccion) }}
          onMessage={handleResultadoDeteccion}
          onError={handleDetectionWebViewError}
        />
      ) : null}

      <Modal visible={mostrarConfirmacionRecorte} transparent animationType="fade">
        <View style={styles.cropModalOverlay}>
          <View style={styles.cropModal}>
            <Text style={styles.cropModalTitle}>Recorte sugerido</Text>
            <Text style={styles.cropModalText}>Confianza media. Revisa el área marcada antes de aplicar.</Text>
            <View style={styles.cropPreviewBox}>
              <Image source={{ uri: currentUri }} style={styles.cropPreviewImage} resizeMode="contain" />
              {margenes && (
                <View
                  pointerEvents="none"
                  style={[
                    styles.cropRect,
                    {
                      left: `${margenes.left * 100}%`,
                      top: `${margenes.top * 100}%`,
                      width: `${(margenes.right - margenes.left) * 100}%`,
                      height: `${(margenes.bottom - margenes.top) * 100}%`,
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.cropModalActions}>
              <TouchableOpacity
                style={styles.cropCancelBtn}
                onPress={() => {
                  setMostrarConfirmacionRecorte(false);
                  setMargenes(null);
                }}
              >
                <Text style={styles.cropCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cropApplyBtn}
                onPress={() => margenes && aplicarRecorteAutomatico(margenes)}
              >
                <Text style={styles.cropApplyText}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake} disabled={busy}>
          <Ionicons name="refresh" size={18} color="#6b7280" />
          <Text style={styles.retakeBtnText}>Repetir foto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addPageBtn} onPress={handleAddPage} disabled={busy}>
          <Ionicons name="add-circle" size={18} color="#2563eb" />
          <Text style={styles.addPageBtnText}>Agregar página</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} disabled={busy}>
          <Text style={styles.continueBtnText}>Continuar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { padding: 16, paddingBottom: 110 },
  pageCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  pageCounterText: { fontSize: 14, color: '#1e40af', fontWeight: '600' },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 0.65,
    backgroundColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  bnOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  brightnessOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  contrastOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  processingText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  enhancementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 12,
  },
  enhBtn: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 3,
    backgroundColor: '#fff',
    borderRadius: 10,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  enhBtnActive: { backgroundColor: '#2563eb' },
  enhBtnText: { fontSize: 10, color: '#4b5563', fontWeight: '600', textAlign: 'center' },
  activeEffects: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 8 },
  effectTag: { backgroundColor: '#dbeafe', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  effectTagText: { fontSize: 11, color: '#1e40af', fontWeight: '600' },
  hiddenWebView: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
  },
  cropModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  cropModal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  cropModalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  cropModalText: { color: '#64748b', fontSize: 13, marginTop: 6, marginBottom: 12 },
  cropPreviewBox: {
    width: '100%',
    aspectRatio: 0.65,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  cropPreviewImage: { width: '100%', height: '100%' },
  cropRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.08)',
  },
  cropModalActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cropCancelBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cropCancelText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  cropApplyBtn: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  cropApplyText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingBottom: 32,
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  retakeBtnText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  addPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 10,
    backgroundColor: '#eff6ff',
  },
  addPageBtnText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  continueBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  continueBtnText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
});
