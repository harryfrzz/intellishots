import * as SQLite from 'expo-sqlite';

// ==========================================
// TYPES
// ==========================================

export interface ScreenshotEntry {
  id: string;
  localUri: string;
  summary: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // Array of image URIs
  // Legacy support if you haven't migrated DB yet, though 'images' is preferred now
  imageUri?: string; 
}

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: ChatMessage[]; 
  isPinned?: boolean;
}

// ==========================================
// DATABASE SETUP
// ==========================================

// Open Database synchronously
const db = SQLite.openDatabaseSync('cactus_app.db');

export const initDB = () => {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    
    -- Table for Gallery Screenshots/Summaries
    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      localUri TEXT NOT NULL,
      summary TEXT,
      timestamp INTEGER
    );

    -- Table for Chat Sessions
    -- We store the full messages array as a JSON string for simplicity
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT,
      lastMessage TEXT,
      timestamp INTEGER,
      messages TEXT, 
      isPinned INTEGER DEFAULT 0
    );
  `);
};

// ==========================================
// SCREENSHOTS LOGIC
// ==========================================

export const addScreenshot = (entry: ScreenshotEntry) => {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO screenshots (id, localUri, summary, timestamp) VALUES (?, ?, ?, ?)',
      [entry.id, entry.localUri, entry.summary, entry.timestamp]
    );
  } catch (e) {
    console.error("Failed to add screenshot:", e);
  }
};

export const getScreenshots = (): ScreenshotEntry[] => {
  try {
    return db.getAllSync<ScreenshotEntry>(
      'SELECT * FROM screenshots ORDER BY timestamp DESC'
    );
  } catch (e) {
    console.error("Failed to get screenshots:", e);
    return [];
  }
};

export const getScreenshot = (id: string): ScreenshotEntry | null => {
  try {
    return db.getFirstSync<ScreenshotEntry>(
      'SELECT * FROM screenshots WHERE id = ?',
      [id]
    );
  } catch (e) {
    console.error("Failed to get screenshot:", e);
    return null;
  }
};

// ==========================================
// CHAT HISTORY LOGIC
// ==========================================

/**
 * Saves or Updates a chat session.
 * @param messages - The list of messages (Newest first, as coming from UI)
 * @param existingId - (Optional) If provided, updates this specific session. If null, creates new.
 * @returns string - The Session ID used/created.
 */
export const saveChatSession = (messages: ChatMessage[], existingId?: string | null): string | null => {
  if (messages.length === 0) return existingId || null;

  try {
    // Messages come in Newest-First from UI
    const lastMsg = messages[0]; 
    const firstMsg = messages[messages.length - 1]; 

    // Use existing ID if we are continuing a chat, otherwise generate new based on start time
    const id = existingId || Date.now().toString();
    const timestamp = Date.now();
    
    // Generate a title from the first user message
    let title = firstMsg.content.slice(0, 40);
    if (firstMsg.content.length > 40) title += '...';
    
    // Fallback title if content is empty (e.g. image only)
    if ((!title || title.trim() === '') && (firstMsg.images || firstMsg.imageUri)) {
        title = 'Image Analysis';
    } else if (!title || title.trim() === '') {
        title = 'New Chat';
    }

    const lastMessagePreview = lastMsg.content || (lastMsg.images || lastMsg.imageUri ? 'Image attached' : '...');

    db.runSync(
      `INSERT OR REPLACE INTO chat_sessions (id, title, lastMessage, timestamp, messages, isPinned) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id, 
        title, 
        lastMessagePreview, 
        timestamp, 
        JSON.stringify(messages), 
        0 // isPinned = false (0)
      ]
    );

    return id; // Return the ID so the UI can lock onto it

  } catch (e) {
    console.error("Failed to save chat session:", e);
    return existingId || null;
  }
};

/**
 * Retrieves all chat sessions, parsing the JSON string back into objects.
 */
export const getChatHistory = (): ChatSession[] => {
  try {
    const rows = db.getAllSync<{
      id: string;
      title: string;
      lastMessage: string;
      timestamp: number;
      messages: string; // comes out as string
      isPinned: number; // comes out as number
    }>('SELECT * FROM chat_sessions ORDER BY timestamp DESC');

    // Transform database rows back into ChatSession objects
    return rows.map(row => ({
      id: row.id,
      title: row.title,
      lastMessage: row.lastMessage,
      timestamp: row.timestamp,
      messages: JSON.parse(row.messages), // Parse the JSON string
      isPinned: row.isPinned === 1
    }));

  } catch (e) {
    console.error("Failed to fetch chat history:", e);
    return [];
  }
};

/**
 * Retrieves a single chat session by ID.
 */
export const getChatSession = (id: string): ChatSession | null => {
  try {
    const row = db.getFirstSync<{
      id: string;
      title: string;
      lastMessage: string;
      timestamp: number;
      messages: string;
      isPinned: number;
    }>('SELECT * FROM chat_sessions WHERE id = ?', [id]);

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      lastMessage: row.lastMessage,
      timestamp: row.timestamp,
      messages: JSON.parse(row.messages),
      isPinned: row.isPinned === 1
    };
  } catch (e) {
    console.error("Failed to get chat session:", e);
    return null;
  }
};

/**
 * Deletes a specific chat session.
 */
export const deleteChatSession = (id: string) => {
  try {
    db.runSync('DELETE FROM chat_sessions WHERE id = ?', [id]);
  } catch (e) {
    console.error("Failed to delete session:", e);
  }
};

export const togglePinChatSession = (id: string) => {
  try {
    // 1. Get current status
    const row = db.getFirstSync<{ isPinned: number }>('SELECT isPinned FROM chat_sessions WHERE id = ?', [id]);
    if (!row) return;

    const newStatus = row.isPinned === 1 ? 0 : 1;

    // 2. Update
    db.runSync('UPDATE chat_sessions SET isPinned = ? WHERE id = ?', [newStatus, id]);
    console.log(`Session ${id} pinned status: ${newStatus}`);
  } catch (e) {
    console.error("Failed to toggle pin:", e);
  }
};

/**
 * Deletes multiple sessions at once.
 */
export const deleteBatchChatSessions = (ids: string[]) => {
  if (ids.length === 0) return;
  try {
    // Create placeholders ?,?,? based on array length
    const placeholders = ids.map(() => '?').join(',');
    db.runSync(`DELETE FROM chat_sessions WHERE id IN (${placeholders})`, ids);
    console.log(`Deleted ${ids.length} sessions.`);
  } catch (e) {
    console.error("Failed to batch delete:", e);
  }
};