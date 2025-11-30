import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Optimized resizing for VLM Multi-Image Batching.
 * 
 * Strategy: 
 * 1. 384px is the sweet spot for "SmolVLM" and local models processing multiple files.
 *    It allows the vision encoder to see the image without filling the RAM.
 * 2. 0.6 compression reduces the buffer size passed to the native module.
 */
export const optimizeImageForVLM = async (uri: string): Promise<string> => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 384 } }], // Aggressive resize for batch performance
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error("Failed to resize image:", error);
    return uri; // Fallback to original if fail (risky but better than crashing)
  }
};

/**
 * Resizes an array of images in parallel.
 */
export const optimizeBatchImages = async (uris: string[]): Promise<string[]> => {
  console.log(`[ImageUtils] Optimizing ${uris.length} images...`);
  const promises = uris.map(uri => optimizeImageForVLM(uri));
  return Promise.all(promises);
};