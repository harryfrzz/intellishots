import { Image } from 'expo-image';
import { StyleSheet, View, TouchableOpacity, useWindowDimensions, Text } from 'react-native';
import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import * as MediaLibrary from 'expo-media-library';
import Animated, { useSharedValue, useAnimatedScrollHandler, FadeIn, FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { getScreenshots, ScreenshotEntry } from '@/services/Storage';
import { CustomHeader, Tag } from '@/components/CustomHeader';
import { IconSymbol } from '@/components/ui/icon-symbol';

const AnimatedImage = Animated.createAnimatedComponent(Image) as React.ComponentType<any>;

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [summaries, setSummaries] = useState<ScreenshotEntry[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  // Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('all'); 
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });

  const columnWidth = (width - 48) / 2; 
  const contentTopPadding = insets.top + 100 + 10; 

  useEffect(() => { loadInitialData(); }, [permissionResponse]);

  const loadInitialData = async () => {
    if (permissionResponse?.status !== 'granted') {
      const response = await requestPermission();
      if (response.status !== 'granted') return;
    }
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const tagsData: Tag[] = [
      { id: 'all', title: 'All Photos' }, 
      ...albums.filter(a => a.assetCount > 0).map(a => ({ id: a.id, title: a.title }))
    ];
    setAvailableTags(tagsData);
    loadAssets('all');
    loadSummaries();
  };

  const loadAssets = async (albumId: string) => {
    let fetchOptions: MediaLibrary.AssetsOptions = {
      first: 100,
      sortBy: [MediaLibrary.SortBy.creationTime],
      mediaType: [MediaLibrary.MediaType.photo],
    };
    if (albumId !== 'all') fetchOptions.album = albumId;
    const { assets: fetchedAssets } = await MediaLibrary.getAssetsAsync(fetchOptions);
    setAssets(fetchedAssets);
  };

  const loadSummaries = () => {
    try {
      const storedSummaries = getScreenshots();
      setSummaries(storedSummaries);
    } catch (e) { console.error(e); }
  };

  // --- SELECTION LOGIC ---

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
      if (newSet.size === 0) setIsSelectionMode(false);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const enterSelectionMode = (id: string) => {
    setIsSelectionMode(true);
    const newSet = new Set<string>(); 
    newSet.add(id);
    setSelectedItems(newSet);
  };

  const cancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedItems(new Set());
  };

  const handleAddToChat = () => {
    // 1. Get Selected URIs
    const selectedUris = assets
      .filter(a => selectedItems.has(a.id))
      .map(a => a.uri);

    // 2. Reset Mode
    cancelSelection();

    // 3. Navigate to Chat with Params
    router.push({
      pathname: "/(tabs)/ChatScreen",
      params: { 
        // Pass JSON string of array
        incomingImages: JSON.stringify(selectedUris) 
      }
    });
  };

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
  }, [searchQuery, assets, summaries]);

  const evenAssets = displayedAssets.filter((_, i) => i % 2 === 0);
  const oddAssets = displayedAssets.filter((_, i) => i % 2 !== 0);

  const renderImageCard = (item: MediaLibrary.Asset) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <Animated.View 
        key={item.id} 
        entering={FadeIn.duration(400)} 
        style={{ marginBottom: 16 }}
      >
        <TouchableOpacity 
          onPress={() => {
            if (isSelectionMode) {
              toggleSelection(item.id);
            } else {
              router.push({
                pathname: "/image/[id]",
                params: { id: item.id, uri: item.uri, width: item.width, height: item.height }
              });
            }
          }}
          onLongPress={() => enterSelectionMode(item.id)}
          activeOpacity={0.8}
          style={[
            styles.cardWrapper,
            isSelected && styles.cardSelected // Scale down or border effect
          ]}
        >
          <AnimatedImage 
            sharedTransitionTag={!isSelectionMode ? `image-${item.id}` : undefined} // Disable transition in selection mode
            source={{ uri: item.uri }} 
            style={[
              styles.image, 
              { width: columnWidth, height: (columnWidth * item.height) / item.width },
              isSelected && { opacity: 0.7 } // Dim image when selected
            ]} 
            contentFit="cover"
            transition={500} 
          />
          
          {/* Checkmark Overlay */}
          {isSelectionMode && (
            <View style={styles.selectionOverlay}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <IconSymbol name="checkmark" size={14} color="#000" />}
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader 
        title={isSelectionMode ? `${selectedItems.size} Selected` : "Gallery"}
        onSearch={setSearchQuery}
        scrollY={scrollY}
        tags={isSelectionMode ? [] : availableTags} // Hide tags in selection mode
        selectedTag={selectedTagId}
        onSelectTag={(id) => { setSelectedTagId(id); loadAssets(id); }}
        showSearch={!isSelectionMode}
        // Show Cancel button if selecting
        rightIcon={isSelectionMode ? 'xmark' : undefined}
        onRightPress={cancelSelection}
      />
      
      <Animated.ScrollView 
        onScroll={scrollHandler}
        scrollEventThrottle={16} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: contentTopPadding }]} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masonryContainer}>
          <View style={styles.column}>{evenAssets.map(renderImageCard)}</View>
          <View style={styles.column}>{oddAssets.map(renderImageCard)}</View>
        </View>
      </Animated.ScrollView>

      {/* Floating Context Menu (Add to Chat) */}
      {isSelectionMode && selectedItems.size > 0 && (
        <Animated.View 
          entering={FadeInDown.springify()} 
          exiting={FadeOutDown}
          style={[styles.floatingMenu, { bottom: 100 }]} // Adjust based on tab bar
        >
          <BlurView intensity={90} tint="dark" style={styles.menuBlur}>
            <TouchableOpacity onPress={handleAddToChat} style={styles.menuButton}>
              <IconSymbol name="sparkles" size={20} color="#fff" />
              <Text style={styles.menuText}>Add to Chat ({selectedItems.size})</Text>
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 150 },
  masonryContainer: { flexDirection: 'row', gap: 16 },
  column: { flex: 1, gap: 16 },
  cardWrapper: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#2a2a2a' },
  cardSelected: {
    transform: [{ scale: 0.95 }],
    borderWidth: 2,
    borderColor: '#4facfe',
  },
  image: { backgroundColor: '#333' },
  
  // Selection Styles
  selectionOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },

  // Floating Menu
  floatingMenu: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  menuBlur: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});