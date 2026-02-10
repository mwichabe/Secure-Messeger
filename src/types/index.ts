export interface Chat {
  id: string;
  title: string;
  participants: string;
  lastMessage: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  ts: number;
  sender: string;
  body: string;
}

export interface WebSocketMessage {
  chatId: string;
  messageId: string;
  ts: number;
  sender: string;
  body: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
}

export interface DatabaseService {
  initializeDatabase(): Promise<void>;
  seedData(): Promise<void>;
  getChats(offset: number, limit: number): Promise<Chat[]>;
  getMessages(chatId: string, offset: number, limit: number): Promise<Message[]>;
  addMessage(message: Omit<Message, 'id'>): Promise<void>;
  searchMessages(chatId: string, query: string, limit: number): Promise<Message[]>;
  markChatAsRead(chatId: string): Promise<void>;
  updateChatLastMessage(chatId: string, ts: number): Promise<void>;
  incrementUnreadCount(chatId: string): Promise<void>;
}

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  limit: number;
  searchResults: Message[];
  searching: boolean;
}
