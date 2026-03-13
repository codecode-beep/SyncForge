from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Board, Column, Task, User
from ..schemas import TaskCreate, TaskOut, TaskUpdate, TaskMove
from ..websocket_manager import manager

router = APIRouter(tags=["tasks"])


def _get_board_for_column(db: Session, column_id: str) -> Board:
    col = db.get(Column, column_id)
    if not col:
        raise HTTPException(status_code=404, detail="Column not found")

    board = db.get(Board, col.board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")

    return board


# ✅ CREATE TASK (NOW ASYNC)
@router.post("/columns/{column_id}/tasks", response_model=TaskOut)
async def create_task(
    column_id: str,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    board = _get_board_for_column(db, column_id)

    if board.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    task = Task(
        column_id=column_id,
        title=payload.title,
        description=payload.description or "",
        position=payload.position,
        created_by=user.id,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    # 🔥 Broadcast to WebSocket clients
    await manager.broadcast(
        board.id,
        {
            "type": "task_created",
            "task": {
                "id": task.id,
                "column_id": task.column_id,
                "title": task.title,
                "description": task.description,
                "position": task.position,
                "created_by": task.created_by,
            },
        },
    )

    return TaskOut(
        id=task.id,
        column_id=task.column_id,
        title=task.title,
        description=task.description,
        position=task.position,
        created_by=task.created_by,
    )


# ✅ UPDATE TASK (NOW ASYNC)
@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    board = _get_board_for_column(db, task.column_id)

    if board.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description

    db.commit()
    db.refresh(task)

    # 🔥 Broadcast update
    await manager.broadcast(
        board.id,
        {
            "type": "task_updated",
            "task": {
                "id": task.id,
                "column_id": task.column_id,
                "title": task.title,
                "description": task.description,
                "position": task.position,
                "created_by": task.created_by,
            },
        },
    )

    return TaskOut(
        id=task.id,
        column_id=task.column_id,
        title=task.title,
        description=task.description,
        position=task.position,
        created_by=task.created_by,
    )


# ✅ MOVE TASK (NOW ASYNC)
@router.post("/tasks/{task_id}/move", response_model=TaskOut)
async def move_task(
    task_id: str,
    payload: TaskMove,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    board = _get_board_for_column(db, task.column_id)

    if board.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    to_col = db.get(Column, payload.to_column_id)
    if not to_col or to_col.board_id != board.id:
        raise HTTPException(status_code=400, detail="Invalid destination column")

    task.column_id = payload.to_column_id
    task.position = payload.to_position

    db.commit()
    db.refresh(task)

    # 🔥 Broadcast move
    await manager.broadcast(
        board.id,
        {
            "type": "task_moved",
            "task": {
                "id": task.id,
                "column_id": task.column_id,
                "title": task.title,
                "description": task.description,
                "position": task.position,
                "created_by": task.created_by,
            },
        },
    )

    return TaskOut(
        id=task.id,
        column_id=task.column_id,
        title=task.title,
        description=task.description,
        position=task.position,
        created_by=task.created_by,
    )


# ✅ DELETE TASK (NOW ASYNC)
@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    board = _get_board_for_column(db, task.column_id)

    if board.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(task)
    db.commit()

    # 🔥 Broadcast delete
    await manager.broadcast(
        board.id,
        {
            "type": "task_deleted",
            "task_id": task_id,
        },
    )

    return {"ok": True}