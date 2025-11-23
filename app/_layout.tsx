import { DarkTheme, DefaultTheme, ThemeProvider, Theme } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import ScreenshotManager from '@/components/ScreenshotManager';

export const unstable_settings = {
  anchor: '(tabs)',
};

const BlackTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
    card: '#000000',
    text: '#ECEDEE',
    border: '#333333',
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={BlackTheme}>
      <ScreenshotManager />
      <Stack screenOptions={{
        contentStyle: { backgroundColor: '#000' },
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        headerShadowVisible: false,
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
