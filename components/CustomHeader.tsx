import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView, Platform, LayoutAnimation } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomHeaderProps {
  title?: string;
  onSearch: (text: string) => void;
  selectedTag: string;
  onSelectTag: (tag: string) => void;
}

const TAGS = ["All", "Screenshots", "UI Elements", "Text", "Warnings"];

export function CustomHeader({ title = 'Gallery', onSearch, selectedTag, onSelectTag }: CustomHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const insets = useSafeAreaInsets();
  
  const searchWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  const toggleSearch = () => {
    if (isSearchExpanded) {
      // Close
      setSearchText('');
      onSearch('');
      searchWidth.value = withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => setIsSearchExpanded(false), 300);
    } else {
      // Open
      setIsSearchExpanded(true);
      searchWidth.value = withTiming(100, { duration: 300, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(1, { duration: 300 });
    }
  };

  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    onSearch(text);
  };

  const animatedSearchStyle = useAnimatedStyle(() => ({
    width: `${searchWidth.value}%`,
  }));

  const animatedInputStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top}]}>
      {/* Row 1: Title & Search */}
      <View style={styles.topRow}>
        {!isSearchExpanded && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </Animated.View>
        )}

        {isSearchExpanded ? (
          <Animated.View style={[styles.searchContainer, animatedSearchStyle]}>
            <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
              <IconSymbol name="magnifyingglass" size={20} color="#ccc" />
              <TextInput
                style={styles.input}
                placeholder="Search..."
                placeholderTextColor="#aaa"
                value={searchText}
                onChangeText={handleSearchTextChange}
                autoFocus
                returnKeyType="search"
              />
            </Animated.View>
            <TouchableOpacity onPress={toggleSearch} style={styles.closeButton}>
               <IconSymbol name="xmark" size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity onPress={toggleSearch} style={styles.iconButton}>
            <IconSymbol name="magnifyingglass" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Row 2: Tags */}
      <View style={styles.bottomRow}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tagsContainer}
        >
          {TAGS.map((tag) => (
            <TouchableOpacity
              key={tag}
              onPress={() => onSelectTag(tag)}
              style={[
                styles.tag,
                selectedTag === tag && styles.tagActive
              ]}
            >
              <Text style={[
                styles.tagText,
                selectedTag === tag && styles.tagTextActive
              ]}>
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 15,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#000', // Replaced gradient with solid black
    zIndex: 100,
  },
  topRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 10,
    position: 'relative',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    flex: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 40,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
    height: '100%',
  },
  closeButton: {
    padding: 5,
  },
  bottomRow: {
    height: 40,
  },
  tagsContainer: {
    paddingHorizontal: 20,
    gap: 10,
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)', // Adjusted for dark bg
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tagText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  tagTextActive: {
    color: '#000', 
  },
});