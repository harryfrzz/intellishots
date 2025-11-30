import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import Markdown from 'react-native-markdown-display';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { getScreenshot, addScreenshot } from '@/services/Storage';
import { summarizeImage } from '@/services/LocalAI';
import { Fonts } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const AnimatedImage = Animated.createAnimatedComponent(Image) as React.ComponentType<any>;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap Points
const SNAP_CLOSED = SCREEN_HEIGHT;
const SNAP_INITIAL = SCREEN_HEIGHT * 0.45; 
const SNAP_FULL = SCREEN_HEIGHT * 0.1;

export default function ImageDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, uri } = useLocalSearchParams<{ id: string; uri: string }>();
  
  const [asset, setAsset] = useState<MediaLibrary.AssetInfo | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // --- Animation Values ---
  const translationY = useSharedValue(0);
  const translationX = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDraggingImage = useSharedValue(false);

  const sheetTranslateY = useSharedValue(SNAP_CLOSED);
  const contextSheetY = useSharedValue(0);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
       const assetInfo = await MediaLibrary.getAssetInfoAsync(id);
       setAsset(assetInfo);
       const existing = getScreenshot(id);
       if (existing?.summary) setSummary(existing.summary);
    } catch (e) {
      console.error("Error loading image data", e);
    }
  };

  const handleGenerateSummary = async (force: boolean = false) => {
    openSheet();
    setShowControls(false); 

    if (summary && !force) return;

    const currentUri = asset?.uri || uri;
    if (!currentUri) return;
    
    setLoading(true);
    if (force) setSummary(null);

    try {
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ resize: { width: 512 } }], 
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const localUri = result.uri;
      const generatedSummary = await summarizeImage(localUri);
      setSummary(generatedSummary);

      addScreenshot({
        id: id,
        localUri: localUri,
        summary: generatedSummary,
        timestamp: asset?.creationTime || Date.now(),
      });
    } catch (e) {
      console.error(e);
      setSummary("Failed to generate summary.");
    } finally {
      setLoading(false);
    }
  };

  const openSheet = () => {
    setIsSheetVisible(true);
    sheetTranslateY.value = withTiming(SNAP_INITIAL, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  };

  const closeSheet = () => {
    sheetTranslateY.value = withTiming(SNAP_CLOSED, {
      duration: 300,
      easing: Easing.in(Easing.cubic),
    }, (finished) => {
      if (finished) runOnJS(setIsSheetVisible)(false);
    });
    setShowControls(true);
  };

  const toggleControls = () => {
    if (!isSheetVisible && !isDraggingImage.value) {
        setShowControls(prev => !prev);
    } else if (isSheetVisible) {
        closeSheet();
    }
  };

  // --- Gestures ---
  const imagePanGesture = Gesture.Pan()
    .enabled(!isSheetVisible)
    .onUpdate((e) => {
      translationX.value = e.translationX;
      translationY.value = e.translationY;
      isDraggingImage.value = true;
      scale.value = interpolate(Math.abs(e.translationY), [0, SCREEN_HEIGHT], [1, 0.5], Extrapolation.CLAMP);
    })
    .onEnd((e) => {
      isDraggingImage.value = false;
      if (Math.abs(e.translationY) > 100 || Math.abs(e.velocityY) > 500) {
        runOnJS(router.back)();
      } else {
        translationX.value = withSpring(0);
        translationY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const sheetPanGesture = Gesture.Pan()
    .onStart(() => { contextSheetY.value = sheetTranslateY.value; })
    .onUpdate((e) => {
      let newY = contextSheetY.value + e.translationY;
      if (newY < SNAP_FULL) newY = SNAP_FULL - (SNAP_FULL - newY) * 0.2;
      sheetTranslateY.value = newY;
    })
    .onEnd((e) => {
      if (e.velocityY > 500) {
        runOnJS(closeSheet)();
      } else if (e.velocityY < -500) {
        sheetTranslateY.value = withTiming(SNAP_FULL, { duration: 300, easing: Easing.out(Easing.cubic) });
      } else {
        const currentY = sheetTranslateY.value;
        const distToFull = Math.abs(currentY - SNAP_FULL);
        const distToInitial = Math.abs(currentY - SNAP_INITIAL);
        const distToClosed = Math.abs(currentY - SNAP_CLOSED);

        if (distToClosed < distToInitial && currentY > SNAP_INITIAL + 100) runOnJS(closeSheet)();
        else if (distToFull < distToInitial) sheetTranslateY.value = withTiming(SNAP_FULL, { duration: 300, easing: Easing.out(Easing.cubic) });
        else sheetTranslateY.value = withTiming(SNAP_INITIAL, { duration: 300, easing: Easing.out(Easing.cubic) });
      }
    });

  // --- Animated Styles ---

  const imageAnimatedStyle = useAnimatedStyle(() => {
    // FIX: Removed sheetOffset calculation. 
    // The image now stays at 0 (center) unless dragged by user.
    const translateY = isDraggingImage.value 
        ? translationY.value 
        : withTiming(0, { duration: 200 });
    
    // Scale slightly when sheet opens for effect, or keep 1 to fill screen completely
    const currentScale = isDraggingImage.value
        ? scale.value
        : interpolate(
            sheetTranslateY.value,
            [SNAP_CLOSED, SNAP_INITIAL],
            [1, 0.95], // Subtle scale down (0.95) looks nice, or use 1 for no change
            Extrapolation.CLAMP
          );

    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translateY },
        { scale: currentScale }
      ],
      borderRadius: isDraggingImage.value ? 20 : 0, 
      overflow: 'hidden'
    };
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showControls && !isDraggingImage.value ? 1 : 0, { duration: 200 }),
    transform: [{ translateY: withTiming(showControls ? 0 : 20) }],
    pointerEvents: showControls && !isDraggingImage.value ? 'auto' : 'none', 
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }]
  }));

  if (!uri && !asset) return <View style={styles.container} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* --- Main Image --- */}
        <GestureDetector gesture={imagePanGesture}>
          <AnimatedPressable 
            style={[styles.imageWrapper, imageAnimatedStyle]} 
            onPress={toggleControls}
          >
            <AnimatedImage
              sharedTransitionTag={`image-${id}`}
              source={{ uri: uri || asset?.uri }}
              style={styles.fullScreenImage}
              contentFit="contain" // Ensures image scales properly within screen bounds
            />
          </AnimatedPressable>
        </GestureDetector>

        {/* --- Header --- */}
        <Animated.View style={[styles.headerOverlay, { paddingTop: insets.top }, controlsStyle]}>
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={StyleSheet.absoluteFill} />
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <IconSymbol name="chevron.left" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        {/* --- Action Bar --- */}
        <Animated.View style={[styles.floatingBarWrapper, { bottom: insets.bottom + 10 }, controlsStyle]}>
          <BlurView intensity={80} tint="dark" style={styles.floatingBarContent}>
            <TouchableOpacity style={styles.circleActionBtn}>
              <IconSymbol name="trash" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtn} onPress={() => handleGenerateSummary(false)}>
              <IconSymbol name="sparkles" size={18} color="#fff" />
              <Text style={styles.heroBtnText}>Summarize</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleActionBtn}>
              <IconSymbol name="info.circle" size={22} color="#fff" />
            </TouchableOpacity>
          </BlurView>
        </Animated.View>

        {/* --- Bottom Sheet --- */}
        <GestureDetector gesture={sheetPanGesture}>
          <Animated.View style={[styles.bottomSheet, sheetStyle, { paddingBottom: insets.bottom }]}>
             <View style={styles.sheetHandleArea}>
               <View style={styles.sheetHandle} />
             </View>
             <View style={styles.sheetHeader}>
               <Text style={styles.sheetTitle}>Image Summary</Text>
               <View style={styles.sheetActions}>
                 <TouchableOpacity onPress={() => handleGenerateSummary(true)} style={[styles.headerBtn, { marginRight: 8 }]} disabled={loading}>
                   <IconSymbol name="arrow.clockwise" size={20} color="#fff" />
                 </TouchableOpacity>
                 <TouchableOpacity onPress={closeSheet} style={styles.headerBtn}>
                   <IconSymbol name="xmark.circle.fill" size={24} color="#555" />
                 </TouchableOpacity>
               </View>
             </View>
             <View style={styles.scrollWrapper}>
                {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={styles.loadingText}>Analyzing Image...</Text>
                </View>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.summaryContent}>
                        <Markdown style={markdownStyles}>
                            {summary || "No summary available."}
                        </Markdown>
                    </ScrollView>
                )}
             </View>
          </Animated.View>
        </GestureDetector>

      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageWrapper: {
    flex: 1, // Ensures wrapper fills the container
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT, // FIX: Use full screen height instead of '100%'
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    paddingHorizontal: 20,
    justifyContent: 'center',
    zIndex: 10,
  },
  iconButton: { width: 40, height: 40, justifyContent: 'center' },
  floatingBarWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    width: 260, 
    borderRadius: 35,
    overflow: 'hidden', 
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  floatingBarContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 6, height: 60 },
  circleActionBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 48, paddingHorizontal: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.15)', gap: 8 },
  heroBtnText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.3 },
  
  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    top: 0, 
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    zIndex: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sheetHandleArea: { width: '100%', paddingVertical: 15, alignItems: 'center' },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#444', borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', fontFamily: Fonts.rounded },
  sheetActions: { flexDirection: 'row', alignItems: 'center' },
  headerBtn: { padding: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollWrapper: { flex: 1, marginBottom: 100 },
  loadingContainer: { padding: 40, alignItems: 'center', gap: 16 },
  loadingText: { color: '#aaa', fontSize: 14 },
  summaryContent: { paddingBottom: 40 },
});

const markdownStyles = StyleSheet.create({
  body: { color: '#e1e1e1', fontSize: 16, lineHeight: 24 },
  heading1: { color: '#fff', fontWeight: 'bold', marginVertical: 10 },
  heading2: { color: '#fff', fontWeight: 'bold', marginVertical: 8 },
  paragraph: { marginVertical: 8 },
});