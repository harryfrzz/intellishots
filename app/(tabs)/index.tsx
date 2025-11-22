import { Image } from 'expo-image';
import { StyleSheet, View, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import React, { useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';

export default function GalleryScreen() {
  const router = useRouter();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
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
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [permissionResponse])
  );

  // Split assets into two columns for masonry effect
  const evenAssets = assets.filter((_, i) => i % 2 === 0);
  const oddAssets = assets.filter((_, i) => i % 2 !== 0);

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
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>Gallery</ThemedText>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.masonryContainer}>
          <View style={styles.column}>
            {evenAssets.map(renderImageCard)}
          </View>
          <View style={styles.column}>
            {oddAssets.map(renderImageCard)}
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: Fonts.rounded,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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