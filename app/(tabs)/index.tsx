import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity, useWindowDimensions, ScrollView, Text } from 'react-native';
import React, { useState, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';

import { getScreenshots, ScreenshotEntry } from '@/services/Storage';
import { CustomHeader } from '@/components/CustomHeader';

export default function GalleryScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [summaries, setSummaries] = useState<ScreenshotEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const { width } = useWindowDimensions();

  // Calculate column width (subtracting padding)
  const columnWidth = (width - 48) / 2; 

  const loadData = async () => {
    if (permissionResponse?.status !== 'granted') {
      const response = await requestPermission();
      if (response.status !== 'granted') return;
    }

    const { assets: fetchedAssets } = await MediaLibrary.getAssetsAsync({
      first: 50,
      sortBy: [MediaLibrary.SortBy.creationTime],
      mediaType: [MediaLibrary.MediaType.photo],
    });
    setAssets(fetchedAssets);

    // Load summaries
    try {
      const storedSummaries = getScreenshots();
      setSummaries(storedSummaries);
    } catch (e) {
      console.error("Failed to load summaries", e);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [permissionResponse])
  );

  const displayedAssets = useMemo(() => {
    let filtered = assets;

    // 1. Search Filtering
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      // Filter based on whether a summary exists and matches the query
      // This is a join operation in memory basically
      const matchedIds = new Set(summaries.filter(s => 
        s.summary && s.summary.toLowerCase().includes(lowerQuery)
      ).map(s => s.id));
      
      // Also potentially filter by existing assets if we just want to search filenames? 
      // For now, let's assume search is mainly for summaries or filenames.
      filtered = filtered.filter(a => matchedIds.has(a.id));
    }

    // 2. Tag Filtering (Mock logic for now as we don't have real tags in DB yet)
    // In a real app, you'd filter `summaries` based on tag property
    if (selectedTag !== 'All') {
      // Placeholder: If 'Text' is selected, maybe filter for summaries containing "text"?
      // For this demo, we'll just show everything to avoid empty screens, 
      // or you could implement simple logic like:
      // if (selectedTag === 'Screenshots') ...
    }
    
    // Map to displayable format (we use assets directly here)
    return filtered;
  }, [searchQuery, selectedTag, assets, summaries]);

  // Split assets into two columns for masonry effect
  const evenAssets = displayedAssets.filter((_, i) => i % 2 === 0);
  const oddAssets = displayedAssets.filter((_, i) => i % 2 !== 0);

  const renderImageCard = (item: MediaLibrary.Asset) => (
    <TouchableOpacity 
      key={item.id} 
      onPress={() => router.push(`/image/${encodeURIComponent(item.id)}`)}
      activeOpacity={0.8}
      style={styles.cardWrapper}
    >
      <Image 
        source={{ uri: item.uri }} 
        style={[styles.image, { width: columnWidth, height: (columnWidth * item.height) / item.width }]} 
        contentFit="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Gallery"
        onSearch={setSearchQuery}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.masonryContainer}>
          <View style={styles.column}>
            {evenAssets.map(renderImageCard)}
          </View>
          <View style={styles.column}>
            {oddAssets.map(renderImageCard)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Add space for bottom tab bar
    paddingTop: 10,
  },
  masonryContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  column: {
    flex: 1,
    gap: 16,
  },
  cardWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    marginBottom: 16,
  },
  image: {
    backgroundColor: '#333',
  },
});