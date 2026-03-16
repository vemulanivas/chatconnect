import React, { useEffect, useState } from 'react';
import { useNotifications } from '../hooks';

// Inject styles once
const STYLE_ID = 'toast-styles';
if (!document.getElementById(STYLE_ID)) {
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #toast-root {
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 999999 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      pointer-events: none !important;
      max-width: 380px !important;
    }
    .toast-item {
      pointer-events: all !important;
      display: flex !important;
      align-items: flex-start !important;
      gap: 10px !important;
      padding: 14px 16px !important;
      border-radius: 14px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.22) !important;
      min-width: 300px !important;
      max-width: 380px !important;
      cursor: pointer !important;
      transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1) !important;
      position: relative !important;
      overflow: hidden !important;
      border: 1px solid rgba(255,255,255,0.15) !important;
      backdrop-filter: blur(12px) !important;
    }
    .toast-enter { transform: translateX(110%) scale(0.9); opacity: 0; }
    .toast-visible { transform: translateX(0) scale(1); opacity: 1; }
    .toast-leave { transform: translateX(110%) scale(0.9); opacity: 0; }
    .toast-success { background: rgba(26,46,26,0.95) !important; border-left: 4px solid #22c55e !important; }
    .toast-error   { background: rgba(46,26,26,0.95) !important; border-left: 4px solid #ef4444 !important; }
    .toast-warning { background: rgba(46,38,26,0.95) !important; border-left: 4px solid #f59e0b !important; }
    .toast-info    { background: rgba(26,31,46,0.95) !important; border-left: 4px solid #3b82f6 !important; }
    .toast-call    { background: rgba(30,26,46,0.95) !important; border-left: 4px solid #8b5cf6 !important; }
    .toast-message { background: rgba(20,30,40,0.97) !important; border-left: 4px solid #06b6d4 !important; }
    .toast-icon {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 14px;
    }
    .toast-success .toast-icon { background: rgba(34,197,94,0.2); color: #22c55e; }
    .toast-error   .toast-icon { background: rgba(239,68,68,0.2);  color: #ef4444; }
    .toast-warning .toast-icon { background: rgba(245,158,11,0.2); color: #f59e0b; }
    .toast-info    .toast-icon { background: rgba(59,130,246,0.2); color: #3b82f6; }
    .toast-call    .toast-icon { background: rgba(139,92,246,0.2); color: #8b5cf6; }
    .toast-message .toast-icon { background: rgba(6,182,212,0.2);  color: #06b6d4; }
    .toast-body { flex: 1; min-width: 0; }
    .toast-title { font-weight: 600; font-size: 13px; color: #f9fafb; margin: 0 0 2px 0; }
    .toast-text  { font-size: 12px; color: #9ca3af; margin: 0; word-break: break-word; }
    .toast-close {
      background: none; border: none; cursor: pointer;
      color: #6b7280; padding: 0; font-size: 11px;
      flex-shrink: 0; line-height: 1; transition: color 0.2s;
    }
    .toast-close:hover { color: #d1d5db; }
    .toast-actions {
      display: flex; gap: 6px; margin-top: 8px;
    }
    .toast-action-btn {
      padding: 4px 12px; border-radius: 6px; border: none;
      font-size: 11px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .toast-action-btn.primary {
      background: #06b6d4; color: #fff;
    }
    .toast-action-btn.primary:hover { background: #0891b2; }
    .toast-action-btn.secondary {
      background: rgba(255,255,255,0.1); color: #d1d5db;
    }
    .toast-action-btn.secondary:hover { background: rgba(255,255,255,0.2); }
    .toast-progress {
      position: absolute; bottom: 0; left: 0; height: 3px;
      animation: toastBar var(--toast-duration, 5s) linear forwards;
    }
    .toast-success .toast-progress { background: #22c55e; }
    .toast-error   .toast-progress { background: #ef4444; }
    .toast-warning .toast-progress { background: #f59e0b; }
    .toast-info    .toast-progress { background: #3b82f6; }
    .toast-call    .toast-progress { background: #8b5cf6; }
    .toast-message .toast-progress { background: #06b6d4; }
    @keyframes toastBar { from { width: 100%; } to { width: 0; } }
  `;
  document.head.appendChild(style);
}

const ICONS = {
  success: 'fa-check-circle',
  error: 'fa-times-circle',
  warning: 'fa-exclamation-triangle',
  call: 'fa-phone',
  message: 'fa-comment-dots',
  info: 'fa-info-circle',
};

function Toast({ notification, onDismiss, onMarkRead }) {
  const [phase, setPhase] = useState('toast-enter');
  const isMessage = notification.type === 'message';
  // Messages stay for 20 seconds, others 5 seconds
  const duration = isMessage ? 20000 : 5000;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('toast-visible'), 20);
    const t2 = setTimeout(() => {
      setPhase('toast-leave');
      setTimeout(() => onDismiss(notification.id), 350);
    }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [notification.id, onDismiss, duration]);

  const dismiss = () => {
    setPhase('toast-leave');
    setTimeout(() => onDismiss(notification.id), 350);
  };

  const handleMarkRead = (e) => {
    e.stopPropagation();
    if (onMarkRead) onMarkRead(notification);
    dismiss();
  };

  const type = notification.type || 'info';
  const icon = ICONS[type] || ICONS.info;

  return (
    <div className={`toast-item toast-${type} ${phase}`} onClick={dismiss}>
      <div className="toast-icon">
        <i className={`fas ${icon}`}></i>
      </div>
      <div className="toast-body">
        {notification.title && <p className="toast-title">{notification.title}</p>}
        <p className="toast-text">{notification.content || notification.message || ''}</p>
        {isMessage && (
          <div className="toast-actions">
            <button className="toast-action-btn primary" onClick={handleMarkRead}>
              ✓ Mark as Read
            </button>
            <button className="toast-action-btn secondary" onClick={(e) => { e.stopPropagation(); dismiss(); }}>
              Dismiss
            </button>
          </div>
        )}
      </div>
      <button className="toast-close" type="button" onClick={(e) => { e.stopPropagation(); dismiss(); }}>
        <i className="fas fa-times"></i>
      </button>
      <div className="toast-progress" style={{ '--toast-duration': `${duration / 1000}s` }} />
    </div>
  );
}

function NotificationContainer() {
  const { notifications, dismiss } = useNotifications();

  const handleMarkRead = (notification) => {
    if (notification.conversationId) {
      // Import dynamically to avoid circular deps
      import('../utils/apiClient').then(mod => {
        mod.default.markConversationRead(notification.conversationId).catch(() => { });
      });
    }
  };

  return (
    <div id="toast-root">
      {notifications.map(n => (
        <Toast key={n.id} notification={n} onDismiss={dismiss} onMarkRead={handleMarkRead} />
      ))}
    </div>
  );
}

export default NotificationContainer;