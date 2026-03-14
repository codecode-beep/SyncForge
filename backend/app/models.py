import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def uuid_str() -> str:
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    boards_owned = relationship("Board", back_populates="owner")

class Board(Base):
    __tablename__ = "boards"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="boards_owned")
    columns = relationship("Column", back_populates="board", cascade="all, delete-orphan")
    members = relationship("BoardMember", back_populates="board", cascade="all, delete-orphan")

class BoardMember(Base):
    __tablename__ = "board_members"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)

    board_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("boards.id"), index=True
    )

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), index=True
    )

    joined_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    board = relationship("Board", back_populates="members")

class Column(Base):
    __tablename__ = "columns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    board_id: Mapped[str] = mapped_column(String(36), ForeignKey("boards.id"), index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0)

    board = relationship("Board", back_populates="columns")
    tasks = relationship("Task", back_populates="column", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("board_id", "position", name="uq_column_board_position"),
    )


class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    column_id: Mapped[str] = mapped_column(String(36), ForeignKey("columns.id"), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    assigned_to: Mapped[str] = mapped_column(String(255), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    created_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    column = relationship("Column", back_populates="tasks")

    __table_args__ = (
        UniqueConstraint("column_id", "position", name="uq_task_column_position"),
    )

