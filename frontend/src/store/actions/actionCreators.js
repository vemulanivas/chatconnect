import * as types from './types';

// ========================================
// AUTH ACTION CREATORS
// ========================================
export const loginRequest = () => ({ type: types.AUTH_LOGIN_REQUEST });
export const loginSuccess = (user) => ({ type: types.AUTH_LOGIN_SUCCESS, payload: user });
export const loginFailure = (error) => ({ type: types.AUTH_LOGIN_FAILURE, payload: error });

export const signupRequest = () => ({ type: types.AUTH_SIGNUP_REQUEST });
export const signupSuccess = (user) => ({ type: types.AUTH_SIGNUP_SUCCESS, payload: user });
export const signupFailure = (error) => ({ type: types.AUTH_SIGNUP_FAILURE, payload: error });

export const logout = () => ({ type: types.AUTH_LOGOUT });
export const checkAuth = (user) => ({ type: types.AUTH_CHECK, payload: user });

export const updateUserStatus = (status) => ({ type: types.UPDATE_USER_STATUS, payload: status });
export const updateUserProfile = (profile) => ({ type: types.UPDATE_USER_PROFILE, payload: profile });

// ========================================
// CHAT ACTION CREATORS
// ========================================
export const loadUsersRequest = () => ({ type: types.LOAD_USERS_REQUEST });
export const loadUsersSuccess = (users) => ({ type: types.LOAD_USERS_SUCCESS, payload: users });
export const loadUsersFailure = (error) => ({ type: types.LOAD_USERS_FAILURE, payload: error });

export const loadChannelsRequest = () => ({ type: types.LOAD_CHANNELS_REQUEST });
export const loadChannelsSuccess = (channels) => ({ type: types.LOAD_CHANNELS_SUCCESS, payload: channels });
export const loadChannelsFailure = (error) => ({ type: types.LOAD_CHANNELS_FAILURE, payload: error });

export const loadConversationsRequest = () => ({ type: types.LOAD_CONVERSATIONS_REQUEST });
export const loadConversationsSuccess = (conversations) => ({
  type: types.LOAD_CONVERSATIONS_SUCCESS,
  payload: conversations
});
export const loadConversationsFailure = (error) => ({
  type: types.LOAD_CONVERSATIONS_FAILURE,
  payload: error
});

export const setActiveConversation = (conversation) => ({
  type: types.SET_ACTIVE_CONVERSATION,
  payload: conversation
});
export const clearActiveConversation = () => ({ type: types.CLEAR_ACTIVE_CONVERSATION });

export const createChannelRequest = () => ({ type: types.CREATE_CHANNEL_REQUEST });
export const createChannelSuccess = (channel) => ({ type: types.CREATE_CHANNEL_SUCCESS, payload: channel });
export const createChannelFailure = (error) => ({ type: types.CREATE_CHANNEL_FAILURE, payload: error });

export const startConversation = (conversation) => ({
  type: types.START_CONVERSATION,
  payload: conversation
});
export const startChannelConversation = (conversation) => ({
  type: types.START_CHANNEL_CONVERSATION,
  payload: conversation
});

export const updateConversation = (conversation) => ({
  type: types.UPDATE_CONVERSATION,
  payload: conversation
});
export const deleteConversation = (conversationId) => ({
  type: types.DELETE_CONVERSATION,
  payload: conversationId
});

// ========================================
// MESSAGE ACTION CREATORS
// ========================================
export const loadMessagesRequest = () => ({ type: types.LOAD_MESSAGES_REQUEST });
export const loadMessagesSuccess = (messages) => ({ type: types.LOAD_MESSAGES_SUCCESS, payload: messages });
export const loadMessagesFailure = (error) => ({ type: types.LOAD_MESSAGES_FAILURE, payload: error });

export const sendMessageRequest = () => ({ type: types.SEND_MESSAGE_REQUEST });
export const sendMessageSuccess = (message) => ({ type: types.SEND_MESSAGE_SUCCESS, payload: message });
export const sendMessageFailure = (error) => ({ type: types.SEND_MESSAGE_FAILURE, payload: error });

export const editMessage = (messageId, newContent) => ({
  type: types.EDIT_MESSAGE,
  payload: { messageId, newContent }
});
export const deleteMessage = (messageId) => ({ type: types.DELETE_MESSAGE, payload: messageId });

export const addReaction = (messageId, emoji, userId) => ({
  type: types.ADD_REACTION,
  payload: { messageId, emoji, userId }
});
export const removeReaction = (messageId, emoji, userId) => ({
  type: types.REMOVE_REACTION,
  payload: { messageId, emoji, userId }
});

export const pinMessage = (messageId) => ({ type: types.PIN_MESSAGE, payload: messageId });
export const unpinMessage = (messageId) => ({ type: types.UNPIN_MESSAGE, payload: messageId });
export const bookmarkMessage = (messageId) => ({ type: types.BOOKMARK_MESSAGE, payload: messageId });
export const unbookmarkMessage = (messageId) => ({ type: types.UNBOOKMARK_MESSAGE, payload: messageId });

export const forwardMessage = (messageId, targetConversationId) => ({
  type: types.FORWARD_MESSAGE,
  payload: { messageId, targetConversationId }
});
export const replyToMessage = (messageId, replyContent) => ({
  type: types.REPLY_TO_MESSAGE,
  payload: { messageId, replyContent }
});

