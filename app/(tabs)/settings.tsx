import { StyleSheet, Switch, TouchableOpacity, View, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="moon.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
            <Text style={styles.itemText}>Dark Mode</Text>
          </View>
          <Switch value={colorScheme === 'dark'} disabled />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="bell.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
            <Text style={styles.itemText}>Notifications</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color="gray" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="info.circle.fill" size={24} color={Colors[colorScheme ?? 'light'].text} />
            <Text style={styles.itemText}>Version</Text>
          </View>
          <Text style={styles.versionText}>1.0.0</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
