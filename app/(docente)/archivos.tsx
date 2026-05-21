import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge } from '../../components/Badge';
import { ProgressBar } from '../../components/ProgressBar';
import { DocumentType, Evidence, Task, useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';

type StatusFilter = 'Todos' | 'Pendiente' | 'Validado' | 'Observado';

const STATUS_OPTIONS: StatusFilter[] = ['Todos', 'Pendiente', 'Validado', 'Observado'];

const DOCUMENT_SECTIONS: {
  type: DocumentType;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { type: 'Académico', title: 'Documentos Académicos', icon: 'clipboard' },
  { type: 'Título/Certificado', title: 'Títulos y Certificados', icon: 'school' },
  { type: 'Informe', title: 'Informes y Reportes', icon: 'stats-chart' },
  { type: 'Acta', title: 'Actas y Reuniones', icon: 'create' },
  { type: 'Generado con IA', title: 'Generados con IA', icon: 'sparkles' },
  { type: 'Escaneado', title: 'Documentos Escaneados', icon: 'camera' },
];

const getFileMeta = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') {
    return { icon: 'document-text' as const, color: '#dc2626', label: 'PDF' };
  }

  if (extension === 'doc' || extension === 'docx') {
    return { icon: 'document' as const, color: '#2563eb', label: 'DOCX' };
  }

  return { icon: 'image' as const, color: '#16a34a', label: 'IMG' };
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getDaysRemaining = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function ArchivosScreen() {
  const router = useRouter();
  const { evidences, deleteEvidence, tasks } = useData();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [showFilter, setShowFilter] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Evidence | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(
    DOCUMENT_SECTIONS.map(section => section.type)
  );
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

  // FAB animation
  const fabAnim = useRef(new Animated.Value(0)).current;
  const fabRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fabAnim, {
        toValue: showFabMenu ? 1 : 0,
        useNativeDriver: true,
        friction: 7,
        tension: 60,
      }),
      Animated.timing(fabRotation, {
        toValue: showFabMenu ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fabAnim, fabRotation, showFabMenu]);

  const myDocuments = useMemo(
    () => evidences.filter(doc => doc.docenteId === user?.id),
    [evidences, user?.id]
  );

  const visibleDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return myDocuments.filter(doc => {
      const docName = doc.fileName || doc.nombre || '';
      const docStatus = doc.status || doc.estado || '';
      const matchesSearch = !query || docName.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'Todos' || docStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [myDocuments, search, statusFilter]);

  const myTasks = useMemo(() => {
    const docenteTasks = tasks.filter(t => t.docenteId === user?.id);
    // Sort: pending first, completed at end
    return docenteTasks.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks, user?.id]);

  const validatedCount = myDocuments.filter(doc => doc.status === 'Validado' || doc.estado === 'Validado').length;
  const attentionCount = myDocuments.filter(doc => doc.status === 'Pendiente' || doc.estado === 'Pendiente' || doc.status === 'Observado' || doc.estado === 'Observado').length;
  const progress = myDocuments.length ? Math.round((validatedCount / myDocuments.length) * 100) : 0;

  const toggleSection = (type: DocumentType) => {
    setExpandedSections(current =>
      current.includes(type)
        ? current.filter(item => item !== type)
        : [...current, type]
    );
  };

  const toggleTask = (taskId: string) => {
    setExpandedTasks(current =>
      current.includes(taskId)
        ? current.filter(id => id !== taskId)
        : [...current, taskId]
    );
  };

  const openUpload = (params?: { mode?: string; documentType?: string; taskId?: string; fileName?: string }) => {
    setShowFabMenu(false);
    router.push({
      pathname: '/(docente)/subir',
      params: params || {},
    });
  };

  const openScanner = () => {
    setShowFabMenu(false);
    router.push('/escaner');
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;
    await deleteEvidence(selectedDoc.id);
    Toast.show({ type: 'success', text1: 'Documento eliminado', text2: selectedDoc.fileName });
    setSelectedDoc(null);
  };

  const handleUploadCorrected = () => {
    if (!selectedDoc) return;
    const baseName = selectedDoc.fileName.replace(/\.[^.]+$/, '');
    const ext = selectedDoc.fileName.split('.').pop() || 'pdf';
    const correctedName = `${baseName}_v2.${ext}`;
    setSelectedDoc(null);
    router.push({
      pathname: '/(docente)/subir',
      params: { fileName: correctedName, documentType: selectedDoc.documentType },
    });
  };

  const descargarDoc = async (uri?: string) => {
    if (!uri) {
      Alert.alert('Archivo no encontrado', 'Este documento no tiene un archivo local asociado.');
      return;
    }

    const existe = await FileSystem.getInfoAsync(uri);
    if (!existe.exists) {
      Alert.alert('Archivo no encontrado', 'El archivo ya no está disponible en este dispositivo.');
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Guardar o compartir PDF',
      UTI: 'com.adobe.pdf',
    });
  };

  const abrirPreviewDoc = async (doc: Evidence) => {
    if (!doc.uri) {
      Alert.alert('Vista previa no disponible', 'Este documento no tiene un archivo local asociado.');
      return;
    }

    const existe = await FileSystem.getInfoAsync(doc.uri);
    if (!existe.exists) {
      Alert.alert('Archivo no encontrado', 'El archivo ya no está disponible en este dispositivo.');
      return;
    }

    setSelectedDoc(null);
    setPreviewError(false);
    setPreviewUri(doc.uri);
  };

  const getLinkedTaskTitle = (doc: Evidence) => {
    const linkedTaskId = doc.taskId || doc.tareaId;
    const linkedTask = tasks.find(task => task.id === linkedTaskId || task.completedEvidenceId === doc.id);
    return doc.tareaTitulo || linkedTask?.title || '';
  };

  // FAB animated options config
  const fabOptions = [
    { label: '📁  Subir archivo', action: () => openUpload(), color: '#2563eb', icon: 'folder-open' as const },
    { label: '✨  Generar con IA', action: () => openUpload({ mode: 'ia' }), color: '#7c3aed', icon: 'sparkles' as const },
    { label: '📷  Escanear documento', action: () => openScanner(), color: '#0891b2', icon: 'camera' as const },
  ];

  const renderTaskCard = (task: Task) => {
    const daysLeft = getDaysRemaining(task.deadline);
    const isUrgent = daysLeft <= 3;
    const isExpanded = expandedTasks.includes(task.id);

    return (
      <TouchableOpacity
        key={task.id}
        style={[styles.taskCard, task.completed && styles.taskCardCompleted]}
        activeOpacity={0.8}
        onPress={() => toggleTask(task.id)}
      >
        <View style={styles.taskHeader}>
          <View style={styles.taskTitleRow}>
            <Ionicons
              name={task.completed ? 'checkmark-circle' : 'alert-circle'}
              size={22}
              color={task.completed ? '#16a34a' : isUrgent ? '#dc2626' : '#d97706'}
            />
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]} numberOfLines={isExpanded ? undefined : 1}>
              {task.title}
            </Text>
          </View>
          <View style={styles.taskBadgeRow}>
            <Badge
              status={task.completed ? 'Validado' : 'Pendiente'}
              label={task.completed ? 'Entregado' : 'Pendiente de entrega'}
            />
          </View>
        </View>

        <View style={styles.taskDeadlineRow}>
          <Ionicons name="calendar-outline" size={14} color={isUrgent && !task.completed ? '#dc2626' : '#64748b'} />
          <Text style={[styles.taskDeadline, isUrgent && !task.completed && styles.taskDeadlineUrgent]}>
            {task.completed
              ? 'Completada'
              : daysLeft <= 0
              ? 'Vencida'
              : daysLeft === 1
              ? 'Vence mañana'
              : `Vence en ${daysLeft} días`}
          </Text>
        </View>

        {isExpanded && (
          <View style={styles.taskExpandedContent}>
            <Text style={styles.taskDescription}>{task.description}</Text>
            {!task.completed && (
              <TouchableOpacity
                style={styles.taskUploadBtn}
                activeOpacity={0.85}
                onPress={(e) => {
                  e.stopPropagation?.();
                  openUpload({ documentType: task.documentType, taskId: task.id });
                }}
              >
                <Ionicons name="cloud-upload" size={18} color="#fff" />
                <Text style={styles.taskUploadBtnText}>Subir ahora</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!isExpanded && (
          <View style={styles.taskPeekRow}>
            <Text style={styles.taskPeekText} numberOfLines={1}>{task.description}</Text>
            <Ionicons name="chevron-down" size={16} color="#94a3b8" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderDocument = (doc: Evidence) => {
    const name = doc.fileName || doc.nombre || 'Documento';
    const date = doc.date || doc.fecha || new Date().toISOString();
    const status = doc.status || doc.estado || 'Pendiente';
    const isIA = doc.iaGenerated || doc.origen === 'ia';
    const isScanned = doc.scanned || doc.origen === 'escaneado';
    const fileMeta = getFileMeta(name);

    return (
      <TouchableOpacity
        key={doc.id}
        style={styles.documentRow}
        activeOpacity={0.75}
        onPress={() => setSelectedDoc(doc)}
      >
        <View style={[styles.fileIcon, { backgroundColor: `${fileMeta.color}18` }]}>
          <Ionicons name={fileMeta.icon} size={22} color={fileMeta.color} />
        </View>
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>{name}</Text>
          <Text style={styles.documentDate}>Subido el {formatDate(date)}</Text>
          <View style={styles.badgeRow}>
            <Badge status={status} />
            {isIA && <Badge status="Generado con IA" />}
            {isScanned && <Badge status="Escaneado" />}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </TouchableOpacity>
    );
  };

  const rotateInterpolate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mis Documentos</Text>
          <Text style={styles.subtitle}>Gestiona tus evidencias académicas</Text>
        </View>

        {/* ===== MEJORA 1: Tareas Pendientes ===== */}
        {myTasks.length > 0 && (
          <View style={styles.tasksSection}>
            <View style={styles.tasksSectionHeader}>
              <Ionicons name="clipboard-outline" size={20} color="#d97706" />
              <Text style={styles.tasksSectionTitle}>Tareas pendientes</Text>
              <View style={styles.tasksSectionBadge}>
                <Text style={styles.tasksSectionBadgeText}>
                  {myTasks.filter(t => !t.completed).length}
                </Text>
              </View>
            </View>
            {myTasks.map(renderTaskCard)}
          </View>
        )}

        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar documento..."
              placeholderTextColor="#94a3b8"
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
            <Text style={styles.filterText}>{statusFilter}</Text>
            <Ionicons name="chevron-down" size={16} color="#475569" />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNumber}>{myDocuments.length}</Text>
              <Text style={styles.summaryLabel}>Total docs</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#15803d' }]}>{validatedCount}</Text>
              <Text style={styles.summaryLabel}>Validados</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: '#d97706' }]}>{attentionCount}</Text>
              <Text style={styles.summaryLabel}>Por atender</Text>
            </View>
          </View>
          <ProgressBar progress={progress} label={`${progress}% de tus documentos están validados`} />
        </View>

        {DOCUMENT_SECTIONS.map(section => {
          const sectionDocs = visibleDocuments.filter(doc => {
            if (section.type === 'Escaneado') {
              return doc.origen === 'escaneado' || doc.scanned === true;
            }
            if (section.type === 'Generado con IA') {
              return doc.origen === 'ia' || doc.iaGenerated === true;
            }
            // For others, they must match type and not be scanned/ia
            const matchesType = doc.tipo === section.type || doc.documentType === section.type;
            const isSpecial = doc.origen === 'escaneado' || doc.scanned === true || doc.origen === 'ia' || doc.iaGenerated === true;
            return matchesType && !isSpecial;
          });
          const isExpanded = expandedSections.includes(section.type);

          return (
            <View key={section.type} style={styles.sectionCard}>
              <TouchableOpacity
                style={styles.sectionHeader}
                activeOpacity={0.75}
                onPress={() => toggleSection(section.type)}
              >
                <View style={styles.sectionTitleRow}>
                  <Ionicons name={section.icon} size={20} color="#2563eb" />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{sectionDocs.length}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#64748b"
                  />
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View>
                  {sectionDocs.length > 0 ? (
                    sectionDocs.map(renderDocument)
                  ) : (
                    <Text style={styles.emptySection}>No hay documentos en esta sección.</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ===== MEJORA 2: FAB con overlay y animación ===== */}
      {showFabMenu && (
        <TouchableOpacity
          style={styles.fabOverlay}
          activeOpacity={1}
          onPress={() => setShowFabMenu(false)}
        />
      )}

      {fabOptions.map((opt, i) => {
        const translateY = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -(70 * (i + 1))],
        });
        const opacity = fabAnim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0, 1],
        });
        const scale = fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 1],
        });

        return (
          <Animated.View
            key={opt.label}
            style={[
              styles.fabOptionAnimated,
              {
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
            pointerEvents={showFabMenu ? 'auto' : 'none'}
          >
            <TouchableOpacity style={styles.fabOptionRow} onPress={opt.action}>
              <View style={styles.fabOptionLabelContainer}>
                <Text style={styles.fabOptionText}>{opt.label}</Text>
              </View>
              <View style={[styles.fabOptionIcon, { backgroundColor: `${opt.color}15` }]}>
                <Ionicons name={opt.icon} size={20} color={opt.color} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => setShowFabMenu(current => !current)}
      >
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <Ionicons name="add" size={30} color="#fff" />
        </Animated.View>
      </TouchableOpacity>

      {/* Filter Modal */}
      <Modal visible={showFilter} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowFilter(false)}>
          <View style={styles.filterMenu}>
            <FlatList
              data={STATUS_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.filterItem}
                  onPress={() => {
                    setStatusFilter(item);
                    setShowFilter(false);
                  }}
                >
                  <Text style={[styles.filterItemText, item === statusFilter && styles.filterItemTextActive]}>
                    {item}
                  </Text>
                  {item === statusFilter && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== MEJORA 4: Bottom sheet con observación del coordinador ===== */}
      <Modal visible={!!selectedDoc} transparent animationType="slide">
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setSelectedDoc(null)} />
          <View style={styles.bottomSheet}>
            {selectedDoc && (
              (() => {
                const name = selectedDoc.fileName || selectedDoc.nombre || 'Documento.pdf';
                const date = selectedDoc.date || selectedDoc.fecha || new Date().toISOString();
                const status = selectedDoc.status || selectedDoc.estado || 'Pendiente';
                const type = selectedDoc.documentType || selectedDoc.tipo || 'Escaneado';
                const size = selectedDoc.tamaño || selectedDoc.size || selectedDoc.fileSize || 'N/A';
                const pages = selectedDoc.paginas ? `${selectedDoc.paginas} páginas` : 'PDF';
                const isScanned = selectedDoc.scanned || selectedDoc.origen === 'escaneado';
                const linkedTaskTitle = getLinkedTaskTitle(selectedDoc);
                const observation = selectedDoc.comment || selectedDoc.comentario;

                return (
                  <>
                    <View style={styles.sheetHandle} />
                    <Text style={styles.sheetTitle} numberOfLines={2}>📄 {name}</Text>
                    <Text style={styles.sheetMeta}>{type} • {size} • {formatDate(date)} • {pages}</Text>
                    <View style={styles.sheetBadges}>
                      <Badge status={status} />
                      {selectedDoc.iaGenerated && <Badge status="Generado con IA" />}
                      {isScanned && <Badge status="Escaneado" />}
                    </View>

                    {linkedTaskTitle && (
                      <View style={styles.linkedTaskBox}>
                        <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
                        <Text style={styles.linkedTaskText}>Vinculado a: {linkedTaskTitle}</Text>
                      </View>
                    )}

                    {status === 'Observado' && observation && (
                      <View style={styles.observationBox}>
                        <View style={styles.observationHeader}>
                          <Ionicons name="warning" size={18} color="#991b1b" />
                          <Text style={styles.observationTitle}>Observación:</Text>
                        </View>
                        <Text style={styles.observationText}>{observation}</Text>
                        <TouchableOpacity
                          style={styles.correctBtn}
                          activeOpacity={0.85}
                          onPress={handleUploadCorrected}
                        >
                          <Ionicons name="camera" size={18} color="#fff" />
                          <Text style={styles.correctBtnText}>Subir versión corregida</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.sheetActionRow}>
                      <TouchableOpacity style={styles.sheetActionButton} onPress={() => abrirPreviewDoc(selectedDoc)}>
                        <Ionicons name="eye" size={20} color="#2563eb" />
                        <Text style={styles.sheetActionText}>Vista previa</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.sheetActionButton} onPress={() => descargarDoc(selectedDoc.uri)}>
                        <Ionicons name="share-social-outline" size={20} color="#2563eb" />
                        <Text style={styles.sheetActionText}>Descargar</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={[styles.sheetAction, styles.deleteAction]} onPress={handleDelete}>
                      <Ionicons name="trash" size={22} color="#dc2626" />
                      <Text style={[styles.sheetActionText, { color: '#dc2626' }]}>Eliminar</Text>
                    </TouchableOpacity>
                  </>
                );
              })()
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={!!previewUri} transparent animationType="slide">
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.previewModalHeader}>
              <Text style={styles.previewModalTitle}>Vista previa</Text>
              <TouchableOpacity onPress={() => setPreviewUri(null)}>
                <Ionicons name="close" size={24} color="#475569" />
              </TouchableOpacity>
            </View>
            {previewUri && !previewError ? (
              <WebView
                source={{ uri: previewUri }}
                style={styles.previewWebView}
                originWhitelist={['*']}
                onError={() => setPreviewError(true)}
              />
            ) : (
              <View style={styles.previewFallback}>
                <Ionicons name="document-text" size={54} color="#2563eb" />
                <Text style={styles.previewFallbackTitle}>No se pudo renderizar el PDF aquí.</Text>
                <TouchableOpacity style={styles.previewDownloadBtn} onPress={() => descargarDoc(previewUri || undefined)}>
                  <Ionicons name="share-social-outline" size={18} color="#fff" />
                  <Text style={styles.previewDownloadText}>Abrir / compartir PDF</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 110 },
  header: { marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },

  // ===== Tareas pendientes =====
  tasksSection: {
    marginBottom: 14,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  tasksSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#92400e',
    flex: 1,
  },
  tasksSectionBadge: {
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tasksSectionBadgeText: {
    color: '#78350f',
    fontSize: 12,
    fontWeight: '800',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  taskCardCompleted: {
    borderLeftColor: '#16a34a',
    opacity: 0.75,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  taskTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  taskBadgeRow: {
    flexShrink: 0,
  },
  taskDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    marginLeft: 30,
  },
  taskDeadline: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  taskDeadlineUrgent: {
    color: '#dc2626',
    fontWeight: '800',
  },
  taskExpandedContent: {
    marginTop: 10,
    marginLeft: 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  taskDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  taskUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  taskUploadBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  taskPeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginLeft: 30,
  },
  taskPeekText: {
    flex: 1,
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // ===== Search & Filter =====
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  searchBox: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: '#0f172a', fontSize: 14, paddingVertical: 10 },
  filterButton: {
    minHeight: 46,
    maxWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
  },
  filterText: { color: '#334155', fontSize: 13, fontWeight: '600' },

  // ===== Summary =====
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNumber: { fontSize: 22, fontWeight: '800', color: '#2563eb' },
  summaryLabel: { fontSize: 12, color: '#64748b', marginTop: 2, textAlign: 'center' },
  summaryDivider: { width: 1, height: 34, backgroundColor: '#e2e8f0' },

  // ===== Document Sections =====
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  sectionTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1f2937' },
  sectionCount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCountText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentInfo: { flex: 1, minWidth: 0 },
  documentName: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  documentDate: { fontSize: 12, color: '#64748b', marginTop: 3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  emptySection: { paddingHorizontal: 14, paddingBottom: 16, color: '#94a3b8', fontStyle: 'italic' },

  // ===== FAB animado =====
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 20,
  },
  fabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.25)',
    zIndex: 9,
  },
  fabOptionAnimated: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 15,
    alignItems: 'flex-end',
  },
  fabOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fabOptionLabelContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  fabOptionText: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 14,
  },
  fabOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  // ===== Modals =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.25)', justifyContent: 'center', padding: 24 },
  filterMenu: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  filterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterItemText: { fontSize: 15, color: '#334155' },
  filterItemTextActive: { color: '#2563eb', fontWeight: '800' },

  // ===== Bottom Sheet =====
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.35)' },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 34,
  },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  sheetMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  sheetBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 8 },
  linkedTaskBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 10,
  },
  linkedTaskText: {
    flex: 1,
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },

  // Observación del coordinador (Mejora 4)
  observationBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  observationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  observationTitle: {
    color: '#991b1b',
    fontWeight: '800',
    fontSize: 14,
  },
  observationText: {
    color: '#7f1d1d',
    lineHeight: 20,
    fontSize: 13,
  },
  correctBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  correctBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sheetActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 4,
  },
  sheetActionButton: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  deleteAction: { borderBottomWidth: 0 },
  sheetActionText: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  previewModal: {
    height: '86%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  previewModalHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  previewModalTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  previewWebView: { flex: 1, backgroundColor: '#fff' },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  previewFallbackTitle: { color: '#475569', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  previewDownloadBtn: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  previewDownloadText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
