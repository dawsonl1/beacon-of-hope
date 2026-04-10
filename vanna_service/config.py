"""
config.py — Vanna chatbot service configuration.
Loads from environment variables (.env.local at repo root, then .env in this dir).
"""

import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PROJECT_ROOT / ".env.local")
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-5.4")

DATABASE_URL_READONLY = os.environ.get("DATABASE_URL_READONLY", "")

VANNA_API_KEY = os.environ.get("VANNA_API_KEY", "")

# App is frozen to Feb 16, 2026.
from datetime import datetime
APP_TODAY = datetime(2026, 2, 16, 0, 0, 0)
