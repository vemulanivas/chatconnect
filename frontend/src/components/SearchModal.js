import React, { useState } from 'react';

function SearchModal({ messages, users, onClose, formatTime }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const results = messages.filter(m =>
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-search"></i> Search Messages
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search in conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button className="btn-search" onClick={handleSearch}>
              <i className="fas fa-search"></i>
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="search-results">
              <p className="results-count">{searchResults.length} result(s) found</p>
              <div className="results-list">
                {searchResults.map((result, idx) => {
                  const sender = users.find(u => u.id === result.senderId);
                  return (
                    <div 
                      key={idx} 
                      className="search-result-item"
                    >
                      <img 
                        src={sender?.avatar} 
                        alt="" 
                        className="result-avatar"
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.fullName || 'User')}&background=random`;
                        }}
                      />
                      <div className="result-content">
                        <span className="result-sender">{sender?.fullName}</span>
                        <span className="result-time">{formatTime(result.timestamp)}</span>
                        <p className="result-text">{result.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {searchQuery && searchResults.length === 0 && (
            <div className="no-results">
              <i className="fas fa-search"></i>
              <p>No messages found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
