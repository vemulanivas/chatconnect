import * as types from '../actions/types';

const initialState = {
  messages: [],
  unreadCounts: {},
  readReceipts: {},
  remoteTyping: {},
  isLoading: false,
  error: null,
  typingStatus: {},
  searchQuery: '',
  searchResults: [],
  pinnedMessages: [],
  bookmarkedMessages: []
};

const messageReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.LOAD_MESSAGES_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case types.LOAD_MESSAGES_SUCCESS:
      return {
        ...state,
        messages: action.payload,
        isLoading: false,
        error: null,
        pinnedMessages: action.payload.filter(m => m.pinned),
        bookmarkedMessages: action.payload.filter(m => m.bookmarked)
      };

    case types.LOAD_MESSAGES_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };

    case types.SEND_MESSAGE_REQUEST:
      return {
        ...state,
        isSending: true,
        error: null
      };

    case types.SEND_MESSAGE_SUCCESS:
      return {
        ...state,
        messages: [...state.messages, action.payload],
        isSending: false,
        error: null
      };

    case types.SEND_MESSAGE_FAILURE:
      return {
        ...state,
        isSending: false,
        error: action.payload
      };

    case types.EDIT_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.messageId
            ? {
              ...msg,
              content: action.payload.newContent,
              edited: true,
              editedAt: new Date().toISOString()
            }
            : msg
        )
      };

    case types.DELETE_MESSAGE:
      return {
        ...state,
        messages: state.messages.filter(msg => msg.id !== action.payload),
        pinnedMessages: state.pinnedMessages.filter(msg => msg.id !== action.payload),
        bookmarkedMessages: state.bookmarkedMessages.filter(msg => msg.id !== action.payload)
      };

    case types.ADD_REACTION:
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.payload.messageId) return msg;

          const reactions = msg.reactions || [];
          const exists = reactions.find(
            r => r.emoji === action.payload.emoji && (r.userId === action.payload.userId || r.user_id === action.payload.userId)
          );

          if (exists) return msg; // Already added, ignore (prevents double toggle bug)

          return {
            ...msg,
            reactions: [
              ...reactions,
              {
                emoji: action.payload.emoji,
                userId: action.payload.userId,
                timestamp: new Date().toISOString()
              }
            ]
          };
        })
      };

    case types.REMOVE_REACTION:
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id !== action.payload.messageId) return msg;
          return {
            ...msg,
            reactions: (msg.reactions || []).filter(
              r => !(r.emoji === action.payload.emoji && (r.userId === action.payload.userId || r.user_id === action.payload.userId))
            )
          };
        })
      };

    case types.PIN_MESSAGE:
      const pinnedMessage = state.messages.find(m => m.id === action.payload);
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload ? { ...msg, pinned: true } : msg
        ),
        pinnedMessages: pinnedMessage
          ? [...state.pinnedMessages, { ...pinnedMessage, pinned: true }]
          : state.pinnedMessages
      };

    case types.UNPIN_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload ? { ...msg, pinned: false } : msg
        ),
        pinnedMessages: state.pinnedMessages.filter(msg => msg.id !== action.payload)
      };

    case types.BOOKMARK_MESSAGE:
      const bookmarkedMessage = state.messages.find(m => m.id === action.payload);
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload ? { ...msg, bookmarked: true } : msg
        ),
        bookmarkedMessages: bookmarkedMessage
          ? [...state.bookmarkedMessages, { ...bookmarkedMessage, bookmarked: true }]
          : state.bookmarkedMessages
      };

    case types.UNBOOKMARK_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload ? { ...msg, bookmarked: false } : msg
        ),
        bookmarkedMessages: state.bookmarkedMessages.filter(msg => msg.id !== action.payload)
      };

    case types.FORWARD_MESSAGE:
      return state;

    case types.REPLY_TO_MESSAGE:
      return state;

    case types.SET_TYPING_STATUS:
      return {
        ...state,
        typingStatus: {
          ...state.typingStatus,
          [action.payload.conversationId]: action.payload.isTyping
        }
      };

    case types.MARK_MESSAGE_AS_READ:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload ? { ...msg, read: true, readAt: new Date().toISOString() } : msg
        )
      };

    case types.MARK_ALL_AS_READ:
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.conversationId === action.payload
            ? { ...msg, read: true, readAt: new Date().toISOString() }
            : msg
        )
      };

    case types.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload
      };

    case types.CLEAR_SEARCH:
      return {
        ...state,
        searchQuery: '',
        searchResults: []
      };

    case 'WS_RECEIVE_MESSAGE': {
      const msg = action.payload;
      const exists = state.messages.find(m => m.id === msg.id);
      if (exists) return state;
      const unreadCounts = { ...state.unreadCounts };
      unreadCounts[msg.conversationId] = (unreadCounts[msg.conversationId] || 0) + 1;
      return { ...state, messages: [...state.messages, msg], unreadCounts };
    }

    case 'WS_TYPING': {
      const { userId, conversationId, isTyping } = action.payload;
      const key = `${conversationId}-${userId}`;
      const remoteTyping = { ...state.remoteTyping, [key]: isTyping };
      return { ...state, remoteTyping };
    }

    case 'WS_READ': {
      const { userId, messageId } = action.payload;
      return {
        ...state,
        messages: state.messages.map(msg => {
          if (msg.id === messageId) {
            const currentReadBy = msg.readBy || [];
            if (!currentReadBy.includes(userId)) {
              return { ...msg, readBy: [...currentReadBy, userId] };
            }
          }
          return msg;
        })
      };
    }

    case 'SET_UNREAD_COUNT': {
      const unreadCounts = { ...state.unreadCounts, [action.payload.conversationId]: action.payload.count };
      return { ...state, unreadCounts };
    }

    case 'INCREMENT_UNREAD': {
      const unreadCounts = { ...state.unreadCounts };
      unreadCounts[action.payload] = (unreadCounts[action.payload] || 0) + 1;
      return { ...state, unreadCounts };
    }

    case 'CLEAR_UNREAD': {
      const unreadCounts = { ...state.unreadCounts, [action.payload]: 0 };
      return { ...state, unreadCounts };
    }

    case 'CLEAR_CONVERSATION_MESSAGES':
      return {
        ...state,
        messages: state.messages.filter(m => m.conversationId !== action.payload)
      };

    default:
      return state;
  }
};

export default messageReducer;