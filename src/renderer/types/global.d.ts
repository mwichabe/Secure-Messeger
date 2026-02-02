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

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
