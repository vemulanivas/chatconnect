import * as types from '../actions/types';

const initialState = {
  currentUser: null,
  token: localStorage.getItem('authToken') || null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  signupSuccess: false
};

const authReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.AUTH_LOGIN_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case types.AUTH_LOGIN_SUCCESS:
      return {
        ...state,
        currentUser: action.payload,
        token: localStorage.getItem('authToken'),
        isAuthenticated: true,
        isLoading: false,
        error: null
      };

    case types.AUTH_LOGIN_FAILURE:
      return {
        ...state,
        currentUser: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload
      };

    case types.AUTH_SIGNUP_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
        signupSuccess: false
      };

    case types.AUTH_SIGNUP_SUCCESS:
      return {
        ...state,
        isLoading: false,
        error: null,
        signupSuccess: true
      };

    case types.AUTH_SIGNUP_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        signupSuccess: false
      };

    case types.AUTH_LOGOUT:
      return {
        ...initialState
      };

    case types.AUTH_CHECK:
      return {
        ...state,
        currentUser: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false
      };

    case types.UPDATE_USER_STATUS:
      return {
        ...state,
        currentUser: state.currentUser ? {
          ...state.currentUser,
          status: action.payload
        } : null
      };

    case types.UPDATE_USER_PROFILE:
      return {
        ...state,
        currentUser: state.currentUser ? {
          ...state.currentUser,
          ...action.payload
        } : null
      };

    case 'TOKEN_REFRESHED':
      return {
        ...state,
        token: action.payload
      };

    default:
      return state;
  }
};

export default authReducer;