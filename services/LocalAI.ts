import { CactusLM, type Message } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Use the official slug for the Vision model as per reference
// This ensures the library downloads the correct bundle (likely including projectors if needed)
const MODEL_SLUG = 'lfm2-vl-450m';

let cactus: CactusLM | null = null;
let isModelLoaded = false;
let isDownloading = false;
let isInitializing = false;

export const initLocalAI = async () => {
  if (isModelLoaded && cactus) return;
  
  // Prevent concurrent download triggers
  if (isDownloading) {
      console.log("Download already in progress...");
      while (isDownloading) {
          await new Promise(resolve => setTimeout(resolve, 500));
      }
  }
  
  // Prevent concurrent initialization triggers
  if (isInitializing) {
      console.log("Initialization already in progress...");
      while (isInitializing) {
          await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (isModelLoaded && cactus) return; // Re-check after waiting
  }

  try {
    isInitializing = true;

    if (!cactus) {
      cactus = new CactusLM({ model: MODEL_SLUG });
    }

    console.log(`[LocalAI] checking/downloading model: ${MODEL_SLUG}...`);
    isDownloading = true;
    await cactus.download({
      onProgress: (progress) => {
        const percentage = (progress * 100).toFixed(1);
        console.log(`[LocalAI] Downloading: ${percentage}%`);
      }
    });
    isDownloading = false;
    console.log('[LocalAI] Download complete. Initializing...');

    await cactus.init();
    
    isModelLoaded = true;
    console.log('[LocalAI] Cactus VLM initialized successfully.');

  } catch (error) {
    console.error('[LocalAI] Initialization Failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const summarizeImage = async (imagePath: string): Promise<string> => {
  if (!isModelLoaded || !cactus) {
    await initLocalAI();
  }

  if (!cactus) throw new Error("Cactus failed to initialize");

  try {
    console.log(`[LocalAI] Received image path: ${imagePath}`);
    
    // Validate file existence
    const fileInfo = await FileSystem.getInfoAsync(imagePath);
    if (!fileInfo.exists) {
        console.error(`[LocalAI] Image file not found at: ${imagePath}`);
        return "Error: Image file not found.";
    }
    console.log(`[LocalAI] Image file confirmed. Size: ${fileInfo.size} bytes`);

    // Clean path for native module (often requires stripping file://)
    const cleanPath = imagePath.startsWith('file://') ? imagePath.slice(7) : imagePath;
    console.log(`[LocalAI] Using clean path for inference: ${cleanPath}`);

    const messages: Message[] = [
      {
        role: 'user',
        content: 'Describe the UI elements and content of this screen in detail.',
        images: [cleanPath]
      }
    ];

    console.log('[LocalAI] Generating summary for image...');
    const result = await cactus.complete({ messages });
    
    console.log('[LocalAI] Generation success.');
    if (result && result.response) {
       return result.response;
    }
    
    return "No response generated.";

  } catch (error) {
    console.error('[LocalAI] Error summarizing image:', error);
    return 'Failed to generate summary.';
  }
};
