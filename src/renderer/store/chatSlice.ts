import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Chat } from '../../types';

interface ChatState {
  chats: Chat[];
  selectedChatId: string | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  limit: number;
}

const initialState: ChatState = {
  chats: [],
  selectedChatId: null,
  loading: false,
  error: null,
  hasMore: true,
  offset: 0,
  limit: 50,
};

// Async thunks
export const fetchChats = createAsyncThunk(
  'chat/fetchChats',
  async ({ offset = 0, limit = 50 }: { offset?: number; limit?: number }) => {
    const result = await window.electronAPI.getChats(offset, limit);
    return { chats: result.chats, hasMore: result.hasMore, offset };
  }
);

export const markChatAsRead = createAsyncThunk(
  'chat/markAsRead',
  async (chatId: string) => {
    await window.electronAPI.markChatAsRead(chatId);
    return chatId;
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    selectChat: (state, action: PayloadAction<string>) => {
      state.selectedChatId = action.payload;
    },
    updateChat: (state, action: PayloadAction<Partial<Chat> & { id: string }>) => {
      const index = state.chats.findIndex(chat => chat.id === action.payload.id);
      if (index !== -1) {
        state.chats[index] = { ...state.chats[index], ...action.payload };
      }
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const chat = state.chats.find(c => c.id === action.payload);
      if (chat) {
        chat.unreadCount += 1;
      }
    },
    resetChats: (state) => {
      state.chats = [];
      state.offset = 0;
      state.hasMore = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChats.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.offset === 0) {
          // Initial load or refresh
          state.chats = action.payload.chats;
        } else {
          // Append more chats
          state.chats.push(...action.payload.chats);
        }
        state.hasMore = action.payload.hasMore;
        state.offset = action.payload.offset + action.payload.chats.length;
      })
      .addCase(fetchChats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch chats';
      })
      .addCase(markChatAsRead.fulfilled, (state, action) => {
        const chat = state.chats.find(c => c.id === action.payload);
        if (chat) {
          chat.unreadCount = 0;
        }
      });
  },
});

export const { selectChat, updateChat, incrementUnreadCount, resetChats } = chatSlice.actions;
export default chatSlice.reducer;
