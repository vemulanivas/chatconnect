import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import * as actions from '../store/actions/actionCreators';

const WS_URL = process.env.REACT_APP_WS_URL || 'wss://chatconnect-b5c9amhye7gpdfeb.southeastasia-01.azurewebsites.net/ws';

// Register the notification service worker once
let swRegistration = null;
const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator && !swRegistration) {
    try {
      swRegistration = await navigator.serviceWorker.register('/sw-notifications.js');
      console.log('[SW] Notification service worker registered');
    } catch (e) {
      console.warn('[SW] Service worker registration failed:', e);
    }
  }
  return swRegistration;
};

// Show notification via service worker (with reply action) or fallback
const showRichNotification = async (title, body, data = {}) => {
  let reg = swRegistration || await registerServiceWorker();
  // Wait for the SW to become active if it's installing
  if (reg && !reg.active && reg.installing) {
    await new Promise(resolve => {
      reg.installing.addEventListener('statechange', function handler() {
        if (reg.active) { resolve(); reg.installing?.removeEventListener('statechange', handler); }
      });
    });
  }
  if (reg && reg.active) {
    reg.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      icon: '/favicon.ico',
      conversationId: String(data.conversationId), // Ensure conversationId is a string
      senderId: String(data.senderId), // Ensure senderId is a string
      senderName: data.senderName,
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    // Fallback — still persist until clicked
    new Notification(title, { body, icon: '/favicon.ico', requireInteraction: true });
  }
};

