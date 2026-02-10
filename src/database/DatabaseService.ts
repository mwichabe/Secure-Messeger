import Database from 'better-sqlite3';
import { Chat, Message, DatabaseService as IDatabaseService } from '../types';
import * as path from 'path';
import { app } from 'electron';

export class DatabaseService implements IDatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(app.getPath('userData'), 'messenger.db');
  }

  async initializeDatabase(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      
      // Create tables with proper indexes
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          participants TEXT NOT NULL,
          lastMessage TEXT NOT NULL,
          lastMessageAt INTEGER NOT NULL,
          unreadCount INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chatId TEXT NOT NULL,
          ts INTEGER NOT NULL,
          sender TEXT NOT NULL,
          body TEXT NOT NULL,
          encrypted INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
          FOREIGN KEY (chatId) REFERENCES chats (id) ON DELETE CASCADE
        );
        
        -- Enhanced indexes for performance
        CREATE INDEX IF NOT EXISTS idx_chats_lastMessageAt ON chats (lastMessageAt DESC);
        CREATE INDEX IF NOT EXISTS idx_chats_createdAt ON chats (createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_chats_unreadCount ON chats (unreadCount DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_chatId_ts ON messages (chatId, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender);
        CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages (createdAt DESC);
        
        -- Full-text search index for message content
        CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(body, content='messages', tokenize='porter');
        
        -- Trigger to update FTS table
        CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
          INSERT INTO messages_fts(rowid, body) VALUES (new.id, new.body);
        END;
        
        CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
          INSERT INTO messages_fts(messages_fts, body) VALUES ('delete', old.body);
        END;
        
        CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
          INSERT INTO messages_fts(messages_fts, body) VALUES ('delete', old.body);
          INSERT INTO messages_fts(rowid, body) VALUES (new.id, new.body);
        END;
      `);

      // Enable foreign key constraints
      this.db.pragma('foreign_keys = ON');
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async seedData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const transaction = this.db.transaction(() => {
        // Clear existing data
        this.db!.exec('DELETE FROM messages');
        this.db!.exec('DELETE FROM chats');

        // Insert 200 chats
        const chatInsert = this.db!.prepare(`
          INSERT INTO chats (id, title, participants, lastMessage, lastMessageAt, unreadCount) 
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const messageInsert = this.db!.prepare(`
          INSERT INTO messages (id, chatId, ts, sender, body) 
          VALUES (?, ?, ?, ?, ?)
        `);

        const senders = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        const messageTemplates = [
          'Hey there!',
          'How are you doing?',
          'Did you see the news?',
          'Let\'s catch up soon.',
          'That sounds great!',
          'I\'ll get back to you.',
          'Thanks for letting me know.',
          'See you tomorrow!',
          'Have a great day!',
          'What do you think about this?'
        ];

        const now = Date.now();
        
        // Create chats and messages
        for (let i = 0; i < 200; i++) {
          const chatId = `chat_${i}`;
          const chatTitle = `Chat ${i + 1}`;
          const lastMessageAt = now - (i * 1000 * 60); // Spread over time
          const unreadCount = Math.floor(Math.random() * 10);
          
          // Generate random participants (2-3 people per chat)
          const participantCount = 2 + Math.floor(Math.random() * 2);
          const chatParticipants: string[] = [];
          for (let p = 0; p < participantCount; p++) {
            const sender = senders[Math.floor(Math.random() * senders.length)];
            if (!chatParticipants.includes(sender)) {
              chatParticipants.push(sender);
            }
          }
          
          // Get a random message as the last message
          const lastMessageText = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
          
          chatInsert.run(chatId, chatTitle, chatParticipants.join(','), lastMessageText, lastMessageAt, unreadCount);
          
          // Create 100 messages per chat (20,000 total)
          const messageCount = 100;
          for (let j = 0; j < messageCount; j++) {
            const messageId = `msg_${i}_${j}`;
            const messageTs = lastMessageAt - ((messageCount - j) * 1000 * 60 * 5); // 5 min intervals
            const sender = chatParticipants[Math.floor(Math.random() * chatParticipants.length)];
            const body = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
            
            messageInsert.run(messageId, chatId, messageTs, sender, body);
          }
        }
      });

      transaction();
      console.log('Seed data created successfully');
    } catch (error) {
      console.error('Failed to seed data:', error);
      throw error;
    }
  }

  async getChats(offset: number, limit: number): Promise<Chat[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, title, participants, lastMessage, lastMessageAt, unreadCount 
      FROM chats 
      ORDER BY lastMessageAt DESC 
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as Chat[];
    return rows;
  }

  async getMessages(chatId: string, offset: number, limit: number): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT id, chatId, ts, sender, body 
      FROM messages 
      WHERE chatId = ? 
      ORDER BY ts DESC 
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(chatId, limit, offset) as Message[];
    return rows;
  }

  async addMessage(message: Omit<Message, 'id'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, chatId, ts, sender, body) 
      VALUES (?, ?, ?, ?, ?)
    `);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    stmt.run(messageId, message.chatId, message.ts, message.sender, message.body);
  }

  async searchMessages(chatId: string, query: string, limit: number): Promise<Message[]> {
    if (!this.db) throw new Error('Database not initialized');

    // Use full-text search for better performance
    const ftsQuery = this.db.prepare(`
      SELECT m.id, m.chatId, m.ts, m.sender, m.body 
      FROM messages_fts fts
      JOIN messages m ON m.id = messages_fts.rowid
      WHERE m.chatId = ? AND messages_fts MATCH ?
      ORDER BY m.ts DESC
      LIMIT ?
    `);

    const rows = ftsQuery.all(chatId, query, limit) as Message[];
    return rows;
  }

  async markChatAsRead(chatId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE chats 
      SET unreadCount = 0 
      WHERE id = ?
    `);

    stmt.run(chatId);
  }

  async updateChatLastMessage(chatId: string, ts: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE chats 
      SET lastMessageAt = ? 
      WHERE id = ?
    `);

    stmt.run(ts, chatId);
  }

  async incrementUnreadCount(chatId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE chats 
      SET unreadCount = unreadCount + 1 
      WHERE id = ?
    `);

    stmt.run(chatId);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
