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
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const DatabaseService_1 = require("../database/DatabaseService");
const WebSocketServer_1 = require("../services/WebSocketServer");
const WebSocketClient_1 = require("../services/WebSocketClient");
const SecurityService_1 = require("../services/SecurityService");
class MessengerApp {
    constructor() {
        this.mainWindow = null;
        this.databaseService = new DatabaseService_1.DatabaseService();
        this.webSocketServer = new WebSocketServer_1.WebSocketServer(8080);
        // Set up WebSocket client
        this.webSocketClient = new WebSocketClient_1.WebSocketClient('ws://localhost:8080', {
            onMessage: this.handleWebSocketMessage.bind(this),
            onConnectionStateChange: this.handleConnectionStateChange.bind(this),
        });
        this.setupIpcHandlers();
    }
    setupIpcHandlers() {
        // Database operations
        electron_1.ipcMain.handle('db:initialize', async () => {
            try {
                await this.databaseService.initializeDatabase();
                return { success: true };
            }
            catch (error) {
                console.error('Failed to initialize database:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        electron_1.ipcMain.handle('db:seed', async () => {
            try {
                await this.databaseService.seedData();
                return { success: true };
            }
            catch (error) {
                console.error('Failed to seed data:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        electron_1.ipcMain.handle('db:getChats', async (_, offset, limit) => {
            try {
                const chats = await this.databaseService.getChats(offset, limit);
                const totalChats = await this.databaseService.getChats(0, Number.MAX_SAFE_INTEGER);
                const hasMore = offset + limit < totalChats.length;
                return { chats, hasMore };
            }
            catch (error) {
                console.error('Failed to get chats:', error);
                throw error;
            }
        });
        electron_1.ipcMain.handle('db:getMessages', async (_, chatId, offset, limit) => {
            try {
                const messages = await this.databaseService.getMessages(chatId, offset, limit);
                const totalMessages = await this.databaseService.getMessages(chatId, 0, Number.MAX_SAFE_INTEGER);
                const hasMore = offset + limit < totalMessages.length;
                return { messages, hasMore };
            }
            catch (error) {
                console.error('Failed to get messages:', error);
                throw error;
            }
        });
        electron_1.ipcMain.handle('db:searchMessages', async (_, chatId, query, limit) => {
            try {
                const messages = await this.databaseService.searchMessages(chatId, query, limit);
                return messages;
            }
            catch (error) {
                console.error('Failed to search messages:', error);
                throw error;
            }
        });
        electron_1.ipcMain.handle('db:markChatAsRead', async (_, chatId) => {
            try {
                await this.databaseService.markChatAsRead(chatId);
                return { success: true };
            }
            catch (error) {
                console.error('Failed to mark chat as read:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        });
        // WebSocket operations
        electron_1.ipcMain.handle('ws:connect', () => {
            this.webSocketClient.connect();
        });
        electron_1.ipcMain.handle('ws:disconnect', () => {
            this.webSocketClient.disconnect();
        });
        electron_1.ipcMain.handle('ws:getState', () => {
            return {
                state: this.webSocketClient.getConnectionState(),
                reconnectAttempts: this.webSocketClient.getReconnectAttempts(),
            };
        });
        electron_1.ipcMain.handle('ws:simulateDrop', () => {
            this.webSocketServer.simulateConnectionDrop();
        });
        // Security operations
        electron_1.ipcMain.handle('security:encrypt', (_, data) => {
            return SecurityService_1.securityService.encrypt(data);
        });
        electron_1.ipcMain.handle('security:decrypt', (_, encryptedData) => {
            return SecurityService_1.securityService.decrypt(encryptedData);
        });
    }
    async handleWebSocketMessage(message) {
        try {
            // Validate message integrity
            if (!SecurityService_1.securityService.validateMessageIntegrity(message)) {
                console.error('Invalid message received:', SecurityService_1.securityService.sanitizeForLogging(message));
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
            console.log('New message processed:', SecurityService_1.securityService.sanitizeForLogging({
                chatId: message.chatId,
                messageId: message.messageId,
                ts: message.ts,
                sender: message.sender,
            }));
        }
        catch (error) {
            console.error('Failed to handle WebSocket message:', error);
        }
    }
    handleConnectionStateChange(state) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('ws:stateChange', state);
        }
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js'),
            },
        });
        // Load the app
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.loadURL('http://localhost:3000');
        }
        else {
            this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
        }
    }
    async initialize() {
        await electron_1.app.whenReady();
        // Initialize database
        await this.databaseService.initializeDatabase();
        // Start WebSocket server
        await this.webSocketServer.start();
        // Connect WebSocket client
        this.webSocketClient.connect();
        // Create main window
        this.createWindow();
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.cleanup();
                electron_1.app.quit();
            }
        });
        electron_1.app.on('activate', () => {
            if (electron_1.BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });
    }
    cleanup() {
        this.webSocketClient.disconnect();
        this.webSocketServer.stop();
        this.databaseService.close();
    }
}
// Create and initialize the app
const messengerApp = new MessengerApp();
messengerApp.initialize().catch(console.error);
