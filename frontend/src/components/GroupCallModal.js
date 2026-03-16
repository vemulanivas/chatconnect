import React from 'react';

function GroupCallModal({
  users,
  selectedParticipants,
  onSelectParticipant,
  onStartAudioGroupCall,
  onStartVideoGroupCall,
  onClose
}) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content group-call-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i className="fas fa-users"></i> Group Call
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-subtitle">Select participants to add to the call:</p>
          <div className="participants-list">
            {users.map(user => (
              <div 
                key={user.id} 
                className={`participant-item ${selectedParticipants.includes(user.id) ? 'selected' : ''}`}
                onClick={() => onSelectParticipant(user.id)}
              >
                <img 
                  src={user.avatar} 
                  alt={user.fullName}
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`;
                  }}
                />
                <span>{user.fullName}</span>
                {selectedParticipants.includes(user.id) && (
                  <i className="fas fa-check-circle check-icon"></i>
                )}
              </div>
            ))}
          </div>
          <div className="group-call-actions">
            <button 
              className="btn-audio-call"
              onClick={onStartAudioGroupCall}
              disabled={selectedParticipants.length === 0}
            >
              <i className="fas fa-phone"></i> Audio Call
            </button>
            <button 
              className="btn-video-call"
              onClick={onStartVideoGroupCall}
              disabled={selectedParticipants.length === 0}
            >
              <i className="fas fa-video"></i> Video Call
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GroupCallModal;
