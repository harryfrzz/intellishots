import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { IconSymbol } from './ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from './themed-text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const activeColor = Colors[colorScheme ?? 'light'].tint;
  const inactiveColor = Colors[colorScheme ?? 'light'].icon;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.content}>
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

          const iconName = route.name === 'index' ? 'house.fill' : 'gearshape.fill';
          const label = route.name === 'index' ? 'Home' : 'Settings';

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isFocused && styles.activeIconContainer]}>
                <IconSymbol
                  name={iconName}
                  size={24}
                  color={isFocused ? '#fff' : inactiveColor}
                />
              </View>
              <ThemedText style={[styles.label, { color: isFocused ? activeColor : inactiveColor }]}>
                {label}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "none",
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 30,
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#0a7ea4',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    display: 'none', // Hiding label for cleaner look, user can toggle if needed
  },
});
