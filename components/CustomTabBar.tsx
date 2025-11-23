import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React from 'react';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: 25}]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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
          if (route.name === 'settings') iconName = 'gearshape.fill';
          
          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[
                styles.tabItem, 
                isFocused && styles.tabItemFocused
              ]}
              activeOpacity={0.8}
            >
              <IconSymbol
                name={iconName as any}
                size={24}
                color={isFocused ? '#000' : '#888'}
              />
              {isFocused && (
                <Text style={styles.label}>
                  {options.title || route.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
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
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a', 
    width: '90%',
    height: 60,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    // Removed marginBottom to bring it closer to the safe area/bottom
    borderWidth: 1,
    borderColor: '#333',
  },
  tabItem: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemFocused: {
    width: 'auto',
    paddingHorizontal: 16,
    flexDirection: 'row',
    backgroundColor: '#fff', 
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  }
});
