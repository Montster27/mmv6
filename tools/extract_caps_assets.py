#!/usr/bin/env python3

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont


ORIGINAL_SOURCE = "/mnt/data/a_sprite_sheet_sheet_of_digital_assets_for_a_retro.png"
LOCAL_FALLBACK_SOURCE = Path(__file__).resolve().parents[2] / "caps.png"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "assets" / "caps"
CONTACT_SHEET_PATH = OUTPUT_DIR / "contact-sheet.png"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
MARGIN = 6

ASSETS = [
    ("caps-target.png", (120, 55, 405, 295)),
    ("caps-bottle.png", (585, 20, 900, 470)),
    ("caps-shooter.png", (900, 40, 1115, 270)),
    ("caps-shooter-flying.png", (1170, 30, 1495, 265)),
    ("caps-aim-arrow.png", (70, 285, 575, 455)),
    ("caps-power-bar-bg.png", (155, 455, 710, 605)),
    ("caps-power-bar-fill.png", (760, 455, 1325, 605)),
    ("caps-hand.png", (70, 635, 570, 1000)),
    ("caps-result-hit.png", (560, 640, 970, 980)),
    ("caps-result-miss.png", (980, 675, 1415, 955)),
]

MISSING = ["caps-floor.jpg"]


def clamp_box(box: tuple[int, int, int, int], size: tuple[int, int]) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    width, height = size
    return (
        max(0, left - MARGIN),
        max(0, top - MARGIN),
        min(width, right + MARGIN),
        min(height, bottom + MARGIN),
    )


def is_uniform_line(pixels: Iterable[tuple[int, ...]], baseline: tuple[int, ...]) -> bool:
    return all(pixel == baseline for pixel in pixels)


def safe_trim_rect(image: Image.Image) -> tuple[Image.Image, tuple[int, int, int, int]]:
    # Conservative trim only when a full edge exactly matches the corner color.
    image = image.convert("RGBA")
    width, height = image.size
    px = image.load()
    bg = px[0, 0]

    left = 0
    while left < width - 1 and is_uniform_line((px[left, y] for y in range(height)), bg):
        left += 1

    right = width - 1
    while right > left and is_uniform_line((px[right, y] for y in range(height)), bg):
        right -= 1

    top = 0
    while top < height - 1 and is_uniform_line((px[x, top] for x in range(width)), bg):
        top += 1

    bottom = height - 1
    while bottom > top and is_uniform_line((px[x, bottom] for x in range(width)), bg):
        bottom -= 1

    # Only trim if something actually moved and keep a tiny extra safety ring.
    if left == 0 and top == 0 and right == width - 1 and bottom == height - 1:
        return image, (0, 0, width, height)

    left = max(0, left - 2)
    top = max(0, top - 2)
    right = min(width, right + 3)
    bottom = min(height, bottom + 3)
    return image.crop((left, top, right, bottom)), (left, top, right, bottom)


def fit_size(size: tuple[int, int], max_w: int, max_h: int) -> tuple[int, int]:
    w, h = size
    scale = min(max_w / w, max_h / h, 1)
    return max(1, int(w * scale)), max(1, int(h * scale))


def build_contact_sheet(exports: list[dict]) -> None:
    thumb_w = 260
    thumb_h = 180
    label_h = 40
    padding = 20
    cols = 2
    rows = math.ceil(len(exports) / cols)
    sheet_w = cols * thumb_w + (cols + 1) * padding
    sheet_h = rows * (thumb_h + label_h) + (rows + 1) * padding

    canvas = Image.new("RGB", (sheet_w, sheet_h), (244, 241, 235))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()

    for idx, item in enumerate(exports):
        row = idx // cols
        col = idx % cols
        x = padding + col * thumb_w
        y = padding + row * (thumb_h + label_h)

        frame = (x, y, x + thumb_w, y + thumb_h)
        draw.rounded_rectangle(frame, radius=12, fill=(255, 255, 255), outline=(185, 178, 168), width=2)

        img = Image.open(item["path"]).convert("RGB")
        fitted = fit_size(img.size, thumb_w - 24, thumb_h - 24)
        preview = img.resize(fitted)
        px = x + (thumb_w - preview.width) // 2
        py = y + (thumb_h - preview.height) // 2
        canvas.paste(preview, (px, py))

        label = item["filename"]
        draw.text((x + 6, y + thumb_h + 10), label, fill=(49, 46, 43), font=font)
        draw.text(
            (x + 6, y + thumb_h + 24),
            f"{item['exportedSize'][0]}x{item['exportedSize'][1]}",
            fill=(107, 99, 92),
            font=font,
        )

    canvas.save(CONTACT_SHEET_PATH)


def main() -> None:
    source_path = Path(ORIGINAL_SOURCE)
    actual_source = source_path if source_path.exists() else LOCAL_FALLBACK_SOURCE
    if not actual_source.exists():
        raise FileNotFoundError(
            f"Could not find source sheet at {ORIGINAL_SOURCE} or local fallback {LOCAL_FALLBACK_SOURCE}"
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(actual_source).convert("RGBA")
    exports: list[dict] = []

    for filename, box in ASSETS:
        expanded = clamp_box(box, sheet.size)
        cropped = sheet.crop(expanded)
        trimmed, trim_box = safe_trim_rect(cropped)
        final_box = (
            expanded[0] + trim_box[0],
            expanded[1] + trim_box[1],
            expanded[0] + trim_box[2],
            expanded[1] + trim_box[3],
        )
        output_path = OUTPUT_DIR / filename
        trimmed.save(output_path)
        exports.append(
            {
                "filename": filename,
                "box": list(final_box),
                "exportedSize": list(trimmed.size),
                "path": str(output_path),
            }
        )

    build_contact_sheet(exports)

    manifest = {
        "source": ORIGINAL_SOURCE,
        "sheetSize": list(sheet.size),
        "assets": [
            {
                "filename": item["filename"],
                "box": item["box"],
                "exportedSize": item["exportedSize"],
            }
            for item in exports
        ],
        "missing": MISSING,
    }

    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))

    print(f"Source used: {actual_source}")
    print(f"Manifest source recorded as: {ORIGINAL_SOURCE}")
    for item in exports:
        print(f"{item['filename']}: {item['exportedSize'][0]}x{item['exportedSize'][1]} box={item['box']}")
    print(f"Missing: {', '.join(MISSING)}")
    print(f"Contact sheet: {CONTACT_SHEET_PATH}")
    print(f"Manifest: {MANIFEST_PATH}")


if __name__ == "__main__":
    main()
