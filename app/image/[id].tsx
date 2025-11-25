import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInDown } from 'react-native-reanimated'; // 1. Import Reanimated

import { getScreenshot, addScreenshot } from '@/services/Storage';
import { summarizeImage } from '@/services/LocalAI';
import { Fonts } from '@/constants/theme';

// 2. Create Animated Image Component
const AnimatedImage = Animated.createAnimatedComponent(Image) as React.ComponentType<any>;

export default function ImageDetailScreen() {
  // 3. Get params passed from Gallery
  const { id, uri } = useLocalSearchParams<{ id: string; uri: string }>();
  
  const [asset, setAsset] = useState<MediaLibrary.AssetInfo | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
       const assetInfo = await MediaLibrary.getAssetInfoAsync(id);
       setAsset(assetInfo);

       const existing = getScreenshot(id);
       if (existing && existing.summary) {
         setSummary(existing.summary);
       }
    } catch (e) {
      console.error("Error loading image data", e);
    }
  };

  const handleGenerateSummary = async () => {
    // Use the passed URI if asset isn't fully loaded yet, though usually it is by now
    const currentUri = asset?.uri || uri;
    if (!currentUri) return;
    
    setLoading(true);
    try {
      const fileName = `screenshot_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
          from: currentUri,
          to: localUri
      });

      const generatedSummary = await summarizeImage(localUri);
      setSummary(generatedSummary);

      addScreenshot({
        id: id,
        localUri: localUri,
        summary: generatedSummary,
        timestamp: asset?.creationTime || Date.now(),
      });

    } catch (e) {
      console.error("Error generating summary", e);
      setSummary("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  // We need the URI to render the image immediately for the animation
  if (!uri && !asset) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ECEDEE" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ 
        headerTitle: "",
        headerBackTitle: "Gallery",
        // Optional: Make header transparent for better immersion
        headerTransparent: true, 
        headerTintColor: '#fff',
        headerStyle: { backgroundColor: 'rgba(0,0,0,0.3)' }
      }} />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          {/* 4. The Shared Element Image */}
          <AnimatedImage
            sharedTransitionTag={`image-${id}`}
            source={{ uri: uri || asset?.uri }}
            style={styles.image}
            contentFit="contain"
          />
        </View>

        {/* 5. Animate the controls in slightly later */}
        <Animated.View 
          entering={FadeInDown.duration(400).delay(300)} 
          style={styles.controls}
        >
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleGenerateSummary}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>{summary ? "Regenerate Summary" : "Generate Summary"}</Text>
            )}
          </TouchableOpacity>

          {summary && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Markdown style={markdownStyles}>
                {summary}
              </Markdown>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 40,
    // Add top padding to account for transparent header
    paddingTop: 100, 
  },
  imageContainer: {
    width: '100%',
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  controls: {
    padding: 20,
    gap: 20,
  },
  button: {
    backgroundColor: '#ECEDEE',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Fonts.rounded, 
  },
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 16,
    marginTop: 10,
  },
  summaryTitle: {
    color: '#ECEDEE',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: Fonts.rounded,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  // ... rest of your markdown styles
});