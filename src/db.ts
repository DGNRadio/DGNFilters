import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'filters.db');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS filters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT UNIQUE NOT NULL,
    response TEXT NOT NULL,
    is_exact_match BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface Filter {
  id: number;
  keyword: string;
  response: string;
  is_exact_match: boolean;
  created_at: string;
}

export const getFilters = (): Filter[] => {
  return db.prepare('SELECT * FROM filters ORDER BY created_at DESC').all() as Filter[];
};

export const addFilter = (keyword: string, response: string, isExactMatch: boolean = false): Filter => {
  const stmt = db.prepare('INSERT INTO filters (keyword, response, is_exact_match) VALUES (?, ?, ?)');
  const info = stmt.run(keyword.toLowerCase(), response, isExactMatch ? 1 : 0);
  return db.prepare('SELECT * FROM filters WHERE id = ?').get(info.lastInsertRowid) as Filter;
};

export const updateFilter = (id: number, keyword: string, response: string, isExactMatch: boolean = false): Filter => {
  const stmt = db.prepare('UPDATE filters SET keyword = ?, response = ?, is_exact_match = ? WHERE id = ?');
  stmt.run(keyword.toLowerCase(), response, isExactMatch ? 1 : 0, id);
  return db.prepare('SELECT * FROM filters WHERE id = ?').get(id) as Filter;
};

export const deleteFilter = (id: number): void => {
  db.prepare('DELETE FROM filters WHERE id = ?').run(id);
};

export const findMatchingResponse = (messageText: string): string | null => {
  if (!messageText) return null;
  
  const text = messageText.toLowerCase();
  const filters = getFilters();
  
  for (const filter of filters) {
    if (filter.is_exact_match) {
      if (text === filter.keyword) {
        return filter.response;
      }
    } else {
      // Check if the keyword is a standalone word in the message
      // or if it's a command like /keyword
      const regex = new RegExp(`(?:^|\\s)(${filter.keyword})(?:\\s|$)`, 'i');
      if (text.includes(filter.keyword) || regex.test(text)) {
        return filter.response;
      }
    }
  }
  
  return null;
};
