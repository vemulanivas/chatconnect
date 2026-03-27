const BASE_URL = process.env.REACT_APP_API_URL || 'https://chatconnect-b5c9amhye7gpdfeb.southeastasia-01.azurewebsites.net';

class ApiClient {
  getToken() { return localStorage.getItem('authToken'); }
  getRefreshToken() { return localStorage.getItem('refreshToken'); }
  setToken(t, rt) {
    if (t) localStorage.setItem('authToken', t);
    if (rt) localStorage.setItem('refreshToken', rt);
  }
  clearToken() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  }

  isRefreshing = false;
  refreshSubscribers = [];

  subscribeTokenRefresh(cb) {
    this.refreshSubscribers.push(cb);
  }

  onRefreshed(token) {
    this.refreshSubscribers.forEach(cb => cb(token));
    this.refreshSubscribers = [];
  }

  async request(method, path, body = null, isFormData = false, retries = 3) {
    const token = this.getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData && body) headers['Content-Type'] = 'application/json';
    const options = { method, headers };
    if (body) options.body = isFormData ? body : JSON.stringify(body);

    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${BASE_URL}${path}`, options);
        if (response.status === 401) {
          const isAuthPath = path === '/api/auth/login' || path === '/api/auth/register' || path === '/api/auth/refresh';
          
          if (!isAuthPath) {
            // Attempt to refresh token for general API calls
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              if (!this.isRefreshing) {
                this.isRefreshing = true;
                try {
                  const refreshResponse = await fetch(`${BASE_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token: refreshToken })
                  });

                  if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    this.setToken(data.access_token, data.refresh_token);
                    this.isRefreshing = false;
                    this.onRefreshed(data.access_token);
                  } else {
                    this.isRefreshing = false;
                    this.clearToken();
                    window.location.href = '/login';
                    throw new Error('Session expired.');
                  }
                } catch (refreshErr) {
                  this.isRefreshing = false;
                  this.clearToken();
                  window.location.href = '/login';
                  throw new Error('Session expired.');
                }
              }

              // Wait for the token wrapper
              const newToken = await new Promise(resolve => {
                this.subscribeTokenRefresh(token => {
                  resolve(token);
                });
              });

              // Retry original request
              options.headers['Authorization'] = `Bearer ${newToken}`;
              const retryResponse = await fetch(`${BASE_URL}${path}`, options);
              if (retryResponse.status === 401) {
                this.clearToken(); window.location.href = '/login'; throw new Error('Session expired.');
              }
              if ((retryResponse.status >= 500 && retryResponse.status <= 599) || retryResponse.status === 429) {
                if (i === retries - 1) throw new Error(`Server error: ${retryResponse.status}`);
                continue;
              }
              const data = await retryResponse.json().catch(() => ({}));
              if (!retryResponse.ok) throw new Error(data.detail || `Request failed: ${retryResponse.status}`);
              return data;

            } else {
              this.clearToken(); 
              window.location.href = '/login'; 
              throw new Error('Session expired.');
            }
          }
          // If it IS an auth path and we got 401, fall through to normal error handling at line 104
        }

        // If it's a server error or rate limiting, we might want to retry
        if ((response.status >= 500 && response.status <= 599) || response.status === 429) {
          if (i === retries - 1) throw new Error(`Server error: ${response.status}`);
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
          continue;
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.detail || `Request failed: ${response.status}`);
        return data;
      } catch (error) {
        // Rethrow immediately if we are out of retries or if it's an explicit auth abort
        if (i === retries - 1 || error.message === 'Session expired.') {
          throw error;
        }
        // Wait before next retry
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
      }
    }
  }

  // AUTH
  async login(username, password) {
    const data = await this.request('POST', '/api/auth/login', { username, password });
    this.setToken(data.access_token, data.refresh_token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data;
  }
  async register(userData) {
    const data = await this.request('POST', '/api/auth/register', {
      username: userData.username, email: userData.email,
      full_name: userData.fullName, password: userData.password, bio: userData.bio || '',
    });
    this.setToken(data.access_token, data.refresh_token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data;
  }
  async logout() {
    try {
      await this.request('POST', '/api/auth/logout', {});
    } catch (e) { }
    this.clearToken();
  }
  async getMe() { return this.request('GET', '/api/users/me'); }

  // USERS
  async getUsers() { return this.request('GET', '/api/users/'); }
  async searchUsers(query) { return this.request('GET', `/api/users/search?q=${encodeURIComponent(query)}`); }
  async updateProfile(data) { return this.request('PUT', '/api/users/me', data); }
  async blockUser(userId) { return this.request('POST', '/api/users/block', { user_id: userId }); }
  async unblockUser(userId) { return this.request('POST', '/api/users/unblock', { user_id: userId }); }
  async getBlockedUsers() { return this.request('GET', '/api/users/blocked'); }

  // CHATS
  async getConversations() { return this.request('GET', '/api/chats/'); }
  async createDM(userId) { return this.request('POST', '/api/chats/dm', { user_id: userId }); }
  async createGroup(name, description, participantIds, type = 'group') {
    return this.request('POST', '/api/chats/', { name, description, participant_ids: participantIds, type });
  }
  async getConversation(convId) { return this.request('GET', `/api/chats/${convId}`); }
  async deleteConversation(convId) { return this.request('DELETE', `/api/chats/${convId}`); }
  async addMember(convId, userId) { return this.request('POST', `/api/chats/${convId}/add-member`, { user_id: userId }); }
  async removeMember(convId, userId) { return this.request('DELETE', `/api/chats/${convId}/remove-member/${userId}`); }

  // MESSAGES
  async getMessages(conversationId, limit = 50) { return this.request('GET', `/api/messages/${conversationId}?limit=${limit}`); }
  async sendMessage(conversationId, content, type = 'text', metadata = {}) {
    return this.request('POST', '/api/messages/', {
      conversation_id: conversationId, content, type,
      priority: metadata.priority || 'normal',
      mentions: metadata.mentions || [],
      ...metadata
    });
  }
  async editMessage(messageId, content) { return this.request('PUT', `/api/messages/${messageId}`, { content }); }
  async deleteMessage(messageId) { return this.request('DELETE', `/api/messages/${messageId}`); }
  async reactToMessage(messageId, emoji) { return this.request('POST', `/api/messages/${messageId}/react`, { emoji }); }
  async pinMessage(messageId) { return this.request('POST', `/api/messages/${messageId}/pin`); }
  async bookmarkMessage(messageId) { return this.request('POST', `/api/messages/${messageId}/bookmark`); }
  async searchMessages(conversationId, q) { return this.request('GET', `/api/messages/search/${conversationId}?q=${encodeURIComponent(q)}`); }
  async flagMessage(messageId) { return this.request('POST', `/api/messages/${messageId}/flag`); }
  async markMessageRead(messageId) { return this.request('POST', `/api/messages/${messageId}/read`); }
  async getThread(messageId) { return this.request('GET', `/api/messages/${messageId}/thread`); }
  async createPoll(conversationId, question, options, isAnonymous = false, allowMultiple = false) {
    return this.request('POST', '/api/messages/poll', {
      conversation_id: conversationId, question, options, is_anonymous: isAnonymous, allow_multiple: allowMultiple
    });
  }
  async votePoll(pollId, optionIndex) { return this.request('POST', `/api/messages/poll/${pollId}/vote`, { option_index: optionIndex }); }
  async getPoll(pollId) { return this.request('GET', `/api/messages/poll/${pollId}`); }

  // CALLS
  async getCallHistory() { return this.request('GET', '/api/calls/'); }
  async createCall(callData) {
    return this.request('POST', '/api/calls/', {
      conversation_id: callData.conversationId || null,
      call_type: callData.type || 'audio',
      participant_ids: callData.participants || [],
      status: callData.status || 'completed',
      duration: callData.duration || 0,
    });
  }
  async deleteCall(callId) { return this.request('DELETE', `/api/calls/${callId}`); }

  // NOTIFICATIONS
  async getNotifications() { return this.request('GET', '/api/notifications/'); }
  async getUnreadCount() { return this.request('GET', '/api/notifications/unread-count'); }
  async markNotificationRead(notifId) { return this.request('POST', `/api/notifications/${notifId}/read`); }
  async markAllNotificationsRead() { return this.request('POST', '/api/notifications/read-all'); }
  async getUnreadSystemNotifications() { return this.request('GET', '/api/notifications/unread-system'); }

  // ADMIN
  async adminGetStats() { return this.request('GET', '/api/admin/stats'); }
  async adminGetUsers() { return this.request('GET', '/api/admin/users'); }
  async adminBanUser(userId) { return this.request('POST', `/api/admin/users/${userId}/ban`); }
  async adminUnbanUser(userId) { return this.request('POST', `/api/admin/users/${userId}/unban`); }
  async adminMakeAdmin(userId) { return this.request('POST', `/api/admin/users/${userId}/make-admin`); }
  async adminRevokeAdmin(userId) { return this.request('POST', `/api/admin/users/${userId}/revoke-admin`); }
  async adminDeleteUser(userId) { return this.request('DELETE', `/api/admin/users/${userId}`); }
  async adminGetFlagged() { return this.request('GET', '/api/admin/flagged-messages'); }
  async adminDeleteMessage(messageId) { return this.request('DELETE', `/api/admin/messages/${messageId}`); }
  async adminUnflagMessage(messageId) { return this.request('POST', `/api/admin/messages/${messageId}/unflag`); }
  async adminGetConversations() { return this.request('GET', '/api/admin/conversations'); }
  async adminBroadcast(message) { return this.request('POST', '/api/admin/broadcast', { message }); }
  async adminGetUserCalls(userId) { return this.request('GET', `/api/admin/users/${userId}/calls`); }
  async adminGetConversationMessages(convId) { return this.request('GET', `/api/admin/conversations/${convId}/messages`); }

  // PRESENCE
  async getOnlineUsers() { return this.request('GET', '/api/online-users'); }

  // UNREAD
  async markConversationRead(conversationId) { return this.request('POST', '/api/chats/mark-read', { conversation_id: conversationId }); }
}

const apiClient = new ApiClient();
export default apiClient;