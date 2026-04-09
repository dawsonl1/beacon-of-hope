"""
graphics.py — Branded graphic compositing.
Overlays text onto template backgrounds using Pillow.
Used for stat posts, milestone announcements, and other non-photo content.
"""

import io
import os
import uuid
import logging
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from ai_harness.config import AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER

logger = logging.getLogger(__name__)

# Local fallback dir (dev only)
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "backend" / "wwwroot" / "media" / "generated"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Azure Blob client (lazy-init)
_blob_service = None

def _get_blob_service():
    global _blob_service
    if _blob_service is None and AZURE_STORAGE_CONNECTION_STRING:
        from azure.storage.blob import BlobServiceClient
        _blob_service = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)
    return _blob_service

# Try to find a good font, fall back to default
def _get_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_paths = [
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def generate_graphic(
    template_path: str | None,
    overlay_text: str,
    text_color: str = "#FFFFFF",
    text_position: str = "center",
    width: int = 1080,
    height: int = 1080,
) -> dict:
    """
    Composites overlay_text onto a template background image.
    If no template, creates a solid-color background.
    Returns {"file_path": "/media/generated/xxx.jpg", "absolute_path": "..."}.
    """
    # Load or create background
    if template_path and os.path.exists(template_path):
        img = Image.open(template_path).convert("RGB")
        img = img.resize((width, height), Image.Resampling.LANCZOS)
    else:
        # Default dark gradient-ish background
        img = Image.new("RGB", (width, height), color="#1a1a2e")

    draw = ImageDraw.Draw(img)

    # Calculate font size based on text length
    if len(overlay_text) < 30:
        font_size = 72
    elif len(overlay_text) < 60:
        font_size = 56
    elif len(overlay_text) < 120:
        font_size = 42
    else:
        font_size = 32

    font = _get_font(font_size)

    # Word wrap
    max_chars_per_line = max(width // (font_size // 2 + 2), 15)
    words = overlay_text.split()
    lines = []
    current_line = ""
    for word in words:
        test = f"{current_line} {word}".strip()
        if len(test) <= max_chars_per_line:
            current_line = test
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    if current_line:
        lines.append(current_line)

    # Calculate text block height
    line_height = font_size + 10
    total_text_height = len(lines) * line_height

    # Position
    if text_position == "center":
        y_start = (height - total_text_height) // 2
    elif text_position == "top_center":
        y_start = height // 6
    elif text_position == "bottom_left":
        y_start = height - total_text_height - height // 6
    else:
        y_start = (height - total_text_height) // 2

    # Draw text with shadow for readability
    for i, line in enumerate(lines):
        bbox = draw.textbbox((0, 0), line, font=font)
        text_width = bbox[2] - bbox[0]

        if text_position == "bottom_left":
            x = width // 8
        else:
            x = (width - text_width) // 2

        y = y_start + i * line_height

        # Shadow
        draw.text((x + 2, y + 2), line, fill="#00000088", font=font)
        # Main text
        draw.text((x, y), line, fill=text_color, font=font)

    # Save
    filename = f"{uuid.uuid4()}.jpg"
    blob_svc = _get_blob_service()

    if blob_svc:
        # Production: upload to Azure Blob Storage
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=85)
        buf.seek(0)
        blob_name = f"generated/{filename}"
        blob_client = blob_svc.get_blob_client(container=AZURE_STORAGE_CONTAINER, blob=blob_name)
        blob_client.upload_blob(buf, content_type="image/jpeg", overwrite=True)
        blob_url = blob_client.url
        logger.info(f"Generated graphic uploaded to blob: {blob_url}")
        return {"file_path": blob_url, "absolute_path": blob_url}
    else:
        # Dev: save to local disk
        abs_path = OUTPUT_DIR / filename
        img.save(str(abs_path), "JPEG", quality=85)
        rel_path = f"/media/generated/{filename}"
        logger.info(f"Generated graphic: {rel_path} ({len(lines)} lines)")
        return {"file_path": rel_path, "absolute_path": str(abs_path)}
