import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
export interface ElectronAPI {
  // Database operations
  initializeDatabase: () => Promise<{ success: boolean; error?: string }>;
  seedData: () => Promise<{ success: boolean; error?: string }>;
  getChats: (offset: number, limit: number) => Promise<{ chats: any[]; hasMore: boolean }>;
  getMessages: (chatId: string, offset: number, limit: number) => Promise<{ messages: any[]; hasMore: boolean }>;
  searchMessages: (chatId: string, query: string, limit: number) => Promise<any[]>;
  markChatAsRead: (chatId: string) => Promise<{ success: boolean; error?: string }>;
  
  // WebSocket operations
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  getWebSocketState: () => Promise<{ state: string; reconnectAttempts: number }>;
  simulateConnectionDrop: () => void;
  
  // Security operations
  encrypt: (data: string) => Promise<string>;
  decrypt: (encryptedData: string) => Promise<string>;
  
  // Event listeners
  onWebSocketMessage: (callback: (message: any) => void) => void;
  onWebSocketStateChange: (callback: (state: string) => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // Database operations
  initializeDatabase: () => ipcRenderer.invoke('db:initialize'),
  seedData: () => ipcRenderer.invoke('db:seed'),
  getChats: (offset, limit) => ipcRenderer.invoke('db:getChats', offset, limit),
  getMessages: (chatId, offset, limit) => ipcRenderer.invoke('db:getMessages', chatId, offset, limit),
  searchMessages: (chatId, query, limit) => ipcRenderer.invoke('db:searchMessages', chatId, query, limit),
  markChatAsRead: (chatId) => ipcRenderer.invoke('db:markChatAsRead', chatId),
  
  // WebSocket operations
  connectWebSocket: () => ipcRenderer.invoke('ws:connect'),
  disconnectWebSocket: () => ipcRenderer.invoke('ws:disconnect'),
  getWebSocketState: () => ipcRenderer.invoke('ws:getState'),
  simulateConnectionDrop: () => ipcRenderer.invoke('ws:simulateDrop'),
  
  // Security operations
  encrypt: (data) => ipcRenderer.invoke('security:encrypt', data),
  decrypt: (encryptedData) => ipcRenderer.invoke('security:decrypt', encryptedData),
  
  // Event listeners
  onWebSocketMessage: (callback) => {
    ipcRenderer.on('ws:message', (_, message) => callback(message));
  },
  onWebSocketStateChange: (callback) => {
    ipcRenderer.on('ws:stateChange', (_, state) => callback(state));
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the renderer process
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
