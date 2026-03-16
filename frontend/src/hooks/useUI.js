import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  toggleTheme,
  initializeTheme
} from '../store/actions/thunks';
import {
  setLoading,
  setError,
  clearError,
  openModal,
  closeModal,
  setActiveTab,
  toggleSidebar,
  setMobileView
} from '../store/actions/actionCreators';

export const useUI = () => {
  const dispatch = useDispatch();
  const ui = useSelector((state) => state.ui);

  const toggleDarkMode = useCallback(() => {
    return dispatch(toggleTheme());
  }, [dispatch]);

  const initTheme = useCallback(() => {
    return dispatch(initializeTheme());
  }, [dispatch]);

  const setLoadingState = useCallback((isLoading) => {
    dispatch(setLoading(isLoading));
  }, [dispatch]);

  const setErrorState = useCallback((error) => {
    dispatch(setError(error));
  }, [dispatch]);

  const clearErrorState = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const openModalHandler = useCallback((modalType, modalData = null) => {
    dispatch(openModal(modalType, modalData));
  }, [dispatch]);

  const closeModalHandler = useCallback(() => {
    dispatch(closeModal());
  }, [dispatch]);

  const setActiveTabHandler = useCallback((tab) => {
    dispatch(setActiveTab(tab));
  }, [dispatch]);

  const toggleSidebarHandler = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  const setMobileViewHandler = useCallback((isMobile) => {
    dispatch(setMobileView(isMobile));
  }, [dispatch]);

  const toggleSettings = useCallback(() => {
    dispatch({ type: 'TOGGLE_SETTINGS_MODAL' });
  }, [dispatch]);

  const toggleCreateChannel = useCallback(() => {
    dispatch({ type: 'TOGGLE_CREATE_CHANNEL_MODAL' });
  }, [dispatch]);

  const toggleVoiceRecorder = useCallback(() => {
    dispatch({ type: 'TOGGLE_VOICE_RECORDER_MODAL' });
  }, [dispatch]);

  const toggleCall = useCallback(() => {
    dispatch({ type: 'TOGGLE_CALL_MODAL' });
  }, [dispatch]);

  const toggleGroupCall = useCallback(() => {
    dispatch({ type: 'TOGGLE_GROUP_CALL_MODAL' });
  }, [dispatch]);

  const toggleSearch = useCallback(() => {
    dispatch({ type: 'TOGGLE_SEARCH_MODAL' });
  }, [dispatch]);

  const toggleEmojiPicker = useCallback(() => {
    dispatch({ type: 'TOGGLE_EMOJI_PICKER' });
  }, [dispatch]);

  const toggleInfoPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_INFO_PANEL' });
  }, [dispatch]);

  return {
    darkMode: ui.darkMode,
    isLoading: ui.isLoading,
    error: ui.error,
    activeTab: ui.activeTab,
    sidebarOpen: ui.sidebarOpen,
    isMobileView: ui.isMobileView,
    modals: ui.modals,
    modalData: ui.modalData,
    toggleDarkMode,
    initTheme,
    setLoading: setLoadingState,
    setError: setErrorState,
    clearError: clearErrorState,
    openModal: openModalHandler,
    closeModal: closeModalHandler,
    setActiveTab: setActiveTabHandler,
    toggleSidebar: toggleSidebarHandler,
    setMobileView: setMobileViewHandler,
    toggleSettings,
    toggleCreateChannel,
    toggleVoiceRecorder,
    toggleCall,
    toggleGroupCall,
    toggleSearch,
    toggleEmojiPicker,
    toggleInfoPanel
  };
};

export default useUI;
