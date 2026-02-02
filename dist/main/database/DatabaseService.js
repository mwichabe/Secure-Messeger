"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
class DatabaseService {
    constructor() {
        this.db = null;
        this.dbPath = path.join(electron_1.app.getPath('userData'), 'messenger.db');
    }
    async initializeDatabase() {
        try {
            this.db = new better_sqlite3_1.default(this.dbPath);
            // Create tables with proper indexes
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          lastMessageAt INTEGER NOT NULL,
          unreadCount INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          chatId TEXT NOT NULL,
          ts INTEGER NOT NULL,
          sender TEXT NOT NULL,
          body TEXT NOT NULL,
          FOREIGN KEY (chatId) REFERENCES chats (id) ON DELETE CASCADE
        );
        
        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_chats_lastMessageAt ON chats (lastMessageAt DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_chatId_ts ON messages (chatId, ts DESC);
        CREATE INDEX IF NOT EXISTS idx_messages_body_fts ON messages (body);
      `);
            // Enable foreign key constraints
            this.db.pragma('foreign_keys = ON');
            console.log('Database initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            throw error;
        }
    }
    async seedData() {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const transaction = this.db.transaction(() => {
                // Clear existing data
                this.db.exec('DELETE FROM messages');
                this.db.exec('DELETE FROM chats');
                // Insert 200 chats
                const chatInsert = this.db.prepare(`
          INSERT INTO chats (id, title, lastMessageAt, unreadCount) 
          VALUES (?, ?, ?, ?)
        `);
                const messageInsert = this.db.prepare(`
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
                    chatInsert.run(chatId, chatTitle, lastMessageAt, unreadCount);
                    // Create 100 messages per chat (20,000 total)
                    const messageCount = 100;
                    for (let j = 0; j < messageCount; j++) {
                        const messageId = `msg_${i}_${j}`;
                        const messageTs = lastMessageAt - ((messageCount - j) * 1000 * 60 * 5); // 5 min intervals
                        const sender = senders[Math.floor(Math.random() * senders.length)];
                        const body = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
                        messageInsert.run(messageId, chatId, messageTs, sender, body);
                    }
                }
            });
            transaction();
            console.log('Seed data created successfully');
        }
        catch (error) {
            console.error('Failed to seed data:', error);
            throw error;
        }
    }
    async getChats(offset, limit) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      SELECT id, title, lastMessageAt, unreadCount 
      FROM chats 
      ORDER BY lastMessageAt DESC 
      LIMIT ? OFFSET ?
    `);
        const rows = stmt.all(limit, offset);
        return rows;
    }
    async getMessages(chatId, offset, limit) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      SELECT id, chatId, ts, sender, body 
      FROM messages 
      WHERE chatId = ? 
      ORDER BY ts DESC 
      LIMIT ? OFFSET ?
    `);
        const rows = stmt.all(chatId, limit, offset);
        return rows;
    }
    async addMessage(message) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      INSERT INTO messages (id, chatId, ts, sender, body) 
      VALUES (?, ?, ?, ?, ?)
    `);
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        stmt.run(messageId, message.chatId, message.ts, message.sender, message.body);
    }
    async searchMessages(chatId, query, limit) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      SELECT id, chatId, ts, sender, body 
      FROM messages 
      WHERE chatId = ? AND body LIKE ? 
      ORDER BY ts DESC 
      LIMIT ?
    `);
        const rows = stmt.all(chatId, `%${query}%`, limit);
        return rows;
    }
    async markChatAsRead(chatId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      UPDATE chats 
      SET unreadCount = 0 
      WHERE id = ?
    `);
        stmt.run(chatId);
    }
    async updateChatLastMessage(chatId, ts) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      UPDATE chats 
      SET lastMessageAt = ? 
      WHERE id = ?
    `);
        stmt.run(ts, chatId);
    }
    async incrementUnreadCount(chatId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const stmt = this.db.prepare(`
      UPDATE chats 
      SET unreadCount = unreadCount + 1 
      WHERE id = ?
    `);
        stmt.run(chatId);
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}
exports.DatabaseService = DatabaseService;
