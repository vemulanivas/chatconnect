# ChatConnect - Full Stack Edition

A modern, production-ready chat application built with **React + Redux Thunk** (frontend) and **FastAPI + SQLAlchemy** (backend).

---

## 🏗️ Architecture

```
chatconnect-fullstack/
├── frontend/          # React + Redux application
│   └── src/
│       ├── utils/apiClient.js     # ← NEW: Real API calls
│       ├── store/actions/thunks.js # ← UPDATED: Real API integration
│       └── ...components, hooks, etc.
├── backend/           # FastAPI application
│   ├── main.py
│   ├── database.py
│   ├── auth_utils.py
│   ├── seed.py        # Demo data seeder
│   ├── models/
│   │   └── models.py  # SQLAlchemy ORM models
│   └── routers/
│       ├── auth.py
│       ├── users.py
│       ├── chats.py
│       ├── messages.py
│       ├── calls.py
│       └── notifications.py
└── README.md
```

---

## 🚀 Quick Start

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate     # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# Run database seed (creates demo users)
python seed.py

# Start the backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: http://localhost:8000  
API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# REACT_APP_API_URL=http://localhost:8000  (default)

# Start the frontend dev server
npm start
```

Frontend runs at: http://localhost:3000

---

## 👤 Demo Credentials

After running `python seed.py`:

| Username   | Password  |
|------------|-----------|
| nivas      | demo123   |
| abhinava   | demo123   |
| rahul      | demo123   |
| priya      | demo123   |
| anwita     | demo123   |

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable                    | Default                          | Description               |
|-----------------------------|----------------------------------|---------------------------|
| `DATABASE_URL`              | `sqlite:///./chatconnect.db`     | SQLite or PostgreSQL URL  |
| `SECRET_KEY`                | (insecure default)               | JWT signing secret        |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`                         | 24 hours by default       |

### Frontend (`frontend/.env`)

| Variable             | Default                    | Description         |
|----------------------|----------------------------|---------------------|
| `REACT_APP_API_URL`  | `http://localhost:8000`    | Backend API base URL|

---

## 🗄️ Database Models

| Model            | Description                          |
|------------------|--------------------------------------|
| `User`           | Auth & profile                       |
| `Conversation`   | DM / Group / Channel                 |
| `Message`        | Text, file, voice messages           |
| `Reaction`       | Emoji reactions on messages          |
| `CallHistory`    | Audio/video call records             |
| `Notification`   | Per-user notifications               |
| `BlockedUser`    | Block relationships                  |

---

## 📡 API Endpoints

| Method | Endpoint                          | Description                  |
|--------|-----------------------------------|------------------------------|
| POST   | `/api/auth/register`              | Register a new user          |
| POST   | `/api/auth/login`                 | Login, returns JWT           |
| GET    | `/api/users/`                     | Get all users                |
| GET    | `/api/users/me`                   | Get current user profile     |
| PUT    | `/api/users/me`                   | Update profile               |
| POST   | `/api/users/block`                | Block a user                 |
| POST   | `/api/users/unblock`              | Unblock a user               |
| GET    | `/api/chats/`                     | Get conversations            |
| POST   | `/api/chats/dm`                   | Create/get DM conversation   |
| POST   | `/api/chats/`                     | Create group/channel         |
| GET    | `/api/messages/{conv_id}`         | Get messages for conversation|
| POST   | `/api/messages/`                  | Send a message               |
| PUT    | `/api/messages/{id}`              | Edit message                 |
| DELETE | `/api/messages/{id}`              | Delete message               |
| POST   | `/api/messages/{id}/react`        | Toggle emoji reaction        |
| POST   | `/api/messages/{id}/pin`          | Toggle pin                   |
| POST   | `/api/messages/{id}/bookmark`     | Toggle bookmark              |
| GET    | `/api/calls/`                     | Get call history             |
| POST   | `/api/calls/`                     | Create call record           |
| GET    | `/api/notifications/`             | Get notifications            |
| GET    | `/api/notifications/unread-count` | Get unread count             |
| POST   | `/api/notifications/read-all`     | Mark all as read             |

---

## 🔄 What Changed from Original

### Frontend
- Replaced `chatService.js` mock with `apiClient.js` → real HTTP calls
- All Redux thunks now call the FastAPI backend
- `checkAuthStatus` validates JWT token on refresh
- `setActiveChat` triggers `loadMessagesForConversation` from backend
- Added 5-second polling for new messages
- Login persists via JWT in localStorage

### Backend (New)
- FastAPI with JWT authentication
- BCrypt password hashing
- SQLAlchemy ORM with SQLite (PostgreSQL compatible)
- Full CRUD for: users, conversations, messages, reactions, calls, notifications
- CORS enabled for React dev server

---

## 🔐 Security

- Passwords hashed with bcrypt (passlib)
- JWT tokens with configurable expiry
- All routes (except auth) require valid Bearer token
- Pydantic validation on all inputs
- CORS restricted to configured origins

---

## 🚀 Production Deployment

### Backend
```bash
# Use PostgreSQL
DATABASE_URL=postgresql://user:pass@host:5432/chatconnect

# Generate secure secret key
python -c "import secrets; print(secrets.token_hex(32))"

# Run with gunicorn
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Frontend
```bash
REACT_APP_API_URL=https://your-api-domain.com npm run build
# Serve /build folder with nginx or similar
```
