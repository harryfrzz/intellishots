import { View, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView, Text } from 'react-native';
import React, { useState, useMemo, useEffect } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LinearGradient } from 'expo-linear-gradient';

// Reuse the Animated Image for the Shared Transition to work
const AnimatedImage = Animated.createAnimatedComponent(Image) as React.ComponentType<any>;

export default function AlbumDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, title } = useLocalSearchParams<{ id: string; title: string }>();
  const { width } = useWindowDimensions();
  
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);

  // Calculate layout
  const columnWidth = (width - 48) / 2; 
  const headerHeight = insets.top + 60;
  const contentTopPadding = headerHeight + 10;

  useEffect(() => {
    if (id) {
      loadAlbumAssets();
    }
  }, [id]);

  const loadAlbumAssets = async () => {
    // Fetch assets belonging ONLY to this album ID
    const { assets: fetchedAssets } = await MediaLibrary.getAssetsAsync({
      album: id,
      first: 100, // Adjust limit as needed
      sortBy: [MediaLibrary.SortBy.creationTime],
      mediaType: [MediaLibrary.MediaType.photo],
    });
    setAssets(fetchedAssets);
  };

  // Split into columns for Masonry layout
  const evenAssets = useMemo(() => assets.filter((_, i) => i % 2 === 0), [assets]);
  const oddAssets = useMemo(() => assets.filter((_, i) => i % 2 !== 0), [assets]);

  const renderImageCard = (item: MediaLibrary.Asset) => (
    <TouchableOpacity 
      key={item.id} 
      onPress={() => {
        // Navigate to the existing Image Detail screen
        // The animation will work seamlessly from here too!
        router.push({
          pathname: "/image/[id]",
          params: { 
            id: item.id,
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
        transition={200}
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Hide default header so we can make our own custom one */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header with Back Button */}
      <View style={styles.headerWrapper}>
        <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0)']}
            locations={[0, 1]} 
            style={[styles.gradientHeader, { height: headerHeight, paddingTop: insets.top }]}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Album'}</Text>
            {/* Empty View to balance the title center alignment */}
            <View style={{ width: 40 }} /> 
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]} 
        showsVerticalScrollIndicator={false}
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
  // Header Styles
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  gradientHeader: {
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'flex-start', // Align arrow to left
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    maxWidth: '70%',
  },
  // Grid Styles
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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