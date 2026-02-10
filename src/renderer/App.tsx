import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Provider } from 'react-redux';
import { store } from './store';
import ChatList from './components/ChatList';
import MessageView from './components/MessageView';
import ConnectionIndicator from './components/ConnectionIndicator';
import ThemeToggle from './components/ThemeToggle';
import LandingPage from './components/LandingPage';
import { fetchChats } from './store/chatSlice';
import { setConnectionState } from './store/connectionSlice';
import { addMessage as addMessageToStore } from './store/messageSlice';
import { incrementUnreadCount } from './store/chatSlice';
import { AppDispatch } from './store';
import { ConnectionState } from '../types';
import './App.css';

const AppContent: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    // Initialize database and load initial data
    const initializeApp = async () => {
      try {
        await window.electronAPI.initializeDatabase();
        // Seed the database with initial data
        await window.electronAPI.seedData();
        dispatch(fetchChats({ offset: 0, limit: 50 }));
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Set up WebSocket message listener
    window.electronAPI.onWebSocketMessage((message) => {
      console.log('New message received:', message);
      // Handle new message - dispatch to store
      dispatch(addMessageToStore(message));
      dispatch(incrementUnreadCount(message.chatId));
      // Create and dispatch custom event for real-time updates
      const event = new CustomEvent('messageUpdate', { detail: message });
      window.dispatchEvent(event);
    });

    // Set up WebSocket state change listener
    window.electronAPI.onWebSocketStateChange((state: string) => {
      dispatch(setConnectionState(state as ConnectionState));
    });

    // Connect to WebSocket
    window.electronAPI.connectWebSocket();

    return () => {
      window.electronAPI.removeAllListeners('ws:message');
      window.electronAPI.removeAllListeners('ws:stateChange');
    };
  }, [dispatch]);

  const handleEnterChat = () => {
    setShowLanding(false);
  };

  if (showLanding) {
    return <LandingPage onEnterChat={handleEnterChat} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Secure Messenger</h1>
        <ThemeToggle className="theme-toggle-header" />
      </header>
      <div className="app-body">
        <ConnectionIndicator />
        <div className="app-content">
          <ChatList />
          <MessageView />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
