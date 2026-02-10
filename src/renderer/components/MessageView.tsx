import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { fetchMessages, searchMessages, clearMessages, clearSearchResults, addMessage } from '../store/messageSlice';
import { fetchChats } from '../store/chatSlice';
import { Message } from '../../types';
import { AppDispatch } from '../store';
import './MessageView.css';

const MessageView: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedChatId } = useSelector((state: RootState) => state.chat);
  const { messages, loading, hasMore, searchResults, searching } = useSelector((state: RootState) => state.message);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle real-time message updates
  useEffect(() => {
    const handleMessageUpdate = (event: CustomEvent<Message>) => {
      const message = event.detail;
      
      if (selectedChatId && message.chatId === selectedChatId) {
        dispatch(addMessage(message));
      }
    };

    window.addEventListener('messageUpdate', handleMessageUpdate as EventListener);
    return () => {
      window.removeEventListener('messageUpdate', handleMessageUpdate as EventListener);
    };
  }, [dispatch, selectedChatId]);

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
      dispatch(fetchChats({ offset: 0, limit: 50 }));
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

  const handleSendMessage = useCallback(async () => {
    if (messageInput.trim() && selectedChatId) {
      try {
        // Send message to database via ElectronAPI
        const result = await window.electronAPI.sendMessage(selectedChatId, messageInput.trim());
        
        if (result.success) {
          // Clear input
          setMessageInput('');
          inputRef.current?.focus();
          
          console.log('Message sent successfully:', result.messageId);
        } else {
          console.error('Failed to send message:', result.error);
          // Show error feedback to user
          alert('Failed to send message: ' + (result.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message: ' + (error as Error).message);
      }
    }
  }, [messageInput, selectedChatId]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setMessageInput(prev => prev + `[File: ${file.name}]`);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setAttachedFile(null);
    setMessageInput(prev => prev.replace(/\[File: [^\]]+\]/g, ''));
  }, []);

  const handleFilePickerClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,.pdf,.doc,.docx,.txt';
    input.onchange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        setAttachedFile(file);
        setMessageInput(prev => prev + `[File: ${file.name}]`);
      }
    };
    input.click();
  }, []);

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🙏'];

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getMessageClass = useCallback((sender: string) => {
    return sender === 'You' ? 'own' : 'other';
  }, []);

  if (!selectedChatId) {
    return (
      <div className="message-view">
        <div className="empty-state-container">
          <div className="empty-state-animation">
            <div className="empty-icon-wrapper">
              <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <div className="icon-pulse"></div>
            </div>
            <h2 className="empty-title">Welcome to Secure Messenger</h2>
            <p className="empty-description">
              Select a conversation from the sidebar to start your secure messaging experience
            </p>
            <button 
              className="cta-button"
              onClick={handleSeedData}
              disabled={seeding}
            >
              <span className="button-content">
                {seeding ? (
                  <>
                    <span className="button-spinner"></span>
                    <span>Loading Data...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M2 12h20"></path>
                    </svg>
                    <span>Initialize Database</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-view">
      {/* Header */}
      <div className="message-header-modern">
        <div className="header-info">
          <div className="chat-avatar">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <div className="header-text">
            <h3 className="chat-name">Chat #{selectedChatId.slice(-6)}</h3>
            <p className="chat-status">
              <span className="status-dot"></span>
              <span>{messages.length} messages • Encrypted</span>
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`action-btn ${showSearch ? 'active' : ''}`}
            onClick={() => setShowSearch(!showSearch)}
            title="Search messages"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          <button 
            className="action-btn"
            onClick={handleSeedData}
            disabled={seeding}
            title="Seed database"
          >
            {seeding ? (
              <span className="button-spinner small"></span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Search Panel */}
      {showSearch && (
        <div className="search-panel">
          <div className="search-input-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="search-input-modern"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              autoFocus
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => {
                  setSearchQuery('');
                  dispatch(clearSearchResults());
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
            <button 
              className="search-btn"
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="search-results-modern">
              <div className="results-header">
                <span className="results-count">{searchResults.length} results found</span>
                <button 
                  className="clear-results"
                  onClick={() => {
                    setSearchQuery('');
                    dispatch(clearSearchResults());
                  }}
                >
                  Clear
                </button>
              </div>
              <div className="results-list">
                {searchResults.map((message: Message, index: number) => (
                  <div 
                    key={message.id} 
                    className="result-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="result-header">
                      <span className="result-sender">{message.sender}</span>
                      <span className="result-time">{formatTimestamp(message.ts)}</span>
                    </div>
                    <div className="result-body">{message.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Messages Area */}
      <div className="messages-area">
        {loading && messages.length === 0 ? (
          <div className="loading-container">
            <div className="loading-spinner-modern">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="empty-messages">
            <div className="empty-icon-small">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                <circle cx="9" cy="10" r="1"></circle>
                <circle cx="12" cy="10" r="1"></circle>
                <circle cx="15" cy="10" r="1"></circle>
              </svg>
            </div>
            <h4>No messages yet</h4>
            <p>Start the conversation with a message below</p>
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="load-more-container">
                <button 
                  className="load-more-btn"
                  onClick={handleLoadOlder} 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="button-spinner small"></span>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M19 12l-7 7-7-7"></path>
                      </svg>
                      <span>Load Older Messages</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            <div className="messages-container-modern">
              {messages.map((message: Message, index: number) => (
                <div 
                  key={message.id} 
                  className={`message-bubble ${getMessageClass(message.sender)}`}
                  style={{ animationDelay: `${index * 0.02}s` }}
                >
                  <div className="message-content">
                    <div className="message-meta">
                      <span className="sender-name">{message.sender}</span>
                      <span className="message-timestamp">{formatTimestamp(message.ts)}</span>
                    </div>
                    <div className="message-text">{message.body}</div>
                  </div>
                  <div className="message-tail"></div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* Message Input */}
      {selectedChatId && (
        <div className="message-input-modern">
          <div className="input-wrapper">
            <button className="attach-btn" title="Attach file" onClick={handleFilePickerClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              className="message-input-field-modern"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button 
              className="emoji-btn" 
              title="Add emoji"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                <line x1="15" y1="9" x2="15.01" y2="9"></line>
              </svg>
            </button>
            <button 
              className={`send-btn-modern ${messageInput.trim() ? 'active' : ''}`}
              onClick={handleSendMessage}
              disabled={!messageInput.trim()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 8 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="emoji-picker-overlay" onClick={() => setShowEmojiPicker(false)}>
          <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
            <div className="emoji-picker-header">
              <h4>Choose Emoji</h4>
              <button className="close-emoji" onClick={() => setShowEmojiPicker(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="emoji-grid">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  className="emoji-btn-item"
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File Attachment Display */}
      {attachedFile && (
        <div className="file-attachment">
          <div className="file-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <span className="file-name">{attachedFile.name}</span>
            <span className="file-size">({(attachedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
          <button className="remove-file" onClick={handleRemoveFile}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default MessageView;