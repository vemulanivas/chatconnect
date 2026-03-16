import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  loadInitialData,
  createNewChannel,
  deleteConversationThunk,
  startNewConversation,
  startNewChannelConversation,
  setActiveChat,
  blockUserAction,
  unblockUserAction,
  muteChatAction,
  unmuteChatAction
} from '../store/actions/thunks';
import {
  clearActiveConversation,
  addToFavorites,
  removeFromFavorites
} from '../store/actions/actionCreators';

export const useChat = () => {
  const dispatch = useDispatch();
  const chat = useSelector((state) => state.chat);
  const auth = useSelector((state) => state.auth);

  const loadData = useCallback(() => {
    return dispatch(loadInitialData());
  }, [dispatch]);

  const createChannel = useCallback((name, description, privacy) => {
    return dispatch(createNewChannel(name, description, privacy));
  }, [dispatch]);

  const startConversation = useCallback((userId) => {
    return dispatch(startNewConversation(userId));
  }, [dispatch]);

  const deleteConversation = useCallback((convId) => {
    return dispatch(deleteConversationThunk(convId));
  }, [dispatch]);

  const startChannelConversation = useCallback((channelId) => {
    return dispatch(startNewChannelConversation(channelId));
  }, [dispatch]);

  const setActiveConversationHandler = useCallback(async (conversation) => {
    dispatch(setActiveChat(conversation));
    // Clear unread count immediately in Redux
    if (conversation?.id) {
      dispatch({ type: 'CLEAR_UNREAD', payload: conversation.id });
      // Tell backend to mark all messages as read
      try {
        const apiClient = (await import('../utils/apiClient')).default;
        await apiClient.markConversationRead(conversation.id);
      } catch (e) { /* silent */ }
    }
  }, [dispatch]);

  const clearActiveConversationHandler = useCallback(() => {
    dispatch(clearActiveConversation());
  }, [dispatch]);

  const blockUser = useCallback((userId) => {
    return dispatch(blockUserAction(userId));
  }, [dispatch]);

  const unblockUser = useCallback((userId) => {
    return dispatch(unblockUserAction(userId));
  }, [dispatch]);

  const muteChat = useCallback((conversationId) => {
    return dispatch(muteChatAction(conversationId));
  }, [dispatch]);

  const unmuteChat = useCallback((conversationId) => {
    return dispatch(unmuteChatAction(conversationId));
  }, [dispatch]);

  const addToFavoritesHandler = useCallback((conversationId) => {
    dispatch(addToFavorites(conversationId));
  }, [dispatch]);

  const removeFromFavoritesHandler = useCallback((conversationId) => {
    dispatch(removeFromFavorites(conversationId));
  }, [dispatch]);

  const isUserBlocked = useCallback((userId) => {
    return chat.blockedUsers.includes(userId);
  }, [chat.blockedUsers]);

  const isChatMuted = useCallback((conversationId) => {
    return chat.mutedChats.includes(conversationId);
  }, [chat.mutedChats]);

  const isFavorite = useCallback((conversationId) => {
    return chat.favorites.includes(conversationId);
  }, [chat.favorites]);

  const getUserById = useCallback((userId) => {
    return chat.users.find(u => u.id === userId);
  }, [chat.users]);

  const getChannelById = useCallback((channelId) => {
    return chat.channels.find(c => c.id === channelId);
  }, [chat.channels]);

  return {
    currentUser: auth.currentUser,
    users: chat.users,
    channels: chat.channels,
    conversations: chat.conversations,
    activeConversation: chat.activeConversation,
    blockedUsers: chat.blockedUsers,
    mutedChats: chat.mutedChats,
    favorites: chat.favorites,
    isLoadingUsers: chat.isLoadingUsers,
    isLoadingChannels: chat.isLoadingChannels,
    isLoadingConversations: chat.isLoadingConversations,
    error: chat.error,
    loadData,
    createChannel,
    deleteConversation,
    startConversation,
    startChannelConversation,
    setActiveConversation: setActiveConversationHandler,
    clearActiveConversation: clearActiveConversationHandler,
    blockUser,
    unblockUser,
    muteChat,
    unmuteChat,
    addToFavorites: addToFavoritesHandler,
    removeFromFavorites: removeFromFavoritesHandler,
    isUserBlocked,
    isChatMuted,
    isFavorite,
    getUserById,
    getChannelById
  };
};

export default useChat;