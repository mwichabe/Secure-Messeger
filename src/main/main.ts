import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { DatabaseService } from '../database/DatabaseService';
import { WebSocketServer } from '../services/WebSocketServer';
import { WebSocketClient } from '../services/WebSocketClient';
import { securityService } from '../services/SecurityService';
import { WebSocketMessage, ConnectionState } from '../types';

class MessengerApp {
  private mainWindow: BrowserWindow | null = null;
  private databaseService: DatabaseService;
  private webSocketServer: WebSocketServer;
  private webSocketClient: WebSocketClient;

  constructor() {
    this.databaseService = new DatabaseService();
    this.webSocketServer = new WebSocketServer(8080);
    
    // Set up WebSocket client
    this.webSocketClient = new WebSocketClient('ws://localhost:8080', {
      onMessage: this.handleWebSocketMessage.bind(this),
      onConnectionStateChange: this.handleConnectionStateChange.bind(this),
    });

    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Database operations
    ipcMain.handle('db:initialize', async () => {
      try {
        await this.databaseService.initializeDatabase();
        return { success: true };
      } catch (error) {
        console.error('Failed to initialize database:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('db:seed', async () => {
      try {
        await this.databaseService.seedData();
        return { success: true };
      } catch (error) {
        console.error('Failed to seed data:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    ipcMain.handle('db:getChats', async (_, offset: number, limit: number) => {
      try {
        const chats = await this.databaseService.getChats(offset, limit);
        const totalChats = await this.databaseService.getChats(0, Number.MAX_SAFE_INTEGER);
        const hasMore = offset + limit < totalChats.length;
        return { chats, hasMore };
      } catch (error) {
        console.error('Failed to get chats:', error);
        throw error;
      }
    });

    ipcMain.handle('db:getMessages', async (_, chatId: string, offset: number, limit: number) => {
      try {
        const messages = await this.databaseService.getMessages(chatId, offset, limit);
        const totalMessages = await this.databaseService.getMessages(chatId, 0, Number.MAX_SAFE_INTEGER);
        const hasMore = offset + limit < totalMessages.length;
        return { messages, hasMore };
      } catch (error) {
        console.error('Failed to get messages:', error);
        throw error;
      }
    });

    ipcMain.handle('db:searchMessages', async (_, chatId: string, query: string, limit: number) => {
      try {
        const messages = await this.databaseService.searchMessages(chatId, query, limit);
        return messages;
      } catch (error) {
        console.error('Failed to search messages:', error);
        throw error;
      }
    });

    ipcMain.handle('db:markChatAsRead', async (_, chatId: string) => {
      try {
        await this.databaseService.markChatAsRead(chatId);
        return { success: true };
      } catch (error) {
        console.error('Failed to mark chat as read:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    // WebSocket operations
    ipcMain.handle('ws:connect', () => {
      this.webSocketClient.connect();
    });

    ipcMain.handle('ws:disconnect', () => {
      this.webSocketClient.disconnect();
    });

    ipcMain.handle('ws:getState', () => {
      return {
        state: this.webSocketClient.getConnectionState(),
        reconnectAttempts: this.webSocketClient.getReconnectAttempts(),
      };
    });

    ipcMain.handle('ws:simulateDrop', () => {
      this.webSocketServer.simulateConnectionDrop();
    });

    // Security operations
    ipcMain.handle('security:encrypt', (_, data: string) => {
      return securityService.encrypt(data);
    });

    ipcMain.handle('security:decrypt', (_, encryptedData: string) => {
      return securityService.decrypt(encryptedData);
    });
  }

  private async handleWebSocketMessage(message: WebSocketMessage): Promise<void> {
    try {
      // Validate message integrity
      if (!securityService.validateMessageIntegrity(message)) {
        console.error('Invalid message received:', securityService.sanitizeForLogging(message));
        return;
      }

      // Store message in database
      await this.databaseService.addMessage({
        chatId: message.chatId,
        ts: message.ts,
        sender: message.sender,
        body: message.body,
      });

      // Update chat metadata
      await this.databaseService.updateChatLastMessage(message.chatId, message.ts);
      await this.databaseService.incrementUnreadCount(message.chatId);

      // Notify renderer about new message
      if (this.mainWindow) {
        this.mainWindow.webContents.send('ws:message', message);
      }

      console.log('New message processed:', securityService.sanitizeForLogging({
        chatId: message.chatId,
        messageId: message.messageId,
        ts: message.ts,
        sender: message.sender,
      }));

    } catch (error) {
      console.error('Failed to handle WebSocket message:', error);
    }
  }

  private handleConnectionStateChange(state: ConnectionState): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('ws:stateChange', state);
    }
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Load the app
    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadURL('http://localhost:3000');
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      this.mainWindow?.focus();
    });

    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Window finished loading');
    });

    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Window failed to load:', errorCode, errorDescription);
    });
  }

  async initialize(): Promise<void> {
    await app.whenReady();
    
    // Initialize database
    await this.databaseService.initializeDatabase();
    
    // Start WebSocket server
    await this.webSocketServer.start();
    
    // Connect WebSocket client
    this.webSocketClient.connect();
    
    // Create main window
    this.createWindow();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup();
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private cleanup(): void {
    this.webSocketClient.disconnect();
    this.webSocketServer.stop();
    this.databaseService.close();
  }
}

// Create and initialize the app
const messengerApp = new MessengerApp();
messengerApp.initialize().catch(console.error);
