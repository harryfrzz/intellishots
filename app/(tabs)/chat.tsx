import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CustomHeader } from '@/components/CustomHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AlbumWithCover extends MediaLibrary.Album {
  coverUri?: string;
}

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [albums, setAlbums] = useState<AlbumWithCover[]>([]);
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  // Layout calculation for 2 columns
  const SPACING = 16;
  const cardWidth = (width - SPACING * 3) / 2; // (Screen - (Left + Middle + Right padding)) / 2

  useEffect(() => {
    loadAlbums();
  }, [permissionResponse]);

  const loadAlbums = async () => {
    if (permissionResponse?.status !== 'granted') {
      const response = await requestPermission();
      if (response.status !== 'granted') return;
    }

    // 1. Get all albums (Smart albums include 'Recents', 'Favorites', 'Screenshots' on iOS)
    const fetchedAlbums = await MediaLibrary.getAlbumsAsync({
      includeSmartAlbums: true,
    });

    // 2. Filter out empty albums and fetch the first photo of each to use as a cover
    const albumsWithCovers = await Promise.all(
      fetchedAlbums.map(async (album) => {
        if (album.assetCount === 0) return null;

        const { assets } = await MediaLibrary.getAssetsAsync({
          album: album,
          first: 1,
          mediaType: [MediaLibrary.MediaType.photo],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });

        if (assets.length > 0) {
          return { ...album, coverUri: assets[0].uri };
        }
        return null;
      })
    );

    // Remove nulls (empty albums)
    setAlbums(albumsWithCovers.filter((a): a is AlbumWithCover => a !== null));
  };

  const renderAlbumCard = ({ item }: { item: AlbumWithCover }) => (
    <TouchableOpacity
    activeOpacity={0.8}
    style={[styles.card, { width: cardWidth, height: cardWidth }]}
    onPress={() => {
      // Navigate to the dynamic album page
      router.push({
        pathname: "/album/[id]",
        params: { 
          id: item.id, 
          title: item.title 
        }
      });
    }}
  >
      {/* Album Cover */}
      <Image
        source={{ uri: item.coverUri }}
        style={styles.coverImage}
        contentFit="cover"
        transition={200}
      />

      {/* Gradient Overlay for Text Visibility */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
      >
        <View style={styles.textContainer}>
          <Text style={styles.albumTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.albumCount}>
            {item.assetCount} {item.assetCount === 1 ? 'Photo' : 'Photos'}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Library" 
        onSearch={() => {}} // Search functionality optional here
      />
      
      <FlatList
        data={albums}
        renderItem={renderAlbumCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={[
          styles.listContent, 
          { paddingTop: insets.top + 80 }
        ]}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Space for Bottom Tab Bar
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12, // Slightly rounded squares look better
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%', // Cover bottom 40% of the card
    justifyContent: 'flex-end',
    padding: 12,
  },
  textContainer: {
    gap: 4,
  },
  albumTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
  albumCount: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
});