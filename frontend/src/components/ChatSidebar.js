import React, { useState } from 'react';

function ChatSidebar({
  currentUser, users, channels, conversations, activeConversation,
  activeTab, setActiveTab, searchQuery, setSearchQuery,
  onUserClick, onChannelClick, onToggleDarkMode, onToggleSettings,
  onToggleCreateChannel, onToggleCallHistory, onToggleBlockedUsers,
  onLogout, darkMode, sidebarOpen, isUserBlocked, isChatMuted,
  getUserById, onDeleteConversation, onDeleteByUser,
  unreadCounts = {}, onAdminPanel,
  callHistory = [], formatDuration, onStartCall,
  remoteTyping = {}
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletedConvIds, setDeletedConvIds] = useState([]);

  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getConversationForUser(userId) {
    return conversations.find(
      c => c.type === 'dm' &&
        c.participants?.some(p => (p?.id || p) === currentUser?.id) &&
        c.participants?.some(p => (p?.id || p) === userId)
    );
  }

  function getSortTime(userId) {
    const conv = getConversationForUser(userId);
    if (!conv || deletedConvIds.includes(conv.id)) return 0;
    const ts = conv.lastMessage?.timestamp || conv.updatedAt || conv.created_at;
    if (!ts) return 0;
    try {
      const fixed = (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+')) ? ts + 'Z' : ts;
      return new Date(fixed).getTime() || 0;
    } catch (e) {
      return 0;
    }
  }

  function getLastMessage(userId) {
    const conv = getConversationForUser(userId);
    if (!conv || deletedConvIds.includes(conv.id)) return null;
    return conv.lastMessage || null;
  }

  function formatTime(ts) {
    if (!ts) return '';
    const fixed = ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z';
    const d = new Date(fixed);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // Check if someone is typing in a conversation
  function getTypingUserName(conversationId) {
    if (!conversationId || !remoteTyping) return null;
    for (const key of Object.keys(remoteTyping)) {
      if (key.startsWith(conversationId + '-') && remoteTyping[key]) {
        const userId = key.substring(conversationId.length + 1);
        if (userId === currentUser?.id) continue; // Skip self
        const user = getUserById(userId);
        return user?.fullName || user?.username || 'Someone';
      }
    }
    return null;
  }

  // Strip markdown formatting for sidebar preview
  function stripMarkdown(text) {
    if (!text) return text;
    return text
      .replace(/```[\s\S]*?```/g, '[code]')   // code blocks
      .replace(/`([^`]+)`/g, '$1')             // inline code
      .replace(/\*\*(.+?)\*\*/g, '$1')         // bold
      .replace(/~~(.+?)~~/g, '$1')             // strikethrough
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1') // italic
      .replace(/^>\s?/gm, '')                  // blockquote
      .replace(/^- /gm, '• ')                  // bullet list → bullet dot
      .replace(/\n+/g, ' ')                    // newlines → space
      .trim();
  }

  // Total unread across all DMs (for tab badge)
  const totalDmUnread = users
    .filter(u => u.id !== currentUser?.id && !isUserBlocked(u.id))
    .reduce((sum, u) => {
      const conv = getConversationForUser(u.id);
      return sum + (conv ? (unreadCounts[conv.id] || 0) : 0);
    }, 0);

  // Total unread across all groups (for tab badge)
  const totalGroupUnread = channels.reduce((sum, ch) => sum + (unreadCounts[ch.id] || 0), 0);

  // ── Filtered + sorted lists ──────────────────────────────────────────────

  const filteredUsers = users
    .filter(u => u.id !== currentUser?.id)
    .filter(u => !isUserBlocked(u.id))
    .filter(u => u.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => getSortTime(b.id) - getSortTime(a.id));

  const filteredChannels = channels
    .filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const getTs = (conv) => {
        const ts = conv.lastMessage?.timestamp || conv.updatedAt || conv.created_at;
        if (!ts) return 0;
        const fixed = (typeof ts === 'string' && !ts.endsWith('Z') && !ts.includes('+')) ? ts + 'Z' : ts;
        return new Date(fixed).getTime() || 0;
      };
      return getTs(b) - getTs(a);
    });

  // ── Context menu handlers ────────────────────────────────────────────────

  function handleRightClick(e, user) {
    e.preventDefault();
    e.stopPropagation();
    const conv = getConversationForUser(user.id);
    setContextMenu({ x: e.clientX, y: e.clientY, user, convId: conv?.id });
  }

  function confirmDeleteChat() {
    if (!contextMenu) return;
    const { convId, user } = contextMenu;
    if (convId) {
      setDeletedConvIds(prev => [...prev, convId]);
      onDeleteConversation && onDeleteConversation(convId);
    } else {
      onDeleteByUser && onDeleteByUser(user.id);
    }
    setContextMenu(null);
    setConfirmDelete(false);
  }

  function cancelDelete() {
    setConfirmDelete(false);
    setContextMenu(null);
  }

  // ── Badge component ──────────────────────────────────────────────────────

  function UnreadBadge({ count, muted = false }) {
    if (!count || count === 0) return null;
    return (
      <span style={{
        background: muted ? 'var(--text-secondary)' : '#25d366',
        color: '#fff',
        borderRadius: '12px',
        padding: '2px 6px',
        fontSize: '11px',
        fontWeight: 700,
        minWidth: '20px',
        height: '20px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        flexShrink: 0,
      }}>
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  // ── Tab badge (small dot or count on tab itself) ──────────────────────────

  function TabBadge({ count }) {
    if (!count) return null;
    return (
      <span style={{
        background: '#25d366',
        color: '#fff',
        borderRadius: '10px',
        padding: '1px 5px',
        fontSize: '10px',
        fontWeight: 700,
        minWidth: '16px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: '4px',
        lineHeight: 1.2,
      }}>
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className={`chat-sidebar ${sidebarOpen ? 'active' : ''}`}>
      <div className="sidebar-header">
        <div className="user-profile">
          <img src={currentUser?.avatar} alt="Profile" className="profile-avatar" />
          <div className="user-info">
            <h3>{currentUser?.fullName}</h3>
            <span className={`status-indicator ${currentUser?.status}`}>{currentUser?.status}</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleDarkMode} title="Toggle Dark Mode">
            <i className={`fas fa-${darkMode ? 'sun' : 'moon'}`}></i>
          </button>
          <button className="icon-btn" onClick={onToggleCreateChannel} title="Create Group">
            <i className="fas fa-plus"></i>
          </button>
          <button className="icon-btn" onClick={onToggleBlockedUsers} title="Blocked Users">
            <i className="fas fa-ban"></i>
          </button>
          <button className="icon-btn" onClick={onToggleSettings} title="Settings">
            <i className="fas fa-cog"></i>
          </button>
          {onAdminPanel && (
            <button className="icon-btn" onClick={onAdminPanel} title="Admin Panel" style={{ color: '#f59e0b' }}>
              <i className="fas fa-shield-alt"></i>
            </button>
          )}
          <button className="icon-btn" onClick={onLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search or start new chat..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-tabs">
        <button className={`tab-btn ${activeTab === 'dms' ? 'active' : ''}`} onClick={() => setActiveTab('dms')}>
          <i className="fas fa-comment"></i> Chats
          <TabBadge count={totalDmUnread} />
        </button>
        <button className={`tab-btn ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>
          <i className="fas fa-users"></i> Groups
          <TabBadge count={totalGroupUnread} />
        </button>
        <button className={`tab-btn ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>
          <i className="fas fa-phone"></i> Calls
        </button>
      </div>

      <div className="sidebar-content">

        {/* ── DMs ── */}
        {activeTab === 'dms' && (
          <div className="conversation-list">
            {filteredUsers.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fas fa-comment-slash" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}></i>
                <p style={{ margin: 0, fontSize: '14px' }}>No chats yet.<br />Click a user to start one.</p>
              </div>
            )}
            {filteredUsers.map((user, index) => {
              const lastMessage = getLastMessage(user.id);
              const conv = getConversationForUser(user.id);
              const unreadCount = conv ? (unreadCounts[conv.id] || 0) : 0;
              const isMuted = isChatMuted && isChatMuted(conv?.id);
              const isActive = activeConversation?.type === 'dm' &&
                activeConversation?.participants?.some(p => (p?.id || p) === user.id);

              // Bold name + preview when there are unread messages
              const hasUnread = unreadCount > 0 && !isActive;

              return (
                <div
                  key={user.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => onUserClick(user)}
                  onContextMenu={e => handleRightClick(e, user)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Avatar + online dot */}
                  <div className="conversation-avatar-wrapper">
                    <img src={user.avatar} alt={user.fullName} />
                    <span className={`status-dot ${user.status}`}></span>
                  </div>

                  {/* Info */}
                  <div className="conversation-info" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <h4 style={{ fontWeight: hasUnread ? 700 : 500, color: hasUnread ? 'var(--text-primary)' : undefined }}>
                        {user.fullName || user.username || 'User'}
                      </h4>
                      {isMuted && (
                        <i className="fas fa-bell-slash" style={{ fontSize: '10px', color: 'var(--text-secondary)' }} title="Muted"></i>
                      )}
                    </div>
                    <p className="conversation-preview" style={{
                      fontWeight: hasUnread ? 600 : 400,
                      color: hasUnread ? 'var(--text-primary)' : undefined,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {(() => {
                        const conv = getConversationForUser(user.id);
                        const typingName = conv ? getTypingUserName(conv.id) : null;
                        if (typingName) {
                          return (
                            <span className="sidebar-typing-indicator">
                              <span className="sidebar-typing-text">typing</span>
                              <span className="sidebar-typing-dots">
                                <span className="sidebar-typing-dot"></span>
                                <span className="sidebar-typing-dot"></span>
                                <span className="sidebar-typing-dot"></span>
                              </span>
                            </span>
                          );
                        }
                        return lastMessage
                          ? stripMarkdown(lastMessage.content || `Sent a ${lastMessage.type || 'message'}`).substring(0, 38)
                          : user.bio || 'Hey there! I am using ChatConnect';
                      })()}
                    </p>
                  </div>

                  {/* Time + unread badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {lastMessage?.timestamp && (
                      <span className="conversation-time" style={{ color: hasUnread ? '#25d366' : undefined, fontWeight: hasUnread ? 600 : 400 }}>
                        {formatTime(lastMessage.timestamp)}
                      </span>
                    )}
                    <UnreadBadge count={unreadCount} muted={isMuted} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Calls ── */}
        {activeTab === 'calls' && (
          <CallsTab
            callHistory={callHistory}
            users={users}
            currentUser={currentUser}
            formatDuration={formatDuration}
            onStartCall={onStartCall}
            conversations={conversations}
          />
        )}

        {/* ── Groups / Channels ── */}
        {activeTab === 'channels' && (
          <div className="conversation-list">
            {filteredChannels.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <i className="fas fa-users" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}></i>
                <p style={{ margin: 0, fontSize: '14px' }}>No groups yet.<br />Click + to create one.</p>
              </div>
            )}
            {filteredChannels.map((channel, index) => {
              const isActive = activeConversation?.id === channel.id;
              const unreadCount = unreadCounts[channel.id] || 0;
              const isMuted = isChatMuted && isChatMuted(channel.id);
              const hasUnread = unreadCount > 0 && !isActive;

              return (
                <div
                  key={channel.id}
                  className={`conversation-item ${isActive ? 'active' : ''}`}
                  onClick={() => onChannelClick(channel)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Group avatar */}
                  <div className="conversation-avatar-wrapper">
                    <div className="channel-avatar">
                      {channel.avatar
                        ? <img src={channel.avatar} alt={channel.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        : <i className="fas fa-users"></i>
                      }
                    </div>
                  </div>

                  {/* Info */}
                  <div className="conversation-info" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <h4 style={{ fontWeight: hasUnread ? 700 : 500, color: hasUnread ? 'var(--text-primary)' : undefined }}>
                        {channel.name}
                      </h4>
                      {channel.privacy === 'private' && (
                        <i className="fas fa-lock" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}></i>
                      )}
                      {isMuted && (
                        <i className="fas fa-bell-slash" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}></i>
                      )}
                    </div>
                    <p className="conversation-preview" style={{
                      fontWeight: hasUnread ? 600 : 400,
                      color: hasUnread ? 'var(--text-primary)' : undefined,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {(() => {
                        const typingName = getTypingUserName(channel.id);
                        if (typingName) {
                          return (
                            <span className="sidebar-typing-indicator">
                              <span className="sidebar-typing-name">{typingName}: </span>
                              <span className="sidebar-typing-text">typing</span>
                              <span className="sidebar-typing-dots">
                                <span className="sidebar-typing-dot"></span>
                                <span className="sidebar-typing-dot"></span>
                                <span className="sidebar-typing-dot"></span>
                              </span>
                            </span>
                          );
                        }
                        return channel.lastMessage
                          ? stripMarkdown(channel.lastMessage.content || 'New message').substring(0, 38)
                          : channel.description || 'Group chat';
                      })()}
                    </p>
                  </div>

                  {/* Time + unread badge */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                    {channel.lastMessage?.timestamp && (
                      <span className="conversation-time" style={{ color: hasUnread ? '#25d366' : undefined, fontWeight: hasUnread ? 600 : 400 }}>
                        {formatTime(channel.lastMessage.timestamp)}
                      </span>
                    )}
                    <UnreadBadge count={unreadCount} muted={isMuted} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Right-click context menu ── */}
      {contextMenu && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: Math.min(contextMenu.y, window.innerHeight - 140),
            left: Math.min(contextMenu.x, window.innerWidth - 210),
            zIndex: 99999, background: 'var(--bg-primary)',
            borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            border: '1px solid var(--border-color)', overflow: 'hidden', minWidth: '200px',
          }}
        >
          {!confirmDelete ? (
            <>
              <div style={{ padding: '10px 14px 6px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {contextMenu.user.fullName}
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)' }} />
              <button type="button"
                onClick={() => { onUserClick(contextMenu.user); setContextMenu(null); setConfirmDelete(false); }}
                style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--text-primary)', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-comment" style={{ width: 16, color: '#667eea' }}></i> Open Chat
              </button>
              <div style={{ height: '1px', background: 'var(--border-color)', margin: '0 12px' }} />
              <button type="button"
                onClick={() => setConfirmDelete(true)}
                style={{ width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#ef4444', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <i className="fas fa-trash" style={{ width: 16 }}></i> Delete Chat
              </button>
            </>
          ) : (
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '12px', fontWeight: 500 }}>
                Delete chat with <strong>{contextMenu.user.fullName}</strong>?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={cancelDelete}
                  style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px' }}>
                  Cancel
                </button>
                <button type="button" onClick={confirmDeleteChat}
                  style={{ flex: 1, padding: '7px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}


// ── Calls Tab ─────────────────────────────────────────────────────────────────
function CallsTab({ callHistory, users, currentUser, formatDuration, onStartCall, conversations }) {
  const [filter, setFilter] = React.useState('all');

  const userMap = React.useMemo(() => {
    const m = {};
    (users || []).forEach(u => { if (u?.id) m[u.id] = u; });
    if (currentUser?.id) m[currentUser.id] = currentUser;
    return m;
  }, [users, currentUser]);

  const convMap = React.useMemo(() => {
    const m = {};
    (conversations || []).forEach(c => { if (c?.id) m[c.id] = c; });
    return m;
  }, [conversations]);

  function getContact(call) {
    if (call.conversationId && convMap[call.conversationId]) {
      const conv = convMap[call.conversationId];
      const other = (conv.participants || []).find(p => {
        const pid = typeof p === 'object' ? p?.id : p;
        return pid && pid !== currentUser?.id;
      });
      if (other) {
        const otherId = typeof other === 'object' ? other.id : other;
        const liveUser = userMap[otherId];
        if (liveUser) return liveUser;
        if (typeof other === 'object' && other.fullName) return other;
      }
    }
    if (call.otherUserName) {
      const live = call.otherUserId ? userMap[call.otherUserId] : null;
      return { id: call.otherUserId, fullName: call.otherUserName, avatar: live?.avatar || call.otherUserAvatar || null };
    }
    for (const p of (call.participantDetails || [])) {
      if (p?.id && p.id !== currentUser?.id) return userMap[p.id] || p;
    }
    for (const pid of (call.participants || [])) {
      const id = typeof pid === 'object' ? pid?.id : pid;
      if (id && id !== currentUser?.id && userMap[id]) return userMap[id];
    }
    if (call.callerId && call.callerId !== currentUser?.id) {
      if (userMap[call.callerId]) return userMap[call.callerId];
      if (call.callerName) return { fullName: call.callerName, avatar: call.callerAvatar };
    }
    return { fullName: 'Unknown', avatar: null };
  }

  function wasIncoming(call) { return call.callerId !== currentUser?.id; }

  function parseTs(ts) {
    if (!ts) return new Date(0);
    return new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z');
  }

  function timeLabel(call) {
    const d = parseTs(call.startedAt || call.timestamp);
    const diff = Date.now() - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const all = callHistory || [];
  const shown = filter === 'missed' ? all.filter(c => c.status === 'missed') : all;
  const missedCount = all.filter(c => c.status === 'missed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px 6px', borderBottom: '1px solid var(--border-color)' }}>
        {[{ k: 'all', l: 'All' }, { k: 'missed', l: `Missed${missedCount ? ` (${missedCount})` : ''}` }].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === f.k ? '#667eea' : 'var(--bg-secondary)', color: filter === f.k ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
            {f.l}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {shown.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <i className="fas fa-phone-slash" style={{ fontSize: 32, marginBottom: 10, opacity: 0.2 }}></i>
            <p style={{ margin: 0, fontSize: 13 }}>{filter === 'missed' ? 'No missed calls' : 'No calls yet'}</p>
          </div>
        ) : shown.map((call, idx) => {
          const contact = getContact(call);
          const incoming = wasIncoming(call);
          const missed = call.status === 'missed';
          const declined = call.status === 'declined';
          const isUnknown = !contact.fullName || contact.fullName === 'Unknown';
          const avatar = contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(isUnknown ? '?' : contact.fullName)}&background=${isUnknown ? '6b7280' : '667eea'}&color=fff`;
          const dur = call.duration > 0 ? (formatDuration ? formatDuration(call.duration) : `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}`) : null;
          const arrowColor = missed || declined ? '#ef4444' : '#22c55e';
          const arrowIcon = incoming ? 'fa-arrow-down-left' : 'fa-arrow-up-right';

          return (
            <div key={call.id || idx}
              style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: 10, borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={avatar} alt={contact.fullName}
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=?&background=667eea&color=fff`; }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: missed ? '#ef4444' : 'var(--text-primary)' }}>
                  {contact.fullName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <i className={`fas ${arrowIcon}`} style={{ fontSize: 10, color: arrowColor }}></i>
                  <span style={{ fontSize: 12, color: missed ? '#ef4444' : 'var(--text-secondary)' }}>
                    {missed ? 'Missed' : declined ? 'Declined' : incoming ? 'Incoming' : 'Outgoing'}
                  </span>
                  <i className={`fas fa-${call.callType === 'video' ? 'video' : 'phone'}`} style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 2 }}></i>
                  {dur && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>· {dur}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{timeLabel(call)}</span>
                {!isUnknown && onStartCall && (
                  <button onClick={e => { e.stopPropagation(); onStartCall(call.callType || 'audio'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#667eea', padding: '2px 4px', borderRadius: 6, display: 'flex', alignItems: 'center' }}
                    title={`${call.callType === 'video' ? 'Video' : 'Voice'} call back`}>
                    <i className={`fas fa-${call.callType === 'video' ? 'video' : 'phone'}`} style={{ fontSize: 15 }}></i>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChatSidebar;