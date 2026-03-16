// ========================================
// CHAT SERVICE - Enhanced with all modern features
// ========================================

const chatService = {
  // ========================================
  // INITIAL DATA
  // ========================================
  
  users: [
    { id: 'u1', username: 'nivas', email: 'nivas@example.com', password: 'demo123', fullName: 'Nivas', bio: 'Software Developer', avatar: 'https://ui-avatars.com/api/?name=Nivas&background=667eea&color=fff', status: 'online', isLoggedIn: false, blockedUsers: [] },
    { id: 'u2', username: 'abhinava', email: 'abhinava@example.com', password: 'demo123', fullName: 'Abhinava', bio: 'Designer & Creative', avatar: 'https://ui-avatars.com/api/?name=Abhinava&background=764ba2&color=fff', status: 'online', isLoggedIn: false, blockedUsers: [] },
    { id: 'u3', username: 'rahul', email: 'rahul@example.com', password: 'demo123', fullName: 'Rahul Sharma', bio: 'Marketing Manager', avatar: 'https://ui-avatars.com/api/?name=Rahul+Sharma&background=f093fb&color=fff', status: 'away', isLoggedIn: false, blockedUsers: [] },
    { id: 'u4', username: 'priya', email: 'priya@example.com', password: 'demo123', fullName: 'Priya Patel', bio: 'Product Manager', avatar: 'https://ui-avatars.com/api/?name=Priya+Patel&background=4facfe&color=fff', status: 'busy', isLoggedIn: false, blockedUsers: [] },
    { id: 'u5', username: 'anwita', email: 'anwita@example.com', password: 'demo123', fullName: 'Anwita', bio: 'Data Scientist', avatar: 'https://ui-avatars.com/api/?name=Anwita&background=43e97b&color=fff', status: 'offline', isLoggedIn: false, blockedUsers: [] }
  ],

  channels: [
    { id: 'c1', name: 'General Chat', description: 'General discussion for everyone', privacy: 'public', members: ['u1', 'u2', 'u3', 'u4', 'u5'], createdBy: 'u1', createdAt: new Date().toISOString() },
    { id: 'c2', name: 'Team Alpha', description: 'Private team channel', privacy: 'private', members: ['u1', 'u2', 'u3'], createdBy: 'u1', createdAt: new Date().toISOString() },
    { id: 'c3', name: 'Design Team', description: 'Design discussions', privacy: 'public', members: ['u2', 'u4'], createdBy: 'u2', createdAt: new Date().toISOString() }
  ],

  conversations: [],
  messages: [],
  callHistory: [],

  // ========================================
  // AUTH METHODS
  // ========================================

  login(username, password) {
    const user = this.users.find(u => (u.username === username || u.email === username) && u.password === password);
    if (user) {
      user.isLoggedIn = true;
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    return null;
  },

  signup(userData) {
    const existingUser = this.users.find(u => u.username === userData.username || u.email === userData.email);
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    const newUser = {
      id: `u${Date.now()}`,
      ...userData,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.fullName)}&background=random`,
      status: 'online',
      isLoggedIn: false,
      blockedUsers: []
    };

    this.users.push(newUser);
    return newUser;
  },

  logout() {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      if (user) user.isLoggedIn = false;
    }
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');
  },

  getCurrentUser() {
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : null;
  },

  updateUser(updatedUser) {
    const index = this.users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      this.users[index] = { ...this.users[index], ...updatedUser };
      if (updatedUser.isLoggedIn) {
        localStorage.setItem('currentUser', JSON.stringify(this.users[index]));
      }
    }
  },

  // ========================================
  // USER METHODS
  // ========================================

  getUsers() {
    return this.users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      bio: u.bio,
      avatar: u.avatar,
      status: u.status,
      isLoggedIn: u.isLoggedIn,
      blockedUsers: u.blockedUsers || []
    }));
  },

  getUserById(userId) {
    return this.users.find(u => u.id === userId);
  },

  // ========================================
  // BLOCK USER METHODS
  // ========================================

  blockUser(userId) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      if (user) {
        if (!user.blockedUsers) user.blockedUsers = [];
        if (!user.blockedUsers.includes(userId)) {
          user.blockedUsers.push(userId);
          this.updateUser(user);
        }
      }
    }
  },

  unblockUser(userId) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      if (user && user.blockedUsers) {
        user.blockedUsers = user.blockedUsers.filter(id => id !== userId);
        this.updateUser(user);
      }
    }
  },

  isUserBlocked(userId) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      return user?.blockedUsers?.includes(userId) || false;
    }
    return false;
  },

  getBlockedUsers() {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      return user?.blockedUsers || [];
    }
    return [];
  },

  // ========================================
  // CHANNEL METHODS
  // ========================================

  getChannels() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];
    return this.channels.filter(c => c.members.includes(currentUser.id));
  },

  createChannel(name, description, privacy) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const newChannel = {
      id: `c${Date.now()}`,
      name,
      description,
      privacy,
      members: [currentUser.id],
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };

    this.channels.push(newChannel);
    return newChannel;
  },

  // ========================================
  // CONVERSATION METHODS
  // ========================================

  getConversations() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];

    // Filter out conversations with blocked users
    return this.conversations.filter(conv => {
      if (conv.type === 'dm') {
        const otherUserId = conv.participants.find(id => id !== currentUser.id);
        return !this.isUserBlocked(otherUserId);
      }
      return true;
    });
  },

  getOrCreateConversation(userId) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    // Check if user is blocked
    if (this.isUserBlocked(userId)) {
      throw new Error('Cannot start conversation with blocked user');
    }

    const existingConv = this.conversations.find(
      c => c.type === 'dm' && 
      c.participants.includes(currentUser.id) && 
      c.participants.includes(userId)
    );

    if (existingConv) return existingConv;

    const newConv = {
      id: `conv${Date.now()}`,
      type: 'dm',
      participants: [currentUser.id, userId],
      createdAt: new Date().toISOString(),
      lastMessage: null
    };

    this.conversations.push(newConv);
    return newConv;
  },

  getOrCreateChannelConversation(channelId) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    const existingConv = this.conversations.find(
      c => c.type === 'channel' && c.channelId === channelId
    );

    if (existingConv) return existingConv;

    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) throw new Error('Channel not found');

    const newConv = {
      id: `conv${Date.now()}`,
      type: 'channel',
      channelId,
      participants: channel.members,
      createdAt: new Date().toISOString(),
      lastMessage: null
    };

    this.conversations.push(newConv);
    return newConv;
  },

  // ========================================
  // MESSAGE METHODS
  // ========================================

  getMessages() {
    return this.messages;
  },

  sendMessage(conversationId, content, type = 'text', metadata = {}) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const message = {
      id: `msg${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      content,
      type,
      metadata,
      timestamp: new Date().toISOString(),
      read: false,
      reactions: [],
      pinned: false,
      bookmarked: false
    };

    this.messages.push(message);

    // Update conversation last message
    const conv = this.conversations.find(c => c.id === conversationId);
    if (conv) {
      conv.lastMessage = message;
    }

    return message;
  },

  editMessage(messageId, newContent) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.content = newContent;
      message.edited = true;
      message.editedAt = new Date().toISOString();
    }
  },

  deleteMessage(messageId) {
    this.messages = this.messages.filter(m => m.id !== messageId);
  },

  addReaction(messageId, emoji) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      if (!message.reactions) message.reactions = [];
      
      const existingIndex = message.reactions.findIndex(r => r.emoji === emoji);
      if (existingIndex >= 0) {
        message.reactions.splice(existingIndex, 1);
      } else {
        message.reactions.push({ emoji, timestamp: new Date().toISOString() });
      }
    }
  },

  togglePinMessage(messageId) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.pinned = !message.pinned;
    }
  },

  toggleBookmarkMessage(messageId) {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.bookmarked = !message.bookmarked;
    }
  },

  searchMessages(query) {
    return this.messages.filter(m =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );
  },

  // ========================================
  // MUTE/UNMUTE METHODS
  // ========================================

  muteChat(conversationId) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      if (user) {
        if (!user.mutedChats) user.mutedChats = [];
        if (!user.mutedChats.includes(conversationId)) {
          user.mutedChats.push(conversationId);
          this.updateUser(user);
        }
      }
    }
  },

  unmuteChat(conversationId) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      if (user && user.mutedChats) {
        user.mutedChats = user.mutedChats.filter(id => id !== conversationId);
        this.updateUser(user);
      }
    }
  },

  isChatMuted(conversationId) {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const user = this.users.find(u => u.id === currentUser.id);
      return user?.mutedChats?.includes(conversationId) || false;
    }
    return false;
  },

  // ========================================
  // CALL HISTORY METHODS
  // ========================================

  addCallHistory(callData) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    const callRecord = {
      id: `call${Date.now()}`,
      ...callData,
      callerId: currentUser.id,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };

    this.callHistory.unshift(callRecord);
    return callRecord;
  },

  getCallHistory() {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return [];

    return this.callHistory.filter(call => 
      call.callerId === currentUser.id || 
      call.participants?.includes(currentUser.id)
    );
  },

  getCallHistoryForConversation(conversationId) {
    return this.callHistory.filter(call => call.conversationId === conversationId);
  },

  deleteCallHistory(callId) {
    this.callHistory = this.callHistory.filter(call => call.id !== callId);
  },

  // ========================================
  // INITIALIZE
  // ========================================

  initialize() {
    // Add some sample messages
    const currentUser = this.getCurrentUser();
    if (currentUser && this.messages.length === 0) {
      // Create sample conversations and messages
      const conv1 = this.getOrCreateConversation('u2');
      if (conv1) {
        this.sendMessage(conv1.id, 'Hey! How are you doing? 👋', 'text');
        this.sendMessage(conv1.id, 'I\'m great! Thanks for asking 😊', 'text');
      }
    }
  }
};

export default chatService;
