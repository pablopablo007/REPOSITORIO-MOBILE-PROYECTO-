import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Modal, Animated, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Evidence, useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

type StatusFilter = 'Todos' | 'Pendiente' | 'Validado' | 'Observado' | 'Escaneado';
const FILTERS: StatusFilter[] = ['Todos', 'Pendiente', 'Validado', 'Observado', 'Escaneado'];

export default function ArchivosScreen() {
  const { evidences, deleteEvidence, uploadEvidence } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('Todos');
  
  const [showFabMenu, setShowFabMenu] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;



  // Preview Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<Evidence | null>(null);

  // Download state
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  // Long press context menu
  const [menuDocId, setMenuDocId] = useState<string | null>(null);

  const previsualizarArchivo = async (doc: Evidence) => {
    const ext = doc.fileName.split('.').pop()?.toLowerCase();
    const isPdf = ext === 'pdf';

    // ── Para PDFs: abrir en el visor interno ──
    if (isPdf) {
      try {
        setDescargandoId(doc.id);

        // Si tiene URI local y el archivo existe, usarlo
        const localUri = doc.uri || (doc as any).uriLocal;
        if (localUri && localUri.startsWith('file://')) {
          const info = await FileSystem.getInfoAsync(localUri);
          if (info.exists) {
            setDescargandoId(null);
            router.push({
              pathname: '/visor-pdf',
              params: { uri: localUri, title: doc.fileName },
            });
            return;
          }
        }

        // Si tiene URL del backend
        if (doc.fileUrl) {
          setDescargandoId(null);
          // fileUrl puede venir como URL completa o como ruta relativa
          const { SERVER_BASE_URL } = require('../../services/api');
          const fullUrl = doc.fileUrl.startsWith('http') ? doc.fileUrl : `${SERVER_BASE_URL}${doc.fileUrl}`;
          router.push({
            pathname: '/visor-pdf',
            params: { remoteUrl: fullUrl, title: doc.fileName },
          });
          return;
        }

        // Fallback: mostrar modal de detalles
        setDescargandoId(null);
        setArchivoSeleccionado(doc);
        setModalVisible(true);
      } catch (error) {
        setDescargandoId(null);
        Alert.alert('Error', 'No se pudo abrir el archivo.');
      }
      return;
    }

    // ── Para archivos NO-PDF: mantener comportamiento original (Sharing) ──
    try {
      setDescargandoId(doc.id);

      // 1. Si tiene URI local y el archivo existe, abrirlo directamente
      const localUri = doc.uri || (doc as any).uriLocal;
      if (localUri && localUri.startsWith('file://')) {
        const info = await FileSystem.getInfoAsync(localUri);
        if (info.exists) {
          await Sharing.shareAsync(localUri, {
            mimeType: 'application/pdf',
            dialogTitle: doc.fileName,
          });
          setDescargandoId(null);
          return;
        }
      }

      // 2. Si tiene URL del backend, descargar al dispositivo y abrir
      if (doc.fileUrl) {
        const token = await AsyncStorage.getItem('@auth_token');
        const destino = FileSystem.cacheDirectory + doc.fileName;

        const downloadOptions: FileSystem.DownloadOptions = {};
        if (token) {
          downloadOptions.headers = { Authorization: `Bearer ${token}` };
        }

        const { uri } = await FileSystem.downloadAsync(
          doc.fileUrl,
          destino,
          downloadOptions
        );

        const mimeType = (ext === 'doc' || ext === 'docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/octet-stream';

        await Sharing.shareAsync(uri, {
          mimeType,
          dialogTitle: doc.fileName,
        });

        setDescargandoId(null);
        return;
      }

      // 3. Fallback: mostrar modal de detalles
      setDescargandoId(null);
      setArchivoSeleccionado(doc);
      setModalVisible(true);
    } catch (error) {
      setDescargandoId(null);
      Alert.alert('Error', 'No se pudo abrir el archivo. Verifica tu conexión a internet.');
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
      else if ((filter as string) === 'Escaneado') matchFilter = isScanned;
      else if ((filter as string) === 'Con IA') matchFilter = isIA;
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
          docenteId: user?.id || '1',
          docenteName: user?.name || 'Prof. Pablo Mora',
          documentType: 'Otro',
          periodo: '2025',
          fileName: file.name,
          fileUri: file.uri,
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
        // Eliminar la evidencia anterior y subir la corrección
        deleteEvidence(docId);
        const file = result.assets[0];
        await uploadEvidence({
          docenteId: user?.id || '1',
          docenteName: user?.name || 'Prof. Pablo Mora',
          documentType: 'Otro',
          periodo: '2025',
          fileName: file.name,
          fileUri: file.uri,
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



  const getFileIconData = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { bg: '#fee2e2', color: '#dc2626', text: 'PDF', icon: 'document-text' };
    if (ext === 'doc' || ext === 'docx') return { bg: '#dbeafe', color: '#2563eb', text: 'DOC', icon: 'document' };
    return { bg: '#dcfce7', color: '#16a34a', text: 'IMG', icon: 'image' };
  };

  const getStatusData = (status: string) => {
    if (status === 'Validado') return { color: '#15803d', bg: '#dcfce7', text: 'Validado', icon: 'checkmark-circle' };
    if (status === 'Observado') return { color: '#dc2626', bg: '#fef2f2', text: 'Observado', icon: 'alert-circle' };
    return { color: '#d97706', bg: '#fef9c3', text: 'Pendiente', icon: 'time' };
  };

  // Determina el estado de sincronización del archivo
  const getSyncStatus = (doc: Evidence) => {
    const hasRemoteUrl = !!doc.fileUrl;
    const hasLocalUri = !!(doc.uri || (doc as any).uriLocal);

    if (hasRemoteUrl && hasLocalUri) return { icon: 'cloud-done', color: '#16a34a', label: 'Sincronizado' };
    if (hasRemoteUrl) return { icon: 'cloud-done', color: '#16a34a', label: 'En servidor' };
    if (hasLocalUri) return { icon: 'cloud-upload', color: '#9ca3af', label: 'Solo local' };
    return { icon: 'cloud-done', color: '#16a34a', label: 'Subido' };
  };

  const renderDoc = (doc: Evidence) => {
    const iconData = getFileIconData(doc.fileName);
    const statusData = getStatusData(doc.status);
    const isScanned = doc.scanned || doc.origen === 'escaneado';
    const isIA = doc.iaGenerated || doc.origen === 'ia';
    const syncStatus = getSyncStatus(doc);
    const isDownloading = descargandoId === doc.id;
    const isMenuOpen = menuDocId === doc.id;

    let leftBorderColor = '#3b82f6';
    if (doc.status === 'Validado') leftBorderColor = '#15803d';
    if (doc.status === 'Observado') leftBorderColor = '#dc2626';

    return (
      <View key={doc.id}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => { setMenuDocId(null); previsualizarArchivo(doc); }}
          onLongPress={() => setMenuDocId(isMenuOpen ? null : doc.id)}
          disabled={isDownloading}
        >
          <View style={[styles.docCard, { borderLeftColor: leftBorderColor }]}>
            <View style={styles.docRow}>
              {/* Ícono tipo de archivo */}
              <View style={[styles.typeIconBox, { backgroundColor: iconData.bg }]}>
                <Text style={[styles.typeIconLabel, { color: iconData.color }]}>{iconData.text}</Text>
                <Ionicons name={iconData.icon as any} size={14} color={iconData.color} />
              </View>

              {/* Info central */}
              <View style={styles.docInfo}>
                <View style={styles.docNameRow}>
                  <Text style={styles.docName} numberOfLines={1}>{doc.fileName}</Text>
                  {(isScanned || isIA) && (
                    <Text style={styles.originEmoji}>{isIA ? '✨' : '📷'}</Text>
                  )}
                </View>
                <Text style={styles.docMeta} numberOfLines={1}>
                  {doc.documentType} • {new Date(doc.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              {/* Status badge + sync */}
              <View style={styles.docRightSection}>
                <View style={[styles.statusPill, { backgroundColor: statusData.bg }]}>
                  <Ionicons name={statusData.icon as any} size={12} color={statusData.color} />
                  <Text style={[styles.statusPillText, { color: statusData.color }]}>{statusData.text}</Text>
                </View>
                <View style={styles.syncRow}>
                  <MaterialIcons name={syncStatus.icon as any} size={12} color={syncStatus.color} />
                  {isDownloading && (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginLeft: 4 }} />
                  )}
                </View>
              </View>
            </View>

            {/* Observación inline (solo si Observado con comentario) */}
            {doc.status === 'Observado' && doc.comment && (
              <View style={styles.obsBox}>
                <Text style={styles.obsText} numberOfLines={1}>💬 &quot;{doc.comment}&quot;</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Menú contextual (long press) */}
        {isMenuOpen && (
          <View style={styles.contextMenu}>
            <TouchableOpacity style={styles.contextMenuItem} onPress={() => { setMenuDocId(null); previsualizarArchivo(doc); }}>
              <Ionicons name="eye-outline" size={18} color="#2563eb" />
              <Text style={[styles.contextMenuText, { color: '#2563eb' }]}>Ver archivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contextMenuItem} onPress={() => { setMenuDocId(null); Toast.show({ type: 'info', text1: 'Simulando compartir...' }); }}>
              <Ionicons name="share-outline" size={18} color="#475569" />
              <Text style={styles.contextMenuText}>Compartir</Text>
            </TouchableOpacity>
            {doc.status === 'Observado' ? (
              <TouchableOpacity style={styles.contextMenuItem} onPress={() => { setMenuDocId(null); handleCorregir(doc.id); }}>
                <Ionicons name="refresh-outline" size={18} color="#dc2626" />
                <Text style={[styles.contextMenuText, { color: '#dc2626' }]}>Corregir</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.contextMenuItem} onPress={() => { setMenuDocId(null); confirmDelete(doc.id); }}>
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
                <Text style={[styles.contextMenuText, { color: '#dc2626' }]}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const rotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.container}>
      {/* Summary Header */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {myEvidences.length} documentos • {validadosCount} validados • {observadosCount} observados
        </Text>
      </View>

      <View style={styles.filtersSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={styles.filtersGrid}>
          {FILTERS.map(f => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {visibleDocs.map(renderDoc)}
        
        {visibleDocs.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="folder-open-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>¡Todo limpio!</Text>
            <Text style={styles.emptySubtitle}>Aún no hay documentos aquí. Sube tu primer archivo o escanea uno nuevo para empezar.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleSubirDirecto} activeOpacity={0.85}>
              <Ionicons name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Subir Documento</Text>
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
  summaryBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    zIndex: 10,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  filtersSection: {
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  filtersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  docCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderLeftWidth: 4,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIconLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 1,
  },
  docInfo: {
    flex: 1,
    marginRight: 10,
  },
  docNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
  },
  originEmoji: {
    fontSize: 12,
  },
  docMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  docRightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  obsBox: {
    marginTop: 8,
    backgroundColor: '#fef2f2',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  obsText: {
    fontSize: 12,
    color: '#b91c1c',
    fontStyle: 'italic',
  },
  contextMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    marginTop: -6,
    marginHorizontal: 4,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  contextMenuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
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
