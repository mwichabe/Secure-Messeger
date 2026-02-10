import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FixedSizeList as List } from 'react-window';
import { RootState } from '../store';
import { fetchChats, selectChat, markChatAsRead } from '../store/chatSlice';
import { addMessage } from '../store/messageSlice';
import { Chat, Message } from '../../types';
import { AppDispatch } from '../store';
import ChatSearch from './ChatSearch';

interface ChatItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    chats: Chat[];
    selectedChatId: string | null;
    onSelectChat: (chatId: string) => void;
  };
}

const ChatItem: React.FC<ChatItemProps> = React.memo(({ index, style, data }) => {
  const chat = data.chats[index];
  const isSelected = chat.id === data.selectedChatId;
  const dispatch = useDispatch<AppDispatch>();

  const formatTimestamp = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  }, []);

  const getChatPreview = useCallback((chat: Chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    return chat.lastMessage;
  }, []);

  const getParticipants = useCallback((chat: Chat) => {
    if (!chat.participants || chat.participants.trim() === '') {
      const chatNumber = chat.id.replace('chat_', '');
      return `Chat ${chatNumber}`;
    }
    return chat.participants;
  }, []);

  const handleClick = useCallback(() => {
    data.onSelectChat(chat.id);
    if (chat.unreadCount > 0) {
      dispatch(markChatAsRead(chat.id));
    }
  }, [chat.id, chat.unreadCount, data.onSelectChat, dispatch]);

  return (
    <div
      style={style}
      className={`chat-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="chat-item-content">
        <div className="chat-item-header">
          <div className="chat-title">{getParticipants(chat)}</div>
          <div className="chat-timestamp">{formatTimestamp(chat.lastMessageAt)}</div>
        </div>
        <div className="chat-item-preview">
          <div className="chat-preview-text">{getChatPreview(chat)}</div>
          {chat.unreadCount > 0 && (
            <div className="unread-count">{chat.unreadCount}</div>
          )}
        </div>
      </div>
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

const ChatList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { chats, loading, hasMore, offset, limit } = useSelector((state: RootState) => state.chat);
  const selectedChatId = useSelector((state: RootState) => state.chat.selectedChatId);
  const [containerHeight, setContainerHeight] = useState(600);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle real-time message updates
  useEffect(() => {
    const handleMessageUpdate = (event: CustomEvent<Message>) => {
      const message = event.detail;
      dispatch(addMessage(message));
    };

    window.addEventListener('messageUpdate', handleMessageUpdate as EventListener);
    return () => {
      window.removeEventListener('messageUpdate', handleMessageUpdate as EventListener);
    };
  }, [dispatch]);

  // Update container height on window resize and when search changes
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const headerHeight = 80; // Chat list header height
        const searchHeight = 72; 
        const availableHeight = rect.height - headerHeight - searchHeight;
        setContainerHeight(Math.max(200, Math.floor(availableHeight)));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    // Also update height when search query changes
    const timeoutId = setTimeout(updateHeight, 100);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);

  const handleSelectChat = useCallback((chatId: string) => {
    dispatch(selectChat(chatId));
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchChats({ offset: offset + limit, limit }));
    }
  }, [loading, hasMore, offset, limit, dispatch]);

  const handleSearch = useCallback((query: string) => {
    console.log('Search handler called with:', query);
    setSearchQuery(query);
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100 && hasMore && !loading) {
      handleLoadMore();
    }
  }, [hasMore, loading, handleLoadMore]);

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    const query = searchQuery.toLowerCase();
    const filtered = chats.filter(chat => {
      const participantsMatch = chat.participants && chat.participants.toLowerCase().includes(query);
      const lastMessageMatch = chat.lastMessage && chat.lastMessage.toLowerCase().includes(query);
      const titleMatch = chat.title && chat.title.toLowerCase().includes(query);
      return participantsMatch || lastMessageMatch || titleMatch;
    });
    
    console.log('Search query:', query);
    console.log('Original chats:', chats.length);
    console.log('Filtered chats:', filtered.length);
    
    return filtered;
  }, [chats, searchQuery]);

  const itemData = useMemo(() => ({
    chats: filteredChats,
    selectedChatId,
    onSelectChat: handleSelectChat,
  }), [filteredChats, selectedChatId, handleSelectChat]);

  const itemCount = filteredChats.length;

  if (loading && chats.length === 0) {
    return (
      <div className="chat-list">
        <div className="chat-list-header">
          <h2>Chats</h2>
        </div>
        <div className="loading">
          <span>Loading conversations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-list" ref={containerRef}>
      <div className="chat-list-header">
        <h2>Chats {filteredChats.length > 0 && <span className="chat-count">({filteredChats.length})</span>}</h2>
      </div>
      
      <ChatSearch onSearch={handleSearch} placeholder="Search conversations..." />
      
      {filteredChats.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-state-icon">No Results</div>
          <h4>No conversations found</h4>
          <p>Try adjusting your search terms</p>
        </div>
      ) : filteredChats.length === 0 && loading ? (
        <div className="loading">
          <span>Loading conversations...</span>
        </div>
      ) : (
        <div className="chat-list-container">
          <div className="chat-scroll-container" onScroll={handleScroll}>
            <List
              height={containerHeight}
              width={320}
              itemCount={itemCount}
              itemSize={80}
              itemData={itemData}
              overscanCount={5}
              itemKey={(index) => filteredChats[index]?.id || `chat-${index}`}
            >
              {ChatItem}
            </List>
            
            {hasMore && !searchQuery && (
              <div className="load-more">
                <button onClick={handleLoadMore} disabled={loading}>
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;
