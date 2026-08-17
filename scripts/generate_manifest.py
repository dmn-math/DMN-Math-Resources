#!/usr/bin/env python3
"""
Scans each subject's national/O-Level/N-Level and prelim paper folders under
resources/, and writes a manifest.json into each folder listing every paper
found, plus whether a question paper and/or solution file exists for it.

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
This also runs automatically via .github/workflows/generate-manifest.yml
whenever files change under resources/.
"""

import json
import os
import re

# Folder name per subject for the main (national/O-Level/N-Level) papers.
MAIN_FOLDER = {
    "g2": "n-level-papers",
    "g3": "o-level-papers",
    "amath": "o-level-papers",
}
PRELIM_FOLDER = "prelim-papers"  # same folder name for all subjects

RESOURCES_ROOT = "resources"

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


def main():
    for subject, main_folder_name in MAIN_FOLDER.items():
        # Main (national/O-Level/N-Level) papers
        label_template = "N Level Paper {n}" if subject == "g2" else "O Level Paper {n}"
        main_path = os.path.join(RESOURCES_ROOT, subject, main_folder_name)
        main_entries = scan_main_folder(main_path, label_template)
        os.makedirs(main_path, exist_ok=True)
        with open(os.path.join(main_path, "manifest.json"), "w") as f:
            json.dump(main_entries, f, indent=2)
        print(f"{main_path}/manifest.json: {len(main_entries)} paper(s)")

        # Prelim papers (any school)
        prelim_path = os.path.join(RESOURCES_ROOT, subject, PRELIM_FOLDER)
        prelim_entries = scan_prelim_folder(prelim_path)
        os.makedirs(prelim_path, exist_ok=True)
        with open(os.path.join(prelim_path, "manifest.json"), "w") as f:
            json.dump(prelim_entries, f, indent=2)
        print(f"{prelim_path}/manifest.json: {len(prelim_entries)} paper(s)")


if __name__ == "__main__":
    main()
