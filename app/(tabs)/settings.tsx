import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text, ScrollView, Alert, Linking, Platform } from 'react-native';
import * as Updates from 'expo-updates';

import { CustomHeader } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear AI Cache",
      "This will remove temporary model files. You may need to download the model again.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: () => console.log("Cache Cleared") }
      ]
    );
  };

  const handleReload = async () => {
    await Updates.reloadAsync();
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Settings" 
        showSearch={false} 
        onSearch={() => {}} 
      />

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Section 1: AI Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cactus Framework</Text>
          
          <View style={styles.item}>
            <View style={styles.itemLeft}>
              <IconSymbol name="sparkles" size={22} color="#fff" />
              <View>
                <Text style={styles.itemText}>Active Model</Text>
                <Text style={styles.itemSubtext}>LFM2-VL-450M (On-Device)</Text>
              </View>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Active</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.item} onPress={handleClearCache}>
            <View style={styles.itemLeft}>
              <IconSymbol name="trash" size={22} color="#ff453a" />
              <Text style={[styles.itemText, { color: '#ff453a' }]}>Clear Model Cache</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 2: App Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          
          <TouchableOpacity style={styles.item} onPress={handleOpenSettings}>
            <View style={styles.itemLeft}>
              <IconSymbol name="gearshape.fill" size={22} color="#fff" />
              <Text style={styles.itemText}>System Settings</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Section 3: About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <TouchableOpacity style={styles.item} activeOpacity={1}>
            <View style={styles.itemLeft}>
              <IconSymbol name="info.circle" size={22} color="#fff" />
              <Text style={styles.itemText}>Version</Text>
            </View>
            <Text style={styles.versionText}>1.0.0 (Beta)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.item} onPress={handleReload}>
            <View style={styles.itemLeft}>
              <IconSymbol name="arrow.clockwise" size={22} color="#fff" />
              <Text style={styles.itemText}>Reload App</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  itemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  itemSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  versionText: {
    color: '#666',
    fontSize: 16,
  },
  badge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  badgeText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});