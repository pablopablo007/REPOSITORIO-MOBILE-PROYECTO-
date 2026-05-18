import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Modal, FlatList, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { CACES_CATEGORIES } from '../constants/cacesData';
import Toast from 'react-native-toast-message';

export default function EscanerGuardarScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    pages: string;
    fromIndicator?: string;
    indicatorName?: string;
    criterio?: string;
    year?: string;
    breadcrumb?: string;
  }>();

  const { uploadEvidence } = useData();
  const { user } = useAuth();

  const pages: string[] = params.pages ? JSON.parse(params.pages) : [];
  const isFromIndicator = params.fromIndicator === 'true';

  // Conversion state
  const [isConverting, setIsConverting] = useState(true);
  const [conversionStep, setConversionStep] = useState(0);
  const [conversionDone, setConversionDone] = useState(false);

  // File info
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const defaultName = `Scan_${dd}-${mm}-${yyyy}_${hh}-${min}.pdf`;
  const fileSize = `${Math.round(pages.length * 82 + Math.random() * 100)} KB`;

  const [fileName, setFileName] = useState(defaultName);

  // Save form state
  const [criterio, setCriterio] = useState(isFromIndicator ? (params.criterio || '') : '');
  const [indicador, setIndicador] = useState(isFromIndicator ? (params.indicatorName || '') : '');
  const [periodo, setPeriodo] = useState(params.year || '2025');
  const [desc, setDesc] = useState('');
  const [showCriterioModal, setShowCriterioModal] = useState(false);
  const [showIndicadorModal, setShowIndicadorModal] = useState(false);

  const conversionSteps = [
    'Procesando imágenes...',
    'Optimizando calidad...',
    'Generando PDF...',
    '¡Listo!',
  ];

  // Simulate conversion
  useEffect(() => {
    if (!isConverting) return;
    const timers: NodeJS.Timeout[] = [];
    conversionSteps.forEach((_, i) => {
      timers.push(setTimeout(() => setConversionStep(i), (i + 1) * 800));
    });
    timers.push(setTimeout(() => {
      setIsConverting(false);
      setConversionDone(true);
    }, conversionSteps.length * 800 + 400));
    return () => timers.forEach(clearTimeout);
  }, []);

  // Spinner animation
  const spinValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isConverting) {
      Animated.loop(
        Animated.timing(spinValue, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    }
  }, [isConverting]);
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const getFilteredIndicators = () => {
    const cat = CACES_CATEGORIES.find(c => c.name === criterio);
    if (!cat) return [];
    const indicators: { id: string; name: string }[] = [];
    cat.subcategories.forEach(sub => sub.indicators.forEach(ind => indicators.push(ind)));
    return indicators;
  };

  const handleSave = async () => {
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
      iaGenerated: false,
    });
    Toast.show({
      type: 'success',
      text1: 'Documento escaneado guardado',
      text2: `Guardado en ${indicador}`,
    });
    router.dismissAll();
  };

  const renderPickerModal = (
    visible: boolean, onClose: () => void,
    items: { label: string; value: string }[],
    onSelect: (value: string) => void, title: string
  ) => (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color="#6b7280" /></TouchableOpacity>
          </View>
          <FlatList data={items} keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { onSelect(item.value); onClose(); }}>
                <Text style={styles.modalItemText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  // Conversion overlay
  if (isConverting) {
    return (
      <View style={styles.convertingContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="sync" size={48} color="#2563eb" />
        </Animated.View>
        <Text style={styles.convertingText}>{conversionSteps[conversionStep]}</Text>
        <View style={styles.progressDots}>
          {conversionSteps.map((_, i) => (
            <View key={i} style={[styles.dot, i <= conversionStep && styles.dotActive]} />
          ))}
        </View>
      </View>
    );
  }

  const criterioOptions = CACES_CATEGORIES.map(c => ({ label: c.name, value: c.name }));
  const indicadorOptions = getFilteredIndicators().map(i => ({ label: i.name, value: i.name }));

  return (
    <ScrollView style={styles.container}>
      {/* Success card */}
      <Card style={styles.successCard}>
        <View style={styles.successIcon}>
          <Ionicons name="document-text" size={40} color="#22c55e" />
        </View>
        <Text style={styles.successTitle}>PDF generado exitosamente</Text>

        {/* Editable filename */}
        <View style={styles.fileNameRow}>
          <Ionicons name="document" size={20} color="#ef4444" />
          <TextInput
            style={styles.fileNameInput}
            value={fileName}
            onChangeText={setFileName}
            placeholder="Nombre del archivo..."
            selectTextOnFocus
          />
        </View>

        <View style={styles.fileMetaRow}>
          <View style={styles.metaTag}>
            <Ionicons name="resize" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{fileSize}</Text>
          </View>
          <View style={styles.metaTag}>
            <Ionicons name="documents" size={14} color="#6b7280" />
            <Text style={styles.metaText}>{pages.length} página(s)</Text>
          </View>
          <View style={[styles.metaTag, { backgroundColor: '#e0f2fe' }]}>
            <Text style={[styles.metaText, { color: '#0369a1' }]}>Escaneado</Text>
          </View>
        </View>
      </Card>

      {/* Pre-selection breadcrumb */}
      {isFromIndicator && params.breadcrumb && (
        <View style={styles.preSelectCard}>
          <Ionicons name="information-circle" size={20} color="#1e40af" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.preSelectTitle}>Destino pre-seleccionado:</Text>
            <Text style={styles.preSelectIndicator}>{params.indicatorName}</Text>
            <Text style={styles.preSelectBreadcrumb}>{params.breadcrumb}</Text>
          </View>
        </View>
      )}

      {/* Save form */}
      <Card>
        <Text style={styles.sectionTitle}>Guardar en indicador CACES</Text>

        <Text style={styles.label}>Criterio CACES</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setShowCriterioModal(true)}>
          <Text style={[styles.dropdownText, !criterio && { color: '#9ca3af' }]}>
            {criterio || 'Seleccionar criterio...'}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isFromIndicator && criterio && <Ionicons name="lock-closed" size={14} color="#9ca3af" style={{ marginRight: 6 }} />}
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </View>
        </TouchableOpacity>

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
            {isFromIndicator && indicador && <Ionicons name="lock-closed" size={14} color="#9ca3af" style={{ marginRight: 6 }} />}
            <Ionicons name="chevron-down" size={18} color="#6b7280" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Período</Text>
        <TextInput style={styles.input} value={periodo} onChangeText={setPeriodo} />

        <Text style={styles.label}>Descripción (Opcional)</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          multiline maxLength={300} value={desc} onChangeText={setDesc}
          placeholder="Escribe una breve descripción..."
        />
        <Text style={styles.charCount}>{desc.length}/300</Text>
      </Card>

      {/* Save button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
        <Ionicons name="checkmark-circle" size={22} color="#fff" />
        <Text style={styles.saveBtnText}>Guardar Evidencia</Text>
      </TouchableOpacity>

      {/* Modals */}
      {renderPickerModal(showCriterioModal, () => setShowCriterioModal(false), criterioOptions, (val) => {
        setCriterio(val);
        if (!isFromIndicator) setIndicador('');
      }, 'Seleccionar Criterio CACES')}
      {renderPickerModal(showIndicadorModal, () => setShowIndicadorModal(false), indicadorOptions, setIndicador, 'Seleccionar Indicador')}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  // Converting overlay
  convertingContainer: {
    flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  convertingText: { fontSize: 18, color: '#1f2937', fontWeight: '600' },
  progressDots: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: '#2563eb' },
  // Success card
  successCard: { alignItems: 'center', paddingVertical: 24, marginBottom: 4 },
  successIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#dcfce7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#15803d', marginBottom: 16 },
  fileNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 8, paddingHorizontal: 12, width: '100%',
  },
  fileNameInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#374151' },
  fileMetaRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metaTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#f3f4f6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  metaText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  // Pre-selection
  preSelectCard: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#eff6ff',
    padding: 14, borderRadius: 12, marginVertical: 8, borderWidth: 1, borderColor: '#bfdbfe',
  },
  preSelectTitle: { fontSize: 12, color: '#1e40af', fontWeight: '600' },
  preSelectIndicator: { fontSize: 14, color: '#1e3a5f', fontWeight: 'bold', marginTop: 2 },
  preSelectBreadcrumb: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  // Form
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#4b5563', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12 },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12,
  },
  dropdownDisabled: { opacity: 0.5 },
  dropdownText: { fontSize: 14, color: '#374151', flex: 1 },
  charCount: { fontSize: 12, color: '#6b7280', textAlign: 'right', marginTop: 4 },
  // Save
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', padding: 16, borderRadius: 12, marginTop: 16,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: '#1f2937' },
  modalItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 15, color: '#374151' },
});
