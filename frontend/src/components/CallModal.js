import React, { useRef, useEffect, useState } from 'react';

function CallModal({
  callType,
  conversationName,
  conversationAvatar,
  onEndCall,
  localStream,
  remoteStream,
  callDuration,
  formatDuration
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(e => console.warn("Remote video play failed:", e));
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      // Ensure audio is unmuted and play requested
      remoteAudioRef.current.muted = false;
      const playPromise = remoteAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => console.warn("Remote audio play delayed or blocked:", e));
      }
    }
  }, [remoteStream]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  };

  const toggleSpeaker = () => {
    const newState = !isSpeakerOff;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = newState;
    if (remoteAudioRef.current) remoteAudioRef.current.muted = newState;
    setIsSpeakerOff(newState);
  }

  return (
    <div className="modal call-modal-overlay">
      <div className="call-modal-content">
        <div className="call-container">
          <div className="call-header">
            <button className="icon-btn" onClick={onEndCall} style={{ color: 'white', background: 'rgba(255,255,255,0.2)' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Audio call UI */}
          {callType === 'audio' && (
            <div className="audio-call-ui">
              <audio ref={remoteAudioRef} autoPlay />
              <div className="call-avatar-large">
                <img
                  src={conversationAvatar}
                  alt={conversationName}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationName)}&background=random`;
                  }}
                />
                <div className="call-pulse"></div>
              </div>
              <div className="call-info-static">
                <h3>{conversationName}</h3>
                <p className="call-status">
                  {callDuration > 0 ? formatDuration(callDuration) : 'Calling...'}
                </p>
              </div>
            </div>
          )}

          {/* Video elements for video and screen calls */}
          {(callType === 'video' || callType === 'screen') && (
            <>
              <div className="call-video-area">
                <div className={`remote-video ${callType}-mode`}>
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                  />
                  {(!remoteStream || (remoteStream && remoteStream.getVideoTracks().length === 0)) && (
                    <div className="video-placeholder">
                      <img 
                        src={conversationAvatar} 
                        alt={conversationName}
                        onError={(e) => {
                          e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationName)}&background=random`;
                        }}
                      />
                      <div className="connecting-badge">
                        <span className="dot"></span>
                        <p>Establishing secure connection...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="local-video">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
              </div>
              <div className="call-info">
                <h3>{conversationName}</h3>
                <p className="call-status">
                  {callDuration > 0 ? formatDuration(callDuration) : 'Calling...'}
                </p>
              </div>
            </>
          )}

          <div className="call-controls">
            <button className={`call-control-btn ${isMuted ? 'muted' : ''}`} onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} style={isMuted ? { background: '#da3633', color: '#fff' } : {}}>
              <i className={`fas ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            {(callType === 'video' || callType === 'screen') && (
              <button className="call-control-btn" title={callType === 'video' ? 'Video' : 'Screen Share'}>
                <i className={`fas ${callType === 'video' ? 'fa-video' : 'fa-desktop'}`}></i>
              </button>
            )}
            <button className={`call-control-btn speaker-btn ${isSpeakerOff ? 'speaker-off' : ''}`} onClick={toggleSpeaker} title={isSpeakerOff ? 'Speaker On' : 'Speaker Off'} style={isSpeakerOff ? { background: '#da3633', color: '#fff' } : {}}>
              <i className={`fas ${isSpeakerOff ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
            </button>
            <button className="call-control-btn end-call-btn" onClick={onEndCall} title="End Call">
              <i className="fas fa-phone-slash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallModal;
