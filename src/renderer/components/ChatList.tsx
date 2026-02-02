import React, { useEffect, useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FixedSizeList as List } from 'react-window';
import { RootState } from '../store';
import { fetchChats, selectChat, markChatAsRead } from '../store/chatSlice';
import { Chat } from '../../types';
import { AppDispatch } from '../store';

interface ChatItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    chats: Chat[];
    selectedChatId: string | null;
    onSelectChat: (chatId: string) => void;
  };
}

const ChatItem: React.FC<ChatItemProps> = ({ index, style, data }) => {
  const chat = data.chats[index];
  const isSelected = chat.id === data.selectedChatId;

  const formatTimestamp = (timestamp: number) => {
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
  };

  const getChatPreview = (chat: Chat) => {
    return `Last message ${formatTimestamp(chat.lastMessageAt)}`;
  };

  const handleClick = () => {
    data.onSelectChat(chat.id);
  };

  return (
    <div
      style={style}
      className={`chat-item ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="chat-item-content">
        <div className="chat-item-header">
          <span className="chat-title">{chat.title}</span>
          <span className="chat-timestamp">{formatTimestamp(chat.lastMessageAt)}</span>
        </div>
        <div className="chat-item-preview">
          <span className="chat-preview-text">{getChatPreview(chat)}</span>
          {chat.unreadCount > 0 && (
            <span className="unread-count">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { chats, selectedChatId, loading, hasMore } = useSelector((state: RootState) => state.chat);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (isInitialLoad && chats.length === 0) {
      dispatch(fetchChats({ offset: 0, limit: 50 }));
      setIsInitialLoad(false);
    }
  }, [dispatch, isInitialLoad, chats.length]);

  const handleSelectChat = useCallback((chatId: string) => {
    dispatch(selectChat(chatId));
    dispatch(markChatAsRead(chatId));
  }, [dispatch]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      dispatch(fetchChats({ offset: chats.length, limit: 50 }));
    }
  }, [dispatch, hasMore, loading, chats.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 100) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => (
    <ChatItem
      index={index}
      style={style}
      data={{
        chats,
        selectedChatId,
        onSelectChat: handleSelectChat,
      }}
    />
  ), [chats, selectedChatId, handleSelectChat]);

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
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chats {chats.length > 0 && <span className="chat-count">({chats.length})</span>}</h2>
      </div>
      
      {chats.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">No Chats</div>
          <h4>No Chats Yet</h4>
          <p>Start a conversation to see it here</p>
          <button 
            className="btn primary" 
            onClick={() => window.electronAPI.seedData()}
            style={{ marginTop: '16px' }}
          >
            Seed Data
          </button>
        </div>
      ) : (
        <div className="chat-list-container">
          <div onScroll={handleScroll} className="chat-scroll-container">
            <List
              height={window.innerHeight - 120}
              itemCount={chats.length}
              itemSize={80}
              width="100%"
              overscanCount={5}
            >
              {Row}
            </List>
            
            {hasMore && (
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
