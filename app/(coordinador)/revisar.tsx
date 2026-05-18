import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { useData } from '../../contexts/DataContext';
import Toast from 'react-native-toast-message';

export default function RevisarScreen() {
  const { evidences, reviewEvidence } = useData();
  const [selectedEv, setSelectedEv] = useState<any>(null);
  const [comment, setComment] = useState('');

  const pendientes = evidences.filter(e => e.status === 'Pendiente' || e.status === 'Generado con IA');

  const handleReview = async (status: 'Validado' | 'Observado') => {
    if (status === 'Observado' && !comment.trim()) {
      alert('Debes ingresar un comentario para observar la evidencia.');
      return;
    }
    await reviewEvidence(selectedEv.id, status, comment);
    Toast.show({
      type: 'success',
      text1: `Evidencia ${status}`,
    });
    setSelectedEv(null);
    setComment('');
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list}>
        {pendientes.map(ev => (
          <TouchableOpacity key={ev.id} onPress={() => setSelectedEv(ev)}>
            <Card style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.docente}>{ev.docenteName}</Text>
                <Badge status={ev.status} />
              </View>
              <Text style={styles.fileName}>{ev.fileName}</Text>
              <Text style={styles.indicador}>{ev.criterio} {'>'} {ev.indicador}</Text>
              <Text style={styles.date}>{new Date(ev.date).toLocaleDateString()}</Text>
            </Card>
          </TouchableOpacity>
        ))}
        {pendientes.length === 0 && (
          <Text style={styles.emptyText}>No hay evidencias pendientes de revisión.</Text>
        )}
      </ScrollView>

      {selectedEv && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Revisar Evidencia</Text>
              <Text style={styles.fileName}>{selectedEv.fileName}</Text>
              <Text style={styles.indicador}>{selectedEv.docenteName}</Text>
              
              <View style={styles.previewBox}>
                <Text style={{color: '#9ca3af'}}>(Vista previa del documento simulada)</Text>
              </View>

              <Text style={styles.label}>Comentarios / Observaciones</Text>
              <TextInput
                style={styles.input}
                multiline
                placeholder="Escribe aquí si hay observaciones..."
                value={comment}
                onChangeText={setComment}
              />

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnReject]} onPress={() => handleReview('Observado')}>
                  <Text style={styles.btnText}>Observar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnApprove]} onPress={() => handleReview('Validado')}>
                  <Text style={styles.btnText}>Validar</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setSelectedEv(null)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  list: { padding: 16 },
  card: { marginBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  docente: { fontWeight: 'bold', color: '#1f2937' },
  fileName: { fontSize: 16, color: '#374151', marginBottom: 4 },
  indicador: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  date: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#6b7280', fontStyle: 'italic' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  previewBox: { height: 150, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginVertical: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#4b5563' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, height: 80, textAlignVertical: 'top', marginBottom: 24 },
  btnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  btn: { flex: 1, padding: 16, borderRadius: 8, alignItems: 'center' },
  btnApprove: { backgroundColor: '#22c55e' },
  btnReject: { backgroundColor: '#ef4444' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnCancel: { padding: 16, alignItems: 'center' },
  btnCancelText: { color: '#6b7280', fontSize: 16, fontWeight: 'bold' }
});
