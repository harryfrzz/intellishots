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
      
      // 2. Aggregate Images (Prioritize Array)
      if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
        imagesToProcess = [...msg.images];
      } else if (msg.imageUri) {
        imagesToProcess = [msg.imageUri];
      }

      // 3. Prompt Engineering for Multi-Image
      // If we have multiple images, we MUST tell the model they exist in the text.
      let finalContent = msg.content || "";
      
      if (isCurrentMessage && imagesToProcess.length > 1) {
        // Create context string: "Image 1: [Image] Image 2: [Image]" logic is handled by model,
        // but we need to mention it in text for attention.
        const count = imagesToProcess.length;
        if (!finalContent.toLowerCase().includes("image")) {
           finalContent = `(I have sent ${count} images) ${finalContent}`;
        }
      } 
      // Fallback if empty
      if (!finalContent || finalContent.trim() === '') {
        finalContent = imagesToProcess.length > 0 ? "Analyze these images." : "...";
      }

      const formattedMsg: Message = {
        role: msg.role,
        content: finalContent,
      };

      // 4. Attach Images ONLY to current message
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
    const lastMsg = cactusMessages[cactusMessages.length - 1];
    if (lastMsg.images) {
        console.log(`[LocalAI] Current turn processing ${lastMsg.images.length} images.`);
    }

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
    
    // NEW PROMPT: Asks for structured event data
    const messages: Message[] = [{
        role: 'user',
        content: `Analyze this image in detail. 
        
        IMPORTANT: If this image contains a scheduled event, meeting, deadline, or specific time:
        1. Summarize the visual content naturally.
        2. At the very end, add a new line starting with "Event Title:" followed by a short, catchy title (max 5 words).
        3. Add another line starting with "Event Details:" followed by a concise 1-sentence summary of the agenda or context.`,
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