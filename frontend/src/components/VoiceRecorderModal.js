import React from 'react';

function VoiceRecorderModal({
  isRecording,
  recordingTime,
  audioURL,
  onStartRecording,
  onStopRecording,
  onSendVoiceMessage,
  onCancel,
  onReRecord,
  formatDuration
}) {
  return (
    <div className="modal" onClick={onCancel}>
      <div className="modal-content voice-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-microphone"></i> Voice Message
          </h3>
          <button className="icon-btn" onClick={onCancel}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <div className="voice-recorder">
            <div className="recording-visualizer">
              <div className={`recording-pulse ${isRecording ? 'active' : ''}`}>
                <i className="fas fa-microphone"></i>
              </div>
            </div>
            
            <div className="recording-timer">
              {formatDuration(recordingTime)}
            </div>
            
            {audioURL && (
              <div className="audio-preview">
                <audio controls src={audioURL} />
              </div>
            )}
            
            <div className="recording-controls">
              {!isRecording && !audioURL && (
                <button className="btn-record" onClick={onStartRecording}>
                  <i className="fas fa-circle"></i> Start Recording
                </button>
              )}
              
              {isRecording && (
                <button className="btn-stop" onClick={onStopRecording}>
                  <i className="fas fa-stop"></i> Stop Recording
                </button>
              )}
              
              {audioURL && (
                <div className="recording-actions">
                  <button className="btn-cancel" onClick={onReRecord}>
                    <i className="fas fa-redo"></i> Re-record
                  </button>
                  <button className="btn-send" onClick={onSendVoiceMessage}>
                    <i className="fas fa-paper-plane"></i> Send
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceRecorderModal;
