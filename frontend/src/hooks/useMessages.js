import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  sendNewMessage,
  editExistingMessage,
  deleteExistingMessage,
  addMessageReaction,
  toggleMessagePin,
  toggleMessageBookmark,
  searchMessages,
  setUserTyping
} from '../store/actions/thunks';
import {
  setSearchQuery,
  clearSearch,
  markMessageAsRead,
  markAllAsRead
} from '../store/actions/actionCreators';

export const useMessages = () => {
  const dispatch = useDispatch();
  const messages = useSelector((state) => state.messages);
  const chat = useSelector((state) => state.chat);

  const sendMessage = useCallback((conversationId, content, type = 'text', metadata = {}) => {
    return dispatch(sendNewMessage(conversationId, content, type, metadata));
  }, [dispatch]);

  const editMessage = useCallback((messageId, newContent) => {
    return dispatch(editExistingMessage(messageId, newContent));
  }, [dispatch]);

  const deleteMessage = useCallback((messageId) => {
    return dispatch(deleteExistingMessage(messageId));
  }, [dispatch]);

  const addReaction = useCallback((messageId, emoji) => {
    return dispatch(addMessageReaction(messageId, emoji));
  }, [dispatch]);

  const togglePin = useCallback((messageId) => {
    return dispatch(toggleMessagePin(messageId));
  }, [dispatch]);

  const toggleBookmark = useCallback((messageId) => {
    return dispatch(toggleMessageBookmark(messageId));
  }, [dispatch]);

  const search = useCallback((query) => {
    return dispatch(searchMessages(query));
  }, [dispatch]);

  const setSearch = useCallback((query) => {
    dispatch(setSearchQuery(query));
  }, [dispatch]);

  const clearSearchHandler = useCallback(() => {
    dispatch(clearSearch());
  }, [dispatch]);

  const setTyping = useCallback((conversationId, isTyping) => {
    return dispatch(setUserTyping(conversationId, isTyping));
  }, [dispatch]);

  const markAsRead = useCallback((messageId) => {
    dispatch(markMessageAsRead(messageId));
  }, [dispatch]);

  const markConversationAsRead = useCallback((conversationId) => {
    dispatch(markAllAsRead(conversationId));
  }, [dispatch]);

  const getMessagesByConversation = useCallback((conversationId) => {
    return messages.messages.filter(m => m.conversationId === conversationId);
  }, [messages.messages]);

  const getMessageById = useCallback((messageId) => {
    return messages.messages.find(m => m.id === messageId);
  }, [messages.messages]);

  const getPinnedMessages = useCallback((conversationId) => {
    return messages.messages.filter(m => m.conversationId === conversationId && m.pinned);
  }, [messages.messages]);

  const getBookmarkedMessages = useCallback(() => {
    return messages.messages.filter(m => m.bookmarked);
  }, [messages.messages]);

  const getUnreadCount = useCallback((conversationId) => {
    return messages.messages.filter(
      m => m.conversationId === conversationId && !m.read && m.senderId !== chat.currentUser?.id
    ).length;
  }, [messages.messages, chat.currentUser]);

  const isTyping = useCallback((conversationId) => {
    // Check remote typing status (from OTHER users via WebSocket)
    const remoteTyping = messages.remoteTyping || {};
    for (const key of Object.keys(remoteTyping)) {
      if (key.startsWith(conversationId + '-') && remoteTyping[key]) {
        // Extract userId from key "conversationId-userId"
        const userId = key.substring(conversationId.length + 1);
        return userId; // Return the userId of who is typing
      }
    }
    return false;
  }, [messages.remoteTyping]);

  return {
    messages: messages.messages,
    isLoading: messages.isLoading,
    error: messages.error,
    typingStatus: messages.typingStatus,
    searchQuery: messages.searchQuery,
    searchResults: messages.searchResults,
    pinnedMessages: messages.pinnedMessages,
    bookmarkedMessages: messages.bookmarkedMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    togglePin,
    toggleBookmark,
    search,
    setSearch,
    clearSearch: clearSearchHandler,
    setTyping,
    markAsRead,
    markConversationAsRead,
    getMessagesByConversation,
    getMessageById,
    getPinnedMessages,
    getBookmarkedMessages,
    getUnreadCount,
    isTyping
  };
};

export default useMessages;
