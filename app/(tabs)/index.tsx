import { Image, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome to IntelliShots!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Smart Screenshot Companion</ThemedText>
        <ThemedText>
          IntelliShots uses on-device AI to automatically analyze and summarize your screenshots.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">How it works</ThemedText>
        <ThemedText>
          1. Take a screenshot anywhere on your device.
        </ThemedText>
        <ThemedText>
          2. The app detects it and runs a local Vision Language Model to understand the content.
        </ThemedText>
        <ThemedText>
          3. Check the <ThemedText type="defaultSemiBold">Gallery</ThemedText> tab to see your smart summaries.
        </ThemedText>
      </ThemedView>
      
      <TouchableOpacity style={styles.button} onPress={() => router.push('/explore')}>
        <ThemedText style={styles.buttonText}>Go to Smart Gallery</ThemedText>
      </TouchableOpacity>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});