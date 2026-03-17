import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

const CustomAudioPlayer = ({ message, toggleAudioPlayback, playingAudioId, waveformHeights, formatDuration, handleAudioEnded, audioRefs }) => {
  const [audioUrl, setAudioUrl] = useState('');

  React.useEffect(() => {
    let objUrl = '';
    async function initAudio() {
      if (message.content && message.content.startsWith('data:audio/')) {
        try {
          // Clean the Data URI header because Chrome fetch strictly rejects multiple semicolons (e.g., ;codecs=opus;base64,)
          const commaIdx = message.content.indexOf(',');
          let header = message.content.substring(0, commaIdx);
          const b64Data = message.content.substring(commaIdx); // keeps the comma

          if (header.includes(';codecs=')) {
            header = header.replace(/;codecs=[^;]+/, '');
          }

          const cleanDataUri = header + b64Data;
          const res = await fetch(cleanDataUri);
          const blob = await res.blob();

          if (blob.size < 50) {
            console.warn("Audio blob is almost empty, might be corrupted");
          }

          objUrl = URL.createObjectURL(blob);
          setAudioUrl(objUrl);
        } catch (e) {
          console.error("Audio Blob creation failed natively:", e);
          setAudioUrl(message.content); // Fallback
        }
      } else {
        setAudioUrl(message.content || '');
      }
    }
    initAudio();
    return () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [message.content]);

  const sourceRef = React.useRef(null);
  const audioCtxRef = React.useRef(null);

  React.useEffect(() => {
    // If another audio starts, pause this one
    if (playingAudioId !== message.id) {
      if (audioRefs.current[message.id]) {
        audioRefs.current[message.id].pause();
      }
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) { }
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch (e) { }
        audioCtxRef.current = null;
      }
    }
  }, [playingAudioId, message.id, audioRefs]);

  // Note: Parent manages playingAudioId via toggleAudioPlayback prop.
  // We intercept the play action locally to apply resilient fallback if it fails.
  const handlePlayClick = async () => {
    if (playingAudioId === message.id) {
      toggleAudioPlayback(null); // signal pause
      return;
    }

    const audio = audioRefs.current[message.id];
    if (!audio) return;

    // Call parent to reset others and set this message to playing
    toggleAudioPlayback(message.id);

    try {
      await audio.play();
    } catch (err) {
      console.warn("HTML5 Audio failed, attempting Web Audio API fallback", err);
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          audioCtxRef.current = ctx;
          const res = await fetch(audioUrl);
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          sourceRef.current = source;

          source.start(0);
          source.onended = () => {
            if (playingAudioId === message.id) {
              toggleAudioPlayback(null);
            }
            try { ctx.close(); } catch (e) { }
          };
          return;
        }
      } catch (fallbackErr) {
        console.error("AudioContext fallback also failed:", fallbackErr);
      }
      console.error("Audio playback completely failed.");
      toggleAudioPlayback(null);
    }
  };

  return (
    <div className="message-audio">
      <div className="audio-player">
        <button
          className="audio-play-btn"
          onClick={handlePlayClick}
        >
          <i className={`fas fa-${playingAudioId === message.id ? 'pause' : 'play'}`}></i>
        </button>
        <div className="audio-waveform">
          <div className="waveform-bars">
            {(waveformHeights[message.id] || Array(20).fill(40)).map((h, i) => (
              <span
                key={i}
                className={`bar ${playingAudioId === message.id ? 'playing' : ''}`}
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 0.05}s`,
                  animationPlayState: playingAudioId === message.id ? 'running' : 'paused'
                }}
              ></span>
            ))}
          </div>
        </div>
        <span className="audio-duration">
          {formatDuration(message.duration || 0)}
        </span>
      </div>
      {audioUrl && (
        <audio
          ref={el => { if (el) audioRefs.current[message.id] = el; }}
          src={audioUrl}
          onEnded={() => handleAudioEnded(message.id)}
          onError={(e) => {
            console.error("HTML5 fallback error tracking");
          }}
          preload="auto"
          style={{ position: 'absolute', width: 0, height: 0, visibility: 'hidden' }}
        />
      )}
      {!audioUrl && message.content && (
        <a href={message.content} download={`audio_${message.id}.webm`} style={{ fontSize: '0.7rem', color: 'red' }}>
          Download (Unsupported Format)
        </a>
      )}
    </div>
  );
};

function ChatMessages({
  messages,
  currentUser,
  users,
  activeConversation,
  onReaction,
  onEditMessage,
  onDeleteMessage,
  onTogglePin,
  onReplyMessage,
  onForwardMessage,
  onBookmarkMessage,
  formatTime,
  formatDate,
  formatFileSize,
  messagesEndRef,
  messagesContainerRef,
  typingUserName,
  typingUserAvatar
}) {
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const audioRefs = React.useRef({});

  // Generate stable waveform bar heights for each audio message (seeded by message ID)
  const waveformHeights = useMemo(() => {
    const heightsMap = {};
    messages.forEach(msg => {
      if (msg.type === 'audio') {
        // Use a simple hash of the message ID to seed pseudo-random heights
        let seed = 0;
        for (let i = 0; i < (msg.id || '').length; i++) {
          seed = ((seed << 5) - seed) + msg.id.charCodeAt(i);
          seed |= 0;
        }
        const bars = [];
        for (let i = 0; i < 20; i++) {
          seed = (seed * 16807 + 12345) & 0x7fffffff;
          bars.push(20 + (seed % 60));
        }
        heightsMap[msg.id] = bars;
      }
    });
    return heightsMap;
  }, [messages]);

  const toggleAudioPlayback = (messageId) => {
    // Only handle high-level state here. Each CustomAudioPlayer binds to this 
    // and naturally pauses via the useEffect hook when playingAudioId changes.
    if (playingAudioId === messageId) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(messageId);
    }
  };

  const handleAudioEnded = (messageId) => {
    setPlayingAudioId(prev => (prev === messageId ? null : prev));
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  return (
    <div className="chat-messages" ref={messagesContainerRef}>
      {messages.length === 0 && (
        <div className="empty-chat">
          <i className="fas fa-comment-dots"></i>
          <p>No messages yet. Start a conversation!</p>
        </div>
      )}

      {messages.map((message, index) => {
        // Skip fully deleted messages - don't render them at all
        if (message.isDeleted) return null;

        const sender = users.find(u => u.id === message.senderId) ||
          { fullName: message.senderName, avatar: message.senderAvatar };
        const isOwnMessage = message.senderId === currentUser?.id;
        const showDateDivider =
          index === 0 ||
          formatDate(messages[index - 1]?.timestamp) !== formatDate(message.timestamp);

        return (
          <React.Fragment key={message.id}>
            {showDateDivider && (
              <div className="date-divider">
                <span>{formatDate(message.timestamp)}</span>
              </div>
            )}
            <div
              id={`msg-${message.id}`}
              className={`message ${isOwnMessage ? 'sent' : 'received'} ${message.type === 'call' ? 'call-message' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {!isOwnMessage && activeConversation?.type === 'channel' && (
                <img
                  src={sender?.avatar}
                  alt={sender?.fullName}
                  className="message-avatar"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sender?.fullName || 'User')}&background=random`;
                  }}
                />
              )}
              <div className="message-content">
                {!isOwnMessage && activeConversation?.type === 'channel' && (
                  <span className="message-sender">{sender?.fullName}</span>
                )}

                <div className="message-bubble">
                  {(() => {
                    const parentId = message.replyToMessageId || message.reply_to_id;
                    if (!parentId) return null;
                    const parentMsg = messages.find(m => String(m.id) === String(parentId));
                    return (
                      <div className="replied-message-preview" 
                        onClick={() => {
                          const el = document.getElementById(`msg-${parentId}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        style={{ 
                          background: isOwnMessage ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)', 
                          padding: '6px 12px', 
                          borderRadius: '8px', 
                          marginBottom: '8px', 
                          borderLeft: '4px solid var(--primary-color)', 
                          fontSize: '0.85em', 
                          opacity: 0.9,
                          cursor: parentMsg ? 'pointer' : 'default',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ fontWeight: '700', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-color)' }}>
                          <i className="fas fa-reply" style={{ fontSize: '0.9em' }}></i>
                          <span>{parentMsg ? (parentMsg.senderId === currentUser?.id ? 'You' : (parentMsg.senderName || users.find(u => u.id === parentMsg.senderId)?.fullName || 'User')) : 'Original Message'}</span>
                        </div>
                        <div style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          color: isOwnMessage ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)',
                          maxHeight: '1.4em'
                        }}>
                          {parentMsg ? (parentMsg.type === 'text' ? parentMsg.content : `[${parentMsg.type.charAt(0).toUpperCase() + parentMsg.type.slice(1)}]`) : 'Message deleted or unavailable'}
                        </div>
                      </div>
                    );
                  })()}

                  {message.type === 'image' ? (
                    <img src={message.content} alt="Shared" className="message-image" />
                  ) : message.type === 'file' ? (
                    <div className="message-file">
                      <div className="file-icon">
                        <i className="fas fa-file"></i>
                      </div>
                      <div className="file-info">
                        <span className="file-name">{message.fileName || 'File'}</span>
                        <span className="file-size">{formatFileSize(message.fileSize || 0)}</span>
                      </div>
                    </div>
                  ) : message.type === 'audio' ? (
                    <CustomAudioPlayer
                      message={message}
                      toggleAudioPlayback={toggleAudioPlayback}
                      playingAudioId={playingAudioId}
                      waveformHeights={waveformHeights}
                      formatDuration={formatDuration}
                      handleAudioEnded={handleAudioEnded}
                      audioRefs={audioRefs}
                    />
                  ) : message.type === 'call' ? (
                    <div className="call-message-bubble-content">
                      <div className="call-icon-circle">
                        <i className={`fas fa-${message.metadata?.callType === 'video' ? 'video' : 'phone-alt'}`}></i>
                      </div>
                      <div className="call-msg-details">
                        <span className="call-msg-title">
                          {(message.metadata?.callType === 'video' || message.content?.toLowerCase().includes('video')) ? '📹 Video Call' : '📞 Audio Call'}
                        </span>
                        <span className="call-msg-meta">
                          {message.metadata?.duration ? formatDuration(message.metadata.duration) : 
                           (message.content?.includes(' - ') ? message.content.split(' - ')[1] : '⚠ Missed')}
                          <span className="call-msg-dot"></span>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="message-text">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="message-footer">
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                  {isOwnMessage && (
                    <span className="message-status" title="Delivered">
                      <i className="fas fa-check-double" style={{ color: message.readBy?.length > 0 ? '#53bdeb' : undefined }}></i>
                      {message.readBy?.length > 0 && <span style={{ fontSize: '0.7em', marginLeft: '3px', opacity: 0.7 }}>Seen</span>}
                    </span>
                  )}
                  {(message.isEdited || message.edited) && <span className="message-edited">edited</span>}
                  {(message.isPinned || message.pinned) && <i className="fas fa-thumbtack" style={{ fontSize: '0.7em', marginLeft: '6px', color: 'var(--primary-color)', opacity: 0.7 }} title="Pinned"></i>}
                  {(message.isBookmarked || message.bookmarked) && <i className="fas fa-bookmark" style={{ fontSize: '0.7em', marginLeft: '4px', color: '#f59e0b', opacity: 0.7 }} title="Bookmarked"></i>}
                </div>

                {message.reactions && message.reactions.length > 0 && (
                  <div className="message-reactions">
                    {message.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        className="reaction"
                        onClick={() => onReaction(message.id, reaction.emoji)}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="message-actions">
                <div className="quick-reactions">
                  {quickReactions.map(emoji => (
                    <button
                      key={emoji}
                      className="quick-reaction-btn"
                      onClick={() => onReaction(message.id, emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <button className="message-action-btn" onClick={() => onReplyMessage(message)} title="Reply">
                  <i className="fas fa-reply"></i>
                </button>
                {onForwardMessage && (
                  <button className="message-action-btn" onClick={() => onForwardMessage(message)} title="Forward">
                    <i className="fas fa-share"></i>
                  </button>
                )}
                <button className="message-action-btn" onClick={() => onTogglePin(message.id)}
                  title={(message.isPinned || message.pinned) ? 'Unpin' : 'Pin'}>
                  <i className={`fas fa-thumbtack ${(message.isPinned || message.pinned) ? 'pinned' : ''}`}></i>
                </button>
                {onBookmarkMessage && (
                  <button className="message-action-btn" onClick={() => onBookmarkMessage(message.id)}
                    title={(message.isBookmarked || message.bookmarked) ? 'Remove Bookmark' : 'Bookmark'}
                    style={(message.isBookmarked || message.bookmarked) ? { color: '#f59e0b' } : {}}>
                    <i className={`fas fa-bookmark`}></i>
                  </button>
                )}
                {isOwnMessage && (
                  <>
                    <button className="message-action-btn" onClick={() => onEditMessage(message)} title="Edit">
                      <i className="fas fa-edit"></i>
                    </button>
                    <button className="message-action-btn" onClick={() => onDeleteMessage(message.id)} title="Delete">
                      <i className="fas fa-trash"></i>
                    </button>
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      {/* Typing indicator bubble - WhatsApp/Teams style */}
      {typingUserName && (
        <div className="message received typing-bubble-container" style={{ animation: 'fadeIn 0.2s ease' }}>
          <img
            src={typingUserAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(typingUserName)}&background=random`}
            alt={typingUserName}
            className="message-avatar"
            style={{ width: '28px', height: '28px', borderRadius: '50%', alignSelf: 'flex-end', marginRight: '8px' }}
          />
          <div className="message-content">
            <div className="message-bubble typing-bubble">
              <div className="typing-bubble-dots">
                <span className="typing-bubble-dot"></span>
                <span className="typing-bubble-dot"></span>
                <span className="typing-bubble-dot"></span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatMessages;