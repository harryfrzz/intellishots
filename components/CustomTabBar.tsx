import { View, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BlurView } from 'expo-blur';
import React, { useState, useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const [dimensions, setDimensions] = useState<{ x: number; width: number }[]>([]);
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const opacity = useSharedValue(0);

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

      // Initialize position immediately if it's the first render (opacity is 0)
      if (opacity.value === 0) {
        translateX.value = targetX;
        indicatorWidth.value = indicatorSize;
        opacity.value = withTiming(1, { duration: 200 });
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

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: indicatorWidth.value,
      opacity: opacity.value,
    };
  });

  return (
    <View style={[styles.container, { paddingBottom: 25 }]}>
      <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
        {dimensions.length > 0 && (
          <Animated.View style={[styles.indicator, animatedStyle]} />
        )}
        <View style={styles.bar}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
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
            if (route.name === 'history') iconName = 'clock.fill';
            if (route.name === 'chat') iconName = 'sparkles';
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
  },
  blurContainer: {
    width: '90%',
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
  bar: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around', // Changed to space-around for better distribution
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
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
    top: 8, // (60 - 44) / 2
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
    zIndex: 0,
  },
});