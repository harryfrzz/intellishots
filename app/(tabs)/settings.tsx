import { StyleSheet, Switch, TouchableOpacity, View, Text } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>General</Text>
        
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="moon.fill" size={24} color={theme.text} />
            <Text style={[styles.itemText, { color: theme.text }]}>Dark Mode</Text>
          </View>
          <Switch value={true} disabled trackColor={{ false: "#767577", true: "#333" }} thumbColor={ "#f4f3f4"} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="bell.fill" size={24} color={theme.text} />
            <Text style={[styles.itemText, { color: theme.text }]}>Notifications</Text>
          </View>
          <IconSymbol name="chevron.right" size={20} color="gray" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <TouchableOpacity style={styles.item}>
          <View style={styles.itemLeft}>
            <IconSymbol name="info.circle.fill" size={24} color={theme.text} />
            <Text style={[styles.itemText, { color: theme.text }]}>Version</Text>
          </View>
          <Text style={[styles.versionText, { color: theme.text }]}>1.0.0</Text>
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
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
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
