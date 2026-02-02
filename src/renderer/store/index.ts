import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import connectionReducer from './connectionSlice';
import messageReducer from './messageSlice';

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    connection: connectionReducer,
    message: messageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
