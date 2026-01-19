from sqlalchemy import Column, String, Text, ForeignKey, DateTime
from datetime import datetime
from database import Base
import uuid

def uuid_str():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=uuid_str)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)


class Page(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, default=uuid_str)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String)
    content_md = Column(Text)
    parent_id = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
