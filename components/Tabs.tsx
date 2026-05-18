import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface TabsProps {
  tabs: string[];
  activeTab: number;
  onChange: (index: number) => void;
  primaryColor?: string;
}

export function Tabs({ tabs, activeTab, onChange, primaryColor = '#2563eb' }: TabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                isActive && { backgroundColor: primaryColor, borderColor: primaryColor },
              ]}
              onPress={() => onChange(index)}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>{tab}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f3f4f6',
  },
  tabText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
});
