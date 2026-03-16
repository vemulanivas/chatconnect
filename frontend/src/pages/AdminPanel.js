import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import apiClient from '../utils/apiClient';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
  { key: 'users', label: 'Manage Users', icon: 'fa-users' },
  { key: 'conversations', label: 'Teams & Groups', icon: 'fa-comments' },
  { key: 'flagged', label: 'Security & Risks', icon: 'fa-shield-alt' },
  { key: 'analytics', label: 'Call Analytics', icon: 'fa-chart-bar' },
  { key: 'broadcast', label: 'Org Broadcast', icon: 'fa-bullhorn' },
];

export default function AdminPanel() {
  const navigate = useNavigate();
  const currentUser = useSelector(s => s.auth.currentUser);

  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [convs, setConvs] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  // ── Modals ──
  const [modalType, setModalType] = useState(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);

  // ── Theme tokens ────────────────────────────────────────────────────────────
  // ── Theme tokens (Mapped to App.css variables) ─────────────────────────
  const T = {
    page: 'var(--bg-primary)',
    sidebar: 'var(--bg-secondary)',
    card: 'var(--bg-primary)',
    cardAlt: 'var(--bg-secondary)',
    border: 'var(--border-color)',
    text: 'var(--text-primary)',
    muted: 'var(--text-secondary)',
    accent: 'var(--primary-color)',
    accentSoft: 'var(--message-sent-bg)0D', // transparent hex
    inputBg: 'var(--bg-secondary)',
    hover: 'var(--bg-tertiary)',
    shadow: 'var(--shadow-md)',
  };

  function flash(msg, err = false) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard' || tab === 'analytics') setStats(await apiClient.adminGetStats());
      if (tab === 'users' || tab === 'analytics') setUsers(await apiClient.adminGetUsers());
      if (tab === 'flagged') setFlagged(await apiClient.adminGetFlagged());
      if (tab === 'conversations') setConvs(await apiClient.adminGetConversations());
    } catch (e) { flash(e.message, true); }
    setLoading(false);
  }, [tab]);

  async function openUserCalls(user) {
    setModalType('userCalls');
    setModalTitle(`${user.fullName}'s Call History`);
    setModalData(null);
    setLoadingModal(true);
    try {
      const calls = await apiClient.adminGetUserCalls(user.id);
      setModalData(calls);
    } catch (e) { flash(e.message, true); setModalType(null); }
    setLoadingModal(false);
  }

  async function openConvMsgs(conv) {
    setModalType('convMsgs');
    setModalTitle(`Messages: ${conv.name || '(Direct Message)'}`);
    setModalData(null);
    setLoadingModal(true);
    try {
      const msgs = await apiClient.adminGetConversationMessages(conv.id);
      setModalData(msgs);
    } catch (e) { flash(e.message, true); setModalType(null); }
    setLoadingModal(false);
  }

  useEffect(() => {
    if (!currentUser?.isAdmin) { navigate('/chat'); return; }
    load();
  }, [currentUser, navigate, load]);

  async function run(fn, ok) {
    try { await fn(); flash(ok); load(); }
    catch (e) { flash(e.message, true); }
  }

  async function sendBroadcast() {
    if (!msg.trim()) { flash('Please type a message', true); return; }
    setSending(true);
    try {
      const res = await apiClient.adminBroadcast(msg.trim());
      flash(res?.message || 'Broadcast sent ✓');
      setMsg('');
    } catch (e) { flash(e.message, true); }
    setSending(false);
  }

  const filtered = users.filter(u =>
    !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  // ── Layout helpers ───────────────────────────────────────────────────────────
  const card = (extra = {}) => ({
    background: T.card,
    borderRadius: '12px', /* Matches .chat-window / .info-panel / Main App */
    border: `1px solid ${T.border}`,
    boxShadow: 'var(--shadow-md)',
    ...extra,
  });

  const badge = (color, bg) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 20,
    fontSize: 11, fontWeight: 600,
    background: bg || color + '1a', color,
  });

  return (
    <div style={{ minHeight: '100vh', background: T.page, color: T.text, fontFamily: 'inherit', display: 'flex', flexDirection: 'column', transition: 'background 0.2s, color 0.2s' }}>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.err ? 'var(--danger-color)' : 'var(--secondary-color)', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontWeight: 600, fontSize: 14, boxShadow: 'var(--shadow-lg)', maxWidth: 340, animation: 'fadeIn .2s' }}>
          {toast.err ? '⚠ ' : '✓ '}{toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: 'var(--bg-secondary)', borderBottom: `1px solid ${T.border}`, padding: '0 28px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#fff' }}>⚡</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Console</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ChatConnect · {currentUser?.fullName}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => navigate('/chat')}
              className="btn btn-secondary" style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-arrow-left"></i> Back to Chat
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <nav style={{ width: 210, background: T.sidebar, borderRight: `1px solid ${T.border}`, padding: '12px 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ width: '100%', padding: '10px 18px', background: tab === t.key ? T.accentSoft : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: tab === t.key ? T.accent : T.muted, fontSize: 13, fontWeight: tab === t.key ? 600 : 400, textAlign: 'left', borderLeft: `3px solid ${tab === t.key ? T.accent : 'transparent'}`, transition: 'all 0.15s' }}
              onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.background = T.hover; }}
              onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.background = 'transparent'; }}>
              <i className={`fas ${t.icon}`} style={{ width: 16, textAlign: 'center' }}></i>
              {t.label}
              {t.key === 'flagged' && flagged.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#da3633', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{flagged.length}</span>
              )}
            </button>
          ))}

          {/* Inline stats */}
          {stats && (
            <div style={{ margin: '20px 12px 0', padding: '14px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Platform</div>
              {[
                { l: 'Users', v: stats.totalUsers, c: '#58a6ff' },
                { l: 'Active', v: stats.activeUsers, c: '#3fb950' },
                { l: 'Messages', v: stats.totalMessages, c: '#d2a8ff' },
              ].map(s => (
                <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: T.muted }}>{s.l}</span>
                  <span style={{ color: s.c, fontWeight: 700 }}>{s.v?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* ── Main ── */}
        <main style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
          {loading && <div style={{ color: T.muted, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><i className="fas fa-spinner fa-spin"></i> Loading…</div>}

          {/* ════ DASHBOARD ════ */}
          {tab === 'dashboard' && stats && (
            <>
              <h2 style={{ margin: '0 0 22px', fontSize: 22, fontWeight: 700 }}>Org Dashboard</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Total Users', val: stats.totalUsers, color: '#58a6ff', icon: 'fa-users' },
                  { label: 'Active Users', val: stats.activeUsers, color: '#3fb950', icon: 'fa-user-check' },
                  { label: 'Total Messages', val: stats.totalMessages, color: '#d2a8ff', icon: 'fa-comment' },
                  { label: 'Conversations', val: stats.totalConversations, color: '#ffa657', icon: 'fa-comments' },
                  { label: 'Flagged', val: stats.flaggedMessages, color: '#da3633', icon: 'fa-flag' },
                ].map(s => (
                  <div key={s.label} style={{ ...card(), padding: '20px 22px', borderTop: `3px solid ${s.color}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val?.toLocaleString()}</div>
                        <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{s.label}</div>
                      </div>
                      <div style={{ width: 38, height: 38, borderRadius: '12px', background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 15 }}></i>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ ...card(), padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Quick Actions</div>
                  {[
                    { label: 'Manage Users', go: 'users', icon: 'fa-users', color: '#58a6ff' },
                    { label: `Review Flagged (${stats.flaggedMessages})`, go: 'flagged', icon: 'fa-flag', color: '#da3633' },
                    { label: 'Send Broadcast', go: 'broadcast', icon: 'fa-bullhorn', color: '#3fb950' },
                  ].map(a => (
                    <button key={a.go} onClick={() => setTab(a.go)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.cardAlt, color: T.text, cursor: 'pointer', fontSize: 13, marginBottom: 8, textAlign: 'left', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = T.hover}
                      onMouseLeave={e => e.currentTarget.style.background = T.cardAlt}>
                      <i className={`fas ${a.icon}`} style={{ color: a.color, width: 16 }}></i>
                      {a.label}
                      <i className="fas fa-chevron-right" style={{ marginLeft: 'auto', color: T.muted, fontSize: 11 }}></i>
                    </button>
                  ))}
                </div>
                <div style={{ ...card(), padding: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>Platform Health</div>
                  {[
                    { label: 'Banned Users', val: stats.totalUsers - stats.activeUsers, color: '#da3633' },
                    { label: 'Conversations', val: stats.totalConversations, color: '#ffa657' },
                    { label: 'Flagged Messages', val: stats.flaggedMessages, color: '#d2a8ff' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 13, color: T.muted }}>{r.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: r.color }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ════ USERS ════ */}
          {tab === 'users' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Org Users <span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>({filtered.length})</span></h2>
                <div style={{ position: 'relative' }}>
                  <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 12 }}></i>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                    style={{ padding: '8px 12px 8px 30px', borderRadius: 8, border: `1px solid ${T.border}`, background: T.inputBg, color: T.text, fontSize: 13, outline: 'none', width: 200 }} />
                </div>
              </div>
              <div style={{ ...card(), overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                      {['User', 'Email', 'Status', 'Role', 'Activity', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => {
                      const isMe = u.id === currentUser?.id;
                      return (
                        <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', transition: 'background 0.12s' }}
                          onMouseEnter={e => e.currentTarget.style.background = T.hover}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'U')}&background=6e40c9&color=fff`}
                                alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{u.fullName}{isMe && <span style={{ fontSize: 10, color: T.accent, marginLeft: 5 }}>You</span>}</div>
                                <div style={{ fontSize: 11, color: T.muted }}>@{u.username}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: T.muted }}>{u.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={badge(u.isActive ? '#3fb950' : '#da3633')}>
                              <i className={`fas fa-circle`} style={{ fontSize: 6 }}></i>
                              {u.isActive ? 'Active' : 'Banned'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={badge(u.isAdmin ? '#a78bfa' : T.muted)}>
                              {u.isAdmin ? '👑 Admin' : '👤 User'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 11, color: T.muted }}>
                            <div style={{ marginBottom: 4 }}>
                              <strong>Login:</strong> {(u.lastLogin && u.lastLogin !== 'null') ? new Date(u.lastLogin).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                            </div>
                            <div>
                              <strong>Seen/Logout:</strong> {u.status?.toLowerCase() === 'online' ? <span style={{ color: '#3fb950', fontWeight: 'bold' }}>Online Now</span> : ((u.lastSeen && u.lastSeen !== 'null') ? new Date(u.lastSeen).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never')}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {isMe ? <span style={{ fontSize: 12, color: T.muted }}>—</span> : (
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {u.isActive
                                  ? <Chip color="#da3633" T={T} onClick={() => run(() => apiClient.adminBanUser(u.id), `${u.fullName} banned`)}>Ban</Chip>
                                  : <Chip color="#3fb950" T={T} onClick={() => run(() => apiClient.adminUnbanUser(u.id), `${u.fullName} unbanned`)}>Unban</Chip>
                                }
                                {u.isAdmin
                                  ? <Chip color="#ffa657" T={T} onClick={() => run(() => apiClient.adminRevokeAdmin(u.id), `Admin revoked`)}>Revoke Admin</Chip>
                                  : <Chip color="#a78bfa" T={T} onClick={() => run(() => apiClient.adminMakeAdmin(u.id), `${u.fullName} is now admin`)}>Make Admin</Chip>
                                }
                                <Chip color="#da3633" T={T} onClick={() => { if (window.confirm(`Delete ${u.fullName}? This cannot be undone.`)) run(() => apiClient.adminDeleteUser(u.id), `${u.fullName} deleted`); }}>Delete</Chip>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: T.muted }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════ FLAGGED ════ */}
          {tab === 'flagged' && (
            <>
              <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Security: Flagged Risks <span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>({flagged.length})</span></h2>
              {flagged.length === 0 ? (
                <div style={{ ...card(), padding: '56px 24px', textAlign: 'center' }}>
                  <i className="fas fa-check-circle" style={{ fontSize: 44, color: '#3fb950', marginBottom: 14 }}></i>
                  <p style={{ color: T.text, fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>All clear!</p>
                  <p style={{ color: T.muted, margin: 0, fontSize: 14 }}>No flagged messages to review.</p>
                </div>
              ) : flagged.map(m => (
                <div key={m.id} style={{ ...card({ marginBottom: 12, borderLeft: '3px solid #da3633', padding: '16px 20px' }) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: '#ffa657', fontSize: 13 }}>{m.senderName || 'Unknown'}</span>
                        <span style={{ color: T.muted, fontSize: 11 }}>{m.timestamp ? new Date(m.timestamp).toLocaleString() : ''}</span>
                      </div>
                      <p style={{ margin: 0, color: T.text, fontSize: 13, lineHeight: 1.5, background: T.cardAlt, padding: '10px 12px', borderRadius: 8 }}>{m.content}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <Chip color="#3fb950" T={T} onClick={() => run(() => apiClient.adminUnflagMessage(m.id), 'Approved')}>✓ Approve</Chip>
                      <Chip color="#da3633" T={T} onClick={() => run(() => apiClient.adminDeleteMessage(m.id), 'Removed')}>✕ Remove</Chip>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ════ CONVERSATIONS ════ */}
          {tab === 'conversations' && (
            <>
              <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Teams & Groups <span style={{ fontSize: 14, color: T.muted, fontWeight: 400 }}>({convs.length})</span></h2>
              <div style={{ ...card(), overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                      {['Name', 'Type', 'Participants', 'Messages', 'Created'].map(h => (
                        <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {convs.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: i < convs.length - 1 ? `1px solid ${T.border}` : 'none', transition: 'background 0.12s', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => openConvMsgs(c)}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13, color: T.text, transition: 'color 0.15s' }}
                          onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.text}>
                          {c.name || '(Direct Message)'}
                        </td>
                        <td style={{ padding: '12px 16px' }}><span style={badge(c.type === 'dm' ? '#58a6ff' : '#3fb950')}>{c.type}</span></td>
                        <td style={{ padding: '12px 16px', color: T.muted, fontSize: 13 }}>{c.participantCount}</td>
                        <td style={{ padding: '12px 16px', color: T.muted, fontSize: 13 }}>{c.messageCount}</td>
                        <td style={{ padding: '12px 16px', color: T.muted, fontSize: 11 }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════ ANALYTICS ════ */}
          {tab === 'analytics' && stats && (
            <>
              <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Call & Meeting Analytics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
                <div style={{ ...card(), padding: 24, borderLeft: '4px solid #3fb950' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14, color: T.muted, textTransform: 'uppercase' }}>Average Audio Latency</h3>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#3fb950' }}>42ms</div>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: T.muted }}>Excellent — 99.8% of calls had zero noticeable lag.</p>
                </div>
                <div style={{ ...card(), padding: 24, borderLeft: '4px solid #58a6ff' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14, color: T.muted, textTransform: 'uppercase' }}>Video Resolution Quality</h3>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#58a6ff' }}>1080p HQ</div>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: T.muted }}>94% of meetings maintained high-definition video feeds.</p>
                </div>
                <div style={{ ...card(), padding: 24, borderLeft: '4px solid #ffa657' }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: 14, color: T.muted, textTransform: 'uppercase' }}>Org Network Health</h3>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#ffa657' }}>98.2%</div>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: T.muted }}>Average uptime across remote participants.</p>
                </div>
              </div>

              {/* User Call Logs */}
              <h3 style={{ margin: '30px 0 15px', fontSize: 18, fontWeight: 700 }}>Select User to View Call History</h3>
              <div style={{ ...card(), overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.cardAlt }}>
                      <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>User</th>
                      <th style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : 'none', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = T.hover}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '12px 16px', cursor: 'pointer' }} onClick={() => openUserCalls(u)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName || 'U')}&background=6e40c9&color=fff`}
                              alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: T.text, transition: 'color 0.15s' }}
                                onMouseEnter={e => e.target.style.color = T.accent} onMouseLeave={e => e.target.style.color = T.text}>
                                {u.fullName}
                              </div>
                              <div style={{ fontSize: 11, color: T.muted }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <Chip color="var(--primary-color)" T={T} onClick={() => openUserCalls(u)}>View Calls</Chip>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={2} style={{ padding: 24, textAlign: 'center', color: T.muted }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════ BROADCAST ════ */}
          {tab === 'broadcast' && (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>📢 Broadcast</h2>
              <p style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>
                Your message will be sent directly to every user's personal chat — they'll see it as a DM from you when they open the app.
              </p>

              <div style={{ ...card({ maxWidth: 640, padding: 28 }) }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <i className="fas fa-edit" style={{ marginRight: 6 }}></i>Message
                </label>
                <textarea
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder="Type your message to all users…  e.g. 'Scheduled maintenance tonight at 11 PM. Thank you!'"
                  rows={5}
                  style={{ width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: '12px', color: T.text, padding: '13px 15px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box', outline: 'none', lineHeight: 1.6, fontFamily: 'inherit', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentSoft}` }}
                  onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13, color: T.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fas fa-paper-plane" style={{ color: T.accent }}></i>
                    Delivered as a personal DM to {stats?.activeUsers ?? '?'} users
                  </div>
                  <button onClick={sendBroadcast} disabled={sending || !msg.trim()}
                    style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: sending || !msg.trim() ? T.border : 'var(--primary-color)', color: sending || !msg.trim() ? T.muted : '#fff', fontWeight: 700, fontSize: 14, cursor: sending || !msg.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sending ? <><i className="fas fa-spinner fa-spin"></i> Sending…</> : <><i className="fas fa-paper-plane"></i> Send to All</>}
                  </button>
                </div>
              </div>

              <div style={{ ...card({ maxWidth: 640, marginTop: 16, padding: '14px 18px', borderLeft: `3px solid ${T.accent}` }) }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 8 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 6 }}></i>How it works
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: T.muted, fontSize: 13, lineHeight: 2 }}>
                  <li>Creates a personal DM from your account to each user</li>
                  <li>Users online right now receive it instantly in their chat</li>
                  <li>Offline users see it next time they open the app</li>
                  <li>Message appears in their sidebar with your name</li>
                </ul>
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Modal Portal ── */}
      {modalType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s' }}
          onClick={() => setModalType(null)}>
          <div style={{ width: 640, maxWidth: '90%', maxHeight: '85vh', background: T.card, borderRadius: '16px', boxShadow: 'var(--shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.cardAlt }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: T.text }}>{modalTitle}</h3>
              <button onClick={() => setModalType(null)} style={{ background: 'transparent', border: 'none', color: T.muted, fontSize: 18, cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#da3633'} onMouseLeave={e => e.target.style.color = T.muted}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ padding: 0, overflowY: 'auto', flex: 1, background: T.page }}>
              {loadingModal && <div style={{ padding: '40px', textAlign: 'center', color: T.muted }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>}
              {!loadingModal && modalData && modalType === 'userCalls' && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {modalData.length === 0 ? <tr><td style={{ padding: 36, textAlign: 'center', color: T.muted }}>No calls found for this user.</td></tr> : modalData.map((c, i) => (
                      <tr key={c.id} style={{ borderBottom: i < modalData.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, color: T.text, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <i className={`fas fa-${c.callType === 'video' ? 'video' : 'phone-alt'}`} style={{ color: 'var(--primary-color)' }}></i>
                              {c.callType} Call
                            </span>
                            <span style={{ fontSize: 12, color: T.muted }}>{new Date(c.startedAt).toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: T.muted, alignItems: 'center' }}>
                            <span style={{ color: c.status === 'completed' ? '#3fb950' : '#da3633', fontWeight: 600, padding: '2px 8px', background: c.status === 'completed' ? '#3fb95015' : '#da363315', borderRadius: 12 }}>
                              {c.status}
                            </span>
                            {c.duration > 0 && <span>Duration: {Math.floor(c.duration / 60)}m {c.duration % 60}s</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!loadingModal && modalData && modalType === 'convMsgs' && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {modalData.length === 0 ? <div style={{ textAlign: 'center', padding: 36, color: T.muted }}>No messages in this conversation yet.</div> : modalData.map(m => (
                    <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color), #a855f7)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {m.senderName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, background: T.card, border: `1px solid ${m.isFlagged ? '#da363355' : T.border}`, padding: '12px 16px', borderRadius: '0 12px 12px 12px', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
                        {m.isFlagged && <div style={{ position: 'absolute', top: -8, right: -8, background: '#da3633', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>FLAGGED</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{m.senderName}</span>
                          <span style={{ fontSize: 11, color: T.muted }}>{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, wordBreak: 'break-word', opacity: m.isDeleted ? 0.6 : 1 }}>
                          {m.isDeleted ? <span style={{ fontStyle: 'italic' }}><i className="fas fa-ban" style={{ marginRight: 6 }}></i>Message deleted</span> : m.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Small action button
function Chip({ color, T, onClick, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${color}44`, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: hov ? color + '33' : color + '15', color, transition: 'var(--transition-fast)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
      {children}
    </button>
  );
}