export const setTypingStatus = (conversationId, isTyping) => ({
  type: types.SET_TYPING_STATUS,
  payload: { conversationId, isTyping }
});
export const markMessageAsRead = (messageId) => ({ type: types.MARK_MESSAGE_AS_READ, payload: messageId });
export const markAllAsRead = (conversationId) => ({ type: types.MARK_ALL_AS_READ, payload: conversationId });

// ========================================
// UI ACTION CREATORS
// ========================================
export const toggleDarkMode = () => ({ type: types.TOGGLE_DARK_MODE });
export const setLoading = (isLoading) => ({ type: types.SET_LOADING, payload: isLoading });
export const setError = (error) => ({ type: types.SET_ERROR, payload: error });
export const clearError = () => ({ type: types.CLEAR_ERROR });

export const openModal = (modalType, modalData = null) => ({
  type: types.OPEN_MODAL,
  payload: { modalType, modalData }
});
export const closeModal = () => ({ type: types.CLOSE_MODAL });
export const setActiveTab = (tab) => ({ type: types.SET_ACTIVE_TAB, payload: tab });

export const setSearchQuery = (query) => ({ type: types.SET_SEARCH_QUERY, payload: query });
export const clearSearch = () => ({ type: types.CLEAR_SEARCH });

export const toggleSidebar = () => ({ type: types.TOGGLE_SIDEBAR });
export const setMobileView = (isMobile) => ({ type: types.SET_MOBILE_VIEW, payload: isMobile });

// ========================================
// USER INTERACTION ACTION CREATORS
// ========================================
export const blockUser = (userId) => ({ type: types.BLOCK_USER, payload: userId });
export const unblockUser = (userId) => ({ type: types.UNBLOCK_USER, payload: userId });

export const muteChat = (conversationId) => ({ type: types.MUTE_CHAT, payload: conversationId });
export const unmuteChat = (conversationId) => ({ type: types.UNMUTE_CHAT, payload: conversationId });

export const addToFavorites = (conversationId) => ({ type: types.ADD_TO_FAVORITES, payload: conversationId });
export const removeFromFavorites = (conversationId) => ({
  type: types.REMOVE_FROM_FAVORITES,
  payload: conversationId
});

// ========================================
// CALL ACTION CREATORS
// ========================================
export const startCall = (callData) => ({ type: types.START_CALL, payload: callData });
export const endCall = () => ({ type: types.END_CALL });
export const setCallType = (callType) => ({ type: types.SET_CALL_TYPE, payload: callType });
export const setCallDuration = (duration) => ({ type: types.SET_CALL_DURATION, payload: duration });
export const setCallParticipants = (participants) => ({
  type: types.SET_CALL_PARTICIPANTS,
  payload: participants
});
export const setCallActive = (isActive) => ({ type: types.SET_CALL_ACTIVE, payload: isActive });
export const setLocalStream = (stream) => ({ type: types.SET_LOCAL_STREAM, payload: stream });
export const setRemoteStream = (stream) => ({ type: types.SET_REMOTE_STREAM, payload: stream });

export const toggleMic = () => ({ type: types.TOGGLE_MIC });
export const toggleVideo = () => ({ type: types.TOGGLE_VIDEO });
export const toggleSpeaker = () => ({ type: types.TOGGLE_SPEAKER });

export const addCallHistory = (callRecord) => ({ type: types.ADD_CALL_HISTORY, payload: callRecord });
export const loadCallHistory = (history) => ({ type: types.LOAD_CALL_HISTORY, payload: history });
export const deleteCallHistory = (callId) => ({ type: types.DELETE_CALL_HISTORY, payload: callId });

// ========================================
// NOTIFICATION ACTION CREATORS
// ========================================
export const addNotification = (notification) => ({ type: types.ADD_NOTIFICATION, payload: notification });
export const removeNotification = (notificationId) => ({
  type: types.REMOVE_NOTIFICATION,
  payload: notificationId
});
export const clearAllNotifications = () => ({ type: types.CLEAR_ALL_NOTIFICATIONS });
export const markNotificationRead = (notificationId) => ({
  type: types.MARK_NOTIFICATION_READ,
  payload: notificationId
});

// ========================================
// STORIES/STATUS ACTION CREATORS
// ========================================
export const addStory = (story) => ({ type: types.ADD_STORY, payload: story });
export const viewStory = (storyId) => ({ type: types.VIEW_STORY, payload: storyId });
export const deleteStory = (storyId) => ({ type: types.DELETE_STORY, payload: storyId });
export const loadStories = (stories) => ({ type: types.LOAD_STORIES, payload: stories });
export const removeConversation = (convId) => ({ type: 'REMOVE_CONVERSATION', payload: convId });

// WebSocket real-time actions
export const receiveMessage = (message) => ({ type: 'WS_RECEIVE_MESSAGE', payload: message });
export const updateUserPresence = (userId, status, lastSeen) => ({ type: 'WS_PRESENCE', payload: { userId, status, lastSeen } });
export const setRemoteTyping = (userId, conversationId, isTyping) => ({ type: 'WS_TYPING', payload: { userId, conversationId, isTyping } });
export const markReadReceipt = (userId, conversationId, messageId) => ({ type: 'WS_READ', payload: { userId, conversationId, messageId } });
export const setUnreadCount = (conversationId, count) => ({ type: 'SET_UNREAD_COUNT', payload: { conversationId, count } });
export const incrementUnread = (conversationId) => ({ type: 'INCREMENT_UNREAD', payload: conversationId });
export const clearUnread = (conversationId) => ({ type: 'CLEAR_UNREAD', payload: conversationId });