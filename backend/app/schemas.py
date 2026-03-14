from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MeResponse(BaseModel):
    id: str
    email: EmailStr

class BoardCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)

class BoardOut(BaseModel):
    id: str
    name: str
    owner_id: str
    owner_email: str
    created_at: str

class ColumnCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    position: int = 0

class ColumnOut(BaseModel):
    id: str
    board_id: str
    name: str
    position: int

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = ""
    assigned_to: Optional[str] = ""   # ← ADD
    position: int = 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None   # ← ADD

class TaskMove(BaseModel):
    to_column_id: str
    to_position: int = 0

class TaskOut(BaseModel):
    id: str
    column_id: str
    title: str
    description: str
    assigned_to: str     # ← ADD
    position: int
    created_by: str

class BoardSnapshot(BaseModel):
    board: BoardOut
    columns: List[ColumnOut]
    tasks: List[TaskOut]

class InviteUser(BaseModel):
    email: EmailStr