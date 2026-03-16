import * as types from '../actions/types';

const initialState = {
  isInCall: false,
  callType: null,
  callDuration: 0,
  participants: [],
  isMicMuted: false,
  isVideoOff: false,
  isSpeakerOn: false,
  callHistory: [],
  activeCallData: null,
  localStream: null,
  remoteStream: null,
  isCallActive: false
};

const callReducer = (state = initialState, action) => {
  switch (action.type) {
    case types.START_CALL:
      return {
        ...state,
        isInCall: true,
        callType: action.payload.callType,
        participants: action.payload.participants || [],
        callDuration: 0,
        isMicMuted: false,
        isVideoOff: false,
        activeCallData: action.payload
      };

    case types.END_CALL:
      return {
        ...state,
        isInCall: false,
        callType: null,
        callDuration: 0,
        participants: [],
        isMicMuted: false,
        isVideoOff: false,
        isSpeakerOn: false,
        activeCallData: null,
        localStream: null,
        remoteStream: null,
        isCallActive: false
      };

    case types.SET_CALL_TYPE:
      return {
        ...state,
        callType: action.payload
      };

    case types.SET_CALL_DURATION:
      return {
        ...state,
        callDuration: action.payload
      };

    case types.SET_CALL_PARTICIPANTS:
      return {
        ...state,
        participants: action.payload
      };

    case types.SET_CALL_ACTIVE:
      return {
        ...state,
        isCallActive: action.payload
      };

    case types.SET_LOCAL_STREAM:
      return {
        ...state,
        localStream: action.payload
      };

    case types.SET_REMOTE_STREAM:
      return {
        ...state,
        remoteStream: action.payload
      };

    case types.TOGGLE_MIC:
      return {
        ...state,
        isMicMuted: !state.isMicMuted
      };

    case types.TOGGLE_VIDEO:
      return {
        ...state,
        isVideoOff: !state.isVideoOff
      };

    case types.TOGGLE_SPEAKER:
      return {
        ...state,
        isSpeakerOn: !state.isSpeakerOn
      };

    case types.ADD_CALL_HISTORY:
      return {
        ...state,
        callHistory: [action.payload, ...state.callHistory]
      };

    case types.LOAD_CALL_HISTORY:
      return {
        ...state,
        callHistory: action.payload
      };

    case types.DELETE_CALL_HISTORY:
      return {
        ...state,
        callHistory: state.callHistory.filter(call => call.id !== action.payload)
      };

    default:
      return state;
  }
};

export default callReducer;
