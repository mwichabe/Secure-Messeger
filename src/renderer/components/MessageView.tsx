import React, { useEffect, useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { fetchMessages, searchMessages, clearMessages, clearSearchResults } from '../store/messageSlice';
import { fetchChats } from '../store/chatSlice';
import { Message } from '../../types';
import { AppDispatch } from '../store';

const MessageView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedChatId } = useSelector((state: RootState) => state.chat);
  const { messages, loading, hasMore, searchResults, searching } = useSelector((state: RootState) => state.message);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (selectedChatId) {
      dispatch(clearMessages());
      dispatch(fetchMessages({ chatId: selectedChatId, offset: 0, limit: 50 }));
    }
  }, [dispatch, selectedChatId]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim() && selectedChatId) {
      dispatch(searchMessages({ chatId: selectedChatId, query: searchQuery.trim(), limit: 50 }));
    } else {
      dispatch(clearSearchResults());
    }
  }, [dispatch, searchQuery, selectedChatId]);

  const handleLoadOlder = useCallback(() => {
    if (selectedChatId && hasMore && !loading) {
      dispatch(fetchMessages({ chatId: selectedChatId, offset: messages.length, limit: 50 }));
    }
  }, [dispatch, selectedChatId, hasMore, loading, messages.length]);

  const handleSeedData = useCallback(async () => {
    setSeeding(true);
    try {
      await window.electronAPI.seedData();
      // Refresh the chat list after seeding
      dispatch(fetchChats({ offset: 0, limit: 50 }));
      // If a chat is selected, refresh its messages
      if (selectedChatId) {
        dispatch(clearMessages());
        dispatch(fetchMessages({ chatId: selectedChatId, offset: 0, limit: 50 }));
      }
    } catch (error) {
      console.error('Failed to seed data:', error);
    } finally {
      setSeeding(false);
    }
  }, [dispatch, selectedChatId]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getMessageClass = (sender: string) => {
    const isOwn = sender === 'You' || sender === 'User';
    return isOwn ? 'own' : 'other';
  };

  if (!selectedChatId) {
    return (
      <div className="message-view">
        <div className="message-header">
          <h3>Welcome to Secure Messenger</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Select a chat from the sidebar to start messaging
          </p>
        </div>
        <div className="message-list">
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h4>No Chat Selected</h4>
            <p>Choose a conversation from the chat list to view messages</p>
            <button 
              className="btn primary" 
              onClick={handleSeedData}
              disabled={seeding}
              style={{ marginTop: '16px' }}
            >
              {seeding ? 'Loading...' : 'Generate Sample Data'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-view">
      <div className="message-header">
        <div>
          <h3>Chat {selectedChatId}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
            {messages.length} messages
          </p>
        </div>
        <div className="message-controls">
          <button 
            className={`btn ${showSearch ? 'primary' : ''}`} 
            onClick={() => setShowSearch(!showSearch)}
          >
            {showSearch ? 'Close' : 'Search'}
          </button>
          <button 
            className="btn primary" 
            onClick={handleSeedData}
            title="Generate sample messages and populate database"
            disabled={seeding}
          >
            {seeding ? 'Loading...' : 'Generate Sample Data'}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="search-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button 
              className="btn btn-search" 
              onClick={handleSearch} 
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? 'Searching' : 'Search'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="search-results">
              <div className="search-results-header">
                <h4>Search Results ({searchResults.length})</h4>
                <button 
                  className="btn btn-compact" 
                  onClick={() => dispatch(clearSearchResults())}
                >
                  Clear
                </button>
              </div>
              <div className="search-results-list">
                {searchResults.map((message: Message) => (
                  <div key={message.id} className="search-result-item">
                    <div className="search-result-header">
                      <span className="search-result-sender">{message.sender}</span>
                      <span className="search-result-time">{formatTimestamp(message.ts)}</span>
                    </div>
                    <div className="search-result-body">{message.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="message-list">
        {loading && messages.length === 0 ? (
          <div className="loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">No Messages</div>
            <h4>No Messages Yet</h4>
            <p>Start a conversation or wait for messages to appear</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="load-more">
                <button onClick={handleLoadOlder} disabled={loading}>
                  {loading ? 'Loading...' : 'Load Older Messages'}
                </button>
              </div>
            )}
            
            <div className="messages-container">
              {messages.map((message: Message) => (
                <div key={message.id} className={`message-item ${getMessageClass(message.sender)}`}>
                  <div className="message-header-info">
                    <span className="message-sender">{message.sender}</span>
                    <span className="message-time">{formatTimestamp(message.ts)}</span>
                  </div>
                  <div className="message-body">{message.body}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageView;
