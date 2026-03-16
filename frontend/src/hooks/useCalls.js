import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  startNewCall,
  endCurrentCall,
  loadCallHistoryData,
  deleteCallHistoryItem
} from '../store/actions/thunks';
import {
  setCallType,
  setCallDuration,
  setCallParticipants,
  setCallActive,
  setLocalStream,
  setRemoteStream,
  toggleMic,
  toggleVideo,
  toggleSpeaker
} from '../store/actions/actionCreators';

export const useCalls = () => {
  const dispatch = useDispatch();
  const calls = useSelector((state) => state.calls);

  const startCall = useCallback((callData) => {
    return dispatch(startNewCall(callData));
  }, [dispatch]);

  const endCall = useCallback((callData = null) => {
    return dispatch(endCurrentCall(callData));
  }, [dispatch]);

  const loadHistory = useCallback(() => {
    return dispatch(loadCallHistoryData());
  }, [dispatch]);

  const deleteHistoryItem = useCallback((callId) => {
    return dispatch(deleteCallHistoryItem(callId));
  }, [dispatch]);

  const setType = useCallback((type) => {
    dispatch(setCallType(type));
  }, [dispatch]);

  const setDuration = useCallback((duration) => {
    dispatch(setCallDuration(duration));
  }, [dispatch]);

  const setParticipants = useCallback((participants) => {
    dispatch(setCallParticipants(participants));
  }, [dispatch]);

  const setActive = useCallback((isActive) => {
    dispatch(setCallActive(isActive));
  }, [dispatch]);

  const setLocalStreamHandler = useCallback((stream) => {
    dispatch(setLocalStream(stream));
  }, [dispatch]);

  const setRemoteStreamHandler = useCallback((stream) => {
    dispatch(setRemoteStream(stream));
  }, [dispatch]);

  const toggleMicHandler = useCallback(() => {
    dispatch(toggleMic());
  }, [dispatch]);

  const toggleVideoHandler = useCallback(() => {
    dispatch(toggleVideo());
  }, [dispatch]);

  const toggleSpeakerHandler = useCallback(() => {
    dispatch(toggleSpeaker());
  }, [dispatch]);

  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getCallHistoryForConversation = useCallback((conversationId) => {
    return calls.callHistory.filter(call => call.conversationId === conversationId);
  }, [calls.callHistory]);

  const getRecentCalls = useCallback((limit = 10) => {
    return calls.callHistory.slice(0, limit);
  }, [calls.callHistory]);

  return {
    isInCall: calls.isInCall,
    callType: calls.callType,
    callDuration: calls.callDuration,
    participants: calls.participants,
    isMicMuted: calls.isMicMuted,
    isVideoOff: calls.isVideoOff,
    isSpeakerOn: calls.isSpeakerOn,
    callHistory: calls.callHistory,
    activeCallData: calls.activeCallData,
    localStream: calls.localStream,
    remoteStream: calls.remoteStream,
    isCallActive: calls.isCallActive,
    startCall,
    endCall,
    loadHistory,
    deleteHistoryItem,
    setType,
    setDuration,
    setParticipants,
    setActive,
    setLocalStream: setLocalStreamHandler,
    setRemoteStream: setRemoteStreamHandler,
    toggleMic: toggleMicHandler,
    toggleVideo: toggleVideoHandler,
    toggleSpeaker: toggleSpeakerHandler,
    formatDuration,
    getCallHistoryForConversation,
    getRecentCalls
  };
};

export default useCalls;
