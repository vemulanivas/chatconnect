import * as actions from './actionCreators';
import apiClient from '../../utils/apiClient';

// ========================================
// AUTH THUNKS
// ========================================

export const loginUser = (username, password) => {
  return async (dispatch) => {
    dispatch(actions.loginRequest());
    try {
      const data = await apiClient.login(username, password);
      dispatch(actions.loginSuccess(data.user));
      dispatch(loadInitialData());
      return { success: true, user: data.user };
    } catch (error) {
      dispatch(actions.loginFailure(error.message));
      return { success: false, error: error.message };
    }
  };
};

export const signupUser = (userData) => {
  return async (dispatch) => {
    dispatch(actions.signupRequest());
    try {
      const data = await apiClient.register(userData);
      // Treat signup same as login - auto authenticate
      dispatch(actions.loginSuccess(data.user));
      dispatch(loadInitialData());
      return { success: true, user: data.user };
    } catch (error) {
      const msg = error.message || 'Registration failed';
      dispatch(actions.signupFailure(msg));
      return { success: false, error: msg };
    }
  };
};

export const deleteConversationThunk = (convId) => {
  return async (dispatch) => {
    try {
      await apiClient.deleteConversation(convId);
      // Clear messages for this conversation from Redux
      dispatch({ type: 'CLEAR_CONVERSATION_MESSAGES', payload: convId });
      dispatch(actions.removeConversation(convId));
      dispatch(actions.clearActiveConversation());
      return { success: true };
    } catch (error) {
      console.error('[DeleteConv] API error:', error.message);
      return { success: false, error: error.message };
    }
  };
};

export const logoutUser = () => {
  return async (dispatch) => {
    try {
      await apiClient.logout();
    } catch (e) { }
    dispatch(actions.logout());
    dispatch(actions.clearActiveConversation());
    return { success: true };
  };
};

export const checkAuthStatus = () => {
  return async (dispatch) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return { isAuthenticated: false };
      // Always fetch fresh user from backend — never trust localStorage for user data
      const user = await apiClient.getMe();
      if (user) {
        // Update localStorage with fresh data
        localStorage.setItem('currentUser', JSON.stringify(user));
        dispatch(actions.checkAuth(user));
        dispatch(loadInitialData());
        return { isAuthenticated: true, user };
      }
      return { isAuthenticated: false };
    } catch (error) {
      apiClient.clearToken && apiClient.clearToken();
      localStorage.removeItem('currentUser');
      return { isAuthenticated: false };
    }
  };
};

