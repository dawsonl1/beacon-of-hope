"""
config.py — AI Harness configuration.
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
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")  # gpt-5.4 when available

# In production, DATABASE_URL_READONLY must be set explicitly.
# The local dev default only applies when .env.local is loaded above.
DATABASE_URL_READONLY = os.environ.get("DATABASE_URL_READONLY", "")

# In production, HARNESS_API_KEY must be set explicitly.
# verify_key() will reject all requests if this is empty.
HARNESS_API_KEY = os.environ.get("HARNESS_API_KEY", "")

# Azure Blob Storage (production). When set, graphics upload to blob instead of local disk.
AZURE_STORAGE_CONNECTION_STRING = os.environ.get("AZURE_STORAGE_CONNECTION_STRING", "")
AZURE_STORAGE_CONTAINER = os.environ.get("AZURE_STORAGE_CONTAINER", "media")

MAX_TOOL_ROUNDS = 10

# App is frozen to Feb 16, 2026. All "today" references must use this date.
from datetime import datetime
APP_TODAY = datetime(2026, 2, 16, 0, 0, 0)
