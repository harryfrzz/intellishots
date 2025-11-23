import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Platform, Keyboard } from 'react-native';
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

interface ExpandableSearchBarProps {
  title?: string;
  onSearch?: (text: string) => void;
  onChangeText?: (text: string) => void;
}

export function ExpandableSearchBar({ title = 'Gallery', onSearch, onChangeText }: ExpandableSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const insets = useSafeAreaInsets();
  
  const width = useSharedValue(0);
  const opacity = useSharedValue(0);

  const toggleSearch = () => {
    if (isExpanded) {
      // Closing
      Keyboard.dismiss();
      setSearchText('');
      if (onChangeText) onChangeText('');
      width.value = withTiming(0, { duration: 300, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(0, { duration: 200 });
      setTimeout(() => setIsExpanded(false), 300);
    } else {
      // Opening
      setIsExpanded(true);
      width.value = withTiming(100, { duration: 300, easing: Easing.inOut(Easing.ease) });
      opacity.value = withTiming(1, { duration: 300 });
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (onChangeText) onChangeText(text);
    if (onSearch) onSearch(text);
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
    };
  });

  const animatedInputStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.container}>
        {!isExpanded && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </Animated.View>
        )}

        {isExpanded ? (
          <Animated.View style={[styles.searchContainer, animatedContainerStyle]}>
            <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
              <IconSymbol name="magnifyingglass" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="Search..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
            </Animated.View>
            <TouchableOpacity onPress={toggleSearch} style={styles.closeButton}>
               <IconSymbol name="xmark" size={20} color="#ECEDEE" />
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity onPress={toggleSearch} style={styles.iconButton}>
            <IconSymbol name="magnifyingglass" size={24} color="#ECEDEE" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#000',
    zIndex: 100,
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    position: 'relative',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#ECEDEE',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    height: '100%',
    flex: 1,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 15,
    height: 40,
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ECEDEE',
    marginLeft: 10,
    fontSize: 16,
    height: '100%',
  },
  closeButton: {
    padding: 5,
  }
});
