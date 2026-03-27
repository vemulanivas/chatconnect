from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Integer, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import enum


def gen_uuid():
    return str(uuid.uuid4())


class CallTypeEnum(str, enum.Enum):
    audio = "audio"
    video = "video"


class CallStatusEnum(str, enum.Enum):
    missed = "missed"
    completed = "completed"
    declined = "declined"


class ConversationTypeEnum(str, enum.Enum):
    dm = "dm"
    group = "group"
    channel = "channel"


class MessageTypeEnum(str, enum.Enum):
    text = "text"
    image = "image"
    file = "file"
    voice = "voice"
    video = "video"


# Association table for conversation participants
from sqlalchemy import Table
conversation_participants = Table(
    "conversation_participants",
    Base.metadata,
    Column("conversation_id", String, ForeignKey("conversations.id"), primary_key=True),
    Column("user_id", String, ForeignKey("users.id"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    bio = Column(Text, default="")
    avatar = Column(String, default="")
    status = Column(String, default="online")
    is_admin = Column(Boolean, default=False)           # NEW: admin role
    is_active = Column(Boolean, default=True)           # NEW: ban/suspend
    last_seen = Column(DateTime, nullable=True)         # NEW: online presence
    last_login = Column(DateTime, nullable=True)        # NEW: track login
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    messages = relationship("Message", back_populates="sender", foreign_keys="Message.sender_id")
    notifications = relationship("Notification", back_populates="user")
    blocked_users = relationship("BlockedUser", back_populates="blocker", foreign_keys="BlockedUser.blocker_id")
    blocked_by = relationship("BlockedUser", back_populates="blocked", foreign_keys="BlockedUser.blocked_id")
    conversations = relationship("Conversation", secondary=conversation_participants, back_populates="participants")
    calls_made = relationship("CallHistory", back_populates="caller", foreign_keys="CallHistory.caller_id")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=gen_uuid)
    type = Column(String, default="dm")  # dm, group, channel
    name = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    avatar = Column(String, nullable=True)
    privacy = Column(String, default="public")          # NEW: public/private
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    participants = relationship("User", secondary=conversation_participants, back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")
    creator = relationship("User", foreign_keys=[created_by])


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=True)
    type = Column(String, default="text")
    file_url = Column(String, nullable=True)
    file_name = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    duration = Column(Integer, nullable=True)
    reply_to_id = Column(String, ForeignKey("messages.id"), nullable=True)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)
    is_bookmarked = Column(Boolean, default=False)
    is_flagged = Column(Boolean, default=False)         # NEW: moderation flag
    priority = Column(String, default="normal")          # normal, important, urgent
    mentions = Column(Text, nullable=True)               # JSON list of mentioned user IDs
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    sender = relationship("User", back_populates="messages", foreign_keys=[sender_id])
    conversation = relationship("Conversation", back_populates="messages")
    reactions = relationship("Reaction", back_populates="message")
    reply_to = relationship("Message", remote_side="Message.id")
    read_receipts = relationship("ReadReceipt", back_populates="message")  # NEW


class ReadReceipt(Base):                                # NEW: read receipts
    __tablename__ = "read_receipts"

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    read_at = Column(DateTime, server_default=func.now())

    message = relationship("Message", back_populates="read_receipts")


class Reaction(Base):
    __tablename__ = "reactions"

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    emoji = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    message = relationship("Message", back_populates="reactions")


class CallHistory(Base):
    __tablename__ = "call_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    caller_id = Column(String, ForeignKey("users.id"), nullable=False)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    call_type = Column(String, default="audio")
    status = Column(String, default="completed")
    duration = Column(Integer, default=0)
    participants = Column(Text, nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    ended_at = Column(DateTime, nullable=True)

    caller = relationship("User", back_populates="calls_made", foreign_keys=[caller_id])


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="notifications")


class BlockedUser(Base):
    __tablename__ = "blocked_users"

    id = Column(String, primary_key=True, default=gen_uuid)
    blocker_id = Column(String, ForeignKey("users.id"), nullable=False)
    blocked_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    blocker = relationship("User", back_populates="blocked_users", foreign_keys=[blocker_id])
    blocked = relationship("User", back_populates="blocked_by", foreign_keys=[blocked_id])


class Poll(Base):
    __tablename__ = "polls"

    id = Column(String, primary_key=True, default=gen_uuid)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    options = Column(Text, nullable=False)       # JSON array of option strings
    is_anonymous = Column(Boolean, default=False)
    allow_multiple = Column(Boolean, default=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    expires_at = Column(DateTime, nullable=True)

    votes = relationship("PollVote", back_populates="poll")
    creator = relationship("User", foreign_keys=[created_by])


class PollVote(Base):
    __tablename__ = "poll_votes"

    id = Column(String, primary_key=True, default=gen_uuid)
    poll_id = Column(String, ForeignKey("polls.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    option_index = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    poll = relationship("Poll", back_populates="votes")