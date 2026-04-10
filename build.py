#!/usr/bin/env python3
"""Build script for seek.jobs.

Simply copies the static files from src/ into dist/. The site is now
fully API-driven — postings, blocked state, and apply submissions
all happen at runtime via fetch() calls to the WorkReady API.
"""

import shutil
from pathlib import Path

OUTPUT_DIR = Path(__file__).parent / "dist"
SRC_DIR = Path(__file__).parent / "src"


def build():
    print("Building seek.jobs static site...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Clear stale files (e.g. old jobs-data.js from the baked-data era)
    for old in OUTPUT_DIR.iterdir():
        if old.is_file():
            old.unlink()
        elif old.is_dir():
            shutil.rmtree(old)

    for src_file in SRC_DIR.iterdir():
        dst = OUTPUT_DIR / src_file.name
        if src_file.is_file():
            shutil.copy2(src_file, dst)
        else:
            shutil.copytree(src_file, dst)
        print(f"  Copied {src_file.name}")

    print(f"\nBuilt seek.jobs → {OUTPUT_DIR}")


if __name__ == "__main__":
    build()
