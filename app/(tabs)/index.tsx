import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity, useWindowDimensions, ScrollView, Platform } from 'react-native';
import React, { useState, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';

import { getScreenshots, ScreenshotEntry } from '@/services/Storage';
import { ExpandableSearchBar } from '@/components/ExpandableSearchBar';

export default function GalleryScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [summaries, setSummaries] = useState<ScreenshotEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
    if (!searchQuery.trim()) return assets;

    const lowerQuery = searchQuery.toLowerCase();
    const filteredSummaries = summaries.filter(s => 
      s.summary && s.summary.toLowerCase().includes(lowerQuery)
    );
    
    // Map ScreenshotEntry to MediaLibrary.Asset shape
    return filteredSummaries.map(s => ({
      id: s.id,
      uri: s.localUri,
      width: 1000, // Default square aspect ratio for search results
      height: 1000,
      creationTime: s.timestamp,
      mediaType: MediaLibrary.MediaType.photo,
      filename: 'screenshot.jpg',
      modificationTime: s.timestamp,
      duration: 0,
      albumId: undefined,
      mediaSubtypes: []
    } as MediaLibrary.Asset));
  }, [searchQuery, assets, summaries]);

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
      <ExpandableSearchBar 
        title="Gallery"
        onChangeText={setSearchQuery}
        onSearch={(text) => console.log('Search triggered:', text)}
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
  },
  image: {
    backgroundColor: '#333',
  },
});
