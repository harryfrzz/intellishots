import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions, Pressable, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator'; // 1. Import ImageManipulator
import Markdown from 'react-native-markdown-display';
import Animated, { 
  SlideInDown, 
  SlideOutDown, 
  useAnimatedStyle, 
  withTiming, 
  Easing,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation
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

export default function ImageDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { id, uri } = useLocalSearchParams<{ id: string; uri: string }>();
  
  const [asset, setAsset] = useState<MediaLibrary.AssetInfo | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // --- Gesture Shared Values ---
  const translationY = useSharedValue(0);
  const translationX = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDragging = useSharedValue(false);

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

  const handleGenerateSummary = async () => {
    setIsSheetOpen(true);
    setShowControls(false); 

    if (summary) return;

    const currentUri = asset?.uri || uri;
    if (!currentUri) return;
    
    setLoading(true);
    try {
      // 2. Compress & Resize using ImageManipulator
      // Resize to 512px for optimal balance of speed/quality for VLM
      const result = await ImageManipulator.manipulateAsync(
        currentUri,
        [{ resize: { width: 512 } }], 
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const localUri = result.uri;

      // Pass the smaller, compressed image to the AI
      const generatedSummary = await summarizeImage(localUri);
      setSummary(generatedSummary);

      addScreenshot({
        id: id,
        localUri: localUri, // Storing the cached small version is efficient
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

  const closeSheet = () => {
    setIsSheetOpen(false);
    setShowControls(true);
  };

  const toggleControls = () => {
    if (!isSheetOpen && !isDragging.value) {
        setShowControls(prev => !prev);
    } else if (isSheetOpen) {
        closeSheet();
    }
  };

  // --- Gesture Logic ---
  const panGesture = Gesture.Pan()
    .enabled(!isSheetOpen)
    .onUpdate((e) => {
      translationX.value = e.translationX;
      translationY.value = e.translationY;
      isDragging.value = true;
      
      scale.value = interpolate(
        Math.abs(e.translationY),
        [0, SCREEN_HEIGHT],
        [1, 0.5],
        Extrapolation.CLAMP
      );
    })
    .onEnd((e) => {
      isDragging.value = false;
      if (Math.abs(e.translationY) > 100 || Math.abs(e.velocityY) > 500) {
        runOnJS(router.back)();
      } else {
        translationX.value = withSpring(0);
        translationY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  // --- Animations ---
  const imageAnimatedStyle = useAnimatedStyle(() => {
    const translateY = isDragging.value 
        ? translationY.value 
        : withTiming(isSheetOpen ? -SCREEN_HEIGHT * 0.25 : 0, { duration: 400 });
    
    const currentScale = isDragging.value
        ? scale.value
        : withTiming(isSheetOpen ? 0.9 : 1, { duration: 400 });

    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translateY },
        { scale: currentScale }
      ],
      borderRadius: isDragging.value ? 20 : 0, 
      overflow: 'hidden'
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translationY.value),
      [0, 200],
      [1, 0],
      Extrapolation.CLAMP
    );
    return {
      backgroundColor: `rgba(0,0,0,${opacity})`
    };
  });

  const controlsStyle = useAnimatedStyle(() => {
    const opacity = isDragging.value 
        ? withTiming(0, { duration: 100 }) 
        : withTiming(showControls ? 1 : 0, { duration: 300 });

    return {
      opacity,
      transform: [{
        translateY: withTiming(showControls ? 0 : 20, { duration: 300 })
      }],
      pointerEvents: showControls && !isDragging.value ? 'auto' : 'none', 
    };
  });

  if (!uri && !asset) return <View style={styles.container} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View style={[styles.container, containerStyle]}>
        <Stack.Screen options={{ headerShown: false }} />

        <GestureDetector gesture={panGesture}>
          <AnimatedPressable 
            style={[styles.imageWrapper, imageAnimatedStyle]} 
            onPress={toggleControls}
          >
            <AnimatedImage
              sharedTransitionTag={`image-${id}`}
              source={{ uri: uri || asset?.uri }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          </AnimatedPressable>
        </GestureDetector>

        <Animated.View style={[styles.headerOverlay, { paddingTop: insets.top }, controlsStyle]}>
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <IconSymbol name="chevron.left" size={28} color="#fff" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.floatingBarWrapper, { bottom: insets.bottom + 10 }, controlsStyle]}>
          <BlurView intensity={80} tint="dark" style={styles.floatingBarContent}>
            
            <TouchableOpacity style={styles.circleActionBtn}>
              <IconSymbol name="trash" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleActionBtn}>
              <IconSymbol name="info.circle" size={22} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.heroBtn} onPress={handleGenerateSummary}>
              <IconSymbol name="sparkles" size={18} color="#fff" />
              <Text style={styles.heroBtnText}>Summarize</Text>
            </TouchableOpacity>

          </BlurView>
        </Animated.View>

        {isSheetOpen && (
          <>
            <Pressable style={styles.backdrop} onPress={closeSheet} />
            <Animated.View 
              entering={SlideInDown.springify().damping(40).stiffness(200)} 
              exiting={SlideOutDown}
              style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}
            >
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Image Summary</Text>
                <TouchableOpacity onPress={closeSheet} style={styles.closeSheetBtn}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#555" />
                </TouchableOpacity>
              </View>

              <View style={styles.scrollWrapper}>
                  {loading ? (
                  <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={styles.loadingText}>Analyzing Image...</Text>
                  </View>
                  ) : (
                      <ScrollView 
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={styles.summaryContent}
                      >
                          <Markdown style={markdownStyles}>
                              {summary || "No summary available."}
                          </Markdown>
                      </ScrollView>
                  )}
              </View>
            </Animated.View>
          </>
        )}
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
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
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  floatingBarWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    width: 260, 
    borderRadius: 35,
    overflow: 'hidden', 
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  floatingBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 6, 
    height: 60,
  },
  circleActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', 
  },
  heroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)', 
    gap: 8,
  },
  heroBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 20,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    zIndex: 30,
    height: SCREEN_HEIGHT * 0.55,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#444',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    fontFamily: Fonts.rounded,
  },
  closeSheetBtn: {
    padding: 4,
  },
  scrollWrapper: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
  },
  summaryContent: {
    paddingBottom: 40,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: '#e1e1e1',
    fontSize: 16,
    lineHeight: 24,
  },
  heading1: { color: '#fff', fontWeight: 'bold', marginVertical: 10 },
  heading2: { color: '#fff', fontWeight: 'bold', marginVertical: 8 },
  paragraph: { marginVertical: 8 },
});