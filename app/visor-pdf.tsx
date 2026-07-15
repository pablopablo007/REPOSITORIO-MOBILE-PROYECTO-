import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VisorPDFScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri: string; title: string; remoteUrl?: string }>();
  const { uri, title, remoteUrl } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);

  useEffect(() => {
    loadPdf();
  }, []);

  const loadPdf = async () => {
    try {
      setLoading(true);
      setError(false);

      // Caso 1: Archivo local (escaneado, etc.)
      if (uri && uri.startsWith('file://')) {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setPdfBase64(base64);
          setLocalFilePath(uri);
          setLoading(false);
          return;
        }
      }

      // Caso 2: Archivo en el servidor backend (descargar primero)
      if (remoteUrl) {
        const token = await AsyncStorage.getItem('@auth_token');
        const destino = FileSystem.cacheDirectory + (title || 'documento.pdf');

        const downloadOptions: FileSystem.DownloadOptions = {};
        if (token) {
          downloadOptions.headers = { Authorization: `Bearer ${token}` };
        }

        const { uri: downloadedUri } = await FileSystem.downloadAsync(
          remoteUrl,
          destino,
          downloadOptions
        );

        const base64 = await FileSystem.readAsStringAsync(downloadedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        setPdfBase64(base64);
        setLocalFilePath(downloadedUri);
        setLoading(false);
        return;
      }

      // Sin fuente disponible
      setLoading(false);
      setError(true);
    } catch (e) {
      console.error('[VisorPDF] Error cargando PDF:', e);
      setLoading(false);
      setError(true);
    }
  };

  const handleCompartir = async () => {
    if (!localFilePath) return;
    try {
      setCompartiendo(true);
      await Sharing.shareAsync(localFilePath, {
        mimeType: 'application/pdf',
        dialogTitle: title || 'Compartir PDF',
      });
      setCompartiendo(false);
    } catch (e) {
      setCompartiendo(false);
      Alert.alert('Error', 'No se pudo compartir el archivo.');
    }
  };

  // HTML que usa PDF.js para renderizar el PDF desde base64
  const getHtmlContent = (base64Data: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #525659;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      overflow-x: hidden;
    }
    #loading {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: #f1f5f9;
      display: flex; align-items: center; justify-content: center;
      flex-direction: column; z-index: 100;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #loading .spinner {
      width: 40px; height: 40px;
      border: 4px solid #e2e8f0; border-top: 4px solid #2563eb;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loading p { margin-top: 16px; color: #64748b; font-size: 15px; }
    canvas {
      display: block;
      margin: 8px auto;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 100%;
    }
    #page-info {
      position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.7); color: #fff;
      padding: 6px 16px; border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px; font-weight: 600; z-index: 50;
    }
  </style>
</head>
<body>
  <div id="loading">
    <div class="spinner"></div>
    <p>Renderizando PDF...</p>
  </div>
  <div id="pdf-container"></div>
  <div id="page-info" style="display:none;"></div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const base64 = '${base64Data}';
    const pdfData = atob(base64);
    const uint8Array = new Uint8Array(pdfData.length);
    for (let i = 0; i < pdfData.length; i++) {
      uint8Array[i] = pdfData.charCodeAt(i);
    }

    const container = document.getElementById('pdf-container');
    const loadingDiv = document.getElementById('loading');
    const pageInfo = document.getElementById('page-info');

    pdfjsLib.getDocument({ data: uint8Array }).promise.then(function(pdf) {
      const totalPages = pdf.numPages;
      loadingDiv.style.display = 'none';
      pageInfo.style.display = 'block';
      pageInfo.textContent = totalPages + (totalPages === 1 ? ' página' : ' páginas');

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        pdf.getPage(pageNum).then(function(page) {
          const scale = 2;
          const viewport = page.getViewport({ scale: scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.style.height = 'auto';
          container.appendChild(canvas);
          const ctx = canvas.getContext('2d');
          page.render({ canvasContext: ctx, viewport: viewport });
        });
      }
    }).catch(function(err) {
      loadingDiv.innerHTML = '<p style="color:#dc2626;">Error al renderizar el PDF</p>';
      console.error(err);
    });
  </script>
</body>
</html>`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Visor de PDF'}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleCompartir} disabled={compartiendo || !localFilePath}>
          {compartiendo ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="share-outline" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.webviewContainer}>
        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loaderText}>Descargando documento...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="document-text-outline" size={64} color="#94a3b8" />
            <Text style={styles.errorTitle}>No se pudo cargar el PDF</Text>
            <Text style={styles.errorSubtitle}>
              Verifica tu conexión a internet o intenta compartir el archivo para abrirlo con otra aplicación.
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadPdf}>
              <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleCompartir}>
              <Ionicons name="open-outline" size={18} color="#2563eb" style={{ marginRight: 6 }} />
              <Text style={styles.shareBtnText}>Abrir con otra app</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && pdfBase64 && (
          <WebView
            source={{ html: getHtmlContent(pdfBase64) }}
            style={styles.webview}
            javaScriptEnabled
            domStorageEnabled
            scalesPageToFit
            originWhitelist={['*']}
            mixedContentMode="always"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e2d4a',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 8,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: '#525659',
  },
  webview: {
    flex: 1,
    backgroundColor: '#525659',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loaderText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f1f5f9',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 24,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  shareBtnText: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 15,
  },
});
