// ========================================
// AUTH ACTION TYPES
// ========================================
export const AUTH_LOGIN_REQUEST = 'AUTH_LOGIN_REQUEST';
export const AUTH_LOGIN_SUCCESS = 'AUTH_LOGIN_SUCCESS';
export const AUTH_LOGIN_FAILURE = 'AUTH_LOGIN_FAILURE';

export const AUTH_SIGNUP_REQUEST = 'AUTH_SIGNUP_REQUEST';
export const AUTH_SIGNUP_SUCCESS = 'AUTH_SIGNUP_SUCCESS';
export const AUTH_SIGNUP_FAILURE = 'AUTH_SIGNUP_FAILURE';

export const AUTH_LOGOUT = 'AUTH_LOGOUT';
export const AUTH_CHECK = 'AUTH_CHECK';

export const UPDATE_USER_STATUS = 'UPDATE_USER_STATUS';
export const UPDATE_USER_PROFILE = 'UPDATE_USER_PROFILE';

// ========================================
// CHAT ACTION TYPES
// ========================================
export const LOAD_USERS_REQUEST = 'LOAD_USERS_REQUEST';
export const LOAD_USERS_SUCCESS = 'LOAD_USERS_SUCCESS';
export const LOAD_USERS_FAILURE = 'LOAD_USERS_FAILURE';

export const LOAD_CHANNELS_REQUEST = 'LOAD_CHANNELS_REQUEST';
export const LOAD_CHANNELS_SUCCESS = 'LOAD_CHANNELS_SUCCESS';
export const LOAD_CHANNELS_FAILURE = 'LOAD_CHANNELS_FAILURE';

export const LOAD_CONVERSATIONS_REQUEST = 'LOAD_CONVERSATIONS_REQUEST';
export const LOAD_CONVERSATIONS_SUCCESS = 'LOAD_CONVERSATIONS_SUCCESS';
export const LOAD_CONVERSATIONS_FAILURE = 'LOAD_CONVERSATIONS_FAILURE';

export const SET_ACTIVE_CONVERSATION = 'SET_ACTIVE_CONVERSATION';
export const CLEAR_ACTIVE_CONVERSATION = 'CLEAR_ACTIVE_CONVERSATION';

export const CREATE_CHANNEL_REQUEST = 'CREATE_CHANNEL_REQUEST';
export const CREATE_CHANNEL_SUCCESS = 'CREATE_CHANNEL_SUCCESS';
export const CREATE_CHANNEL_FAILURE = 'CREATE_CHANNEL_FAILURE';

export const START_CONVERSATION = 'START_CONVERSATION';
export const START_CHANNEL_CONVERSATION = 'START_CHANNEL_CONVERSATION';

export const UPDATE_CONVERSATION = 'UPDATE_CONVERSATION';
export const DELETE_CONVERSATION = 'DELETE_CONVERSATION';

// ========================================
// MESSAGE ACTION TYPES
// ========================================
export const LOAD_MESSAGES_REQUEST = 'LOAD_MESSAGES_REQUEST';
export const LOAD_MESSAGES_SUCCESS = 'LOAD_MESSAGES_SUCCESS';
export const LOAD_MESSAGES_FAILURE = 'LOAD_MESSAGES_FAILURE';

export const SEND_MESSAGE_REQUEST = 'SEND_MESSAGE_REQUEST';
export const SEND_MESSAGE_SUCCESS = 'SEND_MESSAGE_SUCCESS';
export const SEND_MESSAGE_FAILURE = 'SEND_MESSAGE_FAILURE';

export const EDIT_MESSAGE = 'EDIT_MESSAGE';
export const DELETE_MESSAGE = 'DELETE_MESSAGE';
export const ADD_REACTION = 'ADD_REACTION';
export const REMOVE_REACTION = 'REMOVE_REACTION';

