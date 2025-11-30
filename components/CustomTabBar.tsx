import { View, StyleSheet, TouchableOpacity, LayoutChangeEvent, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient'; // 1. Import LinearGradient
import React, { useState, useEffect } from 'react';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing,
  interpolate,
} from 'react-native-reanimated';

// 1. Define your available models
const MODELS = [
  { id: 'default', name: 'LFM2-VL-450M' },
  { id: 'smolvlm', name: 'smolVLM' },
];

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [dimensions, setDimensions] = useState<{ x: number; width: number }[]>([]);
  
  // 2. New State for Model Selection
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);

  // Animation Values
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  // Menu Animation Values
  const menuAnimation = useSharedValue(0); // 0 = closed, 1 = open

  const onLayout = (event: LayoutChangeEvent, index: number) => {
    const { x, width } = event.nativeEvent.layout;
    setDimensions((prev) => {
      const newDimensions = [...prev];
      newDimensions[index] = { x, width };
      return newDimensions;
    });
  };

  useEffect(() => {
    if (dimensions[state.index]) {
      const { x, width } = dimensions[state.index];
      const tabCenter = x + width / 2;
      const indicatorSize = 44; 
      const targetX = tabCenter - indicatorSize / 2;

      if (opacity.value === 0) {
        translateX.value = targetX;
        indicatorWidth.value = indicatorSize;
        opacity.value = withTiming(1, { duration: 500 });
      } else {
        translateX.value = withTiming(targetX, { 
          duration: 250, 
          easing: Easing.out(Easing.cubic) 
        });
        indicatorWidth.value = withTiming(indicatorSize, { 
          duration: 250 
        });
      }
    }
  }, [state.index, dimensions]);

  // 3. Handle Menu Toggle
  const toggleMenu = () => {
    const newState = !isMenuOpen;
    setIsMenuOpen(newState);
    menuAnimation.value = withTiming(newState ? 1 : 0, {
      duration: 150,
      easing: Easing.out(Easing.cubic),
    });
  };

  const selectModel = (modelId: string) => {
    setSelectedModel(modelId);
    toggleMenu(); // Close after selection
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: indicatorWidth.value,
      opacity: opacity.value,
    };
  });

  // 4. Menu Animated Style
  const menuAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: menuAnimation.value,
      transform: [
        { translateY: interpolate(menuAnimation.value, [0, 1], [20, 0]) },
        { scale: interpolate(menuAnimation.value, [0, 1], [0.9, 1]) },
      ],
      pointerEvents: menuAnimation.value < 0.1 ? 'none' : 'auto', 
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: 25 }]}>
      
      {/* 5. The Model Selection Popup */}
      <Animated.View style={[styles.menuWrapper, menuAnimatedStyle]}>
        <BlurView intensity={90} tint="dark" style={styles.menuContainer}>
          <Text style={styles.menuHeader}>Select Model</Text>
          <View style={styles.divider} />
          
          {MODELS.map((model) => (
            <TouchableOpacity 
              key={model.id} 
              style={[
                styles.menuItem, 
                selectedModel === model.id && styles.menuItemActive
              ]}
              onPress={() => selectModel(model.id)}
            >
              <Text style={[
                styles.menuText, 
                selectedModel === model.id && styles.menuTextActive
              ]}>
                {model.name}
              </Text>
              {selectedModel === model.id && (
                <IconSymbol name="checkmark" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </BlurView>
      </Animated.View>

      <View style={styles.mainContainer}>
        
        {/* Main Tab Bar (Pill Shape) */}
        <BlurView intensity={80} tint="dark" style={styles.tabBarContainer}>
          
          {/* ADDED: Gradient Background Layer */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {dimensions.length > 0 && (
            <Animated.View style={[styles.indicator, animatedStyle]} />
          )}
          <View style={styles.tabsRow}>
            {state.routes.map((route, index) => {
              const isFocused = state.index === index;

              const onPress = () => {
                if (isMenuOpen) toggleMenu();

                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              let iconName = 'house.fill';
              if (route.name === 'index') iconName = 'photo.on.rectangle';
              if (route.name === 'ChatScreen') iconName = 'sparkles';
              if (route.name === 'HistoryScreen') iconName = 'books.vertical.fill';
              if (route.name === 'settings') iconName = 'gearshape.fill';
              
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  onLayout={(e) => onLayout(e, index)}
                  style={styles.tabItem}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    name={iconName as any}
                    size={24}
                    color={isFocused ? '#fff' : '#aaa'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>

        {/* Separate Model Switcher Button (Circle) */}
        <TouchableOpacity
          onPress={toggleMenu}
          activeOpacity={0.8}
          style={styles.switcherWrapper}
        >
          <BlurView 
            intensity={80} 
            tint="dark" 
            style={[
              styles.switcherContainer,
              isMenuOpen && styles.switcherActive
            ]}
          >
            <IconSymbol
              name="sparkles" 
              size={24}
              color={isMenuOpen ? '#fff' : '#ddd'} 
            />
          </BlurView>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  mainContainer: {
    width: '95%',
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  // --- Tab Bar Styles ---
  tabBarContainer: {
    flex: 1, 
    height: 60,
    borderRadius: 35,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    height: 60,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  indicator: {
    position: 'absolute',
    height: 44,
    top: 8, 
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    zIndex: 0,
  },
  // --- Model Switcher Styles ---
  switcherWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  switcherContainer: {
    height: 60,
    width: 60, 
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.2)', // Darker base for glass effect
  },
  switcherActive: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderColor: 'rgba(255,255,255,0.8)',
  },

  // --- Popup Menu Styles ---
  menuWrapper: {
    position: 'absolute',
    bottom: 95, 
    right: '5%', 
    width: 200,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 200,
  },
  menuContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuHeader: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  menuText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '500',
  },
  menuTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});