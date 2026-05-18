import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CACES_CATEGORIES, YEARS } from '../../constants/cacesData';
import { TouchableOpacity as FABTouchable } from 'react-native';

export default function ArchivosScreen() {
  const router = useRouter();
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set(['2025']));
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(new Set());

  const toggleYear = (year: string) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });
  };

  const toggleCat = (key: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSub = (key: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openIndicator = (year: string, catName: string, subName: string, indId: string, indName: string) => {
    router.push({
      pathname: '/indicador-detalle',
      params: {
        year,
        category: catName,
        subcategory: subName,
        indicatorId: indId,
        indicatorName: indName,
      },
    });
  };

  return (
    <View style={styles.wrapper}>
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Ionicons name="folder-open" size={24} color="#2563eb" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.headerTitle}>Árbol de Evidencias CACES</Text>
          <Text style={styles.headerSubtitle}>Navega por la estructura de indicadores</Text>
        </View>
      </View>

      {YEARS.map(year => {
        const yearKey = year;
        const isYearExpanded = expandedYears.has(yearKey);

        return (
          <View key={year} style={styles.yearContainer}>
            <TouchableOpacity
              style={[styles.yearRow, isYearExpanded && styles.yearRowExpanded]}
              onPress={() => toggleYear(yearKey)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isYearExpanded ? 'chevron-down' : 'chevron-forward'}
                size={18}
                color="#2563eb"
              />
              <Ionicons name="calendar" size={22} color="#f59e0b" style={{ marginLeft: 6 }} />
              <Text style={styles.yearText}>Año {year}</Text>
              {year === '2025' && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>Activo</Text>
                </View>
              )}
            </TouchableOpacity>

            {isYearExpanded && CACES_CATEGORIES.map(cat => {
              const catKey = `${year}-${cat.id}`;
              const isCatExpanded = expandedCats.has(catKey);

              return (
                <View key={catKey}>
                  <TouchableOpacity
                    style={[styles.catRow]}
                    onPress={() => toggleCat(catKey)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isCatExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={16}
                      color="#6b7280"
                    />
                    <Ionicons
                      name={isCatExpanded ? 'folder-open' : 'folder'}
                      size={20}
                      color="#f59e0b"
                      style={{ marginLeft: 4 }}
                    />
                    <Text style={styles.catText}>{cat.name}</Text>
                  </TouchableOpacity>

                  {isCatExpanded && cat.subcategories.map(sub => {
                    const subKey = `${year}-${sub.id}`;
                    const isSubExpanded = expandedSubs.has(subKey);

                    return (
                      <View key={subKey}>
                        <TouchableOpacity
                          style={[styles.subRow]}
                          onPress={() => toggleSub(subKey)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSubExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={14}
                            color="#9ca3af"
                          />
                          <Ionicons
                            name={isSubExpanded ? 'folder-open' : 'folder'}
                            size={18}
                            color="#f59e0b"
                            style={{ marginLeft: 4 }}
                          />
                          <Text style={styles.subText}>{sub.name}</Text>
                        </TouchableOpacity>

                        {isSubExpanded && sub.indicators.map(ind => (
                          <TouchableOpacity
                            key={`${year}-${ind.id}`}
                            style={styles.indRow}
                            onPress={() => openIndicator(year, cat.name, sub.name, ind.id, ind.name)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="document-text" size={16} color="#9ca3af" style={{ marginLeft: 4 }} />
                            <Text style={styles.indText}>{ind.name}</Text>
                            <Ionicons name="chevron-forward" size={14} color="#d1d5db" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        );
      })}

      <View style={{ height: 80 }} />
    </ScrollView>

    {/* Scanner FAB */}
    <TouchableOpacity
      style={styles.fab}
      activeOpacity={0.85}
      onPress={() => router.push('/escaner')}
    >
      <Ionicons name="scan" size={26} color="#fff" />
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937' },
  headerSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  yearContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
  },
  yearRowExpanded: {
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  yearText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  activeBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeBadgeText: { fontSize: 11, color: '#15803d', fontWeight: '600' },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 28,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  catText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 48,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  subText: {
    fontSize: 13,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  indRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingLeft: 68,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
    backgroundColor: '#fafbfc',
  },
  indText: {
    fontSize: 13,
    color: '#4b5563',
    marginLeft: 8,
    flex: 1,
  },
  wrapper: { flex: 1 },
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
  },
});
