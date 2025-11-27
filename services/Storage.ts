import * as SQLite from 'expo-sqlite';

// --- Types ---

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

// Open Database synchronously
const db = SQLite.openDatabaseSync('cactus_app.db');

// --- Initialization ---

export const initDB = () => {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    
    -- Table for Screenshots
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
  db.runSync(
    'INSERT OR REPLACE INTO screenshots (id, localUri, summary, timestamp) VALUES (?, ?, ?, ?)',
    [entry.id, entry.localUri, entry.summary, entry.timestamp]
  );
};

export const getScreenshots = (): ScreenshotEntry[] => {
  return db.getAllSync<ScreenshotEntry>(
    'SELECT * FROM screenshots ORDER BY timestamp DESC'
  );
};

export const getScreenshot = (id: string): ScreenshotEntry | null => {
  return db.getFirstSync<ScreenshotEntry>(
    'SELECT * FROM screenshots WHERE id = ?',
    [id]
  );
};

// ==========================================
// CHAT HISTORY LOGIC
// ==========================================

/**
 * Takes the raw list of messages from the UI, creates a session object,
 * and saves it to SQLite.
 */
export const saveChatSession = (messages: ChatMessage[]) => {
  if (messages.length === 0) return;

  try {
    // 1. Prepare Session Data
    // Messages come in Newest-First from UI, so [0] is the last message sent
    const lastMsg = messages[0]; 
    const firstMsg = messages[messages.length - 1]; 

    const id = Date.now().toString();
    const timestamp = Date.now();
    
    // Generate a title from the first user message
    let title = firstMsg.content.slice(0, 40);
    if (firstMsg.content.length > 40) title += '...';
    if (!title && firstMsg.imageUri) title = 'Image Analysis';

    const lastMessagePreview = lastMsg.content || (lastMsg.imageUri ? 'Image attached' : '...');

    // 2. Insert into SQLite
    // We JSON.stringify the messages array to store it in a TEXT column
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

    console.log("Chat session saved to SQLite.");

  } catch (e) {
    console.error("Failed to save chat session:", e);
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
 * Deletes a specific chat session.
 */
export const deleteChatSession = (id: string) => {
  try {
    db.runSync('DELETE FROM chat_sessions WHERE id = ?', [id]);
  } catch (e) {
    console.error("Failed to delete session:", e);
  }
};

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