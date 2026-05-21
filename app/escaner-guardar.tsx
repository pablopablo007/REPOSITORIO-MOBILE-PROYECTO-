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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { Card } from '../components/Card';
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

      // CRÍTICO: convertir cada imagen a base64 antes de enviarla a expo-print.
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
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; }
  .pagina {
    width: 100%;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    page-break-after: always;
    padding: 20px;
  }
  img {
    max-width: 100%;
    max-height: 95vh;
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

      await uploadEvidence(nuevaEvidencia as any);

      if (tareaSeleccionada && tareaSeleccionada !== 'ninguna') {
        await completeTask(tareaSeleccionada, nuevaEvidencia.id);

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
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
          <Text style={styles.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.previewCard}>
        <Text style={styles.sectionTitle}>Vista previa</Text>
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
      </Card>

      <Card style={styles.successCard}>
        <View style={styles.successHeader}>
          <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
          <Text style={styles.successTitle}>PDF generado correctamente</Text>
        </View>
        <Text style={styles.fileSummary} numberOfLines={2}>
          📄 {nombreEditable} • {pages.length} página{pages.length > 1 ? 's' : ''} • {pdfTamaño}
        </Text>

        <Text style={styles.label}>Nombre del documento</Text>
        <View style={styles.fileNameRow}>
          <Ionicons name="document-text" size={20} color="#ef4444" />
          <TextInput
            style={styles.fileNameInput}
            value={nombreEditable}
            onChangeText={setNombreEditable}
            placeholder="Scan_DD-MM-YYYY.pdf"
            selectTextOnFocus
          />
        </View>
      </Card>

      <TouchableOpacity style={styles.shareBtn} onPress={compartirPDF} activeOpacity={0.85}>
        <Ionicons name="share-social-outline" size={20} color="#2563eb" />
        <Text style={styles.shareBtnText}>📤 Descargar / Compartir PDF</Text>
      </TouchableOpacity>

      <Card style={styles.formCard}>
        <Text style={styles.formTitle}>Guardar en Mis Documentos</Text>

        <Text style={styles.label}>Nombre del documento</Text>
        <View style={styles.fileNameRow}>
          <Ionicons name="document-text" size={20} color="#ef4444" />
          <TextInput
            style={styles.fileNameInput}
            value={nombreEditable}
            onChangeText={setNombreEditable}
            placeholder="Nombre del documento"
          />
        </View>

        <Text style={styles.label}>Tipo de documento</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
          <Text style={styles.dropdownText}>
            {DOCUMENT_TYPE_OPTIONS.find(option => option.value === tipoSeleccionado)?.label}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Período</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowPeriodModal(true)}>
          <Text style={styles.dropdownText}>{periodoSeleccionado}</Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          multiline
          maxLength={300}
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Escribe una breve descripción..."
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.charCount}>{descripcion.length}/300</Text>

        <View style={styles.divider} />

        <Text style={styles.formTitle}>¿A qué actividad corresponde?</Text>
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
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? '#2563eb' : '#94a3b8'}
              />
              <View style={styles.taskOptionTextBox}>
                <Text style={styles.taskOptionTitle}>{task.title}</Text>
                <Text style={styles.taskOptionDate}>Fecha límite: {formatTaskDate(task.deadline)}</Text>
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
            name={tareaSeleccionada === 'ninguna' ? 'radio-button-on' : 'radio-button-off'}
            size={22}
            color={tareaSeleccionada === 'ninguna' ? '#2563eb' : '#94a3b8'}
          />
          <Text style={styles.taskOptionTitle}>Ninguna (guardar solo en Mis Documentos)</Text>
        </TouchableOpacity>
      </Card>

      <TouchableOpacity style={styles.saveBtn} onPress={guardarDocumento} activeOpacity={0.85}>
        <Text style={styles.saveBtnEmoji}>💾</Text>
        <Text style={styles.saveBtnText}>Guardar documento</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
        <Text style={styles.cancelBtnText}>Cancelar</Text>
      </TouchableOpacity>

      {renderPickerModal(showTypeModal, () => setShowTypeModal(false), DOCUMENT_TYPE_OPTIONS, setTipoSeleccionado, 'Tipo de documento')}
      {renderPickerModal(showPeriodModal, () => setShowPeriodModal(false), PERIOD_OPTIONS, setPeriodoSeleccionado, 'Período')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  convertingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 32,
  },
  convertingText: { fontSize: 19, color: '#1f2937', fontWeight: '700', textAlign: 'center' },
  convertingSubtext: { fontSize: 13, color: '#9ca3af', marginTop: 8, textAlign: 'center' },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#991b1b', textAlign: 'center' },

  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 40 },
  previewCard: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1f2937', marginBottom: 10 },
  previewBox: {
    minHeight: 400,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  webView: { flex: 1, minHeight: 400, backgroundColor: '#fff' },
  thumbnailRow: { padding: 12, gap: 12, alignItems: 'center' },
  thumbnailCard: {
    width: 142,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  thumbnailImage: { width: '100%', height: 180 },
  thumbnailLabel: { padding: 8, fontSize: 12, color: '#475569', fontWeight: '700', textAlign: 'center' },

  successCard: {
    marginBottom: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  successHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  successTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#15803d' },
  fileSummary: { color: '#166534', fontSize: 13, fontWeight: '700', marginBottom: 8, lineHeight: 20 },

  formCard: { marginTop: 12 },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  label: { fontSize: 14, fontWeight: '700', color: '#4b5563', marginBottom: 8, marginTop: 14 },
  fileNameRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  fileNameInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#374151' },
  dropdown: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownText: { fontSize: 14, color: '#374151', flex: 1 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    color: '#1f2937',
  },
  descriptionInput: { height: 86, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 18 },

  taskOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    marginTop: 8,
  },
  taskOptionSelected: { borderColor: '#93c5fd', backgroundColor: '#eff6ff' },
  taskOptionTextBox: { flex: 1, minWidth: 0 },
  taskOptionTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1f2937' },
  taskOptionDate: { color: '#64748b', fontSize: 12, marginTop: 3 },

  shareBtn: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 12,
  },
  shareBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '800' },
  saveBtn: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnEmoji: { fontSize: 18 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  cancelBtnText: { fontSize: 15, color: '#6b7280', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937' },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 15, color: '#374151' },
});
