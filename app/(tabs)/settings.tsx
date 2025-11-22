import { StyleSheet, Switch, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Settings</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>General</ThemedText>
        
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="moon.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
            <ThemedText style={styles.itemText}>Dark Mode</ThemedText>
          </View>
          <Switch value={colorScheme === 'dark'} disabled />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="bell.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
            <ThemedText style={styles.itemText}>Notifications</ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={20} color="gray" />
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>About</ThemedText>
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="info.circle.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
            <ThemedText style={styles.itemText}>Version</ThemedText>
          </View>
          <ThemedText style={styles.versionText}>1.0.0</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ThemedView>
  );
}

import { View } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
    gap: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    opacity: 0.6,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 16,
  },
  versionText: {
    opacity: 0.5,
  },
});
