# ChatConnect - Redux Thunk Edition

A modern, feature-rich chat application built with React and Redux Thunk for efficient state management, inspired by WhatsApp and Instagram.

## 🚀 Features

### Core Features
- **Real-time Messaging** - Send and receive messages instantly
- **Group Chats** - Create and manage group conversations
- **Voice & Video Calls** - Crystal clear communication with media access
- **Voice Messages** - Record and send audio messages
- **File Sharing** - Share images, documents, and files
- **Message Reactions** - React with emojis to messages
- **Message Search** - Search through conversation history
- **Typing Indicators** - See when someone is typing

### User Management
- **Block/Unblock Users** - Control who can contact you
- **Mute/Unmute Chats** - Silence notifications for specific conversations
- **User Status** - Online, Away, Busy, Offline statuses
- **Profile Management** - Update your profile and status

### Call Features (WhatsApp-like)
- **Audio Calls** - One-on-one voice calls
- **Video Calls** - Face-to-face video calls
- **Group Calls** - Call multiple participants at once
- **Call History** - View all your calls with timestamps and duration
- **Call Duration Tracking** - See how long each call lasted

### Modern UI/UX
- **Dark Mode** - Toggle between light and dark themes
- **Responsive Design** - Works on desktop and mobile
- **Smooth Animations** - Polished transitions and effects
- **Online Status** - Real-time user status updates

## 📁 Project Structure

```
chat-app-redux/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ChatSidebar.js
│   │   ├── ChatHeader.js
│   │   ├── ChatMessages.js
│   │   ├── ChatInput.js
│   │   ├── InfoPanel.js
│   │   ├── CallModal.js
│   │   ├── CallHistoryPanel.js
│   │   ├── BlockedUsersModal.js
│   │   ├── VoiceRecorderModal.js
│   │   ├── SearchModal.js
│   │   ├── CreateChannelModal.js
│   │   ├── SettingsModal.js
│   │   ├── GroupCallModal.js
│   │   ├── NotificationContainer.js
│   │   └── LoadingScreen.js
│   ├── hooks/                # Custom Redux hooks
│   │   ├── useAuth.js
│   │   ├── useChat.js
│   │   ├── useMessages.js
│   │   ├── useUI.js
│   │   ├── useCalls.js
│   │   └── useNotifications.js
│   ├── pages/                # Page components
│   │   ├── Home.js
│   │   ├── Login.js
│   │   ├── Signup.js
│   │   └── ChatPage.js
│   ├── store/                # Redux store configuration
│   │   ├── store.js
│   │   ├── index.js
│   │   ├── actions/
│   │   │   ├── types.js
│   │   │   ├── actionCreators.js
│   │   │   └── thunks.js
│   │   └── reducers/
│   │       ├── authReducer.js
│   │       ├── chatReducer.js
│   │       ├── messageReducer.js
│   │       ├── uiReducer.js
│   │       ├── callReducer.js
│   │       └── notificationReducer.js
│   ├── utils/                # Utility functions
│   │   └── chatService.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── package.json
├── .gitignore
└── README.md
```

## 🛠️ Installation

1. **Extract the archive**
   ```bash
   tar -xzf chat-app-redux.tar.gz
   cd chat-app-redux
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 Demo Credentials

- **Username:** `nivas`
- **Password:** `demo123`

Other demo users (all with password `demo123`):
- `abhinava` - Designer & Creative
- `rahul` - Marketing Manager
- `priya` - Product Manager
- `anwita` - Data Scientist

## 📊 Redux Architecture

### Store Structure
```javascript
{
  auth: {
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  },
  chat: {
    users: [],
    channels: [],
    conversations: [],
    activeConversation: null,
    blockedUsers: [],      // NEW: Blocked users list
    mutedChats: [],
    favorites: []
  },
  messages: {
    messages: [],
    typingStatus: {},
    searchQuery: '',
    searchResults: [],
    pinnedMessages: [],
    bookmarkedMessages: []
  },
  ui: {
    darkMode: false,
    isLoading: false,
    error: null,
    activeTab: 'dms',
    sidebarOpen: false,
    modals: { ... }
  },
  calls: {
    isInCall: false,
    callType: null,
    callDuration: 0,
    participants: [],
    callHistory: [],       // NEW: Call history
    localStream: null,     // NEW: Local media stream
    remoteStream: null     // NEW: Remote media stream
  },
  notifications: {
    notifications: [],
    unreadCount: 0
  }
}
```

### Key Thunks (Async Actions)
| Thunk | Description |
|-------|-------------|
| `loginUser()` | Authenticate user |
| `signupUser()` | Register new user |
| `logoutUser()` | Logout user |
| `sendNewMessage()` | Send messages |
| `blockUserAction()` | Block a user |
| `unblockUserAction()` | Unblock a user |
| `startNewCall()` | Initiate calls with media access |
| `endCurrentCall()` | End calls and save to history |
| `showNotification()` | Display notifications |
| `toggleTheme()` | Dark/light mode |

### Custom Hooks
Clean interface to Redux:
```javascript
const { currentUser, login, logout } = useAuth();
const { users, channels, blockUser, unblockUser, isUserBlocked } = useChat();
const { messages, sendMessage, addReaction } = useMessages();
const { darkMode, toggleDarkMode } = useUI();
const { startCall, endCall, callHistory } = useCalls();
```

## 🎯 Key Features Implemented

### 1. **User Selection Fixed**
- Clicking on a user now properly shows their name in the chat header
- Avatar images load correctly with fallback
- Each chat has its own separate interface

### 2. **Block/Unblock Functionality**
- Block users from the Info Panel
- Blocked users cannot start conversations with you
- Unblock users from the Blocked Users modal
- Blocked users list accessible from sidebar

### 3. **Audio/Video Calls with Media Access**
- Request camera and microphone permissions
- Real video/audio streams in call modal
- Call duration tracking
- Group calls with participant selection

### 4. **Call History (WhatsApp-like)**
- View all calls in the Info Panel
- Call history modal accessible from sidebar
- Shows call type, duration, and timestamp
- Call back directly from history

### 5. **Modern UI Features**
- Dark mode toggle
- Responsive design
- Smooth animations
- Typing indicators
- Message reactions
- Voice message recording

## 🚀 Future Enhancements

- [ ] WebSocket integration for real-time updates
- [ ] End-to-end encryption
- [ ] Message threads/replies
- [ ] Stories/Status feature
- [ ] Push notifications
- [ ] File upload progress
- [ ] @mentions system

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

---

Built with ❤️ using React, Redux, and Thunk