export const updateCurrentUserStatus = (status) => {
  return async (dispatch) => {
    try {
      await apiClient.updateProfile({ status });
      dispatch(actions.updateUserStatus(status));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

// ========================================
// DATA LOADING THUNKS
// ========================================

export const loadInitialData = () => {
  return async (dispatch) => {
    dispatch(actions.loadUsersRequest());
    dispatch(actions.loadConversationsRequest());
    try {
      const [users, conversations, callHistory] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getConversations(),
        apiClient.getCallHistory(),
      ]);
      dispatch(actions.loadUsersSuccess(users));
      dispatch(actions.loadConversationsSuccess(conversations));
      dispatch(actions.loadCallHistory(callHistory));
      // Sync unread counts from backend for all conversations
      conversations.forEach(conv => {
        if (conv.unreadCount !== undefined) {
          dispatch({ type: 'SET_UNREAD_COUNT', payload: { conversationId: conv.id, count: conv.unreadCount } });
        }
      });
      return { success: true };
    } catch (error) {
      dispatch(actions.loadUsersFailure(error.message));
      dispatch(actions.loadConversationsFailure(error.message));
      return { success: false, error: error.message };
    }
  };
};

// ========================================
// CHAT THUNKS
// ========================================

export const createNewChannel = (name, description, privacy) => {
  return async (dispatch) => {
    dispatch(actions.createChannelRequest());
    try {
      const conv = await apiClient.createGroup(name, description, [], 'channel');
      dispatch(actions.createChannelSuccess(conv));
      const conversations = await apiClient.getConversations();
      dispatch(actions.loadConversationsSuccess(conversations));
      return { success: true, channel: conv };
    } catch (error) {
      dispatch(actions.createChannelFailure(error.message));
      return { success: false, error: error.message };
    }
  };
};

export const startNewConversation = (userId) => {
  return async (dispatch) => {
    try {
      const conversation = await apiClient.createDM(userId);
      dispatch(actions.startConversation(conversation));
      const conversations = await apiClient.getConversations();
      dispatch(actions.loadConversationsSuccess(conversations));
      return { success: true, conversation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const startNewChannelConversation = (channelId) => {
  return async (dispatch) => {
    try {
      const conversation = await apiClient.getConversation(channelId);
      dispatch(actions.startChannelConversation(conversation));
      return { success: true, conversation };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const setActiveChat = (conversation) => {
  return async (dispatch) => {
    dispatch(actions.setActiveConversation(conversation));
    if (conversation) {
      dispatch(actions.markAllAsRead(conversation.id));
      // Only load messages for real backend IDs (UUIDs), not old mock IDs
      const isRealId = conversation.id && !conversation.id.startsWith('conv');
      if (isRealId) {
        dispatch(loadMessagesForConversation(conversation.id));
      }
    }
    return { success: true };
  };
};

export const loadMessagesForConversation = (conversationId) => {
  return async (dispatch) => {
    dispatch(actions.loadMessagesRequest());
    try {
      const messages = await apiClient.getMessages(conversationId);
      dispatch(actions.loadMessagesSuccess(messages));
      return { success: true, messages };
    } catch (error) {
      dispatch(actions.loadMessagesFailure(error.message));
      return { success: false, error: error.message };
    }
  };
};

// ========================================
// MESSAGE THUNKS
// ========================================

export const sendNewMessage = (conversationId, content, type = 'text', metadata = {}) => {
  return async (dispatch) => {
    dispatch(actions.sendMessageRequest());
    try {
      const message = await apiClient.sendMessage(conversationId, content, type, metadata);
      dispatch(actions.sendMessageSuccess(message));
      // Optimistically update the conversation's lastMessage instead of refetching all
      dispatch(actions.updateConversation({
        id: conversationId,
        lastMessage: {
          content: message.content,
          type: message.type,
          senderId: message.senderId,
          timestamp: message.timestamp,
        },
        updatedAt: message.timestamp,
      }));
      return { success: true, message };
    } catch (error) {
      dispatch(actions.sendMessageFailure(error.message));
      return { success: false, error: error.message };
    }
  };
};

export const editExistingMessage = (messageId, newContent) => {
  return async (dispatch, getState) => {
    try {
      const updatedMessage = await apiClient.editMessage(messageId, newContent);
      dispatch(actions.editMessage(messageId, newContent));
      return { success: true, message: updatedMessage };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const deleteExistingMessage = (messageId) => {
  return async (dispatch) => {
    try {
      await apiClient.deleteMessage(messageId);
      dispatch(actions.deleteMessage(messageId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const addMessageReaction = (messageId, emoji) => {
  return async (dispatch, getState) => {
    try {
      const { auth } = getState();
      const userId = auth.currentUser?.id;

      const res = await apiClient.reactToMessage(messageId, emoji);

      // Locally dispatch for immediate UI response
      // Check if it was added or removed
      if (res.action === 'added') {
        dispatch(actions.addReaction(messageId, emoji, userId));
      } else {
        dispatch(actions.removeReaction(messageId, emoji, userId));
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const toggleMessagePin = (messageId) => {
  return async (dispatch) => {
    try {
      const result = await apiClient.pinMessage(messageId);
      if (result.pinned) {
        dispatch(actions.pinMessage(messageId));
      } else {
        dispatch(actions.unpinMessage(messageId));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const toggleMessageBookmark = (messageId) => {
  return async (dispatch) => {
    try {
      const result = await apiClient.bookmarkMessage(messageId);
      if (result.bookmarked) {
        dispatch(actions.bookmarkMessage(messageId));
      } else {
        dispatch(actions.unbookmarkMessage(messageId));
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const searchMessages = (query) => {
  return async (dispatch) => {
    dispatch(actions.setSearchQuery(query));
    return { success: true };
  };
};

// ========================================
// USER INTERACTION THUNKS
// ========================================

export const blockUserAction = (userId) => {
  return async (dispatch) => {
    try {
      await apiClient.blockUser(userId);
      // Immediately update Redux state with blocked user ID
      dispatch(actions.blockUser(userId));
      dispatch(actions.clearActiveConversation());
      // Refresh users list so isBlocked flags are updated
      const users = await apiClient.getUsers();
      dispatch(actions.loadUsersSuccess(users));
      return { success: true };
    } catch (error) {
      console.error('[BLOCK] Error:', error);
      return { success: false, error: error.message };
    }
  };
};

export const unblockUserAction = (userId) => {
  return async (dispatch) => {
    try {
      await apiClient.unblockUser(userId);
      dispatch(actions.unblockUser(userId));
      const users = await apiClient.getUsers();
      dispatch(actions.loadUsersSuccess(users));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const muteChatAction = (conversationId) => {
  return async (dispatch) => {
    dispatch(actions.muteChat(conversationId));
    return { success: true };
  };
};

export const unmuteChatAction = (conversationId) => {
  return async (dispatch) => {
    dispatch(actions.unmuteChat(conversationId));
    return { success: true };
  };
};

// ========================================
// CALL THUNKS
// ========================================

export const startNewCall = (callData) => {
  return async (dispatch) => {
    try {
      dispatch(actions.startCall(callData));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const endCurrentCall = (callData = null) => {
  return async (dispatch) => {
    // Always end the call in Redux first — never block the UI
    dispatch(actions.endCall());

    if (!callData) return { success: true };

    try {
      const payload = {
        conversationId: callData.conversationId || null,
        type: callData.type || callData.callType || 'audio',
        participants: (callData.participants || [])
          .map(p => (typeof p === 'object' ? p.id : p))
          .filter(id => id && typeof id === 'string' && id.length > 8),
        duration: callData.duration || 0,
        status: callData.status || (callData.duration > 0 ? 'completed' : 'missed'),
      };

      const callRecord = await apiClient.createCall(payload);
      dispatch(actions.addCallHistory(callRecord));

      // Inject call into chat conversation if possible
      if (payload.conversationId) {
        const dStr = payload.duration > 0 ? `${Math.floor(payload.duration / 60)}m ${payload.duration % 60}s` : 'Missed';
        const typeStr = payload.type === 'video' ? 'Video call' : payload.type === 'screen' ? 'Screen share' : 'Audio call';
        try {
          // This will automatically broadcast to the websocket and render in the UI
          await apiClient.sendMessage(payload.conversationId, `${typeStr} - ${dStr}`, 'call', { callType: payload.type, duration: payload.duration });
        } catch (e) { }
      }

      // Silently refresh history in background
      apiClient.getCallHistory()
        .then(history => dispatch(actions.loadCallHistory(history)))
        .catch(() => { });

      return { success: true };
    } catch (error) {
      // Backend save failed — log but don't crash the UI
      console.warn('[CALL] Could not save call record (is the backend running?):', error.message);
      return { success: false, error: error.message };
    }
  };
};

export const loadCallHistoryData = () => {
  return async (dispatch) => {
    try {
      const history = await apiClient.getCallHistory();
      dispatch(actions.loadCallHistory(history));
      return { success: true, history };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const deleteCallHistoryItem = (callId) => {
  return async (dispatch) => {
    try {
      await apiClient.deleteCall(callId);
      dispatch(actions.deleteCallHistory(callId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

// ========================================
// UI THUNKS
// ========================================

export const toggleTheme = () => {
  return async (dispatch, getState) => {
    try {
      const { ui } = getState();
      const newDarkMode = !ui.darkMode;
      localStorage.setItem('darkMode', newDarkMode.toString());
      if (newDarkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
      dispatch(actions.toggleDarkMode());
      return { success: true, darkMode: newDarkMode };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const initializeTheme = () => {
  return async (dispatch) => {
    try {
      const isDark = localStorage.getItem('darkMode') === 'true';
      if (isDark) {
        document.body.classList.add('dark-mode');
        dispatch({ type: 'SET_INITIAL_DARK_MODE', payload: true });
      }
      return { success: true, darkMode: isDark };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

// ========================================
// NOTIFICATION THUNKS
// ========================================

export const showNotification = (notification) => {
  return async (dispatch) => {
    try {
      const newNotification = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        read: false,
        ...notification,
      };
      dispatch(actions.addNotification(newNotification));
      // Message notifications persist longer (20s), others 5s
      const timeout = newNotification.type === 'message' ? 20000 : 5000;
      setTimeout(() => {
        dispatch(actions.removeNotification(newNotification.id));
      }, timeout);
      return { success: true, notification: newNotification };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};

export const dismissNotification = (notificationId) => {
  return async (dispatch) => {
    dispatch(actions.removeNotification(notificationId));
    // Only call backend for real DB notification IDs (UUIDs), not frontend timestamp IDs
    const isRealDbId = notificationId && !String(notificationId).match(/^\d{10,}$/);
    if (isRealDbId) {
      apiClient.markNotificationRead(notificationId).catch(() => { });
    }
    return { success: true };
  };
};

// ========================================
// TYPING INDICATOR THUNKS
// ========================================

let typingTimeout = null;

export const setUserTyping = (conversationId, isTyping) => {
  return async (dispatch) => {
    try {
      dispatch(actions.setTypingStatus(conversationId, isTyping));
      if (typingTimeout) clearTimeout(typingTimeout);
      if (isTyping) {
        typingTimeout = setTimeout(() => {
          dispatch(actions.setTypingStatus(conversationId, false));
        }, 3000);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };
};