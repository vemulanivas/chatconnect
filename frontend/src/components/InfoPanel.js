import React, { useState } from 'react';
import apiClient from '../utils/apiClient';

function InfoPanel({
  activeConversation, users, currentUser, onClose,
  isChatMuted, onMuteChat, onUnmuteChat,
  onBlockUser, onUnblockUser, isUserBlocked,
  isVisible, onDeleteGroup, onRefreshConversations
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState('success');
  const [removingMember, setRemovingMember] = useState(null);

  const conv = activeConversation || null;

  function showToast(msg, type = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(''), 2500);
  }

  function getOtherParticipant() {
    if (!conv?.participants) return null;
    const other = conv.participants.find(p => (p?.id || p) !== currentUser?.id);
    if (!other) return null;
    if (typeof other === 'object' && other.fullName) return other;
    return users?.find(u => u.id === other) || null;
  }

  const otherUser = conv?.type === 'dm' ? getOtherParticipant() : null;
  const isBlocked = otherUser ? (isUserBlocked ? isUserBlocked(otherUser.id) : false) : false;
  const muted = conv && isChatMuted ? isChatMuted(conv.id) : false;
  const isGroupCreator = conv?.createdBy === currentUser?.id || conv?.created_by === currentUser?.id;

  function convName() {
    if (!conv) return '';
    if (conv.type === 'dm') return otherUser?.fullName || otherUser?.username || 'User';
    return conv.name || 'Group';
  }

  function convAvatar() {
    if (!conv) return '';
    if (conv.type === 'dm') {
      const n = otherUser?.fullName || 'User';
      return otherUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=667eea&color=fff`;
    }
    const n = conv.name || 'Group';
    return conv.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=764ba2&color=fff`;
  }

  function convStatus() {
    if (!conv) return '';
    if (conv.type === 'dm') return otherUser?.status || 'offline';
    const count = conv.participants?.length || 0;
    return `${count} member${count !== 1 ? 's' : ''}`;
  }

  function handleMuteToggle() {
    if (!conv) return;
    if (muted) onUnmuteChat && onUnmuteChat(conv.id);
    else onMuteChat && onMuteChat(conv.id);
  }

  const currentMemberIds = (conv?.participants || []).map(p => p?.id || p);
  const nonMembers = (users || []).filter(u =>
    !currentMemberIds.includes(u.id) &&
    u.id !== currentUser?.id &&
    u.fullName?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  async function handleAddMember(userId) {
    if (!conv?.id) return;
    setAddingMember(true);
    try {
      await apiClient.addMember(conv.id, userId);
      showToast('Member added!');
      setMemberSearch('');
      setShowAddMember(false);
      onRefreshConversations && onRefreshConversations();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setAddingMember(false);
  }

  async function handleRemoveMember(userId) {
    if (!conv?.id) return;
    setRemovingMember(userId);
    try {
      await apiClient.removeMember(conv.id, userId);
      showToast('Member removed');
      onRefreshConversations && onRefreshConversations();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
    setRemovingMember(null);
  }

  async function handleDeleteGroup() {
    if (!conv?.id) return;
    try {
      // onDeleteGroup is actually handleDeleteConversation from ChatPage,
      // which uses the Redux thunk to delete via API and update state.
      await onDeleteGroup(conv.id);
      setConfirmDeleteGroup(false);
      onClose && onClose();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  }

  const currentStatus = otherUser?.status?.toLowerCase() || 'offline';

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return '#22c55e';
      case 'busy': return '#ef4444';
      case 'away': return '#f59e0b';
      case 'dnd': return '#ef4444';
      default: return '#6b7280';
    }
  };
  const statusColor = getStatusColor(currentStatus);

  return (
    <>
      <style>{`
        .info-panel-v2 {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: var(--bg-primary);
          border-left: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          height: 100vh;
          position: relative;
          overflow: hidden;
        }

        /* ── Header ── */
        .ipv2-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px 14px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-primary);
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .ipv2-header-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
        }
        .ipv2-close-btn {
          width: 32px; height: 32px;
          border-radius: 50%;
          border: none;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          transition: background 0.15s, color 0.15s;
        }
        .ipv2-close-btn:hover { background: var(--hover-bg); color: var(--text-primary); }

        /* ── Scroll body ── */
        .ipv2-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: var(--border-color) transparent;
        }

        /* ── Avatar hero ── */
        .ipv2-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 28px 20px 20px;
          gap: 10px;
        }
        .ipv2-avatar-wrap {
          position: relative;
          width: 80px; height: 80px;
        }
        .ipv2-avatar {
          width: 80px; height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--border-color);
        }
        .ipv2-online-dot {
          position: absolute;
          bottom: 4px; right: 4px;
          width: 14px; height: 14px;
          border-radius: 50%;
          border: 2px solid var(--bg-primary);
        }
        .ipv2-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.4px;
          text-align: center;
        }
        .ipv2-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          background: var(--bg-secondary);
          color: var(--text-secondary);
        }

        /* ── Quick action row ── */
        .ipv2-quick-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
          padding: 4px 20px 20px;
        }
        .ipv2-qa-btn {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          cursor: pointer; border: none; background: none; padding: 0;
        }
        .ipv2-qa-icon {
          width: 46px; height: 46px;
          border-radius: 14px;
          background: var(--bg-secondary);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px;
          color: var(--text-secondary);
          transition: background 0.15s, color 0.15s, transform 0.15s;
          border: 1px solid var(--border-color);
        }
        .ipv2-qa-btn:hover .ipv2-qa-icon {
          background: #667eea15;
          color: #667eea;
          transform: translateY(-2px);
        }
        .ipv2-qa-btn.danger:hover .ipv2-qa-icon { background: #ef444415; color: #ef4444; }
        .ipv2-qa-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        /* ── Section ── */
        .ipv2-section {
          padding: 0 16px 16px;
        }
        .ipv2-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--text-secondary);
          padding: 0 4px;
          margin-bottom: 8px;
        }
        .ipv2-card {
          background: var(--bg-secondary);
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--border-color);
        }
        .ipv2-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-primary);
        }
        .ipv2-row:last-child { border-bottom: none; }
        .ipv2-row-icon {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: var(--bg-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .ipv2-row-text { flex: 1; }
        .ipv2-row-label { font-size: 11px; color: var(--text-secondary); }

        /* ── Members ── */
        .ipv2-members-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 4px;
          margin-bottom: 8px;
        }
        .ipv2-add-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 12px;
          border-radius: 20px;
          border: 1.5px solid #667eea44;
          background: #667eea12;
          color: #667eea;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .ipv2-add-btn:hover { background: #667eea22; border-color: #667eea88; }

        /* Member row */
        .ipv2-member-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 14px;
          border-bottom: 1px solid var(--border-color);
          transition: background 0.12s;
          position: relative;
        }
        .ipv2-member-row:last-child { border-bottom: none; }
        .ipv2-member-row:hover { background: var(--hover-bg, #00000008); }
        .ipv2-member-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 2px solid var(--border-color);
        }
        .ipv2-member-info { flex: 1; min-width: 0; }
        .ipv2-member-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ipv2-member-sub {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex; align-items: center; gap: 4px;
        }
        .ipv2-member-online-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
        }
        .ipv2-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }
        .ipv2-badge.admin { background: #f59e0b18; color: #f59e0b; border: 1px solid #f59e0b33; }
        .ipv2-badge.you { background: #667eea18; color: #667eea; border: 1px solid #667eea33; }

        /* ── REMOVE BUTTON — inline on the right, appears on hover ── */
        .ipv2-remove-btn {
          width: 28px; height: 28px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          opacity: 0;
          transform: scale(0.85);
          transition: opacity 0.15s, transform 0.15s, background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .ipv2-member-row:hover .ipv2-remove-btn {
          opacity: 1;
          transform: scale(1);
        }
        .ipv2-remove-btn:hover {
          background: #ef444420 !important;
          color: #ef4444 !important;
        }
        .ipv2-remove-btn.removing {
          opacity: 1;
          transform: scale(1);
          background: #ef444420;
          color: #ef4444;
        }

        /* ── Add member search panel ── */
        .ipv2-add-panel {
          margin-bottom: 10px;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          animation: ipv2-slide-down 0.18s ease;
        }
        @keyframes ipv2-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ipv2-search-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 9px;
          border: 1.5px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
          box-sizing: border-box;
          margin-bottom: 8px;
          outline: none;
          transition: border-color 0.15s;
        }
        .ipv2-search-input:focus { border-color: #667eea88; }
        .ipv2-add-user-row {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 4px;
          border-radius: 8px;
          transition: background 0.12s;
        }
        .ipv2-add-user-row:hover { background: var(--hover-bg); }
        .ipv2-add-user-btn {
          padding: 4px 10px;
          border-radius: 7px;
          border: none;
          background: #667eea20;
          color: #667eea;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ipv2-add-user-btn:hover { background: #667eea35; }
        .ipv2-add-user-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Danger zone ── */
        .ipv2-danger-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1.5px solid #ef444430;
          background: #ef444410;
          color: #ef4444;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.15s, border-color 0.15s;
        }
        .ipv2-danger-btn:hover { background: #ef444420; border-color: #ef444466; }

        .ipv2-confirm-box {
          background: var(--bg-secondary);
          border-radius: 12px;
          border: 1.5px solid #ef444430;
          padding: 14px;
          animation: ipv2-slide-down 0.18s ease;
        }
        .ipv2-confirm-text {
          font-size: 13px;
          color: var(--text-primary);
          margin: 0 0 12px;
          line-height: 1.5;
        }
        .ipv2-confirm-actions {
          display: flex; gap: 8px;
        }
        .ipv2-cancel-btn {
          flex: 1; padding: 9px;
          border-radius: 9px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ipv2-cancel-btn:hover { background: var(--hover-bg); }
        .ipv2-delete-confirm-btn {
          flex: 1; padding: 9px;
          border-radius: 9px;
          border: none;
          background: #ef4444;
          color: white;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ipv2-delete-confirm-btn:hover { background: #dc2626; }

        /* ── Toggle switch ── */
        .ipv2-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 14px;
        }
        .ipv2-toggle-left { display: flex; align-items: center; gap: 10px; }
        .ipv2-toggle-switch {
          width: 40px; height: 22px;
          border-radius: 11px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: background 0.2s;
          flex-shrink: 0;
        }
        .ipv2-toggle-switch::after {
          content: '';
          position: absolute;
          top: 3px; left: 3px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px #0003;
        }
        .ipv2-toggle-switch.on { background: #667eea; }
        .ipv2-toggle-switch.on::after { transform: translateX(18px); }
        .ipv2-toggle-switch.off { background: var(--border-color); }

        /* ── Toast ── */
        .ipv2-toast {
          position: absolute;
          top: 14px; left: 50%; transform: translateX(-50%);
          padding: 8px 18px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          z-index: 100;
          white-space: nowrap;
          animation: ipv2-toast-in 0.2s ease;
          pointer-events: none;
        }
        .ipv2-toast.success { background: #667eea; color: white; }
        .ipv2-toast.error { background: #ef4444; color: white; }
        @keyframes ipv2-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .ipv2-divider {
          height: 1px;
          background: var(--border-color);
          margin: 0 16px 16px;
        }

        .ipv2-empty-text {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: center;
          padding: 10px 0;
        }
      `}</style>

      <aside
        className="info-panel-v2"
        style={{
          width: isVisible && conv ? '320px' : '0',
          minWidth: isVisible && conv ? '320px' : '0',
          maxWidth: isVisible && conv ? '320px' : '0',
          opacity: isVisible && conv ? 1 : 0,
          overflow: isVisible && conv ? 'hidden' : 'hidden',
          flexShrink: 0,
          transition: 'width 0.3s ease, min-width 0.3s ease, max-width 0.3s ease, opacity 0.2s ease',
        }}
      >
        {/* Toast */}
        {toast && <div className={`ipv2-toast ${toastType}`}>{toast}</div>}

        {/* Header */}
        <div className="ipv2-header">
          <span className="ipv2-header-title">
            {conv?.type === 'dm' ? 'Contact Info' : 'Group Info'}
          </span>
          <button className="ipv2-close-btn" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>

        {conv && (
          <div className="ipv2-body">

            {/* Hero avatar */}
            <div className="ipv2-hero">
              <div className="ipv2-avatar-wrap">
                <img
                  className="ipv2-avatar"
                  src={convAvatar()} alt={convName()}
                  onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(convName())}&background=667eea&color=fff`; }}
                />
                {conv.type === 'dm' && currentStatus !== 'offline' && <div className="ipv2-online-dot" style={{ background: statusColor }} />}
              </div>
              <div className="ipv2-name">{convName()}</div>
              <div className="ipv2-status-pill" style={{ color: statusColor, background: `${statusColor}18` }}>
                {conv.type === 'dm' && currentStatus !== 'offline' && <span className="ipv2-member-online-dot" style={{ background: statusColor, width: 6, height: 6, borderRadius: '50%' }} />}
                {convStatus()}
              </div>
            </div>

            {/* ── DM: quick actions ── */}
            {conv.type === 'dm' && otherUser && (
              <>
                <div className="ipv2-quick-actions">
                  <button className="ipv2-qa-btn" onClick={handleMuteToggle}>
                    <div className="ipv2-qa-icon">
                      <i className={`fas fa-${muted ? 'bell' : 'bell-slash'}`} />
                    </div>
                    <span className="ipv2-qa-label">{muted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button
                    className={`ipv2-qa-btn ${isBlocked ? '' : 'danger'}`}
                    onClick={() => isBlocked ? onUnblockUser?.(otherUser.id) : onBlockUser?.(otherUser.id)}
                  >
                    <div className="ipv2-qa-icon">
                      <i className={`fas fa-${isBlocked ? 'user-check' : 'ban'}`} />
                    </div>
                    <span className="ipv2-qa-label">{isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                </div>

                <div className="ipv2-divider" />

                {/* About */}
                <div className="ipv2-section">
                  <div className="ipv2-section-label">About</div>
                  <div className="ipv2-card">
                    <div className="ipv2-row">
                      <div className="ipv2-row-icon"><i className="fas fa-quote-left" /></div>
                      <div className="ipv2-row-text">
                        <div>{otherUser.bio || 'Hey there! I am using ChatConnect'}</div>
                      </div>
                    </div>
                    <div className="ipv2-row">
                      <div className="ipv2-row-icon"><i className="fas fa-at" /></div>
                      <div className="ipv2-row-text">
                        <div className="ipv2-row-label">Username</div>
                        <div>@{otherUser.username || otherUser.id}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Group: members ── */}
            {(conv.type === 'group' || conv.type === 'channel') && (
              <>
                {/* Members section */}
                <div className="ipv2-section">
                  <div className="ipv2-members-header">
                    <div className="ipv2-section-label" style={{ margin: 0 }}>
                      Members · {conv.participants?.length || 0}
                    </div>
                    {isGroupCreator && (
                      <button className="ipv2-add-btn" onClick={() => setShowAddMember(!showAddMember)}>
                        <i className="fas fa-user-plus" style={{ fontSize: 11 }} />
                        Add Member
                      </button>
                    )}
                  </div>

                  {/* Add member search panel */}
                  {showAddMember && isGroupCreator && (
                    <div className="ipv2-add-panel">
                      <input
                        className="ipv2-search-input"
                        placeholder="Search users to add..."
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        autoFocus
                      />
                      <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                        {nonMembers.length === 0
                          ? <div className="ipv2-empty-text">No users available to add</div>
                          : nonMembers.map(u => (
                            <div key={u.id} className="ipv2-add-user-row">
                              <img
                                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'U')}&background=random&color=fff`}
                                alt={u.fullName}
                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              />
                              <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{u.fullName}</span>
                              <button className="ipv2-add-user-btn" disabled={addingMember} onClick={() => handleAddMember(u.id)}>
                                {addingMember ? '...' : 'Add'}
                              </button>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}

                  {/* Members list */}
                  <div className="ipv2-card">
                    {conv.participants?.map(participant => {
                      const member = typeof participant === 'object' ? participant : users?.find(u => u.id === participant);
                      if (!member) return null;
                      const memberId = member.id || member;
                      const isCreator = memberId === (conv.createdBy || conv.created_by);
                      const isMe = memberId === currentUser?.id;
                      const mStatus = member.status?.toLowerCase() || 'offline';
                      const mColor = getStatusColor(mStatus);
                      const isOffline = mStatus === 'offline';

                      let lastSeenStr = 'Offline';
                      if (isOffline && member.lastSeen) {
                        const diffMinutes = Math.floor((new Date() - new Date(member.lastSeen)) / 60000);
                        if (diffMinutes < 1) lastSeenStr = 'Offline • Just now';
                        else if (diffMinutes < 60) lastSeenStr = `Offline • ${diffMinutes}m ago`;
                        else {
                          const diffHours = Math.floor(diffMinutes / 60);
                          if (diffHours < 24) lastSeenStr = `Offline • ${diffHours}h ago`;
                          else lastSeenStr = `Offline • ${Math.floor(diffHours / 24)}d ago`;
                        }
                      } else if (!isOffline) {
                        lastSeenStr = mStatus.charAt(0).toUpperCase() + mStatus.slice(1);
                      }

                      const isRemoving = removingMember === memberId;

                      return (
                        <div
                          key={memberId}
                          className="ipv2-member-row"
                        >
                          <img
                            className="ipv2-member-avatar"
                            src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName || 'U')}&background=random&color=fff`}
                            alt={member.fullName || 'Member'}
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=U&background=667eea&color=fff`; }}
                          />
                          <div className="ipv2-member-info">
                            <div className="ipv2-member-name">{member.fullName || member.username}</div>
                            <div className="ipv2-member-sub">
                              {!isOffline && <span className="ipv2-member-online-dot" style={{ background: mColor }} />}
                              <span>{lastSeenStr}</span>
                            </div>
                          </div>

                          {/* Badges */}
                          {isCreator && <span className="ipv2-badge admin"><i className="fas fa-shield-alt" style={{ fontSize: 9, marginRight: 3 }} />Admin</span>}
                          {isMe && !isCreator && <span className="ipv2-badge you">You</span>}

                          {/* Remove button — inline right side, visible on hover */}
                          {isGroupCreator && !isMe && !isCreator && (
                            <button
                              className={`ipv2-remove-btn ${isRemoving ? 'removing' : ''}`}
                              title={`Remove ${member.fullName || 'member'}`}
                              onClick={() => handleRemoveMember(memberId)}
                              disabled={isRemoving}
                            >
                              {isRemoving
                                ? <i className="fas fa-spinner fa-spin" style={{ fontSize: 11 }} />
                                : <i className="fas fa-user-minus" style={{ fontSize: 12 }} />
                              }
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settings */}
                <div className="ipv2-section">
                  <div className="ipv2-section-label">Settings</div>
                  <div className="ipv2-card">
                    <div className="ipv2-toggle-row">
                      <div className="ipv2-toggle-left">
                        <div className="ipv2-row-icon" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                          <i className={`fas fa-${muted ? 'bell-slash' : 'bell'}`} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{muted ? 'Muted' : 'Active'}</div>
                        </div>
                      </div>
                      <button
                        className={`ipv2-toggle-switch ${muted ? 'off' : 'on'}`}
                        onClick={handleMuteToggle}
                      />
                    </div>
                  </div>
                </div>

                {/* Delete group */}
                {isGroupCreator && (
                  <div className="ipv2-section">
                    <div className="ipv2-section-label">Danger Zone</div>
                    {!confirmDeleteGroup
                      ? (
                        <button className="ipv2-danger-btn" onClick={() => setConfirmDeleteGroup(true)}>
                          <i className="fas fa-trash-alt" />
                          Delete Group
                        </button>
                      ) : (
                        <div className="ipv2-confirm-box">
                          <p className="ipv2-confirm-text">
                            Delete <strong>{conv.name}</strong>? All messages will be permanently removed. This cannot be undone.
                          </p>
                          <div className="ipv2-confirm-actions">
                            <button className="ipv2-cancel-btn" onClick={() => setConfirmDeleteGroup(false)}>Cancel</button>
                            <button className="ipv2-delete-confirm-btn" onClick={handleDeleteGroup}>Delete</button>
                          </div>
                        </div>
                      )
                    }
                  </div>
                )}

                <div style={{ height: 20 }} />
              </>
            )}

          </div>
        )}
      </aside>
    </>
  );
}

export default InfoPanel;