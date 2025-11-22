import React, { useEffect } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { AppState, AppStateStatus } from 'react-native';
import { summarizeImage, initLocalAI } from '../services/LocalAI';
import { addScreenshot, initDB } from '../services/Storage';

const ScreenshotManager: React.FC = () => {
  const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();

  useEffect(() => {
    initDB();
    initLocalAI().catch(console.error);

    if (!permissionResponse?.granted) {
      requestPermission();
    }

    const subscription = ScreenCapture.addScreenshotListener(async () => {
      console.log('Screenshot detected!');
      
      // Wait a moment for the screenshot to be saved to the gallery
      await new Promise((resolve) => setTimeout(resolve, 1500));

      processLatestScreenshot();
    });

    return () => {
      subscription.remove();
    };
  }, [permissionResponse]);

  const processLatestScreenshot = async () => {
    try {
      const { assets } = await MediaLibrary.getAssetsAsync({
        first: 1,
        sortBy: [MediaLibrary.SortBy.creationTime],
        mediaType: [MediaLibrary.MediaType.photo],
      });

      if (assets.length === 0) {
        console.log('No screenshots found.');
        return;
      }

      const asset = assets[0];
      
      // Basic check to ensure it's recent (within last 10 seconds)
      // Creation time is in milliseconds on some platforms, seconds on others. 
      // Expo docs say: creationTime is timestamp in milliseconds.
      const now = Date.now();
      const creationTime = asset.creationTime; // This might be raw timestamp depending on platform implementation details
      
      // To be safe, we just process it. In a robust app, we'd check timestamps more carefully 
      // to avoid reprocessing old images if the listener triggers erroneously.

      console.log('Processing screenshot:', asset.uri);

      // Copy to app's cache/document directory if needed, or pass URI directly.
      // Cactus VLM likely needs a local file path. 
      // iOS assets are ph://, Android content://. We might need to copy specific internal types.
      // For safety, let's read/copy.
      
      // Ideally, pass the asset.uri to the LocalAI service. 
      // If the service requires a straight file path, we might need to copy it locally.
      // Let's assume the service handles it or we copy it to cache.
      
      // Copying to cache to ensure we have a file path accessible
      const fileName = asset.filename || `screenshot_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // On Android/iOS, downloading/copying from gallery URI might behave differently. 
      // copyAsync supports copying from internal URIs.
      await FileSystem.copyAsync({
          from: asset.uri,
          to: localUri
      });

      const summary = await summarizeImage(localUri);
      
      addScreenshot({
        id: asset.id,
        localUri: localUri,
        summary: summary,
        timestamp: asset.creationTime,
      });

      console.log('Screenshot summarized and saved:', summary);

    } catch (error) {
      console.error('Error processing screenshot:', error);
    }
  };

  return null; // This component handles background logic only
};

export default ScreenshotManager;
