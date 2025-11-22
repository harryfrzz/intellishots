import { Image } from 'expo-image';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { getScreenshots, addScreenshot, ScreenshotEntry, getScreenshot } from '@/services/Storage';
import { summarizeImage } from '@/services/LocalAI';
import { useFocusEffect } from 'expo-router';

export default function SmartGalleryScreen() {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const [summaries, setSummaries] = useState<Record<string, ScreenshotEntry>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load latest screenshots and existing summaries
  const loadData = async () => {
    if (permissionResponse?.status !== 'granted') {
      await requestPermission();
    }

    const { assets: fetchedAssets } = await MediaLibrary.getAssetsAsync({
      first: 20,
      sortBy: [MediaLibrary.SortBy.creationTime],
      mediaType: [MediaLibrary.MediaType.photo],
    });
    setAssets(fetchedAssets);

    // Check DB for existing summaries
    const dbSummaries: Record<string, ScreenshotEntry> = {};
    const allStored = getScreenshots();
    allStored.forEach(entry => {
      dbSummaries[entry.id] = entry;
    });
    setSummaries(dbSummaries);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [permissionResponse])
  );

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleSummarize = async (asset: MediaLibrary.Asset) => {
    setLoadingIds(prev => new Set(prev).add(asset.id));
    
    try {
      // 1. Prepare file path (copy to cache if needed to ensure access)
      const fileName = asset.filename || `screenshot_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Always copy to ensure we have a stable local file for the model
      const fileInfo = await FileSystem.getInfoAsync(localUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      }
      
      await FileSystem.copyAsync({
          from: asset.uri,
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
      
      // 4. Update State
      setSummaries(prev => ({ ...prev, [asset.id]: newEntry }));
    } catch (error) {
      console.error("Summarization failed:", error);
      Alert.alert("Error", "Failed to summarize image.");
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });
    }
  };

  const renderItem = ({ item }: { item: MediaLibrary.Asset }) => {
    const isExpanded = expandedIds.has(item.id);
    const summaryEntry = summaries[item.id];
    const isLoading = loadingIds.has(item.id);

    return (
      <ThemedView style={styles.card}>
        <TouchableOpacity onPress={() => toggleExpand(item.id)} activeOpacity={0.8}>
          <Image source={{ uri: item.uri }} style={styles.image} contentFit="cover" />
        </TouchableOpacity>

        {isExpanded && (
          <ThemedView style={styles.detailsContainer}>
            <View style={styles.metaRow}>
              <ThemedText style={styles.dateText}>
                {new Date(item.creationTime).toLocaleDateString()}
              </ThemedText>
              {summaryEntry && (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>Smart Summary</ThemedText>
                </View>
              )}
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0a7ea4" />
                <ThemedText style={styles.loadingText}>Analyzing screenshot...</ThemedText>
              </View>
            ) : summaryEntry ? (
              <ThemedText style={styles.summaryText}>{summaryEntry.summary}</ThemedText>
            ) : (
              <TouchableOpacity 
                style={styles.summarizeButton} 
                onPress={() => handleSummarize(item)}
              >
                <IconSymbol name="sparkles" size={20} color="white" />
                <ThemedText style={styles.buttonText}>Summarize with AI</ThemedText>
              </TouchableOpacity>
            )}
          </ThemedView>
        )}
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
       <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Smart Gallery</ThemedText>
       </View>
      <FlatList
        data={assets}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: Fonts.rounded,
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333', // Subtle border for dark mode contrast
  },
  image: {
    width: '100%',
    height: 200,
  },
  detailsContainer: {
    padding: 16,
    backgroundColor: 'rgba(50, 50, 50, 0.3)', // Slightly lighter background for details
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  badge: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    color: 'white',
    fontWeight: 'bold',
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
  },
  summarizeButton: {
    backgroundColor: '#0a7ea4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.8,
  }
});