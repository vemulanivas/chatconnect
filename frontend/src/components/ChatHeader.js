import React from 'react';

function ChatHeader({
  conversationName,
  conversationAvatar,
  conversationStatus,
  onToggleInfoPanel,
  onStartAudioCall,
  onStartVideoCall,
  onStartScreenShare,
  onToggleGroupCall,
  onToggleSearch,
  onToggleCallHistory,
  isTyping
}) {
  return (
    <header className="chat-header">
      <div className="chat-header-info" onClick={onToggleInfoPanel}>
        <img
          src={conversationAvatar}
          alt={conversationName}
          className="chat-avatar"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationName)}&background=random`;
          }}
        />
        <div className="chat-header-text">
          <h3>{conversationName}</h3>
          <span className="chat-status">
            {isTyping ? (
              <span className="typing-indicator-inline">
                <span className="typing-name">{isTyping}</span>
                <span className="typing-text"> is typing</span>
                <span className="typing-dots">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </span>
              </span>
            ) : conversationStatus}
          </span>
        </div>
      </div>
      <div className="chat-header-actions">
        <button
          className="icon-btn"
          onClick={onStartAudioCall}
          title="Voice Call"
        >
          <i className="fas fa-phone"></i>
        </button>
        <button
          className="icon-btn"
          onClick={onStartVideoCall}
          title="Video Call"
        >
          <i className="fas fa-video"></i>
        </button>
        <button
          className="icon-btn"
          onClick={onStartScreenShare}
          title="Share Screen"
        >
          <i className="fas fa-desktop"></i>
        </button>
        <button
          className="icon-btn"
          onClick={onToggleGroupCall}
          title="Group Call"
        >
          <i className="fas fa-users"></i>
        </button>
        <button
          className="icon-btn"
          onClick={onToggleSearch}
          title="Search Messages"
        >
          <i className="fas fa-search"></i>
        </button>
        <button
          className="icon-btn"
          onClick={onToggleCallHistory}
          title="Call History"
        >
          <i className="fas fa-history"></i>
        </button>
        <button
          className="icon-btn"
          onClick={onToggleInfoPanel}
          title="Menu"
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>
      </div>
    </header>
  );
}

export default ChatHeader;
