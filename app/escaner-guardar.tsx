import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { DocumentType, useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

type EstadoConversion = 'convirtiendo' | 'listo' | 'error';

const DOCUMENT_TYPE_OPTIONS: { label: string; value: DocumentType }[] = [
  { label: 'Académico', value: 'Académico' },
  { label: 'Título o Certificado', value: 'Título/Certificado' },
  { label: 'Informe o Reporte', value: 'Informe' },
  { label: 'Acta o Reunión', value: 'Acta' },
  { label: 'Otro', value: 'Otro' },
];

const PERIOD_OPTIONS = ['2025', '2024', '2023'].map(period => ({ label: period, value: period }));

const formatFecha = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const buildDefaultName = () => `Scan_${formatFecha()}.pdf`;

const formatTaskDate = (date: string) =>
  new Date(date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function EscanerGuardarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pages: string;
    taskId?: string;
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
  }>();
  const { uploadEvidence, completeTask, tasks } = useData();
  const { user } = useAuth();

  const pages = useMemo<string[]>(() => {
    if (!params.pages) return [];
    try {
      return JSON.parse(params.pages);
    } catch {
      return [];
    }
  }, [params.pages]);

  const [estado, setEstado] = useState<EstadoConversion>('convirtiendo');
  const [mensaje, setMensaje] = useState('Leyendo imágenes...');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfTamaño, setPdfTamaño] = useState('');
  const [nombreEditable, setNombreEditable] = useState(buildDefaultName());
  const [tipoSeleccionado, setTipoSeleccionado] = useState<DocumentType>('Académico');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025');
  const [descripcion, setDescripcion] = useState('');
  const [tareaSeleccionada, setTareaSeleccionada] = useState(params.taskId || 'ninguna');
  const [previewError, setPreviewError] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const conversionStarted = useRef(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const pendingTasks = useMemo(() => {
    const docenteId = user?.id || '1';
    return tasks
      .filter(task => task.docenteId === docenteId && (!task.completed || task.id === params.taskId))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [params.taskId, tasks, user?.id]);

  const nombreTareaSeleccionada = useMemo(
    () => pendingTasks.find(task => task.id === tareaSeleccionada)?.title || '',
    [pendingTasks, tareaSeleccionada]
  );

  useEffect(() => {
    if (estado !== 'convirtiendo') return;

    const animation = Animated.loop(
      Animated.timing(spinValue, { toValue: 1, duration: 1000, useNativeDriver: true })
    );
    animation.start();

    return () => animation.stop();
  }, [estado, spinValue]);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const convertirYMostrar = useCallback(async () => {
    try {
      if (!pages.length) {
        throw new Error('No hay imágenes para convertir.');
      }

      setEstado('convirtiendo');
      setMensaje('Leyendo imágenes...');

      const imagenes = await Promise.all(
        pages.map(async (uri) => {
          const nombreTemp = `${FileSystem.cacheDirectory}scan_${Date.now()}_${Math.random()}.jpg`;
          await FileSystem.copyAsync({ from: uri, to: nombreTemp });

          const base64 = await FileSystem.readAsStringAsync(nombreTemp, {
            encoding: FileSystem.EncodingType.Base64,
          });

          await FileSystem.deleteAsync(nombreTemp, { idempotent: true });
          return `data:image/jpeg;base64,${base64}`;
        })
      );

      setMensaje('Generando PDF...');

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page { size: 595pt 842pt; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 595pt;
    min-height: 842pt;
    background: #fff;
  }
  .pagina {
    width: 595pt;
    height: 842pt;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 18pt;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pagina:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
</head>
<body>
${imagenes.map(src => `<div class="pagina"><img src="${src}"/></div>`).join('\n')}
</body>
</html>`;

      const { uri: pdfTemp } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 595,
        height: 842,
      });

      setMensaje('Guardando PDF...');

      const nombre = buildDefaultName();
      const destino = `${FileSystem.documentDirectory}${nombre}`;

      await FileSystem.copyAsync({ from: pdfTemp, to: destino });
      await FileSystem.deleteAsync(pdfTemp, { idempotent: true });

      const info = await FileSystem.getInfoAsync(destino);
      const size = info.exists && typeof (info as any).size === 'number'
        ? `${Math.round((info as any).size / 1024)} KB`
        : 'desconocido';

      setNombreEditable(nombre);
      setPdfUri(destino);
      setPdfTamaño(size);
      setEstado('listo');
    } catch (err) {
      console.error('Error PDF:', err);
      const message = err instanceof Error ? err.message : String(err);
      setEstado('error');
      Alert.alert('Error', `No se pudo generar el PDF: ${message}`);
    }
  }, [pages]);

  useEffect(() => {
    if (conversionStarted.current) return;
    conversionStarted.current = true;
    convertirYMostrar();
  }, [convertirYMostrar]);

  const compartirPDF = async () => {
    if (!pdfUri) return;

    const existe = await FileSystem.getInfoAsync(pdfUri);
    if (!existe.exists) {
      Alert.alert('Archivo no encontrado', 'El archivo PDF ya no está disponible en este dispositivo.');
      return;
    }

    const disponible = await Sharing.isAvailableAsync();
    if (disponible) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Guardar o compartir PDF',
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('Compartir no disponible en este dispositivo');
    }
  };

  const guardarDocumento = async () => {
    if (!pdfUri) return;

    const nombreLimpio = nombreEditable.trim();
    if (!nombreLimpio) {
      Alert.alert('Nombre requerido', 'Escribe un nombre para el documento.');
      return;
    }

    try {
      const existe = await FileSystem.getInfoAsync(pdfUri);
      if (!existe.exists) {
        Alert.alert('Archivo no encontrado', 'El archivo PDF ya no está disponible en este dispositivo.');
        return;
      }

      const nombreFinal = nombreLimpio.endsWith('.pdf') ? nombreLimpio : `${nombreLimpio}.pdf`;
      const destinoFinal = `${FileSystem.documentDirectory}${nombreFinal}`;
      let uriFinal = pdfUri;

      if (destinoFinal !== pdfUri) {
        await FileSystem.deleteAsync(destinoFinal, { idempotent: true });
        await FileSystem.copyAsync({ from: pdfUri, to: destinoFinal });
        await FileSystem.deleteAsync(pdfUri, { idempotent: true });
        uriFinal = destinoFinal;
      }

      const nuevaEvidencia = {
        id: Date.now().toString(),
        nombre: nombreFinal,
        fileName: nombreFinal,
        tipo: tipoSeleccionado,
        documentType: tipoSeleccionado,
        origen: 'escaneado',
        scanned: true,
        badge: 'Escaneado',
        badgeColor: '#2563eb',
        paginas: pages.length,
        uri: uriFinal,
        fileUri: uriFinal,
        tamaño: pdfTamaño,
        fecha: new Date().toISOString(),
        date: new Date().toISOString(),
        estado: 'Pendiente',
        status: 'Pendiente',
        subidoPor: user?.name || 'Prof. Pablo Mora',
        docenteName: user?.name || 'Prof. Pablo Mora',
        descripcion,
        description: descripcion,
        periodo: periodoSeleccionado,
        docenteId: user?.id || '1',
        taskId: tareaSeleccionada !== 'ninguna' ? tareaSeleccionada : undefined,
        tareaId: tareaSeleccionada !== 'ninguna' ? tareaSeleccionada : undefined,
        tareaTitulo: tareaSeleccionada !== 'ninguna' ? nombreTareaSeleccionada : undefined,
      };

      const serverEvidenceId = await uploadEvidence(nuevaEvidencia as any);

      if (tareaSeleccionada && tareaSeleccionada !== 'ninguna') {
        await completeTask(tareaSeleccionada, serverEvidenceId);

        Toast.show({
          type: 'success',
          text1: '¡Documento guardado!',
          text2: `Vinculado a: ${nombreTareaSeleccionada}`,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Documento guardado',
          text2: `Guardado en ${tipoSeleccionado}`,
        });
      }

      router.replace('/(docente)/archivos');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Intenta nuevamente.';
      Alert.alert('Error', `No se pudo guardar el documento: ${message}`);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      '¿Descartar el escaneo?',
      'Se perderán las páginas capturadas.',
      [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => router.dismissAll() },
      ]
    );
  };

  const renderPickerModal = <T extends string>(
    visible: boolean,
    onClose: () => void,
    items: { label: string; value: T }[],
    onSelect: (value: T) => void,
    title: string
  ) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={styles.modalItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  if (estado === 'convirtiendo') {
    return (
      <View style={styles.convertingContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="sync" size={52} color="#2563eb" />
        </Animated.View>
        <Text style={styles.convertingText}>{mensaje}</Text>
        <Text style={styles.convertingSubtext}>
          {pages.length} página{pages.length > 1 ? 's' : ''} • No cierres la pantalla
        </Text>
      </View>
    );
  }

  if (estado === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={54} color="#dc2626" />
        <Text style={styles.errorTitle}>No se pudo generar el PDF</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={convertirYMostrar}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.saveBtnText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtnInline} onPress={handleCancel}>
          <Text style={styles.cancelBtnTextInline}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          
          {/* Banner Superior Elegante */}
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={26} color="#10b981" />
            <View style={styles.successTextContainer}>
              <Text style={styles.successTitle}>PDF Generado Correctamente</Text>
              <Text style={styles.successSubtitle}>{pages.length} página{pages.length > 1 ? 's' : ''} • {pdfTamaño}</Text>
            </View>
          </View>

          {/* Vista Previa del PDF */}
          <View style={styles.premiumCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Vista previa del documento</Text>
              <TouchableOpacity onPress={compartirPDF} style={styles.iconBtn}>
                <Ionicons name="share-outline" size={22} color="#2563eb" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewBox}>
              {pdfUri && !previewError ? (
                <WebView
                  source={{ uri: pdfUri }}
                  style={styles.webView}
                  onError={() => setPreviewError(true)}
                  originWhitelist={['*']}
                />
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailRow}>
                  {pages.map((uri, index) => (
                    <View key={`${uri}-${index}`} style={styles.thumbnailCard}>
                      <Image source={{ uri }} style={styles.thumbnailImage} resizeMode="cover" />
                      <Text style={styles.thumbnailLabel}>Pág. {index + 1}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Formulario de Detalles */}
          <View style={styles.premiumCard}>
            <Text style={styles.sectionTitle}>Detalles del Documento</Text>

            <Text style={styles.label}>Nombre del documento</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={20} color="#64748b" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={nombreEditable}
                onChangeText={setNombreEditable}
                placeholder="Nombre_del_documento.pdf"
                placeholderTextColor="#9ca3af"
                selectTextOnFocus
              />
            </View>

            <Text style={styles.label}>Tipo de documento</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowTypeModal(true)}>
              <Text style={styles.dropdownText}>
                {DOCUMENT_TYPE_OPTIONS.find(option => option.value === tipoSeleccionado)?.label}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </TouchableOpacity>

            <Text style={styles.label}>Período</Text>
            <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowPeriodModal(true)}>
              <Text style={styles.dropdownText}>{periodoSeleccionado}</Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </TouchableOpacity>

            <Text style={styles.label}>Descripción (Opcional)</Text>
            <TextInput
              style={[styles.inputWrapper, styles.textArea]}
              multiline
              maxLength={300}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Añade una descripción si es necesario..."
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.charCount}>{descripcion.length}/300</Text>
            
            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>¿A qué actividad corresponde?</Text>
            
            {pendingTasks.map(task => {
              const selected = tareaSeleccionada === task.id;
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[styles.taskOption, selected && styles.taskOptionSelected]}
                  activeOpacity={0.8}
                  onPress={() => setTareaSeleccionada(task.id)}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={selected ? '#2563eb' : '#cbd5e1'}
                  />
                  <View style={styles.taskOptionTextBox}>
                    <Text style={[styles.taskOptionTitle, selected && styles.taskOptionTitleSelected]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskOptionDate}>Vence el {formatTaskDate(task.deadline)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.taskOption, tareaSeleccionada === 'ninguna' && styles.taskOptionSelected]}
              activeOpacity={0.8}
              onPress={() => setTareaSeleccionada('ninguna')}
            >
              <Ionicons
                name={tareaSeleccionada === 'ninguna' ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={tareaSeleccionada === 'ninguna' ? '#2563eb' : '#cbd5e1'}
              />
              <Text style={[styles.taskOptionTitle, tareaSeleccionada === 'ninguna' && styles.taskOptionTitleSelected]}>
                Ninguna (Guardar libre)
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>

        {/* Bottom Bar para Botones de Acción Fijos */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Descartar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={guardarDocumento} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Guardar Documento</Text>
            <Ionicons name="save-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {renderPickerModal(showTypeModal, () => setShowTypeModal(false), DOCUMENT_TYPE_OPTIONS, setTipoSeleccionado, 'Tipo de documento')}
      {renderPickerModal(showPeriodModal, () => setShowPeriodModal(false), PERIOD_OPTIONS, setPeriodoSeleccionado, 'Período')}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f1f5f9' },
  keyboardView: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24 },

  convertingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  convertingText: { fontSize: 20, color: '#0f172a', fontWeight: '800', textAlign: 'center', marginTop: 24 },
  convertingSubtext: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' },
  
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#dc2626', textAlign: 'center', marginTop: 16 },

  // Nuevos Estilos
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    marginBottom: 16,
  },
  successTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#065f46',
    marginBottom: 2,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '500',
  },

  premiumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 15,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  iconBtn: {
    padding: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  previewBox: {
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  webView: { flex: 1, backgroundColor: '#fff' },
  thumbnailRow: { padding: 12, gap: 12 },
  thumbnailCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  thumbnailImage: { width: '100%', height: 200 },
  thumbnailLabel: { padding: 10, fontSize: 13, color: '#475569', fontWeight: '700', textAlign: 'center' },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    alignItems: 'flex-start',
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 24,
  },

  taskOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  taskOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  taskOptionTextBox: {
    marginLeft: 12,
    flex: 1,
  },
  taskOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  taskOptionTitleSelected: {
    color: '#1e40af',
    fontWeight: '700',
  },
  taskOptionDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },

  // Bottom Fixed Bar
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
    gap: 12,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtnInline: {
    marginTop: 16,
    padding: 12,
  },
  cancelBtnTextInline: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  modalItemText: { fontSize: 16, color: '#334155', fontWeight: '500' },
});
