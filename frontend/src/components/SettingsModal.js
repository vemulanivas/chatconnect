import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks';
import apiClient from '../utils/apiClient';

function SettingsModal({ currentUser, darkMode, onToggleDarkMode, onClose }) {
  const navigate = useNavigate();
  const [activatingAdmin, setActivatingAdmin] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [saving, setSaving] = useState(false);

  const { updateStatus } = useAuth();

  const statusOptions = [
    { value: 'online', label: 'Available', icon: 'fa-check-circle', color: '#22c55e', desc: 'Show as active' },
    { value: 'busy', label: 'Busy', icon: 'fa-minus-circle', color: '#ef4444', desc: 'Only urgent notifications' },
    { value: 'away', label: 'Away', icon: 'fa-clock', color: '#f59e0b', desc: 'Show as away' },
    { value: 'dnd', label: 'Do Not Disturb', icon: 'fa-ban', color: '#ef4444', desc: 'Mute all notifications' },
    { value: 'offline', label: 'Appear Offline', icon: 'fa-circle', color: '#6b7280', desc: 'Invisible mode' },
  ];

  const currentStatus = statusOptions.find(s => s.value === currentUser?.status) || statusOptions[0];

  async function activateAdmin() {
    setActivatingAdmin(true);
    try {
      const res = await fetch('http://localhost:8000/api/admin/setup-first-admin', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setAdminMsg('\u2705 Admin activated! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setAdminMsg('\u2139\uFE0F ' + (data.detail || 'Already admin'));
      }
    } catch (e) {
      setAdminMsg('Error: ' + e.message);
    }
    setActivatingAdmin(false);
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await apiClient.updateProfile({ full_name: fullName, bio });
      setEditMode(false);
      setTimeout(() => window.location.reload(), 500);
    } catch (e) {
      console.error('Profile update failed:', e);
    }
    setSaving(false);
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', borderRadius: '20px' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', padding: '20px 24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px' }}>
            <i className="fas fa-cog" style={{ color: 'var(--primary-color)' }}></i> Settings
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '0' }}>
          {/* Profile Card */}
          <div style={{ padding: '24px', background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ position: 'relative' }}>
                <img
                  src={currentUser?.avatar}
                  alt="Profile"
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--primary-color)' }}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullName || 'User')}&background=667eea&color=fff&size=128`;
                  }}
                />
                <span style={{
                  position: 'absolute', bottom: '2px', right: '2px',
                  width: '14px', height: '14px', borderRadius: '50%',
                  background: currentStatus.color,
                  border: '2px solid var(--bg-primary)'
                }}></span>
              </div>
              <div style={{ flex: 1 }}>
                {editMode ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <input value={fullName} onChange={e => setFullName(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                      placeholder="Full Name" />
                    <input value={bio} onChange={e => setBio(e.target.value)}
                      style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }}
                      placeholder="Bio / Status message" />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={handleSaveProfile} disabled={saving}
                        style={{ padding: '6px 16px', borderRadius: '8px', background: 'var(--primary-color)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditMode(false)}
                        style={{ padding: '6px 16px', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '13px' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{currentUser?.fullName}</h3>
                      <button onClick={() => setEditMode(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', fontSize: '12px', padding: '2px 6px' }}>
                        <i className="fas fa-pen"></i>
                      </button>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {currentUser?.bio || 'Hey there! I am using ChatConnect'}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>@{currentUser?.username}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status Selector */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-signal" style={{ marginRight: '8px' }}></i>Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {statusOptions.map(opt => (
                <button key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px', borderRadius: '10px', border: 'none',
                    background: currentUser?.status === opt.value ? 'rgba(102,126,234,0.12)' : 'transparent',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (currentUser?.status !== opt.value) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                  onMouseLeave={e => { if (currentUser?.status !== opt.value) e.currentTarget.style.background = 'transparent'; }}
                >
                  <i className={`fas ${opt.icon}`} style={{ color: opt.color, fontSize: '16px', width: '20px', textAlign: 'center' }}></i>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{opt.desc}</div>
                  </div>
                  {currentUser?.status === opt.value && (
                    <i className="fas fa-check" style={{ marginLeft: 'auto', color: 'var(--primary-color)', fontSize: '14px' }}></i>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Appearance */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-palette" style={{ marginRight: '8px' }}></i>Appearance
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className={`fas fa-${darkMode ? 'moon' : 'sun'}`} style={{ fontSize: '18px', color: darkMode ? '#a78bfa' : '#f59e0b' }}></i>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>Dark Mode</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{darkMode ? 'Currently using dark theme' : 'Currently using light theme'}</div>
                </div>
              </div>
              <label className="switch-label" style={{ margin: 0 }}>
                <div className="toggle-switch">
                  <input type="checkbox" checked={darkMode} onChange={onToggleDarkMode} />
                  <span className="slider"></span>
                </div>
              </label>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <i className="fas fa-keyboard" style={{ marginRight: '8px' }}></i>Keyboard Shortcuts
            </h4>
            <div style={{ display: 'grid', gap: '6px', fontSize: '13px' }}>
              {[
                { keys: 'Enter', desc: 'Send message' },
                { keys: 'Shift + Enter', desc: 'New line' },
                { keys: '**text**', desc: 'Bold text' },
                { keys: '*text*', desc: 'Italic text' },
                { keys: '`code`', desc: 'Inline code' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{s.desc}</span>
                  <code style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>{s.keys}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Section */}
          {currentUser?.username === 'nivas' && !currentUser?.isAdmin && (
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <button onClick={activateAdmin} disabled={activatingAdmin}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <i className="fas fa-shield-alt"></i>
                {activatingAdmin ? 'Activating...' : 'Activate Admin Access'}
              </button>
              {adminMsg && <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>{adminMsg}</p>}
            </div>
          )}

          {currentUser?.isAdmin && (
            <div style={{ padding: '16px 24px' }}>
              <button
                onClick={() => { onClose(); navigate('/admin'); }}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '12px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: '#fff', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '14px', display: 'flex',
                  alignItems: 'center', gap: '8px', justifyContent: 'center'
                }}
              >
                <i className="fas fa-shield-alt"></i>
                Open Admin Panel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;