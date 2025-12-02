import { CactusLM, type Message } from 'cactus-react-native';
import * as FileSystem from 'expo-file-system/legacy';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; 
  imageUri?: string; // Legacy
}

const MODEL_SLUG = 'lfm2-vl-450m';

let cactus: CactusLM | null = null;
let isModelLoaded = false;
let isDownloading = false;
let isInitializing = false;

export const initLocalAI = async () => {
  if (isModelLoaded && cactus) return;
  
  if (isDownloading) {
      while (isDownloading) await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (isInitializing) {
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

export const sendChatRequest = async (history: ChatMessage[]): Promise<string> => {
  if (!isModelLoaded || !cactus) await initLocalAI();
  if (!cactus) throw new Error("Cactus failed to initialize");

  try {
    // 1. Sliding Window: Limit history to last 6 turns to save RAM
    const recentHistory = history.slice(0, 6);
    const chronologicalHistory = [...recentHistory].reverse();
    const lastIndex = chronologicalHistory.length - 1;

    const cactusMessages: Message[] = chronologicalHistory.map((msg, index) => {
      // Logic: Only the very last message (Current User Prompt) keeps its images.
      const isCurrentMessage = index === lastIndex;

      let imagesToProcess: string[] = [];
      
      if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
        imagesToProcess = [...msg.images];
      } else if (msg.imageUri) {
        imagesToProcess = [msg.imageUri];
      }

      let finalContent = msg.content || "";
      
      if (isCurrentMessage && imagesToProcess.length > 1) {
        const count = imagesToProcess.length;
        if (!finalContent.toLowerCase().includes("image")) {
           finalContent = `(I have sent ${count} images) ${finalContent}`;
        }
      } 
      if (!finalContent || finalContent.trim() === '') {
        finalContent = imagesToProcess.length > 0 ? "Analyze these images." : "...";
      }

      const formattedMsg: Message = {
        role: msg.role,
        content: finalContent,
      };

      if (isCurrentMessage && imagesToProcess.length > 0) {
        const cleanPaths = imagesToProcess.map(uri => {
            const decoded = decodeURIComponent(uri);
            return decoded.startsWith('file://') ? decoded.slice(7) : decoded;
        });
        formattedMsg.images = cleanPaths;
      } 

      return formattedMsg;
    });

    console.log(`[LocalAI] Sending request. History size: ${cactusMessages.length}`);
    
    if (global.gc) global.gc();

    const result = await cactus.complete({ 
      messages: cactusMessages 
    });

    return result.response || "No response from model.";

  } catch (error) {
    console.error('[LocalAI] Chat Error:', error);
    return "Memory limit reached. Please start a new chat.";
  }
};

export const summarizeImage = async (imagePath: string): Promise<string> => {
    if (!isModelLoaded || !cactus) await initLocalAI();
    if (!cactus) throw new Error("Cactus failed");

    const decodedUri = decodeURIComponent(imagePath);
    const cleanPath = decodedUri.startsWith('file://') ? decodedUri.slice(7) : decodedUri;
    
    // UPDATED PROMPT: Strictly conditional event parsing
    const messages: Message[] = [{
        role: 'user',
        content: `You are an intelligent assistant. Analyze this image.

        1. Provide a concise, natural summary of the visual content.

        2. Check if the image text describes a specific scheduled event (like a meeting, concert, deadline, or party) with a clear Date and Time.

        IF (and only if) a specific date/time is found, append these exact lines at the bottom:
        
        Event Title: [Short Title]
        Event Details: [The Date and Time found] - [Brief Context]

        If no date is found, do NOT add the Event lines.`,
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