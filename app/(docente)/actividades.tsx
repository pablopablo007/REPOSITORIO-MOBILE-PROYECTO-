import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TouchableWithoutFeedback, Animated } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useData } from '../../contexts/DataContext';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { Badge } from '../../components/Badge';

const getDaysRemaining = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function ActividadesScreen() {
  const { tasks, uploadEvidence, completeTask, evidences } = useData();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);

  const pendingTasks = tasks.filter(t => !t.completed).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

  const handleSubirDirecto = async (taskId: string, documentType: string, taskTitle: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const evidenceId = await uploadEvidence({
          docenteId: '1',
          docenteName: 'Prof. Pablo Mora', // Este es un placeholder
          documentType: documentType as any,
          periodo: '2025',
          fileName: file.name,
          fileUri: file.uri,
          description: `Subido para: ${taskTitle}`,
        });
        await completeTask(taskId, evidenceId);
        Toast.show({ type: 'success', text1: 'Archivo subido correctamente' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al subir el archivo' });
    }
  };

  const openTaskDetails = (task: any) => {
    const linkedEvidence = task.completedEvidenceId 
      ? evidences.find(e => e.id === task.completedEvidenceId)
      : null;
    setSelectedTask(task);
    setSelectedEvidence(linkedEvidence);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      
      {/* Summary Header */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {pendingTasks.length} {pendingTasks.length === 1 ? 'tarea pendiente' : 'tareas pendientes'} • {completedTasks.length} completadas
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* EMPTY STATE */}
        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="calendar-clear-outline" size={48} color="#94a3b8" />
            </View>
            <Text style={styles.emptyTitle}>¡Día libre!</Text>
            <Text style={styles.emptySubtitle}>No tienes ninguna actividad asignada en este momento. Puedes relajarte o explorar tus archivos.</Text>
          </View>
        )}

        {/* PENDIENTES */}
        {pendingTasks.length > 0 && (
          <Text style={styles.sectionTitle}>PENDIENTES ({pendingTasks.length})</Text>
        )}
        
        {pendingTasks.map(task => {
          const daysLeft = getDaysRemaining(task.deadline);
          let urgencyColor = '#3b82f6'; // Azul > 7
          let badgeIcon = '🔵';
          if (daysLeft <= 3) {
            urgencyColor = '#ef4444'; // Rojo <= 3
            badgeIcon = '🔴';
          } else if (daysLeft <= 7) {
            urgencyColor = '#f59e0b'; // Ámbar <= 7
            badgeIcon = '🟡';
          }

          return (
            <View key={task.id} style={styles.pendingCard}>
              <View style={[styles.urgencyStrip, { backgroundColor: urgencyColor }]} />
              <View style={styles.pendingCardBody}>
                <View style={[styles.iconBox, { backgroundColor: urgencyColor + '15' }]}>
                  <Ionicons name="document-text" size={24} color={urgencyColor} />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                  
                  <View style={[styles.urgencyBadgeWrapper, { backgroundColor: urgencyColor + '15' }]}>
                    <Text style={[styles.urgencyBadgeText, { color: urgencyColor }]}>
                      {badgeIcon} Vence en {daysLeft} días
                    </Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleSubirDirecto(task.id, task.documentType, task.title)}>
                  <Ionicons name="cloud-upload" size={18} color="#2563eb" />
                  <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>Subir Archivo</Text>
                </TouchableOpacity>
                
                <View style={styles.divider} />
                
                <TouchableOpacity style={styles.actionBtn} onPress={() => router.push({ pathname: '/escaner', params: { taskId: task.id } })}>
                  <Ionicons name="scan" size={18} color="#7c3aed" />
                  <Text style={[styles.actionBtnText, { color: '#7c3aed' }]}>Escanear Documento</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* COMPLETADAS */}
        {completedTasks.length > 0 && (
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>COMPLETADAS ({completedTasks.length})</Text>
        )}

        {completedTasks.map(task => {
          const linkedEvidence = task.completedEvidenceId 
            ? evidences.find(e => e.id === task.completedEvidenceId)
            : null;
          
          const deliveryDate = linkedEvidence?.date 
            ? new Date(linkedEvidence.date).toLocaleDateString('es-EC', {day: 'numeric', month: 'short'})
            : 'Hoy';

          return (
            <TouchableOpacity 
              key={task.id} 
              style={styles.completedCard}
              activeOpacity={0.7}
              onPress={() => openTaskDetails(task)}
            >
              <View style={styles.completedIconWrapper}>
                <Ionicons name="checkmark-circle" size={28} color="#10b981" />
              </View>
              
              <View style={styles.completedInfo}>
                <Text style={styles.completedTitle}>{task.title}</Text>
                <Text style={styles.completedMeta} numberOfLines={1}>
                  <Ionicons name="attach" size={14} color="#64748b" /> {linkedEvidence ? linkedEvidence.fileName : 'Documento entregado'}
                </Text>
                <Text style={styles.completedDate}>
                  <Ionicons name="calendar-outline" size={12} color="#94a3b8" /> Entregado el {deliveryDate}
                </Text>
              </View>

              <View style={styles.completedStatus}>
                {linkedEvidence ? (
                  <Badge status={linkedEvidence.status} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

      </ScrollView>

      {/* Modal de Detalles */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                
                {/* Header Modal */}
                <View style={styles.modalHeader}>
                  <View style={styles.modalIconBox}>
                    <Ionicons name="checkmark-done-circle" size={40} color="#10b981" />
                  </View>
                  <Text style={styles.modalTitle}>{selectedTask?.title}</Text>
                  {selectedEvidence && (
                    <Badge status={selectedEvidence.status} />
                  )}
                </View>

                {/* Info File */}
                {selectedEvidence ? (
                  <View style={styles.modalInfoCard}>
                    
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Archivo Entregado:</Text>
                      <Text style={styles.modalValue} numberOfLines={1}>{selectedEvidence.fileName}</Text>
                    </View>
                    
                    <View style={styles.modalDivider} />
                    
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Fecha de Envío:</Text>
                      <Text style={styles.modalValue}>{new Date(selectedEvidence.date).toLocaleDateString()}</Text>
                    </View>

                    {/* Mostrar detalles de revisión si ya fue revisado */}
                    {(selectedEvidence.status === 'Validado' || selectedEvidence.status === 'Observado') && (
                      <>
                        <View style={styles.modalDivider} />
                        
                        <View style={styles.modalRow}>
                          <Text style={styles.modalLabel}>Revisado por:</Text>
                          <Text style={styles.modalValue}>{selectedEvidence.reviewerName || 'Dirección Académica / RRHH'}</Text>
                        </View>
                        
                        <View style={styles.reviewCommentBox}>
                          <Text style={styles.reviewCommentLabel}>Comentarios:</Text>
                          <Text style={styles.reviewCommentText}>
                            {selectedEvidence.comment || 
                              (selectedEvidence.status === 'Validado' 
                                ? 'Buen trabajo, documento aprobado.' 
                                : 'Por favor, corrige el documento y vuelve a subirlo.')}
                          </Text>
                        </View>
                      </>
                    )}

                  </View>
                ) : (
                  <View style={styles.modalInfoCard}>
                    <Text style={styles.noEvidenceText}>No hay información de archivo adjunto para esta actividad.</Text>
                  </View>
                )}
                
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeBtnText}>Cerrar Detalles</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  summaryBar: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  content: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 16,
    marginLeft: 4,
  },
  
  // Pending Cards
  pendingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  urgencyStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 6,
    zIndex: 2,
  },
  pendingCardBody: {
    flexDirection: 'row',
    padding: 20,
    paddingLeft: 24,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  taskInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  taskDesc: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
  urgencyBadgeWrapper: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgencyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  divider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Completed Cards
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  completedIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completedInfo: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  completedMeta: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '500',
  },
  completedDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  completedStatus: {
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  modalIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalInfoCard: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  modalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    flex: 2,
    textAlign: 'right',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  reviewCommentBox: {
    marginTop: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  reviewCommentLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3b82f6',
    marginBottom: 4,
  },
  reviewCommentText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  noEvidenceText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  closeBtn: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
