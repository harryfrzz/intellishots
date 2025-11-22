import React from 'react';
import { StyleSheet, TextInput, View, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface LiquidSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function SearchBar({ value, onChangeText }: LiquidSearchBarProps) {
  const theme = useColorScheme();
  const isDark = theme === 'dark';

  return (
    <View style={styles.container}>
      {/*<BlurView 
        intensity={Platform.select({ ios: 60, android: 40 })} 
        tint={isDark ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} 
        style={styles.blurContainer}
      >
        <View style={[styles.searchRow, isDark ? styles.searchRowDark : styles.searchRowLight]}>
            <IconSymbol name="magnifyingglass" size={20} color={isDark ? '#AAA' : '#666'} />
            <TextInput
                style={[styles.input, { color: isDark ? '#FFF' : '#000' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder="Search summaries..."
                placeholderTextColor={isDark ? '#888' : '#999'}
                returnKeyType="search"
            />
        </View>
      </BlurView>*/}
      <View style={[styles.searchRow,styles.searchRowBorder]}>
            <IconSymbol name="magnifyingglass" size={20} color={isDark ? '#AAA' : '#666'} />
            <TextInput
                style={[styles.input, { color: isDark ? '#FFF' : '#ffffffff' }]}
                value={value}
                onChangeText={onChangeText}
                placeholder="Search summaries..."
                placeholderTextColor={isDark ? '#888' : '#999'}
                returnKeyType="search"
            /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 30,
    overflow: 'hidden',
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 22,
    gap: 10,
  },
  searchRowBorder: {
    backgroundColor: 'rgba(20, 17, 17, 0.77)',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
});
