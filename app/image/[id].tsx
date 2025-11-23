import { useLocalSearchParams, Stack } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { getScreenshot, addScreenshot } from '@/services/Storage';
import { summarizeImage } from '@/services/LocalAI';
import { Fonts } from '@/constants/theme';

export default function ImageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    if (!asset) return;
    setLoading(true);
    try {
      // Copy to cache to ensure consistent file access for the model
      const fileName = asset.filename || `screenshot_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      await FileSystem.copyAsync({
          from: asset.uri,
          to: localUri
      });

      const generatedSummary = await summarizeImage(localUri);
      setSummary(generatedSummary);

      addScreenshot({
        id: asset.id,
        localUri: localUri,
        summary: generatedSummary,
        timestamp: asset.creationTime,
      });

    } catch (e) {
      console.error("Error generating summary", e);
      setSummary("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  if (!asset) {
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
      }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: asset.uri }}
            style={[styles.image, { aspectRatio: asset.width / asset.height }]}
            contentFit="contain"
          />
        </View>

        <View style={styles.controls}>
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
              <Text style={styles.summaryText}>{summary}</Text>
            </View>
          )}
        </View>
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
  },
  imageContainer: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    minHeight: 200,
  },
  image: {
    width: '100%',
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
  summaryText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
});