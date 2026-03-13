from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Board, Column, User
from ..schemas import ColumnCreate, ColumnOut

router = APIRouter(tags=["columns"])

@router.post("/boards/{board_id}/columns", response_model=ColumnOut)
def create_column(board_id: str, payload: ColumnCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    board = db.get(Board, board_id)
    if not board or board.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Board not found")

    col = Column(board_id=board_id, name=payload.name, position=payload.position)
    db.add(col)
    db.commit()
    db.refresh(col)
    return ColumnOut(id=col.id, board_id=col.board_id, name=col.name, position=col.position)