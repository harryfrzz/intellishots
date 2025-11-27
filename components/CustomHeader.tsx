import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomHeaderProps {
  title?: string;
  onSearch: (text: string) => void;
  selectedTag?: string; // Made optional to match usage
  onSelectTag?: (tag: string) => void; // Made optional
}

export function CustomHeader({ title = 'Gallery', onSearch }: CustomHeaderProps) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const insets = useSafeAreaInsets();
  
  const searchWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Calculate specific height to match the Album screen look
  // Status Bar + Header Content + minimal fade space
  const headerHeight = insets.top + 60; 

  const toggleSearch = () => {
    if (isSearchExpanded) {
      setSearchText('');
      onSearch('');
      searchWidth.value = withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => setIsSearchExpanded(false), 300);
    } else {
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
    <View style={styles.headerWrapper}>
      <LinearGradient
        // 1. Use the smoother 0.8 opacity black used in Album Screen
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0)']}
        // 2. Add locations to control the fade curve
        locations={[0, 1]} 
        style={[styles.gradientContainer, { height: headerHeight, paddingTop: insets.top }]}
      >
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
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  gradientContainer: {
    width: '100%',
    paddingHorizontal: 16,
    // Align content to the center/bottom of the fixed height area
    justifyContent: 'center', 
    paddingBottom: 8,
  },
  topRow: {
    height: 44, // Standard iOS navigation bar height
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28, // Matches Album title size
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // Slightly more visible button bg against the gradient
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
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    height: '100%',
  },
  closeButton: {
    padding: 5,
  },
});