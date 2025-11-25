import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import React, { useState, useMemo } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import Animated from 'react-native-reanimated'; // 1. Import Reanimated

import { getScreenshots, ScreenshotEntry } from '@/services/Storage';
import { CustomHeader } from '@/components/CustomHeader';

// 2. Create Animated Image Component
const AnimatedImage = Animated.createAnimatedComponent(Image) as React.ComponentType<any>;

export default function GalleryScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [summaries, setSummaries] = useState<ScreenshotEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
  const { width } = useWindowDimensions();

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
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchedIds = new Set(summaries.filter(s => 
        s.summary && s.summary.toLowerCase().includes(lowerQuery)
      ).map(s => s.id));
      filtered = filtered.filter(a => matchedIds.has(a.id));
    }
    return filtered;
  }, [searchQuery, selectedTag, assets, summaries]);

  const evenAssets = displayedAssets.filter((_, i) => i % 2 === 0);
  const oddAssets = displayedAssets.filter((_, i) => i % 2 !== 0);

const renderImageCard = (item: MediaLibrary.Asset) => (
  <TouchableOpacity 
    key={item.id} 
    onPress={() => {
      router.push({
        pathname: "/image/[id]", // <--- FIX: Use the literal route name
        params: { 
          id: item.id,           // <--- FIX: Move the dynamic ID here
          uri: item.uri,
          width: item.width,
          height: item.height
        }
      });
    }}
    activeOpacity={0.8}
    style={styles.cardWrapper}
  >
    <AnimatedImage 
      sharedTransitionTag={`image-${item.id}`}
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
    paddingBottom: 100,
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