export const PIN_MESSAGE = 'PIN_MESSAGE';
export const UNPIN_MESSAGE = 'UNPIN_MESSAGE';
export const BOOKMARK_MESSAGE = 'BOOKMARK_MESSAGE';
export const UNBOOKMARK_MESSAGE = 'UNBOOKMARK_MESSAGE';

export const FORWARD_MESSAGE = 'FORWARD_MESSAGE';
export const REPLY_TO_MESSAGE = 'REPLY_TO_MESSAGE';

export const SET_TYPING_STATUS = 'SET_TYPING_STATUS';
export const MARK_MESSAGE_AS_READ = 'MARK_MESSAGE_AS_READ';
export const MARK_ALL_AS_READ = 'MARK_ALL_AS_READ';

// ========================================
// UI ACTION TYPES
// ========================================
export const TOGGLE_DARK_MODE = 'TOGGLE_DARK_MODE';
export const SET_LOADING = 'SET_LOADING';
export const SET_ERROR = 'SET_ERROR';
export const CLEAR_ERROR = 'CLEAR_ERROR';

export const OPEN_MODAL = 'OPEN_MODAL';
export const CLOSE_MODAL = 'CLOSE_MODAL';
export const SET_ACTIVE_TAB = 'SET_ACTIVE_TAB';

export const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
export const CLEAR_SEARCH = 'CLEAR_SEARCH';

export const TOGGLE_SIDEBAR = 'TOGGLE_SIDEBAR';
export const SET_MOBILE_VIEW = 'SET_MOBILE_VIEW';

// ========================================
// USER INTERACTION TYPES
// ========================================
export const BLOCK_USER = 'BLOCK_USER';
export const UNBLOCK_USER = 'UNBLOCK_USER';

export const MUTE_CHAT = 'MUTE_CHAT';
export const UNMUTE_CHAT = 'UNMUTE_CHAT';

export const ADD_TO_FAVORITES = 'ADD_TO_FAVORITES';
export const REMOVE_FROM_FAVORITES = 'REMOVE_FROM_FAVORITES';

// ========================================
// CALL ACTION TYPES
// ========================================
export const START_CALL = 'START_CALL';
export const END_CALL = 'END_CALL';
export const SET_CALL_TYPE = 'SET_CALL_TYPE';
export const SET_CALL_DURATION = 'SET_CALL_DURATION';
export const SET_CALL_PARTICIPANTS = 'SET_CALL_PARTICIPANTS';
export const SET_CALL_ACTIVE = 'SET_CALL_ACTIVE';
export const SET_LOCAL_STREAM = 'SET_LOCAL_STREAM';
export const SET_REMOTE_STREAM = 'SET_REMOTE_STREAM';

export const TOGGLE_MIC = 'TOGGLE_MIC';
export const TOGGLE_VIDEO = 'TOGGLE_VIDEO';
export const TOGGLE_SPEAKER = 'TOGGLE_SPEAKER';

export const ADD_CALL_HISTORY = 'ADD_CALL_HISTORY';
export const LOAD_CALL_HISTORY = 'LOAD_CALL_HISTORY';
export const DELETE_CALL_HISTORY = 'DELETE_CALL_HISTORY';

// ========================================
// NOTIFICATION ACTION TYPES
// ========================================
export const ADD_NOTIFICATION = 'ADD_NOTIFICATION';
export const REMOVE_NOTIFICATION = 'REMOVE_NOTIFICATION';
export const CLEAR_ALL_NOTIFICATIONS = 'CLEAR_ALL_NOTIFICATIONS';
export const MARK_NOTIFICATION_READ = 'MARK_NOTIFICATION_READ';

// ========================================
// STORIES/STATUS ACTION TYPES
// ========================================
export const ADD_STORY = 'ADD_STORY';
export const VIEW_STORY = 'VIEW_STORY';
export const DELETE_STORY = 'DELETE_STORY';
export const LOAD_STORIES = 'LOAD_STORIES';
