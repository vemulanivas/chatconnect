import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { useSelector } from 'react-redux';
import { useAuth, useChat, useMessages, useUI, useCalls, useNotifications, useWebSocket } from '../hooks';

// Sub-components
import ChatSidebar from '../components/ChatSidebar';
import ChatHeader from '../components/ChatHeader';
import ChatMessages from '../components/ChatMessages';
import ChatInput from '../components/ChatInput';
import InfoPanel from '../components/InfoPanel';
import CallModal from '../components/CallModal';
import VoiceRecorderModal from '../components/VoiceRecorderModal';
import SearchModal from '../components/SearchModal';
import CreateChannelModal from '../components/CreateChannelModal';
import SettingsModal from '../components/SettingsModal';
import GroupCallModal from '../components/GroupCallModal';
import CallHistoryPanel from '../components/CallHistoryPanel';
import BlockedUsersModal from '../components/BlockedUsersModal';
import IncomingCallModal from '../components/IncomingCallModal';

function ChatPage() {
  const navigate = useNavigate();

  // Custom hooks
  const { currentUser, logout, isAuthenticated } = useAuth();
  const {
    users,
    channels,
    conversations,
    activeConversation,
    setActiveConversation,
    loadData,
    createChannel,
    isUserBlocked,
    isChatMuted,
    getUserById,
    blockUser,
    unblockUser,
    muteChat,
    unmuteChat,
    startConversation,
    deleteConversation,
  } = useChat();
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    togglePin,
    getMessagesByConversation,
    isTyping,
    markAsRead
  } = useMessages();
  const {
    darkMode,
    toggleDarkMode,
    activeTab,
    setActiveTab,
    sidebarOpen,
    toggleSidebar,
    modals,
    toggleSettings,
    toggleCreateChannel,
    toggleVoiceRecorder,
    toggleCall,
    toggleGroupCall,
    toggleSearch,
    toggleInfoPanel
  } = useUI();
  const {
    startCall,
    endCall,
    callType,
    callHistory,
    formatDuration,
    getCallHistoryForConversation,
    participants: callParticipants,
    activeCallData
  } = useCalls();
  const { showSuccess, showInfo, showError } = useNotifications();
  const token = useSelector(s => s.auth.token) || localStorage.getItem('authToken');
  const unreadCounts = useSelector(s => s.messages?.unreadCounts || {});
  const remoteTyping = useSelector(s => s.messages?.remoteTyping || {});
  const { sendEvent, sendRead } = useWebSocket(token, currentUser);

  // Local state
  const [messageInput, setMessageInput] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [selectedCallParticipants, setSelectedCallParticipants] = useState([]);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const callTimerRef = useRef(null);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidatesQueueRef = useRef([]);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && !currentUser) {
      navigate('/login');
    }
  }, [isAuthenticated, currentUser, navigate]);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, loadData]);

  // Poll for new messages every 5 seconds when a conversation is active
  useEffect(() => {
    if (!isAuthenticated || !activeConversation) return;
    const isRealId = activeConversation?.id && !activeConversation.id.startsWith('conv');
    if (!isRealId) return;
    const interval = setInterval(() => {
      loadData();
    }, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeConversation, loadData]);

  // Poll for broadcast/system notifications every 30s
  useEffect(() => {
    if (!isAuthenticated) return;
    const pollBroadcast = async () => {
      try {
        const notifs = await apiClient.getUnreadSystemNotifications();
        if (notifs && notifs.length > 0) {
          notifs.forEach(n => {
            showInfo(n.body, n.title || '📢 Announcement');
          });
        }
      } catch (e) { /* silent */ }
    };
    pollBroadcast(); // immediate check on mount
    const binterval = setInterval(pollBroadcast, 30000);
    return () => clearInterval(binterval);
  }, [isAuthenticated, showInfo]);

  // Handle notification click — navigate to the conversation and focus input
  useEffect(() => {
    const handleNotificationFocus = (e) => {
      const { conversationId } = e.detail || {};
      if (!conversationId || !conversations) return;

      // Find the matching conversation and set it active
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setActiveConversation(conv);
        // Focus the message input after a short delay to let the UI render
        setTimeout(() => {
          const textarea = document.querySelector('.message-input-wrapper .rich-text-editor');
          if (textarea) textarea.focus();
        }, 300);
      }
    };

    window.addEventListener('notification-focus', handleNotificationFocus);
    return () => window.removeEventListener('notification-focus', handleNotificationFocus);
  }, [conversations, setActiveConversation]);

  // ── WEBRTC CONFIGURATION ──
  const initWebRTC = (targetIds) => {
    if (peerConnectionRef.current) return peerConnectionRef.current;

    // Using multiple public STUN servers for better connectivity
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
      ] 
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendEvent({ type: 'call-ice-candidate', targetUserIds: targetIds, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(prevStream => {
        let stream = prevStream || new MediaStream();
        if (event.track && !stream.getTracks().find(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        return new MediaStream(stream.getTracks());
      });
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  useEffect(() => {
    const handleSignal = async (e) => {
      const data = e.detail;
      if (!data || !currentUser) return;

      // Ignore signals from self to prevent infinite loops or premature state changes
      if (data.senderId === currentUser.id || data.callerId === currentUser.id) return;

      if (data.type === 'call-offer') {
        console.log("Received call-offer from", data.callerId);
        // If already in a call? Auto end previous or reject.
        if (peerConnectionRef.current) {
          console.log("Already in a call, ignoring offer");
          sendEvent({ type: 'call-end', targetUserIds: [data.callerId] });
          return;
        }
        setIncomingCallData(data);
      } else if (data.type === 'call-answer') {
        console.log("Received call-answer from", data.callerId);
        const pc = peerConnectionRef.current;
        if (pc && (pc.signalingState === 'have-local-offer')) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            console.log("Remote description set for answer");
            for (const candidate of iceCandidatesQueueRef.current) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error("Error adding queued ICE candidate:", e);
              }
            }
            iceCandidatesQueueRef.current = [];
          } catch (e) {
            console.error("Error setting remote description:", e);
          }
        }
        // Start timer for the caller once the call is answered
        if (pc) {
          if (callTimerRef.current) clearInterval(callTimerRef.current);
          setCallDuration(0);
          callTimerRef.current = window.setInterval(() => {
            setCallDuration(p => p + 1);
          }, 1000);
        }
      } else if (data.type === 'call-ice-candidate') {
        console.log("Received call-ice-candidate from", data.callerId);
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (e) {
            console.error("Error adding ICE candidate:", e);
          }
        } else {
          iceCandidatesQueueRef.current.push(data.candidate);
        }
      } else if (data.type === 'call-end') {
        console.log("Received call-end from", data.callerId);
        if (peerConnectionRef.current || incomingCallData) {
          setIncomingCallData(null);
          handleEndCall();
        }
      }
    };

    window.addEventListener('webrtc-signal', handleSignal);
    return () => window.removeEventListener('webrtc-signal', handleSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, sendEvent, toggleCall, startCall, modals.call, incomingCallData]);
  // ──────────────────────────

  const handleAcceptCall = async () => {
    if (!incomingCallData) return;
    const data = incomingCallData;
    setIncomingCallData(null);
    try {
      const targetIds = [data.callerId];
      const pc = initWebRTC(targetIds);

      if (pc.signalingState !== 'stable') {
        console.warn("RTCPeerConnection is not in a stable state. Resetting.");
        pc.close();
        peerConnectionRef.current = null;
        showError("Call interrupted. Please try again.");
        return;
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

      for (const candidate of iceCandidatesQueueRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding queued ICE candidate:", e);
        }
      }
      iceCandidatesQueueRef.current = [];

      const constraints = { audio: true, video: data.callType === 'video' };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendEvent({ type: 'call-answer', targetUserIds: targetIds, answer });

      startCall({
        callType: data.callType,
        conversationId: data.conversationId,
        participants: [data.callerId],
        callerId: data.callerId
      });
      if (!modals.call) toggleCall();

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0); // Start at 0 to sync with caller who starts at 0 upon answer
      callTimerRef.current = window.setInterval(() => {
        setCallDuration(p => p + 1);
      }, 1000);

    } catch (err) {
      console.error("Answer error", err);
      showError("Failed to connect call.");
      sendEvent({ type: 'call-end', targetUserIds: [data.callerId] });
    }
  };

  const handleRejectCall = () => {
    if (incomingCallData) {
      sendEvent({ type: 'call-end', targetUserIds: [incomingCallData.callerId] });
      setIncomingCallData(null);
    }
  };


  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeConversation]);



  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Handle user click - creates real DM conversation via backend
  const handleUserClick = async (user) => {
    if (isUserBlocked(user.id)) {
      showInfo('This user is blocked. Unblock to start a conversation.', 'User Blocked');
      return;
    }

    try {
      // Check if a real conversation already exists in Redux state
      const existingConv = conversations.find(
        c => c.type === 'dm' &&
          c.participants &&
          c.participants.some(p => (p.id || p) === currentUser?.id) &&
          c.participants.some(p => (p.id || p) === user.id)
      );

      if (existingConv) {
        await setActiveConversation(existingConv);
      } else {
        // Call backend to create/get real DM conversation
        const result = await startConversation(user.id);
        if (result?.success && result?.conversation) {
          await setActiveConversation(result.conversation);
        }
      }
    } catch (error) {
      showError('Could not open conversation. Please try again.');
      console.error('handleUserClick error:', error);
    }

    if (window.innerWidth < 576) {
      toggleSidebar();
    }
  };

  const handleChannelClick = async (channel) => {
    // Groups/channels from backend are already full conversation objects
    // Just set them as active directly
    setActiveConversation(channel);
    if (window.innerWidth < 576) toggleSidebar();
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    try {
      if (editingMessageId) {
        const editResult = await editMessage(editingMessageId, messageInput);
        if (editResult && editResult.success) {
          sendEvent({
            type: 'message-edit',
            messageId: editingMessageId,
            newContent: messageInput,
            targetUserIds: activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id)
          });
          setEditingMessageId(null);
          showSuccess('Message edited successfully');
        }
      } else {
        const result = await sendMessage(
          activeConversation.id,
          messageInput,
          'text',
          replyingToMessage ? { reply_to_id: replyingToMessage.id } : {}
        );
        if (result && result.success && result.message) {
          sendEvent({
            type: 'message',
            message: result.message,
            targetUserIds: activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id)
          });
        }
      }

      setMessageInput('');
      setReplyingToMessage(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (activeConversation) {
      // Send typing indicator to OTHER users via WebSocket
      const targetUserIds = activeConversation.participants
        ?.map(p => p.id || p)
        .filter(id => id !== currentUser?.id) || [];

      if (targetUserIds.length > 0) {
        sendEvent({
          type: 'typing',
          conversationId: activeConversation.id,
          targetUserIds,
          isTyping: true
        });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        if (targetUserIds.length > 0) {
          sendEvent({
            type: 'typing',
            conversationId: activeConversation.id,
            targetUserIds,
            isTyping: false
          });
        }
      }, 3000);
    }
  };

  const handleEmojiClick = (emoji) => {
    setMessageInput(prev => prev + emoji);
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await addReaction(messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleEditMessage = (message) => {
    setMessageInput(message.content);
    setEditingMessageId(message.id);
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      try {
        await deleteMessage(messageId);
        showSuccess('Message deleted');
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && activeConversation) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const isImage = file.type.startsWith('image/');
        try {
          const result = await sendMessage(
            activeConversation.id,
            event.target.result,
            isImage ? 'image' : 'file',
            { file_name: file.name, file_size: file.size }
          );
          if (result && result.success && result.message) {
            sendEvent({
              type: 'message',
              message: result.message,
              targetUserIds: activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id)
            });
          }
          showSuccess(`${isImage ? 'Image' : 'File'} sent successfully`);
        } catch (error) {
          console.error('Error sending file:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    const channelName = e.target.channelName.value;
    const channelDescription = e.target.channelDescription.value;
    const channelPrivacy = e.target.channelPrivacy.value;

    try {
      await createChannel(channelName, channelDescription, channelPrivacy);
      showSuccess('Group created successfully');
      toggleCreateChannel();
      e.target.reset();
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const handleAdminPanel = () => {
    navigate('/admin');
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        await logout();
        navigate('/login');
        showSuccess('Logged out successfully');
      } catch (error) {
        console.error('Error logging out:', error);
      }
    }
  };

  // Block user handler
  const handleBlockUser = async (userId) => {
    if (!userId) return;
    const confirmed = window.confirm('Are you sure you want to block this user?');
    if (!confirmed) return;
    try {
      const result = await blockUser(userId);
      if (result?.success) {
        showSuccess('User blocked successfully');
        toggleInfoPanel();
      } else {
        showError(result?.error || 'Failed to block user');
      }
    } catch (error) {
      showError('Failed to block user');
    }
  };

  const handleUnblockUser = async (userId) => {
    if (!userId) return;
    try {
      const result = await unblockUser(userId);
      if (result?.success) {
        showSuccess('User unblocked successfully');
      } else {
        showError(result?.error || 'Failed to unblock user');
      }
    } catch (error) {
      showError('Failed to unblock user: ' + error.message);
    }
  };

  // Voice Recording Functions
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = { mimeType: 'audio/webm' };
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
          options = MediaRecorder.isTypeSupported('audio/mp4') ? { mimeType: 'audio/mp4' } : {};
        }
      } else {
        options = {};
      }

      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || options.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        if (audioBlob.size < 100) {  // Empty or invalid blob
          showError("Audio recording was too short or empty.");
          setIsRecording(false);
          setRecordingTime(0);
          toggleVoiceRecorder();
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioURL(audioUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start(200);  // Force flushing chunks every 200ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start duration immediately so it's not 0 if less than 1 second
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Microphone error:', error);
      showError('Microphone access denied. Please allow microphone access to record voice messages.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === 'recording') {
        try { mediaRecorderRef.current.requestData(); } catch (e) { }
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const sendVoiceMessage = async () => {
    if (audioBlob && activeConversation) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const result = await sendMessage(
            activeConversation.id,
            event.target.result,
            'audio',
            { duration: recordingTime === 0 ? 1 : recordingTime } // Guarantee at least 1s duration
          );
          if (result && result.success && result.message) {
            sendEvent({
              type: 'message',
              message: result.message,
              targetUserIds: activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id)
            });
          }
          toggleVoiceRecorder();
          setAudioBlob(null);
          setAudioURL(null);
          setRecordingTime(0);
          showSuccess('Voice message sent');
        } catch (error) {
          console.error('Error sending voice message:', error);
        }
      };
      reader.readAsDataURL(audioBlob);
    }
  };

  const cancelVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    }
    toggleVoiceRecorder();
    setAudioBlob(null);
    setAudioURL(null);
    setRecordingTime(0);
  };

  // FIXED: Call Functions with Media Access
  const handleDeleteConversation = async (convId) => {
    if (!convId) return;
    try {
      const result = await deleteConversation(convId);
      if (result?.success) {
        showSuccess('Chat deleted successfully');
        // If we deleted the active chat, just stay happy (useUI usually handles clearing)
      } else {
        showError(result?.error || 'Failed to delete chat');
      }
    } catch (e) {
      showError('An error occurred during deletion');
      console.error('[Delete] Error:', e);
    }
  };

  const handleDeleteByUser = async (userId) => {
    // Find conversation from backend directly and delete it
    console.log('[Delete] Finding conv for userId:', userId);
    const conv = conversations?.find(c =>
      c.type === 'dm' &&
      c.participants?.some(p => (p?.id || p) === userId)
    );
    if (conv?.id) {
      console.log('[Delete] Found conv:', conv.id);
      await handleDeleteConversation(conv.id);
    } else {
      console.log('[Delete] No conversation found for user', userId);
    }
  };

  const handleStartCall = async (type) => {
    if (!activeConversation) return;

    try {
      // Request media permissions
      let stream;
      if (type === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

        // Handle when user clicks "Stop Sharing" on browser's native banner
        stream.getVideoTracks()[0].onended = () => {
          handleEndCall();
        };
      } else {
        const constraints = {
          audio: true,
          video: type === 'video'
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      setLocalStream(stream);

      iceCandidatesQueueRef.current = [];
      const pc = initWebRTC(activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id));
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendEvent({
        type: 'call-offer',
        targetUserIds: activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id),
        offer: offer,
        callType: type,
        conversationId: activeConversation.id,
        callerName: currentUser.fullName
      });

      await startCall({
        callType: type,
        conversationId: activeConversation.id,
        participants: activeConversation.participants,
        callerId: currentUser.id
      });

      if (callTimerRef.current) clearInterval(callTimerRef.current);
      setCallDuration(0);
      toggleCall();
      // Timer is now started upon receiving 'call-answer'

    } catch (error) {
      console.error('Error starting call:', error);
      showError(`Cannot start ${type} call. Please check your camera/microphone permissions.`);
    }
  };

  const handleEndCall = async () => {
    try {
      let resolvedConvId = activeCallData?.conversationId || activeConversation?.id || null;
      let resolvedParticipants = callParticipants?.length ? callParticipants : (activeCallData?.participants || activeConversation?.participants || []);

      let mappedIds = [];
      for (let p of resolvedParticipants) {
        if (p && typeof p === 'object') {
          if (p.id) mappedIds.push(p.id);
          else if (p.userId) mappedIds.push(p.userId);
        } else if (typeof p === 'string') {
          mappedIds.push(p);
        }
      }

      if (currentUser?.id && !mappedIds.includes(currentUser.id)) {
        mappedIds.push(currentUser.id);
      }

      const payload = {
        conversationId: resolvedConvId,
        type: callType || 'audio',
        participants: mappedIds,
        duration: callDuration || 0,
        status: callDuration > 0 ? 'completed' : 'missed',
      };



      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
      }

      // Stop remote stream
      if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        setRemoteStream(null);
      }

      // Close WebRTC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      // Stop timer
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }

      // Clear ICE candidates queue for next call
      iceCandidatesQueueRef.current = [];

      // Notify other peer about the call ending via webrtc signals
      sendEvent({ type: 'call-end', targetUserIds: mappedIds.filter(id => id !== currentUser.id) });

      // Only the caller should save the call to prevent duplicate database entries and messages
      const isCaller = activeCallData?.callerId === currentUser.id;
      const endResult = await endCall(isCaller ? payload : null);

      if (isCaller && endResult && endResult.message) {
        sendEvent({
          type: 'message',
          message: endResult.message,
          targetUserIds: activeConversation.participants.map(p => p.id || p).filter(id => id !== currentUser.id)
        });
      }

      setCallDuration(0);
      toggleCall();
      showSuccess('Call ended');
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleStartGroupCall = async (type) => {
    if (selectedCallParticipants.length === 0) return;

    try {
      const constraints = {
        audio: true,
        video: type === 'video'
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      await startCall({
        callType: type,
        conversationId: activeConversation?.id,
        participants: [...(activeConversation?.participants || []), ...selectedCallParticipants]
      });

      toggleGroupCall();
      toggleCall();

      iceCandidatesQueueRef.current = [];
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error starting group call:', error);
      showError('Cannot start group call. Please check your permissions.');
    }
  };

  // Formatting Functions
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    // Backend returns UTC without 'Z', add it so browser parses correctly
    const ts = timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z';
    return new Date(ts);
  };

  const formatTime = (timestamp) => {
    const date = parseTimestamp(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = parseTimestamp(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get conversation data
  const conversationMessages = activeConversation
    ? getMessagesByConversation(activeConversation.id)
    : [];

  // Mark messages as read when viewing a conversation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!activeConversation || !conversationMessages?.length || !currentUser) return;
    const unreadFromOther = conversationMessages.filter(
      m => m.senderId !== currentUser.id && !(m.readBy || []).includes(currentUser.id)
    );

    if (unreadFromOther.length > 0) {
      const targetUserIds = (activeConversation.participants || [])
        .map(p => typeof p === 'object' ? (p.id || p.userId) : p)
        .filter(id => id && id !== currentUser.id);

      unreadFromOther.slice(-10).forEach(m => {
        markAsRead(m.id); // Update local state immediately
        apiClient.markMessageRead(m.id).catch(() => { }); // Update backend DB
        if (targetUserIds.length > 0) {
          sendRead(activeConversation.id, m.id, targetUserIds); // Emit WebSocket push
        }
      });
    }
  }, [activeConversation?.id, conversationMessages?.length, currentUser]);

  // Get the other participant object from a DM conversation
  // Backend returns participants as objects: [{id, fullName, avatar, status}]
  const getOtherParticipant = () => {
    if (!activeConversation?.participants) return null;
    const participants = activeConversation.participants;
    // participants can be objects {id, fullName} or plain strings
    const other = participants.find(p => {
      const pid = p?.id || p;
      return pid !== currentUser?.id;
    });
    if (!other) return null;

    // Look up current status from users list to ensure absolute freshness (handles login immediately)
    const otherId = typeof other === 'object' ? (other.id || other.userId) : other;
    const userFromList = getUserById(otherId);

    // If it's an object, return the freshest instance or fall back
    if (typeof other === 'object' && other.fullName) {
      return userFromList || other;
    }
    return userFromList || null;
  };

  const getConversationName = () => {
    if (!activeConversation) return '';
    if (activeConversation.type === 'dm') {
      const other = getOtherParticipant();
      return other?.fullName || other?.username || 'Unknown User';
    }
    return activeConversation.name || 'Group';
  };

  const getConversationAvatar = () => {
    if (!activeConversation) return '';
    if (activeConversation.type === 'dm') {
      const other = getOtherParticipant();
      const avatarName = other?.fullName || other?.username || 'User';
      return other?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=random`;
    }
    const avatarName = activeConversation.name || 'Group';
    return activeConversation.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=random`;
  };

  const getConversationStatus = () => {
    if (!activeConversation) return '';
    if (activeConversation.type === 'dm') {
      const otherUser = getOtherParticipant();
      const status = otherUser?.status?.toLowerCase();
      if (status === 'online') return 'Online';
      if (status === 'busy') return 'Busy';
      if (status === 'away') return 'Away';
      if (status === 'dnd') return 'Do Not Disturb';

      if (otherUser?.lastSeen) {
        const lastSeen = new Date(otherUser.lastSeen);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastSeen) / 60000);
        let relativeTimeStr = '';
        if (diffMinutes < 1) relativeTimeStr = 'just now';
        else if (diffMinutes < 60) relativeTimeStr = `${diffMinutes}m ago`;
        else {
          const diffHours = Math.floor(diffMinutes / 60);
          if (diffHours < 24) relativeTimeStr = `${diffHours}h ago`;
          else relativeTimeStr = `${Math.floor(diffHours / 24)}d ago`;
        }
        return `Offline • Last seen ${relativeTimeStr}`;
      }
      return 'Offline';
    }
    return `${activeConversation.participantCount || (activeConversation.participants?.length || 0)} members`;
  };

  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '👍', '👎', '👌', '✌️', '🤙', '👏', '🙌', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '🔥', '✨', '💯', '💢', '💥', '💫', '💦', '💨'];

  // eslint-disable-next-line no-unused-vars
  const currentCallHistory = activeConversation
    ? getCallHistoryForConversation(activeConversation.id)
    : [];

  if (!currentUser) {
    return null;
  }

  return (
    <div className="chat-page">
      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn"
        onClick={toggleSidebar}
        style={{ display: sidebarOpen ? 'none' : 'flex' }}
      >
        <i className="fas fa-bars"></i>
      </button>

      <div className={`chat-layout${modals.infoPanel && activeConversation ? " info-open" : ""}`} style={{ display: "flex", flexDirection: "row", height: "100vh", overflow: "hidden" }}>
        {/* Sidebar */}
        <ChatSidebar
          currentUser={currentUser}
          users={users}
          channels={channels}
          conversations={conversations}
          activeConversation={activeConversation}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onUserClick={handleUserClick}
          onChannelClick={handleChannelClick}
          onToggleDarkMode={toggleDarkMode}
          onToggleSettings={toggleSettings}
          onToggleCreateChannel={toggleCreateChannel}
          onToggleCallHistory={() => setShowCallHistory(true)}
          onToggleBlockedUsers={() => setShowBlockedUsers(true)}
          onLogout={handleLogout}
          darkMode={darkMode}
          sidebarOpen={sidebarOpen}
          isUserBlocked={isUserBlocked}
          isChatMuted={isChatMuted}
          getUserById={getUserById}
          onDeleteConversation={handleDeleteConversation}
          unreadCounts={unreadCounts}
          onAdminPanel={currentUser?.isAdmin ? handleAdminPanel : null}
          onDeleteByUser={handleDeleteByUser}
          callHistory={callHistory}
          formatDuration={formatDuration}
          onStartCall={handleStartCall}
          remoteTyping={remoteTyping}
        />

        {/* Main Chat Area */}
        <main className="chat-main" style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          {!activeConversation ? (
            <div className="welcome-screen">
              <i className="fas fa-comments"></i>
              <h2>ChatConnect</h2>
              <p>Send and receive messages without keeping your phone online.</p>
              <p>Use ChatConnect on up to 4 linked devices at the same time.</p>
            </div>
          ) : (
            <div className="chat-container">
              <ChatHeader
                conversationName={getConversationName()}
                conversationAvatar={getConversationAvatar()}
                conversationStatus={getConversationStatus()}
                onToggleInfoPanel={toggleInfoPanel}
                onStartAudioCall={() => handleStartCall('audio')}
                onStartVideoCall={() => handleStartCall('video')}
                onStartScreenShare={() => handleStartCall('screen')}
                onToggleGroupCall={toggleGroupCall}
                onToggleSearch={toggleSearch}
                onToggleCallHistory={() => setShowCallHistory(true)}
                isTyping={(() => {
                  const typingUserId = isTyping(activeConversation.id);
                  if (!typingUserId) return null;
                  const typingUser = getUserById(typingUserId);
                  return typingUser?.fullName || typingUser?.username || 'Someone';
                })()}
              />

              <ChatMessages
                messages={conversationMessages}
                currentUser={currentUser}
                users={users}
                activeConversation={activeConversation}
                onReaction={handleReaction}
                onEditMessage={handleEditMessage}
                onDeleteMessage={handleDeleteMessage}
                onTogglePin={togglePin}
                onReplyMessage={(msg) => {
                  setReplyingToMessage(msg);
                  document.querySelector('.message-input-wrapper .rich-text-editor')?.focus();
                }}
                onForwardMessage={(msg) => setForwardingMessage(msg)}
                onBookmarkMessage={async (msgId) => {
                  try {
                    await apiClient.bookmarkMessage(msgId);
                    loadData();
                    showSuccess('Message bookmarked!');
                  } catch (e) {
                    console.error('Bookmark error:', e);
                  }
                }}
                formatTime={formatTime}
                formatDate={formatDate}
                formatFileSize={formatFileSize}
                messagesEndRef={messagesEndRef}
                messagesContainerRef={messagesContainerRef}
                typingUserName={(() => {
                  const typingUserId = isTyping(activeConversation.id);
                  if (!typingUserId) return null;
                  const typingUser = getUserById(typingUserId);
                  return typingUser?.fullName || typingUser?.username || 'Someone';
                })()}
                typingUserAvatar={(() => {
                  const typingUserId = isTyping(activeConversation.id);
                  if (!typingUserId) return null;
                  const typingUser = getUserById(typingUserId);
                  return typingUser?.avatar || null;
                })()}
              />

              <ChatInput
                messageInput={messageInput}
                onInputChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSendMessage={handleSendMessage}
                onToggleEmojiPicker={() => setShowEmojiPicker(!showEmojiPicker)}
                setShowEmojiPicker={setShowEmojiPicker}
                onFileUpload={handleFileUpload}
                onToggleVoiceRecorder={toggleVoiceRecorder}
                showEmojiPicker={showEmojiPicker}
                emojis={emojis}
                onEmojiClick={handleEmojiClick}
                editingMessageId={editingMessageId}
                onCancelEdit={() => {
                  setEditingMessageId(null);
                  setMessageInput('');
                }}
                replyingTo={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
              />
            </div>
          )}
        </main>

        {/* Info Panel */}
        <InfoPanel
          activeConversation={activeConversation}
          users={users}
          channels={channels}
          currentUser={currentUser}
          onClose={toggleInfoPanel}
          isChatMuted={isChatMuted}
          onMuteChat={muteChat}
          onUnmuteChat={unmuteChat}
          onBlockUser={handleBlockUser}
          onUnblockUser={handleUnblockUser}
          isUserBlocked={isUserBlocked}
          isVisible={!!(modals.infoPanel && activeConversation)}
          onDeleteGroup={(convId) => { deleteConversation(convId); setActiveConversation(null); }}
          onRefreshConversations={loadData}
          style={!!(modals.infoPanel && activeConversation) ? {
            width: '340px', minWidth: '340px', maxWidth: '340px',
            opacity: 1, pointerEvents: 'all',
            overflowY: 'auto', overflowX: 'hidden',
            transition: 'width 0.3s ease, opacity 0.2s ease'
          } : {
            width: 0, minWidth: 0, maxWidth: 0,
            opacity: 0, pointerEvents: 'none',
            overflow: 'hidden',
            transition: 'width 0.3s ease, opacity 0.2s ease'
          }}
        />
      </div>

      {/* Modals */}
      {modals.voiceRecorder && (
        <VoiceRecorderModal
          isRecording={isRecording}
          recordingTime={recordingTime}
          audioURL={audioURL}
          onStartRecording={startVoiceRecording}
          onStopRecording={stopVoiceRecording}
          onSendVoiceMessage={sendVoiceMessage}
          onCancel={cancelVoiceRecording}
          onReRecord={() => {
            setAudioBlob(null);
            setAudioURL(null);
            setRecordingTime(0);
          }}
          formatDuration={formatDuration}
        />
      )}

      {modals.call && (
        <CallModal
          callType={callType}
          conversationName={getConversationName()}
          conversationAvatar={getConversationAvatar()}
          onEndCall={handleEndCall}
          localStream={localStream}
          remoteStream={remoteStream}
          callDuration={callDuration}
          formatDuration={formatDuration}
        />
      )}

      {modals.groupCall && (
        <GroupCallModal
          users={users.filter(u => u.id !== currentUser?.id)}
          selectedParticipants={selectedCallParticipants}
          onSelectParticipant={(userId) => {
            if (selectedCallParticipants.includes(userId)) {
              setSelectedCallParticipants(prev => prev.filter(id => id !== userId));
            } else {
              setSelectedCallParticipants(prev => [...prev, userId]);
            }
          }}
          onStartAudioGroupCall={() => handleStartGroupCall('audio')}
          onStartVideoGroupCall={() => handleStartGroupCall('video')}
          onClose={toggleGroupCall}
        />
      )}

      {modals.search && (
        <SearchModal
          messages={conversationMessages}
          users={users}
          onClose={toggleSearch}
          formatTime={formatTime}
        />
      )}

      {modals.createChannel && (
        <CreateChannelModal
          onSubmit={handleCreateChannel}
          onClose={toggleCreateChannel}
        />
      )}

      {modals.settings && (
        <SettingsModal
          currentUser={currentUser}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          onClose={toggleSettings}
        />
      )}

      {/* Call History Panel */}
      {showCallHistory && (
        <CallHistoryPanel
          callHistory={callHistory}
          users={users}
          currentUser={currentUser}
          onClose={() => setShowCallHistory(false)}
          onStartCall={handleStartCall}
        />
      )}

      {/* Blocked Users Modal */}
      {showBlockedUsers && (
        <BlockedUsersModal
          blockedUsers={users.filter(u => isUserBlocked(u.id))}
          onUnblock={handleUnblockUser}
          onClose={() => setShowBlockedUsers(false)}
        />
      )}

      {/* Incoming Call Overlay */}
      {incomingCallData && (
        <IncomingCallModal
          callerName={incomingCallData.callerName || 'Unknown User'}
          callType={incomingCallData.callType}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="modal" onClick={() => setForwardingMessage(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', borderRadius: '20px' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <i className="fas fa-share" style={{ color: 'var(--primary-color)' }}></i> Forward Message
              </h3>
              <button className="icon-btn" onClick={() => setForwardingMessage(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div style={{ padding: '8px 0', maxHeight: '400px', overflowY: 'auto' }}>
              <div style={{ padding: '8px 16px', fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                Select a user to forward to
              </div>
              {users.filter(u => u.id !== currentUser?.id).map(user => (
                <div key={user.id}
                  onClick={async () => {
                    try {
                      await startConversation(user.id);
                      const conv = conversations?.find(c =>
                        c.type === 'dm' && c.participants?.some(p => (p?.id || p) === user.id)
                      );
                      if (conv) {
                        const fwdContent = `↪️ Forwarded:\n${forwardingMessage.content || '[Media]'}`;
                        await sendMessage(conv.id, fwdContent, 'text');
                        showSuccess(`Message forwarded to ${user.fullName}`);
                      }
                    } catch (e) { console.error('Forward error:', e); }
                    setForwardingMessage(null);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`}
                    alt={user.fullName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=667eea&color=fff`; }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{user.fullName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{user.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatPage;