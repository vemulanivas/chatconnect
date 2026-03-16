import React, { useState } from 'react';

function CallHistoryPanel({ callHistory, users, currentUser, onClose, formatDuration, onStartCall }) {
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

  // Build user lookup map as fallback
  const userMap = {};
  (users || []).forEach(u => { if (u?.id) userMap[u.id] = u; });
  if (currentUser?.id) userMap[currentUser.id] = currentUser;

  function getContact(call) {
    // PRIMARY: backend now sends otherUserName computed server-side
    if (call.otherUserName) {
      const live = call.otherUserId ? userMap[call.otherUserId] : null;
      return {
        id: call.otherUserId,
        fullName: call.otherUserName,
        avatar: live?.avatar || call.otherUserAvatar || null,
      };
    }

    // FALLBACK: scan participantDetails for non-current user
    for (const p of (call.participantDetails || [])) {
      if (p?.id && p.id !== currentUser?.id && p.fullName) {
        return userMap[p.id] || p;
      }
    }

    // FALLBACK: scan participant IDs
    for (const pid of (call.participants || [])) {
      const id = typeof pid === 'object' ? pid?.id : pid;
      if (id && id !== currentUser?.id && userMap[id]) return userMap[id];
    }

    // FALLBACK: if someone else called us
    if (call.callerId && call.callerId !== currentUser?.id) {
      if (userMap[call.callerId]) return userMap[call.callerId];
      if (call.callerName) return { fullName: call.callerName, avatar: call.callerAvatar };
    }

    return { fullName: 'Unknown', avatar: null };
  }

  function wasIncoming(call) {
    return call.callerId !== currentUser?.id;
  }

  function parseTs(ts) {
    if (!ts) return new Date(0);
    return new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z');
  }

  function formatCallTime(call) {
    const d = parseTs(call.startedAt || call.timestamp);
    const diff = Date.now() - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function getStatus(call) {
    const inc = wasIncoming(call);
    if (call.status === 'missed') return { label: inc ? 'Missed' : 'No answer', color: '#ef4444', symbol: inc ? '↙' : '↗' };
    if (call.status === 'declined') return { label: 'Declined', color: '#f97316', symbol: '✕' };
    return { label: inc ? 'Incoming' : 'Outgoing', color: '#22c55e', symbol: inc ? '↙' : '↗' };
  }

  const allCalls = callHistory || [];
  const filtered = allCalls.filter(call => {
    if (tab === 'incoming') return wasIncoming(call);
    if (tab === 'outgoing') return !wasIncoming(call);
    if (tab === 'missed') return call.status === 'missed';
    return true;
  }).filter(call => {
    if (!search.trim()) return true;
    return getContact(call).fullName?.toLowerCase().includes(search.toLowerCase());
  });

  // Group by date
  const grouped = filtered.reduce((acc, call) => {
    const d = parseTs(call.startedAt || call.timestamp);
    const today = new Date(); today.setHours(0,0,0,0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const day = new Date(d); day.setHours(0,0,0,0);
    const label = day.getTime() === today.getTime() ? 'Today'
      : day.getTime() === yesterday.getTime() ? 'Yesterday'
      : d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    (acc[label] = acc[label] || []).push(call);
    return acc;
  }, {});

  const TABS = [
    { key: 'all', label: 'All' },
    { key: 'incoming', label: 'Incoming' },
    { key: 'outgoing', label: 'Outgoing' },
    { key: 'missed', label: 'Missed' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-primary)', borderRadius: '24px', width: '520px', maxWidth: '96vw', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                <i className="fas fa-phone-alt" style={{ marginRight: 10, opacity: 0.9 }}></i>Call History
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>
                {allCalls.length} total calls
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', color: '#fff', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}></i>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => {
              const count = t.key === 'all' ? allCalls.length
                : t.key === 'missed' ? allCalls.filter(c => c.status === 'missed').length
                : t.key === 'incoming' ? allCalls.filter(c => wasIncoming(c)).length
                : allCalls.filter(c => !wasIncoming(c)).length;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ flex: 1, padding: '8px 6px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, borderRadius: '8px 8px 0 0', background: tab === t.key ? 'var(--bg-primary)' : 'transparent', color: tab === t.key ? '#667eea' : 'rgba(255,255,255,0.7)', transition: 'all 0.2s' }}>
                  {t.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '56px 24px', color: 'var(--text-secondary)' }}>
              <i className="fas fa-phone-slash" style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}></i>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>No calls found</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, opacity: 0.5 }}>{search ? `No results for "${search}"` : 'Calls appear here after you make or receive one'}</p>
            </div>
          ) : (
            Object.entries(grouped).map(([dateLabel, calls]) => (
              <div key={dateLabel}>
                <div style={{ padding: '10px 20px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--bg-secondary)' }}>
                  {dateLabel}
                </div>
                {calls.map((call, idx) => {
                  const contact = getContact(call);
                  const status = getStatus(call);
                  const isUnknown = !contact.fullName || contact.fullName === 'Unknown';
                  const avatar = contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(isUnknown ? '?' : contact.fullName)}&background=${isUnknown ? '6b7280' : '667eea'}&color=fff`;
                  const dur = call.duration > 0 ? (formatDuration ? formatDuration(call.duration) : `${Math.floor(call.duration/60)}:${String(call.duration%60).padStart(2,'0')}`) : null;

                  return (
                    <div key={call.id || idx}
                      style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 14, borderBottom: '1px solid var(--border-color)', transition: 'background 0.12s', cursor: 'default' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={avatar} alt={contact.fullName}
                          style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover' }}
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=?&background=667eea&color=fff`; }} />
                        <div style={{ position: 'absolute', bottom: -1, right: -1, width: 18, height: 18, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className={`fas fa-${call.callType === 'video' ? 'video' : 'phone'}`} style={{ fontSize: 7, color: status.color }}></i>
                        </div>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isUnknown ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {contact.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ color: status.color, fontWeight: 700, fontSize: 11 }}>{status.symbol}</span>
                          <span style={{ color: status.color }}>{status.label}</span>
                          {call.callType === 'video' && <><span>·</span><span>Video</span></>}
                          {dur && <><span>·</span><span>{dur}</span></>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatCallTime(call)}</span>
                        {!isUnknown && onStartCall && (
                          <button onClick={e => { e.stopPropagation(); onStartCall(call.callType || 'audio'); }}
                            style={{ padding: '4px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--bg-secondary)', color: '#667eea', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <i className={`fas fa-${call.callType === 'video' ? 'video' : 'phone'}`} style={{ fontSize: 10 }}></i>
                            Call back
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default CallHistoryPanel;