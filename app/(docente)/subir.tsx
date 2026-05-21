import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Tabs } from '../../components/Tabs';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { DocumentType, useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useLocalSearchParams, useRouter } from 'expo-router';

const DOCUMENT_TYPE_OPTIONS: { label: string; value: DocumentType }[] = [
  { label: 'Académico', value: 'Académico' },
  { label: 'Título/Certificado', value: 'Título/Certificado' },
  { label: 'Informe', value: 'Informe' },
  { label: 'Acta', value: 'Acta' },
  { label: 'Otro', value: 'Otro' },
];

const PERIOD_OPTIONS = ['2025', '2024', '2023'].map(period => ({ label: period, value: period }));

export default function SubirScreen() {
  const params = useLocalSearchParams<{ mode?: string; documentType?: string; taskId?: string; fileName?: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const { uploadEvidence, completeTask } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const [documentType, setDocumentType] = useState<DocumentType>('Académico');
  const [periodo, setPeriodo] = useState('2025');
  const [documentName, setDocumentName] = useState('');
  const [desc, setDesc] = useState('');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [iaDocType, setIaDocType] = useState('Informe');
  const [linkedTaskId, setLinkedTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (params.mode === 'ia') {
      setActiveTab(2);
    }
    if (params.documentType) {
      setDocumentType(params.documentType as DocumentType);
    }
    if (params.fileName) {
      setDocumentName(params.fileName);
    }
    if (params.taskId) {
      setLinkedTaskId(params.taskId);
    }
  }, [params.mode, params.documentType, params.fileName, params.taskId]);

  const selectedTypeLabel = DOCUMENT_TYPE_OPTIONS.find(option => option.value === documentType)?.label || documentType;

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permiso denegado', text2: 'Se necesita acceso a la galería.' });
        return false;
      }
    }
    return true;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets.length > 0) {
        setDocumentName(result.assets[0].name);
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo seleccionar el archivo.' });
    }
  };

  const pickImage = async () => {
    try {
      const granted = await requestPermissions();
      if (!granted) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
      });
      if (!result.canceled && result.assets.length > 0) {
        setDocumentName(result.assets[0].fileName || 'documento_galeria.jpg');
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la galería.' });
    }
  };

  const saveDocument = async (options?: { fileName?: string; isIA?: boolean }) => {
    const fileName = options?.fileName || documentName.trim();

    if (!fileName) {
      Toast.show({ type: 'error', text1: 'Nombre requerido', text2: 'Selecciona un archivo o escribe el nombre del documento.' });
      return;
    }

    const evidenceId = await uploadEvidence({
      docenteId: user!.id,
      docenteName: user!.name,
      documentType: options?.isIA ? 'Generado con IA' : documentType,
      periodo,
      fileName,
      description: desc,
      iaGenerated: options?.isIA || false,
    });

    // Si la subida está vinculada a una tarea, marcarla como completada
    if (linkedTaskId) {
      await completeTask(linkedTaskId, evidenceId);
      setLinkedTaskId(null);
    }

    Toast.show({ type: 'success', text1: 'Documento guardado', text2: `${fileName} se agregó a ${options?.isIA ? 'Generados con IA' : selectedTypeLabel}.` });
    setDocumentName('');
    setDesc('');
  };

  const generateIA = async () => {
    Toast.show({ type: 'info', text1: 'Generando documento...', text2: 'La IA está preparando el archivo.' });
    setTimeout(() => {
      const generatedName = `${iaDocType.replace(/\s+/g, '_')}_${periodo}.pdf`;
      saveDocument({ fileName: generatedName, isIA: true });
    }, 1200);
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

  return (
    <ScrollView style={styles.container}>
      <Tabs
        tabs={['Subir archivo', 'Escanear', 'Generar IA']}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        <Text style={styles.label}>Tipo de documento</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeModal(true)}>
          <Text style={styles.dropdownText}>{selectedTypeLabel}</Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Período</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowPeriodModal(true)}>
          <Text style={styles.dropdownText}>{periodo}</Text>
          <Ionicons name="chevron-down" size={18} color="#6b7280" />
        </TouchableOpacity>

        <Text style={styles.label}>Nombre del documento</Text>
        <TextInput
          style={styles.input}
          value={documentName}
          onChangeText={setDocumentName}
          placeholder="Selecciona un archivo o escribe un nombre..."
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          multiline
          maxLength={300}
          value={desc}
          onChangeText={setDesc}
          placeholder="Escribe una breve descripción..."
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.charCount}>{desc.length}/300</Text>

        {activeTab === 0 && (
          <View>
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={pickDocument}>
                <Ionicons name="document" size={20} color="#fff" />
                <Text style={styles.btnText}>Seleccionar archivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                <Ionicons name="images" size={20} color="#2563eb" />
                <Text style={styles.secondaryBtnText}>Galería</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={() => saveDocument()} activeOpacity={0.85}>
              <Ionicons name="checkmark-circle" size={21} color="#fff" />
              <Text style={styles.btnText}>Guardar documento</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 1 && (
          <View style={styles.scanContainer}>
            <View style={styles.scanPlaceholder}>
              <View style={styles.scanIconCircle}>
                <Ionicons name="camera" size={48} color="#2563eb" />
              </View>
              <Text style={styles.scanTitle}>Escáner de documentos</Text>
              <Text style={styles.scanInfo}>
                Escanea un documento físico y conviértelo a PDF automáticamente
              </Text>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/escaner')}>
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.btnText}>Abrir escáner</Text>
            </TouchableOpacity>
            <Text style={styles.scanSecondaryText}>También puedes importar desde tu galería</Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={async () => {
                try {
                  const granted = await requestPermissions();
                  if (!granted) return;
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.9,
                  });
                  if (!result.canceled && result.assets.length > 0) {
                    router.push({
                      pathname: '/escaner-preview',
                      params: { imageUri: result.assets[0].uri, existingPages: '[]' },
                    });
                  }
                } catch {
                  Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la galería.' });
                }
              }}
            >
              <Ionicons name="images" size={20} color="#2563eb" />
              <Text style={styles.secondaryBtnText}>Importar desde galería</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 2 && (
          <View>
            <Text style={styles.label}>Tipo de documento a generar</Text>
            <View style={styles.iaOptions}>
              {['Acta', 'Informe', 'Memoria Técnica', 'Planificación'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.iaTypeBtn, iaDocType === type && styles.iaTypeBtnActive]}
                  onPress={() => setIaDocType(type)}
                >
                  <Text style={[styles.iaTypeText, iaDocType === type && styles.iaTypeTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.iaBtn} onPress={generateIA}>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.btnText}>Generar y guardar</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {renderPickerModal(showTypeModal, () => setShowTypeModal(false), DOCUMENT_TYPE_OPTIONS, setDocumentType, 'Seleccionar tipo de documento')}
      {renderPickerModal(showPeriodModal, () => setShowPeriodModal(false), PERIOD_OPTIONS, setPeriodo, 'Seleccionar período')}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    color: '#1f2937',
  },
  descriptionInput: { height: 84, textAlignVertical: 'top' },
  dropdown: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownText: { fontSize: 14, color: '#374151', flex: 1 },
  charCount: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  buttonsRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  primaryBtn: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 50,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  saveBtn: {
    minHeight: 52,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  secondaryBtnText: { color: '#2563eb', fontWeight: 'bold', textAlign: 'center' },
  scanContainer: { marginTop: 16 },
  scanPlaceholder: {
    minHeight: 220,
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  scanIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scanTitle: { fontSize: 17, fontWeight: 'bold', color: '#1e40af', marginTop: 8 },
  scanInfo: { color: '#6b7280', marginTop: 8, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  scanSecondaryText: { color: '#9ca3af', fontSize: 12, textAlign: 'center', marginTop: 12, marginBottom: 8 },
  iaOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  iaTypeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  iaTypeBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  iaTypeText: { color: '#4b5563', fontWeight: '600' },
  iaTypeTextActive: { color: '#fff' },
  iaBtn: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 24,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 34 },
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
