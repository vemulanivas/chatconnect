import * as types from '../actions/types';

const initialState = {
  users: [],
  channels: [],
  conversations: [],
  activeConversation: null,
  isLoadingUsers: false,
  isLoadingChannels: false,
  isLoadingConversations: false,
  error: null,
  blockedUsers: [],   // array of user IDs blocked by current user
  mutedChats: [],
  favorites: []
};

const chatReducer = (state = initialState, action) => {
  switch (action.type) {

    case types.LOAD_USERS_REQUEST:
      return { ...state, isLoadingUsers: true, error: null };

    case types.LOAD_USERS_SUCCESS: {
      // Get blocked IDs from backend (isBlocked flag on each user)
      const backendBlockedIds = action.payload
        .filter(u => u.isBlocked === true)
        .map(u => u.id);

      // Merge with existing blocked list - never shrink it from a reload
      const mergedBlockedIds = Array.from(
        new Set([...state.blockedUsers, ...backendBlockedIds])
      );

      return {
        ...state,
        users: action.payload,
        blockedUsers: mergedBlockedIds,
        isLoadingUsers: false,
        error: null
      };
    }

    case types.LOAD_USERS_FAILURE:
      return { ...state, isLoadingUsers: false, error: action.payload };

    case types.LOAD_CHANNELS_REQUEST:
      return { ...state, isLoadingChannels: true, error: null };

    case types.LOAD_CHANNELS_SUCCESS:
      return { ...state, channels: action.payload, isLoadingChannels: false, error: null };

    case types.LOAD_CHANNELS_FAILURE:
      return { ...state, isLoadingChannels: false, error: action.payload };

    case types.CREATE_CHANNEL_REQUEST:
      return { ...state, isLoadingChannels: true, error: null };

    case types.CREATE_CHANNEL_SUCCESS:
      return { ...state, channels: [...state.channels, action.payload], conversations: [...state.conversations, action.payload], isLoadingChannels: false };

    case types.CREATE_CHANNEL_FAILURE:
      return { ...state, isLoadingChannels: false, error: action.payload };

    case types.LOAD_CONVERSATIONS_REQUEST:
      return { ...state, isLoadingConversations: true, error: null };

    case types.LOAD_CONVERSATIONS_SUCCESS: {
      const all = (action.payload || []).filter(c => c.id && !c.id.startsWith('conv'));
      const groups = all.filter(c => c.type === 'group' || c.type === 'channel');
      // Sync activeConversation with fresh data so member counts etc update instantly
      const freshActive = state.activeConversation
        ? (all.find(c => c.id === state.activeConversation.id) || state.activeConversation)
        : null;
      return {
        ...state,
        conversations: all,
        channels: groups,
        activeConversation: freshActive,
        isLoadingConversations: false,
        error: null
      };
    }

    case types.LOAD_CONVERSATIONS_FAILURE:
      return { ...state, isLoadingConversations: false, error: action.payload };

    case types.SET_ACTIVE_CONVERSATION:
      return { ...state, activeConversation: action.payload };

    case types.CLEAR_ACTIVE_CONVERSATION:
      return { ...state, activeConversation: null };

    case types.START_CONVERSATION: {
      const existingIndex = state.conversations.findIndex(c => c.id === action.payload.id);
      if (existingIndex >= 0) {
        const updated = [...state.conversations];
        updated[existingIndex] = action.payload;
        // Move to top
        const item = updated.splice(existingIndex, 1)[0];
        updated.unshift(item);
        return { ...state, conversations: updated, activeConversation: action.payload };
      }
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        activeConversation: action.payload
      };
    }

    case types.START_CHANNEL_CONVERSATION: {
      const existingIndex = state.conversations.findIndex(c => c.id === action.payload.id);
      if (existingIndex >= 0) {
        const updated = [...state.conversations];
        updated[existingIndex] = action.payload;
        // Move to top
        const item = updated.splice(existingIndex, 1)[0];
        updated.unshift(item);
        return { ...state, conversations: updated, activeConversation: action.payload };
      }
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
        activeConversation: action.payload
      };
    }

    case types.UPDATE_CONVERSATION: {
      const convId = action.payload.id;
      const existing = state.conversations.find(c => c.id === convId);
      const updated = existing ? { ...existing, ...action.payload } : action.payload;
      
      const newConversations = [updated, ...state.conversations.filter(c => c.id !== convId)];
      const newChannels = updated.type === 'group' || updated.type === 'channel'
        ? [updated, ...state.channels.filter(c => c.id !== convId)]
        : state.channels;

      return {
        ...state,
        conversations: newConversations,
        channels: newChannels,
        activeConversation: state.activeConversation?.id === convId
          ? { ...state.activeConversation, ...updated }
          : state.activeConversation
      };
    }

    case types.DELETE_CONVERSATION:
      return {
        ...state,
        conversations: state.conversations.filter(c => c.id !== action.payload),
        activeConversation:
          state.activeConversation?.id === action.payload ? null : state.activeConversation
      };

    // BLOCK / UNBLOCK
    case types.BLOCK_USER:
      return {
        ...state,
        blockedUsers: Array.from(new Set([...state.blockedUsers, action.payload]))
      };

    case types.UNBLOCK_USER:
      return {
        ...state,
        blockedUsers: state.blockedUsers.filter(id => id !== action.payload)
      };

    case types.MUTE_CHAT:
      return { ...state, mutedChats: [...state.mutedChats, action.payload] };

    case types.UNMUTE_CHAT:
      return { ...state, mutedChats: state.mutedChats.filter(id => id !== action.payload) };

    case types.ADD_TO_FAVORITES:
      return { ...state, favorites: [...state.favorites, action.payload] };

    case types.REMOVE_FROM_FAVORITES:
      return { ...state, favorites: state.favorites.filter(id => id !== action.payload) };

    case 'REMOVE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(c => c.id !== action.payload)
      };

    // Real-time message updates to move conversation to top
    case 'WS_RECEIVE_MESSAGE': {
      const msg = action.payload;
      const convId = msg.conversationId;
      const existing = state.conversations.find(c => c.id === convId);

      if (!existing) return state;

      const updated = {
        ...existing,
        lastMessage: {
          content: msg.content,
          type: msg.type,
          senderId: msg.senderId,
          timestamp: msg.timestamp,
        },
        updatedAt: msg.timestamp
      };

      const newConversations = [updated, ...state.conversations.filter(c => c.id !== convId)];
      const newChannels = updated.type === 'group' || updated.type === 'channel'
        ? [updated, ...state.channels.filter(c => c.id !== convId)]
        : state.channels;

      return {
        ...state,
        conversations: newConversations,
        channels: newChannels,
        activeConversation: state.activeConversation?.id === convId
          ? { ...state.activeConversation, ...updated }
          : state.activeConversation
      };
    }

    // Real-time presence updates from WebSocket
    case 'WS_PRESENCE': {
      const { userId, status, lastSeen } = action.payload;
      return {
        ...state,
        users: state.users.map(u => u.id === userId ? { ...u, status, lastSeen: lastSeen || u.lastSeen } : u),
        // Also update status inside conversation participants
        conversations: state.conversations.map(conv => ({
          ...conv,
          participants: (conv.participants || []).map(p =>
            (p?.id || p) === userId
              ? (typeof p === 'object' ? { ...p, status, lastSeen: lastSeen || p.lastSeen } : p)
              : p
          )
        })),
        activeConversation: state.activeConversation ? {
          ...state.activeConversation,
          participants: (state.activeConversation.participants || []).map(p =>
            (p?.id || p) === userId
              ? (typeof p === 'object' ? { ...p, status, lastSeen: lastSeen || p.lastSeen } : p)
              : p
          )
        } : null
      };
    }

    default:
      return state;
  }
};

export default chatReducer;