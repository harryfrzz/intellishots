import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import Animated, { useSharedValue, useAnimatedScrollHandler, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getScreenshots, ScreenshotEntry } from '@/services/Storage';
import { CustomHeader, Tag } from '@/components/CustomHeader';

const AnimatedImage = Animated.createAnimatedComponent(Image) as React.ComponentType<any>;

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Data State
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [summaries, setSummaries] = useState<ScreenshotEntry[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('all'); 
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  // Scroll State
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const columnWidth = (width - 48) / 2; 
  // Initial top padding: Status Bar + Title (50) + Tags (50) + spacing
  const contentTopPadding = insets.top + 100 + 10; 

  // 1. Initial Load: Permissions & Albums
  useEffect(() => {
    loadInitialData();
  }, [permissionResponse]);

  const loadInitialData = async () => {
    if (permissionResponse?.status !== 'granted') {
      const response = await requestPermission();
      if (response.status !== 'granted') return;
    }

    // Load Smart Albums (Recents, Favorites, Screenshots, etc.)
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    
    // Format them for the header
    const tagsData: Tag[] = [
      { id: 'all', title: 'All Photos' }, // Default tag
      ...albums
        .filter(a => a.assetCount > 0) // Only non-empty albums
        .map(a => ({ id: a.id, title: a.title }))
    ];
    setAvailableTags(tagsData);

    // Initial load of assets (All)
    loadAssets('all');
    loadSummaries();
  };

  // 2. Load Assets Logic
  const loadAssets = async (albumId: string) => {
    let fetchOptions: MediaLibrary.AssetsOptions = {
      first: 100, // Limit for performance
      sortBy: [MediaLibrary.SortBy.creationTime],
      mediaType: [MediaLibrary.MediaType.photo],
    };

    if (albumId !== 'all') {
      fetchOptions.album = albumId;
    }

    const { assets: fetchedAssets } = await MediaLibrary.getAssetsAsync(fetchOptions);
    setAssets(fetchedAssets);
  };

  const loadSummaries = () => {
    try {
      const storedSummaries = getScreenshots();
      setSummaries(storedSummaries);
    } catch (e) { console.error(e); }
  };

  // 3. Handle Tag Selection
  const handleSelectTag = (id: string) => {
    setSelectedTagId(id);
    loadAssets(id);
    // Optional: Scroll to top when filter changes
    // scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // 4. Filtering Logic (Search)
  const displayedAssets = useMemo(() => {
    let filtered = assets;

    // Search Filter
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchedIds = new Set(summaries.filter(s => 
        s.summary && s.summary.toLowerCase().includes(lowerQuery)
      ).map(s => s.id));
      filtered = filtered.filter(a => matchedIds.has(a.id));
    }
    
    return filtered;
  }, [searchQuery, assets, summaries]);

  const evenAssets = displayedAssets.filter((_, i) => i % 2 === 0);
  const oddAssets = displayedAssets.filter((_, i) => i % 2 !== 0);

  const renderImageCard = (item: MediaLibrary.Asset) => (
    <Animated.View 
      key={item.id} 
      entering={FadeIn.duration(400)} // 1. Smooth entry for the card container
      style={{ marginBottom: 16 }}
    >
      <TouchableOpacity 
        onPress={() => {
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
          style={[
            styles.image, 
            { width: columnWidth, height: (columnWidth * item.height) / item.width }
          ]} 
          contentFit="cover"
          transition={500} // 2. Fades the actual image pixels in over 500ms
        />
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="Gallery"
        onSearch={setSearchQuery}
        scrollY={scrollY}
        tags={availableTags}
        selectedTag={selectedTagId}
        onSelectTag={handleSelectTag}
      />
      
      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]} 
        keyboardShouldPersistTaps="handled"
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
        
        {/* Empty State Helper */}
        {displayedAssets.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
                <AnimatedImage 
                  source={{ system: 'photo.on.rectangle.angled' }} // SF Symbol fallback or icon
                  style={{ width: 50, height: 50, opacity: 0.5 }}
                />
            </View>
        )}
      </Animated.ScrollView>
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