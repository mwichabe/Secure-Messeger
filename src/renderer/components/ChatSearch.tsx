import React, { useState, useCallback } from 'react';

interface ChatSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

const ChatSearch: React.FC<ChatSearchProps> = ({ 
  onSearch, 
  placeholder = "Search conversations..." 
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch(value);
  }, [onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <div className={`chat-search ${isFocused ? 'focused' : ''}`}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="search-input"
        />
        {query && (
          <button onClick={handleClear} className="search-clear">
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatSearch;
