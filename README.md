# SyncForge

Real-Time Task Collaboration System.

## Live Access

- **Login page**: `https://sync-forge-seven.vercel.app/login.html`

## Overview

SyncForge is a real-time collaboration app for managing tasks with a focus on fast updates and shared visibility across users.

## Getting Started

### Backend (FastAPI)

#### Prerequisites

- Python 3.10+ recommended
- A Postgres database (local or hosted)

#### Setup

From the repo root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the repo root (loaded by `backend/app/config.py`) with at least:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
JWT_SECRET=change-me
ALLOWED_ORIGINS=*
```

#### Run

```bash
uvicorn backend.app.main:app --reload --port 8000
```

Then open `http://localhost:8000/health` to verify the API is up.