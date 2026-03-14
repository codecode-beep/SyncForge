from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Board, Column, Task, User, BoardMember
from ..schemas import BoardCreate, BoardOut, BoardSnapshot, InviteUser

router = APIRouter(prefix="/boards", tags=["boards"])

@router.post("", response_model=BoardOut)
def create_board(payload: BoardCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    board = Board(name=payload.name, owner_id=user.id)
    db.add(board)
    db.commit()
    db.refresh(board)

    # default columns
    db.add_all([
        Column(board_id=board.id, name="Todo", position=0),
        Column(board_id=board.id, name="In Progress", position=1),
        Column(board_id=board.id, name="Done", position=2),
    ])
    db.commit()

    return BoardOut(
        id=board.id,
        name=board.name,
        owner_id=board.owner_id,
        owner_email=user.email,
        created_at=str(board.created_at)
    )

# @router.get("", response_model=list[BoardOut])
# def list_boards(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
#     boards = db.query(Board).filter(Board.owner_id == user.id).order_by(Board.created_at.desc()).all()
#     return [BoardOut(id=b.id, name=b.name, owner_id=b.owner_id) for b in boards]

@router.get("", response_model=list[BoardOut])
def list_boards(db: Session = Depends(get_db), user: User = Depends(get_current_user)):

    owned = db.query(Board).filter(Board.owner_id == user.id)

    member = db.query(Board).join(BoardMember).filter(
        BoardMember.user_id == user.id
    )

    boards = owned.union(member).order_by(Board.created_at.desc()).all()

    return [
        BoardOut(
            id=b.id,
            name=b.name,
            owner_id=b.owner_id,
            owner_email=b.owner.email,
            created_at=str(b.created_at)
        )
        for b in boards
    ]

@router.get("/{board_id}", response_model=BoardSnapshot)
def get_board_snapshot(board_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    board = db.get(Board, board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    check_board_access(db, board, user.id)

    cols = db.query(Column).filter(Column.board_id == board_id).order_by(Column.position.asc()).all()
    col_ids = [c.id for c in cols]
    tasks = []
    if col_ids:
        tasks = db.query(Task).filter(Task.column_id.in_(col_ids)).order_by(Task.position.asc()).all()

    return BoardSnapshot(
        board=BoardOut(
            id=board.id,
            name=board.name,
            owner_id=board.owner_id,
            owner_email=board.owner.email,
            created_at=str(board.created_at)
        ),
        columns=[{"id": c.id, "board_id": c.board_id, "name": c.name, "position": c.position} for c in cols],
        tasks=[{"id": t.id, "column_id": t.column_id, "title": t.title, "description": t.description or "","assigned_to": t.assigned_to, "position": t.position, "created_by": t.created_by,"created_at": str(board.created_at)} for t in tasks],
    )

@router.delete("/{board_id}")
def delete_board(board_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    board = db.get(Board, board_id)

    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    check_board_access(db, board, user.id)

    db.delete(board)
    db.commit()

    return {"ok": True}

@router.post("/{board_id}/invite")
def invite_user(
    board_id: str,
    payload: InviteUser,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    board = db.get(Board, board_id)

    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    check_board_access(db, board, user.id)

    invited_user = db.query(User).filter(User.email == payload.email).first()

    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(BoardMember).filter(
        BoardMember.board_id == board_id,
        BoardMember.user_id == invited_user.id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="User already member")

    member = BoardMember(board_id=board_id, user_id=invited_user.id)

    db.add(member)
    db.commit()

    return {"message": "User invited"}


def check_board_access(db, board, user_id):

    if board.owner_id == user_id:
        return

    member = db.query(BoardMember).filter(
        BoardMember.board_id == board.id,
        BoardMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(status_code=403, detail="Not allowed")