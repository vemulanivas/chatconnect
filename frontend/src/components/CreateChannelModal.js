import React from 'react';

function CreateChannelModal({ onSubmit, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><i className="fas fa-users"></i> New Group</h3>
          <button className="icon-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label>Group Name</label>
              <input type="text" name="channelName" placeholder="Enter group name" required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="channelDescription" placeholder="Group Description (optional)" rows="3" />
            </div>
            <div className="form-group">
              <label>Privacy</label>
              <select name="channelPrivacy">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <button type="submit" className="btn-primary btn-full">
              <i className="fas fa-plus"></i> Create Group
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateChannelModal;