export const useWebSocket = (token, currentUser, activeConversation) => {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectCount = useRef(0);
  const dispatch = useDispatch();
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const activeConvRef = useRef(activeConversation);
  activeConvRef.current = activeConversation;

  // Stable event handler — no deps that change
  const handleEvent = useCallback((data) => {
    const d = dispatchRef.current;
    switch (data.type) {
      case 'message':
        if (data.message) {
          d(actions.receiveMessage(data.message));
          
          const isFromMe = String(data.message.senderId) === String(userRef.current?.id);
          const isFromActiveChat = activeConvRef.current && String(activeConvRef.current.id) === String(data.message.conversationId);
          const isFocused = document.hasFocus();

          console.log(`[WS] Message from ${data.message.senderName}. Active: ${activeConvRef.current?.id}. Match: ${isFromActiveChat}`);

          // 🛑 NEVER show notifications for our own messages
          if (isFromMe) break;

          // 1. OS-Level Browser Notification
          // Only show if the user is NOT looking at the tab
          if (!isFocused && Notification.permission === 'granted') {
            showRichNotification(
              data.message.senderName || 'New Message',
              data.message.content || 'New message',
              {
                conversationId: String(data.message.conversationId), // Ensure conversationId is a string
                senderId: String(data.message.senderId), // Ensure senderId is a string
                senderName: data.message.senderName,
              }
            );
          }
          
          // 2. In-App Custom Toast
          // Only show if we are NOT in the active chat (so we know something happened elsewhere)
          // AND either we are focused (so we see it now) or we want it preserved for later
          if (!isFromActiveChat) {
            d(actions.addNotification({
              id: 'msg-' + Date.now(),
              type: 'message',
              title: data.message.senderName || 'New Message',
              content: data.message.content?.substring(0, 80) || 'Sent a message',
              conversationId: String(data.message.conversationId), // Ensure conversationId is a string
              timestamp: new Date().toISOString(),
              read: false,
            }));
          }
        }
        break;

      case 'message-edit':
        if (data.messageId && data.newContent) {
          d(actions.editMessage(data.messageId, data.newContent));
        }
        break;

      case 'presence':
        d(actions.updateUserPresence(data.userId, data.status, data.lastSeen));
        break;

      case 'typing':
        d(actions.setRemoteTyping(data.userId, String(data.conversationId), data.isTyping)); // Ensure conversationId is a string
        // Auto-clear typing after 4 seconds if no stop event arrives
        if (data.isTyping) {
          const key = `typing-timeout-${String(data.conversationId)}-${data.userId}`; // Ensure conversationId is a string
          if (window[key]) clearTimeout(window[key]);
          window[key] = setTimeout(() => {
            d(actions.setRemoteTyping(data.userId, String(data.conversationId), false)); // Ensure conversationId is a string
          }, 4000);
        }
        break;

      case 'read':
        d(actions.markReadReceipt(data.userId, String(data.conversationId), data.messageId)); // Ensure conversationId is a string
        break;

      case 'reaction':
        if (data.action === 'added') {
          d(actions.addReaction(data.messageId, data.emoji, data.userId));
        } else {
          d(actions.removeReaction(data.messageId, data.emoji, data.userId));
        }
        break;

      case 'broadcast':
        d(actions.addNotification({
          id: Date.now().toString(),
          type: 'info',
          title: data.title || '\ud83d\udce2 Announcement',
          content: data.message,
          timestamp: new Date().toISOString(),
          read: false,
        }));
        if (!document.hasFocus() && Notification.permission === 'granted') {
          showRichNotification(
            data.title || '\ud83d\udce2 Admin Announcement',
            data.message,
            {}
          );
        }
        break;

      case 'call-offer':
      case 'call-answer':
      case 'call-ice-candidate':
      case 'call-end':
        window.dispatchEvent(new CustomEvent('webrtc-signal', { detail: data }));
        break;

      default:
        break;
    }
  }, []); // stable — uses ref for dispatch

  // connect is stable too — uses refs for everything that changes
  const tokenRef = useRef(token);
  const userRef = useRef(currentUser);
  tokenRef.current = token;
  userRef.current = currentUser;

  const connect = useCallback(() => {
    const activeToken = tokenRef.current || localStorage.getItem('authToken');
    if (!activeToken || !userRef.current) return;

    // Don't open a new socket if one is already open or connecting
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) return;

    try {
      ws.current = new WebSocket(`${WS_URL}?token=${activeToken}`);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        reconnectCount.current = 0;

        const ping = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          } else {
            clearInterval(ping);
          }
        }, 30000);

        ws.current._pingInterval = ping;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent(data);
        } catch (e) { }
      };

      ws.current.onclose = (e) => {
        clearInterval(ws.current?._pingInterval);
        if (e.code === 4001) {
          console.warn('[WS] Auth failed, not reconnecting');
          return;
        }
        const delay = Math.min(3000 * Math.pow(2, reconnectCount.current), 30000);
        reconnectCount.current += 1;
        console.log(`[WS] Closed. Reconnecting in ${delay / 1000}s...`);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.current.onerror = () => {
        ws.current?.close();
      };
    } catch (e) {
      const delay = Math.min(3000 * Math.pow(2, reconnectCount.current), 30000);
      reconnectCount.current += 1;
      reconnectTimer.current = setTimeout(connect, delay);
    }
  }, [handleEvent]);

  const sendEvent = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const sendTyping = useCallback((conversationId, targetUserIds, isTyping) => {
    sendEvent({ type: 'typing', conversationId, targetUserIds, isTyping });
  }, [sendEvent]);

  const sendRead = useCallback((conversationId, messageId, targetUserIds) => {
    sendEvent({ type: 'read', conversationId, messageId, targetUserIds });
  }, [sendEvent]);

  const sendMessage = useCallback((message, targetUserIds) => {
    sendEvent({ type: 'message', message, targetUserIds });
  }, [sendEvent]);

  useEffect(() => {
    // Request browser notification permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Register service worker for rich notifications
    registerServiceWorker();

    // Listen for messages from the service worker (e.g., reply click)
    const handleSWMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_REPLY_FOCUS') {
        window.focus();
        window.dispatchEvent(new CustomEvent('notification-focus', { detail: event.data }));
      } else if (event.data?.type === 'NOTIFICATION_CLICK') {
        window.focus();
        window.dispatchEvent(new CustomEvent('notification-focus', { detail: event.data }));
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    if (token && currentUser?.id) {
      connect();
    }

    return () => {
      clearTimeout(reconnectTimer.current);
      clearInterval(ws.current?._pingInterval);
      ws.current?.close();
      ws.current = null;
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [token, currentUser?.id, connect]);

  const requestNotificationPermission = useCallback(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, []);

  return { sendTyping, sendRead, sendMessage, sendEvent, requestNotificationPermission };
};