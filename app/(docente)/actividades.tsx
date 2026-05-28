import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

const getDaysRemaining = (deadline: string) => {
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export default function ActividadesScreen() {
  const { tasks, uploadEvidence, completeTask, evidences } = useData();
  const { user } = useAuth();
  const router = useRouter();

  const [iaModalVisible, setIaModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [iaDescription, setIaDescription] = useState('');
  const [iaType] = useState('Informe');
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingTasks = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  const completedTasks = tasks
    .filter((task) => task.completed)
    .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime());

  const docenteId = user?.id || '1';
  const docenteName = user?.name || 'Prof. Pablo Mora';

  const handleSubirDirecto = async (taskId: string, documentType: string, taskTitle: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync();
      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        const evidenceId = await uploadEvidence({
          docenteId,
          docenteName,
          documentType: documentType as any,
          periodo: '2025',
          fileName: file.name,
          description: `Subido para: ${taskTitle}`,
        });
        await completeTask(taskId, evidenceId);
        Toast.show({ type: 'success', text1: 'Archivo subido correctamente' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Error al subir el archivo' });
    }
  };

  const handleIA = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIaModalVisible(true);
  };

  const confirmGenerateIA = () => {
    if (!selectedTaskId) return;
    setIsGenerating(true);

    setTimeout(async () => {
      const task = tasks.find((currentTask) => currentTask.id === selectedTaskId);

      if (task) {
        const generatedName = `${task.title.replace(/\s+/g, '_')}_IA.pdf`;
        const evidenceId = await uploadEvidence({
          docenteId,
          docenteName,
          documentType: 'Generado con IA',
          periodo: '2025',
          fileName: generatedName,
          description: iaDescription || `Generado por IA para: ${task.title}`,
          iaGenerated: true,
        });

        await completeTask(selectedTaskId, evidenceId);
        Toast.show({ type: 'success', text1: 'Documento generado' });
      }

      setIsGenerating(false);
      setIaModalVisible(false);
      setIaDescription('');
    }, 2000);
  };

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Mis Actividades</Text>
        <Text style={styles.heroSubtitle}>
          {tasks.length} tareas disponibles • {completedTasks.length} completadas
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {pendingTasks.length > 0 && <Text style={styles.sectionTitle}>PENDIENTES ({pendingTasks.length})</Text>}

        {pendingTasks.map((task) => {
          const daysLeft = getDaysRemaining(task.deadline);
          let urgencyColor = '#3b82f6';
          let priorityLabel = 'baja';

          if (daysLeft <= 3) {
            urgencyColor = '#dc2626';
            priorityLabel = 'alta';
          } else if (daysLeft <= 7) {
            urgencyColor = '#f59e0b';
            priorityLabel = 'media';
          }

          return (
            <View key={task.id} style={[styles.pendingCard, { borderLeftColor: urgencyColor }]}>
              <View style={styles.pendingCardBody}>
                <View style={styles.iconBox}>
                  <Text style={styles.iconLabel}>DOC</Text>
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                  <Text style={styles.urgencyBadge}>Prioridad {priorityLabel} • vence en {daysLeft} dias</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleSubirDirecto(task.id, task.documentType, task.title)}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#475569" />
                  <Text style={styles.actionBtnText}>Subir</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push({ pathname: '/escaner', params: { taskId: task.id } })}
                >
                  <Ionicons name="camera-outline" size={18} color="#475569" />
                  <Text style={styles.actionBtnText}>Escanear</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.actionBtn} onPress={() => handleIA(task.id)}>
                  <MaterialIcons name="auto-awesome" size={18} color="#7c3aed" />
                  <Text style={styles.actionBtnTextIA}>IA</Text>
                  <View style={styles.betaBadge}>
                    <Text style={styles.betaText}>BETA</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {completedTasks.length > 0 && (
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>COMPLETADAS ({completedTasks.length})</Text>
        )}

        {completedTasks.map((task) => {
          const linkedEvidence = task.completedEvidenceId
            ? evidences.find((evidence) => evidence.id === task.completedEvidenceId)
            : null;

          const deliveryDate = linkedEvidence?.date
            ? new Date(linkedEvidence.date).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
            : 'Hoy';

          return (
            <View key={task.id} style={styles.completedCard}>
              <Text style={styles.completedIcon}>OK</Text>
              <View style={styles.completedInfo}>
                <Text style={styles.completedTitle}>{task.title}</Text>
                <Text style={styles.completedMeta}>{linkedEvidence ? linkedEvidence.fileName : 'Documento entregado'}</Text>
                <Text style={styles.completedMeta}>Entregado el {deliveryDate}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={iaModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => !isGenerating && setIaModalVisible(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Generar documento con IA</Text>
            <View style={styles.sheetBadge}>
              <Text style={styles.sheetBadgeText}>BETA</Text>
            </View>

            <Text style={styles.label}>Tarea vinculada:</Text>
            <Text style={styles.taskValue}>"{selectedTask?.title}"</Text>

            <Text style={styles.label}>Describe lo que necesitas:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: certificado de estudios de posgrado firmado..."
              multiline
              value={iaDescription}
              onChangeText={setIaDescription}
              editable={!isGenerating}
            />

            <View style={styles.row}>
              <View style={styles.half}>
                <Text style={styles.label}>Tipo:</Text>
                <View style={styles.pillBox}>
                  <Text style={styles.pillText}>{iaType} ▼</Text>
                </View>
              </View>
              <View style={styles.half}>
                <Text style={styles.label}>Formato:</Text>
                <View style={styles.formatRow}>
                  <View style={[styles.pillBox, styles.pillActive]}>
                    <Text style={styles.pillActiveText}>PDF</Text>
                  </View>
                  <View style={styles.pillBox}>
                    <Text style={styles.pillText}>DOCX</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isGenerating && styles.primaryBtnDisabled]}
              onPress={confirmGenerateIA}
              disabled={isGenerating}
            >
              <Text style={styles.btnText}>{isGenerating ? 'Generando con IA...' : 'Generar y guardar'}</Text>
            </TouchableOpacity>

            {!isGenerating && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIaModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
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
    paddingBottom: 32,
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 12,
  },
  pendingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  pendingCardBody: {
    flexDirection: 'row',
    padding: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    lineHeight: 18,
  },
  urgencyBadge: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
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
    paddingVertical: 12,
    gap: 6,
  },
  divider: {
    width: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  actionBtnText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  actionBtnTextIA: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '600',
  },
  betaBadge: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 2,
  },
  betaText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#6d28d9',
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#15803d',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  completedIcon: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
    marginRight: 12,
    marginLeft: 4,
  },
  completedInfo: {
    flex: 1,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 2,
  },
  completedMeta: {
    fontSize: 12,
    color: '#94a3b8',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  bottomSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  sheetBadge: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: '#fef08a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sheetBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#854d0e',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    marginBottom: 6,
  },
  taskValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  half: {
    flex: 1,
  },
  formatRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pillText: {
    fontWeight: '600',
    color: '#475569',
  },
  pillActiveText: {
    fontWeight: '600',
    color: '#fff',
  },
  primaryBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#c4b5fd',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
});
