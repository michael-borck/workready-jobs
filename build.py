#!/usr/bin/env python3
"""Build the WorkReady Jobs static site from company jobs.json exports."""

import json
import shutil
from pathlib import Path

# Company sites directory
SITES_DIR = Path(__file__).parent.parent
SITE_SLUGS = [
    "nexuspoint-systems",
    "ironvale-resources",
    "meridian-advisory",
    "metro-council-wa",
    "southern-cross-financial",
    "horizon-foundation",
]

SECTOR_MAP = {
    "nexuspoint-systems": "Technology",
    "ironvale-resources": "Resources & Mining",
    "meridian-advisory": "Management Consulting",
    "metro-council-wa": "Government",
    "southern-cross-financial": "Financial Services",
    "horizon-foundation": "Not-for-profit",
}

OUTPUT_DIR = Path(__file__).parent / "dist"
SRC_DIR = Path(__file__).parent / "src"


def load_all_jobs() -> list[dict]:
    """Load and merge jobs from all company sites."""
    all_jobs = []
    for slug in SITE_SLUGS:
        jobs_file = SITES_DIR / slug / "jobs.json"
        if not jobs_file.is_file():
            print(f"  Warning: {jobs_file} not found, skipping")
            continue

        with open(jobs_file) as f:
            data = json.load(f)

        company = data["company"]
        company_slug = data["company_slug"]
        company_url = data["company_url"]
        sector = SECTOR_MAP.get(company_slug, "Other")

        for job in data["jobs"]:
            all_jobs.append({
                "title": job["title"],
                "slug": job["slug"],
                "company": company,
                "company_slug": company_slug,
                "company_url": company_url,
                "sector": sector,
                "department": job.get("department", ""),
                "location": job.get("location", "Perth, WA"),
                "employment_type": job.get("employment_type", "Full-time"),
                "url": job.get("url", ""),
                "description": job.get("description", ""),
            })

    return all_jobs


def build():
    """Build the static site."""
    print("Loading jobs from company sites...")
    jobs = load_all_jobs()
    print(f"  Found {len(jobs)} jobs across {len(SITE_SLUGS)} companies")

    # Compute filter options
    sectors = sorted(set(j["sector"] for j in jobs))
    companies = sorted(set(j["company"] for j in jobs))
    types = sorted(set(j["employment_type"] for j in jobs))

    # Write aggregated data
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    data_file = OUTPUT_DIR / "jobs-data.js"
    data_file.write_text(
        f"const JOBS_DATA = {json.dumps(jobs, indent=2)};\n"
        f"const SECTORS = {json.dumps(sectors)};\n"
        f"const COMPANIES = {json.dumps(companies)};\n"
        f"const TYPES = {json.dumps(types)};\n",
        encoding="utf-8",
    )
    print(f"  Wrote {data_file}")

    # Copy static files
    for src_file in SRC_DIR.iterdir():
        dst = OUTPUT_DIR / src_file.name
        shutil.copy2(src_file, dst)
        print(f"  Copied {src_file.name}")

    print(f"\nBuilt WorkReady Jobs → {OUTPUT_DIR}")
    print(f"  {len(jobs)} jobs | {len(sectors)} sectors | {len(companies)} companies")


if __name__ == "__main__":
    build()
