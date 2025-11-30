import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  ScrollView,
  Text
} from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  Extrapolation,
  SharedValue
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';

// Helper to extract valid icon names
type IconSymbolName = React.ComponentProps<typeof IconSymbol>['name'];

// Fix for Reanimated Type Issues with custom components
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedText = Animated.createAnimatedComponent(Text) as React.ComponentType<any>;

export interface Tag {
  id: string;
  title: string;
}

interface CustomHeaderProps {
  title?: string;
  
  // Search Props
  onSearch?: (text: string) => void;
  showSearch?: boolean;
  
  // Navigation Props
  showBackButton?: boolean;

  // Scroll Animation Prop
  scrollY?: SharedValue<number>;
  
  // Tags Props (Gallery)
  tags?: Tag[];
  selectedTag?: string;
  onSelectTag?: (id: string) => void;

  // Right Action Props (Chat/History)
  rightIcon?: IconSymbolName;
  onRightPress?: () => void;

  // --- NEW: Selection Mode Props (Fixes your error) ---
  isSelectionMode?: boolean;
  selectedCount?: number;
  onCancelSelection?: () => void;
}

export function CustomHeader({ 
  title = 'Gallery', 
  onSearch, 
  scrollY, 
  tags = [], 
  selectedTag, 
  onSelectTag,
  showSearch = true,
  showBackButton = false,
  rightIcon,
  onRightPress,
  isSelectionMode = false,
  selectedCount = 0,
  onCancelSelection
}: CustomHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const searchWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

  // --- Layout Constants ---
  const TITLE_HEIGHT = 50;
  // If in selection mode, hide tags. Otherwise show tags if available.
  const TAGS_HEIGHT = (tags.length > 0 && !isSelectionMode) ? 50 : 0; 
  const PADDING_TOP = insets.top;
  
  const HEADER_MAX_HEIGHT = PADDING_TOP + TITLE_HEIGHT + TAGS_HEIGHT;
  const HEADER_MIN_HEIGHT = PADDING_TOP + TITLE_HEIGHT;

  // Determine Title text based on mode
  const displayTitle = isSelectionMode ? `${selectedCount} Selected` : title;

  // --- Search Logic ---
  const toggleSearch = () => {
    if (isSearchExpanded) {
      setSearchText('');
      onSearch?.('');
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
    onSearch?.(text);
  };

  // --- Animated Styles ---
  const animatedSearchStyle = useAnimatedStyle(() => ({
    width: `${searchWidth.value}%`,
  }));

  const animatedInputStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => {
    if (!scrollY) return { height: HEADER_MAX_HEIGHT };
    const height = interpolate(
      scrollY.value, 
      [0, 100], 
      [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT], 
      Extrapolation.CLAMP
    );
    return { height };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 0 };
    return {
      opacity: interpolate(scrollY.value, [0, 50], [0, 1], Extrapolation.CLAMP),
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    const scale = interpolate(scrollY.value, [0, 50], [1, 0.85], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 50], [0, 2], Extrapolation.CLAMP);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const tagsRowStyle = useAnimatedStyle(() => {
    if (!scrollY) return { opacity: 1 };
    const tagsOpacity = interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollY.value, [0, 40], [0, -20], Extrapolation.CLAMP);
    return {
      opacity: tagsOpacity,
      transform: [{ translateY }],
      pointerEvents: scrollY.value > 40 ? 'none' : 'auto', 
    };
  });

  return (
    <Animated.View style={[styles.headerWrapper, containerStyle]}>
      
      {/* Background Layer 1: Linear Gradient */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Background Layer 2: Blur View */}
      <AnimatedBlurView 
        intensity={80} 
        tint="dark" 
        style={[StyleSheet.absoluteFill, backgroundStyle]} 
      />

      <View style={[styles.contentContainer, { paddingTop: insets.top }]}>
        
        {/* --- ROW 1: Top Bar (Back/Cancel, Title, Actions) --- */}
        <View style={styles.topRow}>
          
          {/* Left Side */}
          <View style={styles.leftContainer}>
            {isSelectionMode ? (
               // Selection Mode: Cancel Button
               <TouchableOpacity onPress={onCancelSelection} style={styles.cancelButton}>
                 <Text style={styles.cancelText}>Cancel</Text>
               </TouchableOpacity>
            ) : (
               // Normal Mode: Back Button (if enabled)
               showBackButton && (
                <TouchableOpacity 
                  onPress={() => router.back()} 
                  style={styles.backButton}
                >
                  <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>
               )
            )}

            {!isSearchExpanded && (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <AnimatedText style={[styles.title, titleStyle]} numberOfLines={1}>
                  {displayTitle}
                </AnimatedText>
              </Animated.View>
            )}
          </View>

          {/* Right Side */}
          {!isSelectionMode && (
            <View style={styles.actionContainer}>
                {showSearch ? (
                // SEARCH MODE
                isSearchExpanded ? (
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
                )
                ) : (
                // CUSTOM ACTION MODE (e.g., New Chat)
                rightIcon && (
                    <TouchableOpacity onPress={onRightPress} style={styles.iconButton}>
                    <IconSymbol name={rightIcon} size={22} color="#fff" />
                    </TouchableOpacity>
                )
                )}
            </View>
          )}
        </View>

        {/* --- ROW 2: Tags (Collapsible) --- */}
        {!isSearchExpanded && !isSelectionMode && tags.length > 0 && (
          <Animated.View style={[styles.tagsContainer, tagsRowStyle]}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsContent}
            >
              {tags.map((tag) => {
                const isActive = selectedTag === tag.id;
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.tag, isActive && styles.tagActive]}
                    onPress={() => onSelectTag?.(tag.id)}
                    activeOpacity={0.7}
                  >
                    <AnimatedText style={[styles.tagText, isActive && styles.tagTextActive]}>
                      {tag.title}
                    </AnimatedText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  contentContainer: {
    flex: 1,
  },
  topRow: {
    height: 50, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backButton: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,69,58,0.2)', // Light red bg
    borderRadius: 8,
  },
  cancelText: {
    color: '#ff453a', // iOS Red
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 40,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  
  // --- Search Styles ---
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    flex: 1,
    justifyContent: 'flex-end',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    height: '100%',
  },
  closeButton: { padding: 5 },

  // --- Tags Styles ---
  tagsContainer: {
    height: 50,
    justifyContent: 'center',
  },
  tagsContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tagActive: {
    backgroundColor: '#fff',
  },
  tagText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.rounded,
  },
  tagTextActive: {
    color: '#000',
    fontWeight: '700',
  },
});