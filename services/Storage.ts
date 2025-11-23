import * as SQLite from 'expo-sqlite';

export interface ScreenshotEntry {
  id: string;
  localUri: string;
  summary: string;
  timestamp: number;
}

const db = SQLite.openDatabaseSync('screenshots.db');

export const initDB = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS screenshots (
      id TEXT PRIMARY KEY,
      localUri TEXT NOT NULL,
      summary TEXT,
      timestamp INTEGER
    );
  `);
};

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
