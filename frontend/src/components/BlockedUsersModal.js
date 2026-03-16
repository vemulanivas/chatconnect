import React from 'react';

function BlockedUsersModal({ blockedUsers, onUnblock, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content blocked-users-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fas fa-ban"></i> Blocked Users</h3>
          <button className="icon-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          {blockedUsers.length === 0 ? (
            <div className="empty-state">
              <i className="fas fa-user-check"></i>
              <p>No blocked users</p>
              <span>Users you block will appear here</span>
            </div>
          ) : (
            <div className="blocked-users-list">
              {blockedUsers.map((user) => (
                <div key={user.id} className="blocked-user-item">
                  <div className="blocked-user-info">
                    <img 
                      src={user.avatar} 
                      alt={user.fullName}
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`;
                      }}
                    />
                    <div>
                      <h4>{user.fullName}</h4>
                      <p>{user.bio || 'No bio'}</p>
                    </div>
                  </div>
                  <button 
                    className="unblock-btn"
                    onClick={() => onUnblock(user.id)}
                  >
                    <i className="fas fa-user-check"></i> Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BlockedUsersModal;
