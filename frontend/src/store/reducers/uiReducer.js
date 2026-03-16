import * as types from '../actions/types';

const initialState = {
  darkMode: false,
  isLoading: false,
  error: null,
  activeTab: 'dms',
  sidebarOpen: false,
  isMobileView: false,
  modals: {
    settings: false,
    createChannel: false,
    voiceRecorder: false,
    call: false,
    groupCall: false,
    search: false,
    emojiPicker: false,
    infoPanel: false
  },
  modalData: null,
  scrollToBottom: false
};

const uiReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.TOGGLE_DARK_MODE:
      return {
        ...state,
        darkMode: !state.darkMode
      };

    case 'SET_INITIAL_DARK_MODE':
      return {
        ...state,
        darkMode: action.payload
      };

    case types.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };

    case types.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };

    case types.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case types.OPEN_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modalType]: true
        },
        modalData: action.payload.modalData
      };

    case types.CLOSE_MODAL:
      return {
        ...state,
        modals: {
          settings: false,
          createChannel: false,
          voiceRecorder: false,
          call: false,
          groupCall: false,
          search: false,
          emojiPicker: false,
          infoPanel: false
        },
        modalData: null
      };

    case types.SET_ACTIVE_TAB:
      return {
        ...state,
        activeTab: action.payload
      };

    case types.SET_SEARCH_QUERY:
      return {
        ...state,
        searchQuery: action.payload
      };

    case types.CLEAR_SEARCH:
      return {
        ...state,
        searchQuery: ''
      };

    case types.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen
      };

    case types.SET_MOBILE_VIEW:
      return {
        ...state,
        isMobileView: action.payload
      };

    case 'TOGGLE_SETTINGS_MODAL':
      return {
        ...state,
        modals: { ...state.modals, settings: !state.modals.settings }
      };

    case 'TOGGLE_CREATE_CHANNEL_MODAL':
      return {
        ...state,
        modals: { ...state.modals, createChannel: !state.modals.createChannel }
      };

    case 'TOGGLE_VOICE_RECORDER_MODAL':
      return {
        ...state,
        modals: { ...state.modals, voiceRecorder: !state.modals.voiceRecorder }
      };

    case 'TOGGLE_CALL_MODAL':
      return {
        ...state,
        modals: { ...state.modals, call: !state.modals.call }
      };

    case 'TOGGLE_GROUP_CALL_MODAL':
      return {
        ...state,
        modals: { ...state.modals, groupCall: !state.modals.groupCall }
      };

    case 'TOGGLE_SEARCH_MODAL':
      return {
        ...state,
        modals: { ...state.modals, search: !state.modals.search }
      };

    case 'TOGGLE_EMOJI_PICKER':
      return {
        ...state,
        modals: { ...state.modals, emojiPicker: !state.modals.emojiPicker }
      };

    case 'TOGGLE_INFO_PANEL':
      return {
        ...state,
        modals: { ...state.modals, infoPanel: !state.modals.infoPanel }
      };

    default:
      return state;
  }
};

export default uiReducer;
