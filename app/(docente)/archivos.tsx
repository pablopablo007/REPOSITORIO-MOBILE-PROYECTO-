import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Animated, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Evidence, useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';

type StatusFilter = 'Todos' | 'Pendiente' | 'Validado' | 'Observado' | 'Escaneado' | 'Con IA';
const FILTERS: StatusFilter[] = ['Todos', 'Pendiente', 'Validado', 'Observado', 'Escaneado', 'Con IA'];

export default function ArchivosScreen() {
  const { evidences, deleteEvidence, uploadEvidence } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('Todos');
  
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  // IA Modal
  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [iaDescription, setIaDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Preview Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<Evidence | null>(null);

  const previsualizarArchivo = async (doc: Evidence) => {
    if (doc.uri && doc.uri.startsWith('file://')) {
      try {
        await Sharing.shareAsync(doc.uri);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Error al abrir el archivo' });
      }
    } else {
      setArchivoSeleccionado(doc);
      setModalVisible(true);
    }
  };
  const myEvidences = useMemo(() => evidences.filter(e => e.docenteId === user?.id), [evidences, user?.id]);

  const visibleDocs = useMemo(() => {
    return myEvidences.filter(doc => {
      const matchSearch = doc.fileName.toLowerCase().includes(search.toLowerCase());
      const isScanned = doc.scanned || doc.origen === 'escaneado';
      const isIA = doc.iaGenerated || doc.origen === 'ia';
      
      let matchFilter = false;
      if (filter === 'Todos') matchFilter = true;
      else if (filter === 'Escaneado') matchFilter = isScanned;
      else if (filter === 'Con IA') matchFilter = isIA;
      else matchFilter = doc.status === filter;

      return matchSearch && matchFilter;
    });
  }, [myEvidences, search, filter]);

  const validadosCount = myEvidences.filter(e => e.status === 'Validado').length;
  const observadosCount = myEvidences.filter(e => e.status === 'Observado').length;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fabAnim, { toValue: showFabMenu ? 1 : 0, useNativeDriver: true, friction: 7, tension: 60 }),
      Animated.timing(fabRotation, { toValue: showFabMenu ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [showFabMenu]);

  const handleSubirDirecto = async () => {
    setShowFabMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        await uploadEvidence({
          docenteId: '1',
          docenteName: 'Prof. Pablo Mora',
          documentType: 'Otro',
          periodo: '2025',
          fileName: file.name,
        });
        Toast.show({ type: 'success', text1: 'Archivo subido correctamente' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al subir archivo' });
    }
  };

  const handleCorregir = async (docId: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets.length > 0) {
        // En una app real esto actualizaría la evidencia
        deleteEvidence(docId);
        const file = result.assets[0];
        await uploadEvidence({
          docenteId: '1',
          docenteName: 'Prof. Pablo Mora',
          documentType: 'Otro',
          periodo: '2025',
          fileName: file.name,
        });
        Toast.show({ type: 'success', text1: 'Archivo corregido subido correctamente' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al subir corrección' });
    }
  };

  const confirmDelete = (docId: string) => {
    Alert.alert(
      "Eliminar archivo",
      "¿Estás seguro de que deseas eliminar este documento?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive",
          onPress: () => {
            deleteEvidence(docId);
            Toast.show({ type: 'success', text1: 'Archivo eliminado' });
          }
        }
      ]
    );
  };

  const confirmGenerateIA = () => {
    setIsGenerating(true);
    setTimeout(async () => {
      const generatedName = `Documento_Generado_IA_${Date.now()}.pdf`;
      await uploadEvidence({
        docenteId: '1',
        docenteName: 'Prof. Pablo Mora',
        documentType: 'Generado con IA',
        periodo: '2025',
        fileName: generatedName,
        description: iaDescription,
        iaGenerated: true,
      });
      setIsGenerating(false);
      setIaModalVisible(false);
      setIaDescription('');
      Toast.show({ type: 'success', text1: 'Documento generado ✓' });
    }, 2000);
  };

  const getFileIconData = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { bg: '#fee2e2', color: '#dc2626', text: 'PDF', icon: 'document-text' };
    if (ext === 'doc' || ext === 'docx') return { bg: '#dbeafe', color: '#2563eb', text: 'DOC', icon: 'document' };
    return { bg: '#dcfce7', color: '#16a34a', text: 'IMG', icon: 'image' };
  };

  const getStatusData = (status: string) => {
    if (status === 'Validado') return { color: '#15803d', text: 'Validado', icon: 'checkmark-circle' };
    if (status === 'Observado') return { color: '#dc2626', text: 'Requiere corrección', icon: 'alert-circle' };
    return { color: '#d97706', text: 'Pendiente de validación', icon: 'time' };
  };

  const renderDoc = (doc: Evidence) => {
    const iconData = getFileIconData(doc.fileName);
    const statusData = getStatusData(doc.status);
    const isScanned = doc.scanned || doc.origen === 'escaneado';
    const isIA = doc.iaGenerated || doc.origen === 'ia';

    let leftBorderColor = '#3b82f6'; // Azul por defecto (Pendiente)
    if (doc.status === 'Validado') leftBorderColor = '#15803d';
    if (doc.status === 'Observado') leftBorderColor = '#dc2626';

    return (
      <TouchableOpacity 
        key={doc.id} 
        activeOpacity={0.8}
        onPress={() => previsualizarArchivo(doc)}
      >
        <View style={[styles.docCard, { borderLeftColor: leftBorderColor }]}>
        {/* Esquina superior origen */}
        {(isScanned || isIA) && (
          <View style={styles.badgeCorner}>
            <Text style={styles.badgeCornerText}>{isIA ? '✨' : '📷'}</Text>
          </View>
        )}

        <View style={styles.docHeader}>
          <View style={[styles.typeIconBox, { backgroundColor: iconData.bg }]}>
            <Text style={[styles.typeIconLabel, { color: iconData.color }]}>{iconData.text}</Text>
            <Ionicons name={iconData.icon as any} size={16} color={iconData.color} />
          </View>
          
          <View style={styles.docInfo}>
            <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
            <Text style={styles.docMeta}>
              {doc.documentType} • {new Date(doc.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.docStatusRow}>
          <Ionicons name={statusData.icon as any} size={14} color={statusData.color} />
          <Text style={[styles.statusText, { color: statusData.color }]}>{statusData.text}</Text>
        </View>

        {doc.status === 'Observado' && doc.comment && (
          <View style={styles.obsBox}>
            <Text style={styles.obsText}>💬 &quot;{doc.comment}&quot;</Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Toast.show({ type: 'info', text1: 'Simulando compartir...' })}>
            <Ionicons name="share-outline" size={18} color="#475569" />
            <Text style={styles.actionBtnText}>Compartir</Text>
          </TouchableOpacity>

          {doc.status === 'Observado' ? (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCorregir(doc.id)}>
              <Ionicons name="refresh-outline" size={18} color="#dc2626" />
              <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Corregir</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDelete(doc.id)}>
              <Ionicons name="trash-outline" size={18} color="#475569" />
              <Text style={styles.actionBtnText}>Eliminar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </TouchableOpacity>
    );
  };

  const rotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Mis Archivos</Text>
        <Text style={styles.heroSubtitle}>
          {myEvidences.length} documentos • {validadosCount} validados • {observadosCount} observados
        </Text>
      </View>

      <View style={styles.filtersSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar archivo..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          {FILTERS.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visibleDocs.map(renderDoc)}
        
        {visibleDocs.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📂</Text>
            <Text style={styles.emptyTitle}>Sin documentos aún</Text>
            <Text style={styles.emptySubtitle}>Sube tu primer archivo{"\n"}tocando el botón +</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleSubirDirecto}>
              <Text style={styles.emptyBtnText}>+ Subir primer archivo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {showFabMenu && (
        <TouchableOpacity style={styles.fabOverlay} activeOpacity={1} onPress={() => setShowFabMenu(false)} />
      )}

      {/* FAB Opciones */}
      {[
        { label: 'Subir archivo', icon: 'cloud-upload-outline', action: handleSubirDirecto },
        { label: 'Escanear', icon: 'camera-outline', action: () => { setShowFabMenu(false); router.push('/escaner'); } },
        { label: 'Generar con IA', icon: 'sparkles-outline', action: () => { setShowFabMenu(false); setIaModalVisible(true); } },
      ].map((opt, i) => {
        const translateY = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(65 * (i + 1))],
        });
        const scale = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
        const opacity = fabAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });

        return (
          <Animated.View key={opt.label} style={[styles.fabOptionAnimated, { transform: [{ translateY }, { scale }], opacity }]} pointerEvents={showFabMenu ? 'auto' : 'none'}>
            <TouchableOpacity style={styles.fabOptionRow} onPress={opt.action}>
              <View style={styles.fabOptionLabel}><Text style={styles.fabOptionText}>{opt.label}</Text></View>
              <View style={styles.fabOptionIconBg}>
                <Ionicons name={opt.icon as any} size={20} color="#0f172a" />
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={() => setShowFabMenu(!showFabMenu)}>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="add" size={32} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {/* Modal IA */}
      <Modal visible={iaModalVisible} transparent animationType="fade">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => !isGenerating && setIaModalVisible(false)} />
          <View style={styles.bottomSheet}>
            <Text style={styles.iaModalTitle}>✨ Generar con IA</Text>
            <TextInput
              style={styles.iaInput}
              placeholder="¿Qué necesitas que la IA genere?"
              multiline
              value={iaDescription}
              onChangeText={setIaDescription}
              editable={!isGenerating}
            />
            <TouchableOpacity 
              style={[styles.primaryBtn, isGenerating && { opacity: 0.7 }]}
              onPress={confirmGenerateIA}
              disabled={isGenerating}
            >
              <Text style={styles.primaryBtnText}>{isGenerating ? 'Generando...' : 'Generar y guardar'}</Text>
            </TouchableOpacity>
            {!isGenerating && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIaModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.previewSheet}>
            {archivoSeleccionado && (
              <>
                <View style={styles.previewHeader}>
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.previewHeaderBtn}>
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                  <Text style={styles.previewHeaderTitle} numberOfLines={1}>
                    {archivoSeleccionado.fileName}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => Toast.show({ type: 'info', text1: 'Simulando compartir...' })} 
                    style={styles.previewHeaderBtn}
                  >
                    <Ionicons name="share-outline" size={24} color="#2563eb" />
                  </TouchableOpacity>
                </View>

                <View style={styles.previewContent}>
                  <View style={[styles.previewIconBox, { backgroundColor: getFileIconData(archivoSeleccionado.fileName).bg }]}>
                    <Ionicons 
                      name={getFileIconData(archivoSeleccionado.fileName).icon as any} 
                      size={60} 
                      color={getFileIconData(archivoSeleccionado.fileName).color} 
                    />
                  </View>

                  <Text style={styles.previewFileName}>{archivoSeleccionado.fileName}</Text>
                  <Text style={styles.previewFileMeta}>
                    {archivoSeleccionado.documentType} • {archivoSeleccionado.tamaño || 'Tamaño no disp.'} • {new Date(archivoSeleccionado.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <View style={[styles.previewStatusBadge, { backgroundColor: getStatusData(archivoSeleccionado.status).color + '15' }]}>
                      <Ionicons name={getStatusData(archivoSeleccionado.status).icon as any} size={16} color={getStatusData(archivoSeleccionado.status).color} />
                      <Text style={[styles.previewStatusText, { color: getStatusData(archivoSeleccionado.status).color }]}>
                        {getStatusData(archivoSeleccionado.status).text}
                      </Text>
                    </View>

                    {(archivoSeleccionado.scanned || archivoSeleccionado.origen === 'escaneado') && (
                      <View style={[styles.previewStatusBadge, { backgroundColor: '#f3f4f6' }]}>
                        <Text style={[styles.previewStatusText, { color: '#475569' }]}>📷 Escaneado</Text>
                      </View>
                    )}
                    {(archivoSeleccionado.iaGenerated || archivoSeleccionado.origen === 'ia') && (
                      <View style={[styles.previewStatusBadge, { backgroundColor: '#f5f3ff' }]}>
                        <Text style={[styles.previewStatusText, { color: '#7c3aed' }]}>✨ Generado con IA</Text>
                      </View>
                    )}
                  </View>

                  {archivoSeleccionado.status === 'Observado' && archivoSeleccionado.comment && (
                    <View style={styles.obsBoxFull}>
                      <Text style={styles.obsTitleFull}>Motivo de la observación:</Text>
                      <Text style={styles.obsTextFull}>{archivoSeleccionado.comment}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.previewFooter}>
                  {archivoSeleccionado.status === 'Observado' && (
                    <TouchableOpacity 
                      style={[styles.primaryBtn, { backgroundColor: '#dc2626', marginBottom: 12 }]} 
                      onPress={() => {
                        setModalVisible(false);
                        handleCorregir(archivoSeleccionado.id);
                      }}
                    >
                      <Ionicons name="refresh" size={20} color="#fff" style={{marginRight: 8}}/>
                      <Text style={styles.primaryBtnText}>Subir versión corregida</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#2563eb', flexDirection: 'row', justifyContent: 'center' }]} onPress={() => Toast.show({ type: 'info', text1: 'Simulando compartir...' })}>
                    <Ionicons name="share-outline" size={20} color="#fff" style={{marginRight: 8}}/>
                    <Text style={styles.primaryBtnText}>Compartir archivo</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
  },
  heroCard: {
    backgroundColor: '#1e2d4a',
    width: '100%',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    zIndex: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#aac4e8',
    marginTop: 8,
  },
  filtersSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#0f172a',
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  badgeCorner: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  badgeCornerText: {
    fontSize: 14,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIconLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginBottom: 2,
  },
  docInfo: {
    flex: 1,
    paddingRight: 16, // Para que no pise el badge
  },
  docName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  docMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  docStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  obsBox: {
    marginTop: 8,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  obsText: {
    fontSize: 13,
    color: '#b91c1c',
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 20,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
  },
  fabOptionAnimated: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    zIndex: 15,
  },
  fabOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabOptionLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  fabOptionText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1f2937',
  },
  fabOptionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 6,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  iaModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  iaInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 15,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#7c3aed',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelBtn: {
    marginTop: 12,
    alignItems: 'center',
    padding: 12,
  },
  cancelBtnText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },
  previewSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 40,
    minHeight: '60%',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  previewHeaderBtn: {
    padding: 8,
  },
  previewHeaderTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    paddingHorizontal: 16,
  },
  previewContent: {
    padding: 24,
    alignItems: 'center',
  },
  previewIconBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewFileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  previewFileMeta: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  previewStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  previewStatusText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  obsBoxFull: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  obsTitleFull: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 4,
  },
  obsTextFull: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  previewFooter: {
    paddingHorizontal: 24,
    marginTop: 'auto',
  },
});
