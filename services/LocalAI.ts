import { CactusLM, type Message } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Shared Interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Supports multiple images
  // Legacy support for single image
  imageUri?: string;
}

const MODEL_SLUG = 'lfm2-vl-450m';

let cactus: CactusLM | null = null;
let isModelLoaded = false;
let isDownloading = false;
let isInitializing = false;

/**
 * Initializes the Cactus Model
 */
export const initLocalAI = async () => {
  if (isModelLoaded && cactus) return;
  
  if (isDownloading) {
      console.log("Download already in progress...");
      while (isDownloading) await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (isInitializing) {
      console.log("Initialization already in progress...");
      while (isInitializing) {
          await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (isModelLoaded && cactus) return;
  }

  try {
    isInitializing = true;
    if (!cactus) cactus = new CactusLM({ model: MODEL_SLUG });

    console.log(`[LocalAI] checking/downloading model: ${MODEL_SLUG}...`);
    isDownloading = true;
    await cactus.download({
      onProgress: (progress) => {
        const percentage = (progress * 100).toFixed(1);
        if (Number(percentage) % 10 === 0) console.log(`[LocalAI] Downloading: ${percentage}%`);
      }
    });
    isDownloading = false;

    console.log('[LocalAI] Initializing model...');
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

/**
 * Handles Multi-turn Chat Requests
 */
export const sendChatRequest = async (history: ChatMessage[]): Promise<string> => {
  if (!isModelLoaded || !cactus) {
    await initLocalAI();
  }

  if (!cactus) throw new Error("Cactus failed to initialize");

  try {
    // 1. Sort history to Oldest -> Newest
    const chronologicalHistory = [...history].reverse();

    const cactusMessages: Message[] = chronologicalHistory.map(msg => {
      // 2. Sanitize Content: Model crashes on empty string
      let safeContent = msg.content;
      if (!safeContent || safeContent.trim() === '') {
        if (msg.images && msg.images.length > 0) {
           safeContent = "Analyze these images"; 
        } else if (msg.imageUri) {
           safeContent = "Analyze this image";
        } else {
           safeContent = "..."; 
        }
      }

      const formattedMsg: Message = {
        role: msg.role,
        content: safeContent,
      };

      // 3. Sanitize Image Paths
      const imagesToProcess: string[] = [];

      // Handle legacy single image
      if (msg.imageUri) imagesToProcess.push(msg.imageUri);
      
      // Handle new multiple images
      if (msg.images && msg.images.length > 0) {
        imagesToProcess.push(...msg.images);
      }

      if (imagesToProcess.length > 0) {
        const cleanPaths = imagesToProcess.map(uri => {
            const decoded = decodeURIComponent(uri);
            return decoded.startsWith('file://') ? decoded.slice(7) : decoded;
        });
        formattedMsg.images = cleanPaths;
      }

      return formattedMsg;
    });

    console.log('[LocalAI] Sending request with', cactusMessages.length, 'messages');

    const result = await cactus.complete({ 
      messages: cactusMessages 
    });

    console.log('[LocalAI] Response received');
    return result.response || "No response from model.";

  } catch (error) {
    console.error('[LocalAI] Chat Error:', error);
    return "I'm having trouble processing that request on-device.";
  }
};

/**
 * Single Image Summary (Used by Image Detail Screen)
 */
export const summarizeImage = async (imagePath: string): Promise<string> => {
    if (!isModelLoaded || !cactus) await initLocalAI();
    if (!cactus) throw new Error("Cactus failed");

    // Sanitize path
    const decodedUri = decodeURIComponent(imagePath);
    const cleanPath = decodedUri.startsWith('file://') ? decodedUri.slice(7) : decodedUri;
    
    const messages: Message[] = [{
        role: 'user',
        content: 'Describe this image details.',
        images: [cleanPath]
    }];
    
    try {
        const result = await cactus.complete({ messages });
        return result.response || "No summary generated.";
    } catch (e) {
        console.error("Summarize Error:", e);
        return "Failed to generate summary.";
    }
};