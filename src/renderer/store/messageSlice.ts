import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Message } from '../../types';

interface MessageState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
  searchResults: Message[];
  searching: boolean;
}

const initialState: MessageState = {
  messages: [],
  loading: false,
  error: null,
  hasMore: true,
  offset: 0,
  searchResults: [],
  searching: false,
};

// Async thunks
export const fetchMessages = createAsyncThunk(
  'message/fetchMessages',
  async ({ chatId, offset = 0, limit = 50 }: { chatId: string; offset?: number; limit?: number }) => {
    const result = await window.electronAPI.getMessages(chatId, offset, limit);
    return { messages: result.messages, hasMore: result.hasMore, offset };
  }
);

export const searchMessages = createAsyncThunk(
  'message/searchMessages',
  async ({ chatId, query, limit = 50 }: { chatId: string; query: string; limit?: number }) => {
    const results = await window.electronAPI.searchMessages(chatId, query, limit);
    return results;
  }
);

const messageSlice = createSlice({
  name: 'message',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      // Add new message to the beginning (most recent first)
      state.messages.unshift(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
      state.offset = 0;
      state.hasMore = true;
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.offset === 0) {
          // Initial load or refresh
          state.messages = action.payload.messages;
        } else {
          // Append older messages
          state.messages.push(...action.payload.messages);
        }
        state.hasMore = action.payload.hasMore;
        state.offset = action.payload.offset + action.payload.messages.length;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })
      .addCase(searchMessages.pending, (state) => {
        state.searching = true;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.searching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchMessages.rejected, (state, action) => {
        state.searching = false;
        state.error = action.error.message || 'Search failed';
      });
  },
});

export const { addMessage, clearMessages, clearSearchResults } = messageSlice.actions;
export default messageSlice.reducer;
