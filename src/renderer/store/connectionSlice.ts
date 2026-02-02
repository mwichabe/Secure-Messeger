import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ConnectionState } from '../../types';

interface ConnectionStateType {
  state: ConnectionState;
  reconnectAttempts: number;
  lastConnectedAt: number | null;
}

const initialState: ConnectionStateType = {
  state: ConnectionState.DISCONNECTED,
  reconnectAttempts: 0,
  lastConnectedAt: null,
};

const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {
    setConnectionState: (state, action: PayloadAction<ConnectionState>) => {
      state.state = action.payload;
      if (action.payload === ConnectionState.CONNECTED) {
        state.lastConnectedAt = Date.now();
        state.reconnectAttempts = 0;
      }
    },
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },
  },
});

export const { setConnectionState, incrementReconnectAttempts, resetReconnectAttempts } = connectionSlice.actions;
export default connectionSlice.reducer;
