import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, FlatList } from 'react-native';
import { Tabs } from '../../components/Tabs';
import { Card } from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CACES_CATEGORIES } from '../../constants/cacesData';

export default function SubirScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const { uploadEvidence } = useData();
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
  }>();

  const isFromIndicator = params.fromIndicator === 'true';

  // Form states
  const [criterio, setCriterio] = useState('');
  const [indicador, setIndicador] = useState('');
  const [periodo, setPeriodo] = useState('2025');
  const [desc, setDesc] = useState('');
  const [showCriterioModal, setShowCriterioModal] = useState(false);
  const [showIndicadorModal, setShowIndicadorModal] = useState(false);

  // IA Form
  const [iaDocType, setIaDocType] = useState('Acta');

  // Pre-fill from indicator navigation
  useEffect(() => {
    if (isFromIndicator) {
      if (params.criterio) setCriterio(params.criterio);
      if (params.indicatorName) setIndicador(params.indicatorName);
      if (params.year) setPeriodo(params.year);
    }
  }, [params.fromIndicator]);

  // Get filtered indicators based on selected criterio
  const getFilteredIndicators = () => {
    const cat = CACES_CATEGORIES.find(c => c.name === criterio);
    if (!cat) return [];
    const indicators: { id: string; name: string }[] = [];
    cat.subcategories.forEach(sub => {
      sub.indicators.forEach(ind => indicators.push(ind));
    });
    return indicators;
  };

  const handleUpload = async (fileName: string, isIA = false) => {
    if (!criterio || !indicador) {
      Toast.show({ type: 'error', text1: 'Campos requeridos', text2: 'Selecciona un criterio e indicador.' });
      return;
    }
    await uploadEvidence({
      docenteId: user!.id,
      docenteName: user!.name,
      criterio,
      indicador,
      periodo,
      fileName,
      iaGenerated: isIA,
    });
    Toast.show({ type: 'success', text1: 'Evidencia guardada', text2: 'El archivo se ha subido correctamente.' });
    setDesc('');
  };

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

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permiso denegado', text2: 'Se necesita acceso a la cámara.' });
        return false;
      }
    }
    return true;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets.length > 0) {
        handleUpload(result.assets[0].name);
      }
    } catch (e) {
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
        handleUpload('evidencia_galeria.jpg');
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la galería.' });
    }
  };

  const scanDocument = async () => {
    if (Platform.OS === 'web') {
      Toast.show({ type: 'info', text1: 'No disponible', text2: 'La cámara no está disponible en web. Usa la galería.' });
      pickImage();
      return;
    }
    try {
      const granted = await requestCameraPermission();
      if (!granted) return;
      const result = await ImagePicker.launchCameraAsync();
      if (!result.canceled && result.assets.length > 0) {
        handleUpload('documento_camara.jpg');
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo acceder a la cámara.' });
    }
  };

  const generateIA = async () => {
    if (!criterio || !indicador) {
      Toast.show({ type: 'error', text1: 'Campos requeridos', text2: 'Selecciona un criterio e indicador.' });
      return;
    }
    Toast.show({ type: 'info', text1: 'Generando documento...', text2: 'La IA está trabajando.' });
    setTimeout(() => {
      const generatedName = `${iaDocType}_${periodo}.pdf`;
      handleUpload(generatedName, true);
    }, 2000);
  };

  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    items: { label: string; value: string }[],
    onSelect: (value: string) => void,
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
                onPress={() => { onSelect(item.value); onClose(); }}
              >
                <Text style={styles.modalItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  const criterioOptions = CACES_CATEGORIES.map(c => ({ label: c.name, value: c.name }));
  const indicadorOptions = getFilteredIndicators().map(i => ({ label: i.name, value: i.name }));

  return (
    <ScrollView style={styles.container}>
      {/* Pre-selection card */}
      {isFromIndicator && params.breadcrumb && (
        <View style={styles.preSelectCard}>
          <Ionicons name="information-circle" size={22} color="#1e40af" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.preSelectTitle}>Subiendo evidencia para:</Text>
            <Text style={styles.preSelectIndicator}>{params.indicatorName}</Text>
            <Text style={styles.preSelectBreadcrumb}>{params.breadcrumb}</Text>
          </View>
        </View>
      )}

      <Tabs
        tabs={['Subir archivo', 'Escanear', 'Generar IA']}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <Card>
        {/* Criterio selector */}
        <Text style={styles.label}>Criterio CACES</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowCriterioModal(true)}
        >
          <Text style={[styles.dropdownText, !criterio && { color: '#9ca3af' }]}>
            {criterio || 'Seleccionar criterio...'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isFromIndicator && criterio && (
              <Ionicons name="lock-closed" size={14} color="#9ca3af" style={{ marginRight: 6 }} />
            )}
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </View>
        </TouchableOpacity>

        {/* Indicador selector */}
        <Text style={styles.label}>Indicador</Text>
        <TouchableOpacity
          style={[styles.dropdown, !criterio && styles.dropdownDisabled]}
          onPress={() => { if (criterio) setShowIndicadorModal(true); }}
          disabled={!criterio}
        >
          <Text style={[styles.dropdownText, !indicador && { color: '#9ca3af' }]} numberOfLines={1}>
            {indicador || (criterio ? 'Seleccionar indicador...' : 'Primero selecciona un criterio')}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isFromIndicator && indicador && (
              <Ionicons name="lock-closed" size={14} color="#9ca3af" style={{ marginRight: 6 }} />
            )}
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </View>
        </TouchableOpacity>

        {/* Período */}
        <Text style={styles.label}>Período</Text>
        <TextInput style={styles.input} value={periodo} onChangeText={setPeriodo} />

        {activeTab === 0 && (
          <View>
            <Text style={styles.label}>Descripción (Opcional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              multiline
              maxLength={300}
              value={desc}
              onChangeText={setDesc}
              placeholder="Escribe una breve descripción..."
            />
            <Text style={styles.charCount}>{desc.length}/300</Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity style={styles.primaryBtn} onPress={pickDocument}>
                <Ionicons name="document" size={20} color="#fff" />
                <Text style={styles.btnText}>Seleccionar Archivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
                <Ionicons name="images" size={20} color="#2563eb" />
                <Text style={styles.secondaryBtnText}>Galería</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 1 && (
          <View style={styles.scanContainer}>
            <View style={styles.scanPlaceholder}>
              <Ionicons name="scan-outline" size={64} color="#2563eb" />
              <Text style={styles.scanTitle}>Escáner de documentos</Text>
              <Text style={styles.scanInfo}>Captura, mejora y convierte documentos a PDF con el escáner inteligente.</Text>
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                router.push({
                  pathname: '/escaner',
                  params: isFromIndicator ? {
                    fromIndicator: 'true',
                    indicatorName: params.indicatorName || '',
                    criterio: params.criterio || '',
                    year: params.year || '',
                    breadcrumb: params.breadcrumb || '',
                  } : {},
                });
              }}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.btnText}>Abrir Escáner</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 2 && (
          <View>
            <Text style={styles.label}>Tipo de Documento a Generar</Text>
            <View style={styles.iaOptions}>
              {['Acta', 'Informe', 'Memoria Técnica', 'Plan Estratégico'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.iaTypeBtn, iaDocType === t && styles.iaTypeBtnActive]}
                  onPress={() => setIaDocType(t)}
                >
                  <Text style={[styles.iaTypeText, iaDocType === t && { color: '#fff' }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.iaBtn} onPress={generateIA}>
              <Ionicons name="sparkles" size={20} color="#fff" />
              <Text style={styles.btnText}>Generar y Guardar</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Modals */}
      {renderPickerModal(showCriterioModal, () => setShowCriterioModal(false), criterioOptions, (val) => {
        setCriterio(val);
        if (!isFromIndicator) setIndicador(''); // Reset indicador when criterio changes manually
      }, 'Seleccionar Criterio CACES')}

      {renderPickerModal(showIndicadorModal, () => setShowIndicadorModal(false), indicadorOptions, setIndicador, 'Seleccionar Indicador')}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  preSelectCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  preSelectTitle: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  preSelectIndicator: { fontSize: 15, color: '#1e3a5f', fontWeight: 'bold', marginTop: 4 },
  preSelectBreadcrumb: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { fontSize: 14, color: '#374151', flex: 1 },
  charCount: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  buttonsRow: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primaryBtn: { flex: 1, backgroundColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, gap: 8 },
  secondaryBtn: { flex: 1, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#2563eb', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, gap: 8 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  secondaryBtnText: { color: '#2563eb', fontWeight: 'bold' },
  scanContainer: { marginTop: 16 },
  scanPlaceholder: { height: 200, backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#bfdbfe', borderStyle: 'dashed', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16, paddingHorizontal: 20 },
  scanTitle: { fontSize: 17, fontWeight: 'bold', color: '#1e40af', marginTop: 12 },
  scanInfo: { color: '#6b7280', marginTop: 8, textAlign: 'center', fontSize: 13 },
  scanWarning: { color: '#ef4444', fontSize: 12, marginTop: 8, textAlign: 'center' },
  iaOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  iaTypeBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#d1d5db' },
  iaTypeBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  iaTypeText: { color: '#4b5563' },
  iaBtn: { backgroundColor: '#7c3aed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 8, gap: 8, marginTop: 24 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937' },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 15, color: '#374151' },
});
