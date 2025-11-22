import { Image } from 'expo-image';
import { StyleSheet, View, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getScreenshot, addScreenshot, ScreenshotEntry } from '@/services/Storage';
import { summarizeImage } from '@/services/LocalAI';

export default function ImageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [asset, setAsset] = useState<MediaLibrary.AssetInfo | null>(null);
  const [summaryEntry, setSummaryEntry] = useState<ScreenshotEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      const assetInfo = await MediaLibrary.getAssetInfoAsync(id);
      setAsset(assetInfo);

      const stored = getScreenshot(id);
      if (stored) {
        setSummaryEntry(stored);
      }
    } catch (e) {
      console.error("Failed to load image details", e);
    }
  };

  const handleSummarize = async () => {
    if (!asset) return;
    setIsLoading(true);

    try {
       // 1. Prepare file path (copy to cache)
       const fileName = asset.filename || `screenshot_${Date.now()}.jpg`;
       const localUri = `${FileSystem.cacheDirectory}${fileName}`;
       
       const fileInfo = await FileSystem.getInfoAsync(localUri);
       if (fileInfo.exists) {
         await FileSystem.deleteAsync(localUri, { idempotent: true });
       }
       
       await FileSystem.copyAsync({
           from: asset.localUri || asset.uri,
           to: localUri
       });
 
       // 2. Generate Summary
       const summaryText = await summarizeImage(localUri);
 
       // 3. Save to DB
       const newEntry: ScreenshotEntry = {
         id: asset.id,
         localUri: localUri,
         summary: summaryText,
         timestamp: asset.creationTime,
       };
       
       addScreenshot(newEntry);
       setSummaryEntry(newEntry);

    } catch (error) {
      console.error("Summarization failed:", error);
      Alert.alert("Error", "Failed to summarize image.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!asset) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Image Details' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: asset.localUri || asset.uri }} style={styles.image} contentFit="contain" />
        
        <View style={styles.infoContainer}>
          <ThemedText style={styles.dateText}>
            {new Date(asset.creationTime).toLocaleString()}
          </ThemedText>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSummarize}
            disabled={isLoading}
          >
            <IconSymbol name="sparkles" size={24} color="white" />
            <ThemedText style={styles.buttonText}>
              {summaryEntry ? 'Regenerate Summary' : 'Generate Summary'}
            </ThemedText>
          </TouchableOpacity>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0a7ea4" />
              <ThemedText>Analyzing screenshot with AI...</ThemedText>
            </View>
          )}

          {summaryEntry && !isLoading && (
            <View style={styles.summaryContainer}>
                <ThemedText type="subtitle">Summary</ThemedText>
                <ThemedText style={styles.summaryText}>{summaryEntry.summary}</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    height: 400,
    backgroundColor: '#000',
  },
  infoContainer: {
    padding: 20,
    gap: 16,
  },
  dateText: {
    opacity: 0.6,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  summaryContainer: {
    gap: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  }
});
