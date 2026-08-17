#!/usr/bin/env python3
"""
Scans each subject's national/O-Level/N-Level and prelim paper folders under
resources/, and writes a manifest.json into each folder listing every paper
found (by year and paper number), plus whether a question paper and/or
solution file exists for it.

The site's JavaScript fetches this manifest.json at page load and builds the
papers table from it — so adding a new PDF (named correctly) is enough to
make it show up on the live site, with no HTML editing required.

Run manually with: python3 scripts/generate_manifest.py
This also runs automatically via .github/workflows/generate-manifest.yml
whenever files change under resources/.
"""

import json
import os
import re

# Folder name + display label template, per subject.
# "main" = the national/O-Level/N-Level paper folder, "prelim" = the DMN prelim folder.
SUBJECT_CONFIG = {
    "g2":    {"main": ("n-level-papers", "N Level Paper {n}"), "prelim": ("prelim-papers", "DMN Prelim Paper {n}")},
    "g3":    {"main": ("o-level-papers", "O Level Paper {n}"), "prelim": ("prelim-papers", "DMN Prelim Paper {n}")},
    "amath": {"main": ("o-level-papers", "O Level Paper {n}"), "prelim": ("prelim-papers", "DMN Prelim Paper {n}")},
}

RESOURCES_ROOT = "resources"

# Matches "2025-paper-1-qp.pdf", "2025-paper-1-solution.pdf",
# "2025-dmn-paper-1-qp.pdf", "2025-dmn-paper-1-solution.pdf"
FILENAME_PATTERN = re.compile(r"^(\d{4})-(?:dmn-)?paper-(\d+)-(qp|solution)\.pdf$")


def scan_folder(folder_path, label_template):
    """Scan one papers folder and build a list of paper entries."""
    entries = {}  # key: (year, paper_num) -> {"qp": bool, "solution": bool}

    if not os.path.isdir(folder_path):
        return []

    for filename in os.listdir(folder_path):
        match = FILENAME_PATTERN.match(filename)
        if not match:
            continue
        year, paper_num, kind = match.groups()
        key = (year, paper_num)
        if key not in entries:
            entries[key] = {"qp": False, "solution": False}
        entries[key][kind] = True

    result = []
    for (year, paper_num), flags in entries.items():
        is_dmn = "prelim" in folder_path  # prelim papers use the -dmn- filename pattern
        base = f"{year}-{'dmn-' if is_dmn else ''}paper-{paper_num}"
        result.append({
            "year": year,
            "paper": paper_num,
            "label": label_template.format(n=paper_num),
            "qp": f"{base}-qp.pdf" if flags["qp"] else None,
            "solution": f"{base}-solution.pdf" if flags["solution"] else None,
        })

    # Newest year first, then paper 1 before paper 2
    result.sort(key=lambda e: (-int(e["year"]), int(e["paper"])))
    return result


def main():
    for subject, config in SUBJECT_CONFIG.items():
        for kind in ("main", "prelim"):
            folder_name, label_template = config[kind]
            folder_path = os.path.join(RESOURCES_ROOT, subject, folder_name)
            entries = scan_folder(folder_path, label_template)

            manifest_path = os.path.join(folder_path, "manifest.json")
            os.makedirs(folder_path, exist_ok=True)
            with open(manifest_path, "w") as f:
                json.dump(entries, f, indent=2)

            print(f"{manifest_path}: {len(entries)} paper(s)")


if __name__ == "__main__":
    main()
