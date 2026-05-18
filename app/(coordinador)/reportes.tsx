import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Card } from '../../components/Card';
import { BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

export default function ReportesScreen() {
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(15, 118, 110, ${opacity})`, // Coordinador primary color
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  const data = {
    labels: ['Org.', 'Acad.', 'Inv.', 'Vinc.', 'Rec.', 'Est.'],
    datasets: [
      {
        data: [85, 60, 30, 100, 75, 50],
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.chartCard}>
        <Text style={styles.title}>Cumplimiento por Categoría (%)</Text>
        <View style={styles.chartContainer}>
          <BarChart
            data={data}
            width={screenWidth - 64}
            height={220}
            yAxisLabel=""
            yAxisSuffix="%"
            chartConfig={chartConfig}
            verticalLabelRotation={0}
            fromZero
            style={styles.chart}
          />
        </View>
      </Card>

      <TouchableOpacity style={styles.exportBtn}>
        <Ionicons name="document-text" size={24} color="#fff" />
        <Text style={styles.exportText}>Exportar Reporte PDF</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  chartCard: { padding: 16, marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 16, alignSelf: 'flex-start' },
  chartContainer: { alignItems: 'center' },
  chart: { borderRadius: 8 },
  exportBtn: { backgroundColor: '#0f766e', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  exportText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
