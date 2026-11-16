#!/usr/bin/env python3
"""
Scans each subject's national, prelim and topical folders under resources/.
Paper manifests list the available question papers and solutions. Topical
manifests list the PDF and interactive HTML filenames in each chapter folder.

The site's JavaScript fetches this manifest.json at page load and builds the
papers table from it — so adding a new PDF (named correctly) is enough to
make it show up on the live site, with no HTML editing required.

FILE NAMING:
  Main paper folder (n-level-papers / o-level-papers):
      {year}-paper-{n}-qp.pdf
      {year}-paper-{n}-solution.pdf
      e.g. 2025-paper-1-qp.pdf

  Prelim paper folder (prelim-papers):
      {year}-{school}-paper-{n}-qp.pdf
      {year}-{school}-paper-{n}-solution.pdf
      e.g. 2025-dmn-paper-1-qp.pdf, 2025-fmss-paper-1-qp.pdf
      The {school} code becomes the label prefix automatically —
      "fmss" -> "FMSS Prelim Paper 1". Any school code works, no
      script changes needed to add a new school.

Run manually with: python3 scripts/generate_manifest.py
The student-site build also generates manifests in its output directory.
"""

import json
import os
import re
from pathlib import Path

# Folder name per subject for the main (national/O-Level/N-Level) papers.
MAIN_FOLDER = {
    "g2": "n-level-papers",
    "g3": "o-level-papers",
    "amath": "o-level-papers",
}
PRELIM_FOLDER = "prelim-papers"  # same folder name for all subjects

RESOURCES_ROOT = Path(__file__).resolve().parent.parent / "resources"

MAIN_PATTERN = re.compile(r"^(\d{4})-paper-(\d+)-(qp|solution)\.pdf$")
PRELIM_PATTERN = re.compile(r"^(\d{4})-([a-z0-9]+)-paper-(\d+)-(qp|solution)\.pdf$")


def scan_main_folder(folder_path, label_template):
    entries = {}  # key: (year, paper_num) -> {"qp": bool, "solution": bool}

    if not os.path.isdir(folder_path):
        return []

    for filename in os.listdir(folder_path):
        match = MAIN_PATTERN.match(filename)
        if not match:
            continue
        year, paper_num, kind = match.groups()
        key = (year, paper_num)
        entries.setdefault(key, {"qp": False, "solution": False})[kind] = True

    result = []
    for (year, paper_num), flags in entries.items():
        base = f"{year}-paper-{paper_num}"
        result.append({
            "year": year,
            "paper": paper_num,
            "label": label_template.format(n=paper_num),
            "qp": f"{base}-qp.pdf" if flags["qp"] else None,
            "solution": f"{base}-solution.pdf" if flags["solution"] else None,
        })

    result.sort(key=lambda e: (-int(e["year"]), int(e["paper"])))
    return result


def scan_prelim_folder(folder_path):
    entries = {}  # key: (year, school, paper_num) -> {"qp": bool, "solution": bool}

    if not os.path.isdir(folder_path):
        return []

    for filename in os.listdir(folder_path):
        match = PRELIM_PATTERN.match(filename)
        if not match:
            continue
        year, school, paper_num, kind = match.groups()
        key = (year, school, paper_num)
        entries.setdefault(key, {"qp": False, "solution": False})[kind] = True

    result = []
    for (year, school, paper_num), flags in entries.items():
        base = f"{year}-{school}-paper-{paper_num}"
        label = f"{school.upper()} Prelim Paper {paper_num}"
        result.append({
            "year": year,
            "school": school,
            "paper": paper_num,
            "label": label,
            "qp": f"{base}-qp.pdf" if flags["qp"] else None,
            "solution": f"{base}-solution.pdf" if flags["solution"] else None,
        })

    # Newest year first, then school alphabetically, then paper 1 before paper 2
    result.sort(key=lambda e: (-int(e["year"]), e["school"], int(e["paper"])))
    return result


def write_manifest(path, entries):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")


def scan_topical_folders(subject_path, main_folder_name):
    topics = {}
    activities = {}
    excluded = {main_folder_name, PRELIM_FOLDER, "difficult-topics"}
    for folder in sorted(subject_path.iterdir()):
        if not folder.is_dir() or folder.name in excluded:
            continue

        files = sorted(
            (file for file in folder.iterdir() if file.is_file()),
            key=lambda file: (file.name.casefold(), file.name),
        )
        pdfs = [file.name for file in files if file.suffix.lower() == ".pdf"]
        html_files = [file.name for file in files if file.suffix.lower() == ".html"]
        if pdfs:
            topics[folder.name] = pdfs
        if html_files:
            activities[folder.name] = html_files
    return topics, activities


def generate_manifests(resources_root, include_national=True):
    activities_by_subject = {}
    for subject, main_folder_name in MAIN_FOLDER.items():
        subject_path = resources_root / subject
        if include_national:
            label_template = "N Level Paper {n}" if subject == "g2" else "O Level Paper {n}"
            main_path = subject_path / main_folder_name
            main_entries = scan_main_folder(main_path, label_template)
            write_manifest(main_path / "manifest.json", main_entries)
            print(f"{main_path}/manifest.json: {len(main_entries)} paper(s)")

        prelim_path = subject_path / PRELIM_FOLDER
        prelim_entries = scan_prelim_folder(prelim_path)
        write_manifest(prelim_path / "manifest.json", prelim_entries)
        print(f"{prelim_path}/manifest.json: {len(prelim_entries)} paper(s)")

        topics, activities = scan_topical_folders(subject_path, main_folder_name)
        # Keep the existing per-topic PDF lists readable by older student pages.
        write_manifest(subject_path / "topical-manifest.json", {**topics, "_interactive": activities})
        activities_by_subject[subject] = activities
        print(
            f"{subject_path}/topical-manifest.json: "
            f"{sum(map(len, topics.values()))} PDF(s), "
            f"{sum(map(len, activities.values()))} interactive(s)"
        )

    return activities_by_subject


if __name__ == "__main__":
    generate_manifests(RESOURCES_ROOT)
