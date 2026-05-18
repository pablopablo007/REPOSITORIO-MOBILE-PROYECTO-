import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { Card } from '../../components/Card';
import { useData } from '../../contexts/DataContext';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function ConfigScreen() {
  const { config, updateConfig, clearData } = useData();
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const saveConfig = async () => {
    await updateConfig(localConfig);
    Toast.show({
      type: 'success',
      text1: 'Configuración guardada',
    });
  };

  const handleClear = async () => {
    await clearData();
    Toast.show({
      type: 'info',
      text1: 'Datos borrados',
      text2: 'Toda la información simulada ha sido eliminada.',
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Umbrales de Cumplimiento</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.settingLabel}>Nivel Verde (Óptimo) {'>='} {localConfig.thresholdGreen}%</Text>
          </View>
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.settingLabel}>Nivel Ámbar (Medio) {'>='} {localConfig.thresholdAmber}%</Text>
          </View>
        </View>
        <Text style={styles.note}>Nota: El nivel rojo aplica para valores menores al nivel ámbar.</Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.title}>Opciones del Sistema</Text>
        
        <View style={styles.switchRow}>
          <Text style={styles.settingLabel}>Permitir Generación con IA</Text>
          <Switch 
            value={localConfig.allowIA} 
            onValueChange={v => setLocalConfig({...localConfig, allowIA: v})} 
            trackColor={{ true: '#7c3aed', false: '#d1d5db' }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.settingLabel}>Notificaciones Automáticas</Text>
          <Switch 
            value={localConfig.autoNotifications} 
            onValueChange={v => setLocalConfig({...localConfig, autoNotifications: v})}
            trackColor={{ true: '#7c3aed', false: '#d1d5db' }}
          />
        </View>
      </Card>

      <TouchableOpacity style={styles.saveBtn} onPress={saveConfig}>
        <Ionicons name="save" size={20} color="#fff" />
        <Text style={styles.saveBtnText}>Guardar Cambios</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
        <Ionicons name="trash" size={20} color="#ef4444" />
        <Text style={styles.clearBtnText}>Borrar Todos los Datos Simulados</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  card: { marginBottom: 16 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  settingInfo: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  settingLabel: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
  note: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  saveBtn: { backgroundColor: '#7c3aed', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  clearBtn: { backgroundColor: '#fee2e2', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 32 },
  clearBtnText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});
