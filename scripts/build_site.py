#!/usr/bin/env python3
"""Build the static site that students can access."""

import argparse
import re
import shutil
from html import escape, unescape
from pathlib import Path
from urllib.parse import quote

from generate_manifest import MAIN_FOLDER, generate_manifests


ROOT = Path(__file__).resolve().parent.parent
PUBLISH_NATIONAL_PAPERS = False
SITE_FOLDERS = (*MAIN_FOLDER, "math-missions", "resources")
SITE_FILES = ("index.html", "favicon.ico", "favicon.svg", "CNAME")

NATIONAL_PAPERS_TABLE = """<div class="papers-table" aria-label="Past year national papers">
      <div class="papers-row head">
        <span>Year</span><span>Paper</span><span class="col-hide">Format</span><span>Question Paper</span><span>Solution</span>
      </div>
      <div class="papers-body" id="papers-main" data-manifest="{manifest_url}">
        <div class="papers-row"><span style="grid-column: 1 / -1;">Loading papers…</span></div>
      </div>
    </div>"""

TOPIC_HEADINGS = re.compile(
    r'<details\b[^>]*\bdata-slug="([^"]+)"[^>]*>\s*'
    r'<summary\b[^>]*>\s*<h4>([^<]+)</h4>'
)
ACTIVITY_BODY = re.compile(r"<body(?:\s+[^>]*)?>", re.IGNORECASE)


def add_activity_navigation(output, subject, page_html, activities):
    titles = dict(TOPIC_HEADINGS.findall(page_html))
    for topic, filenames in activities.items():
        if topic not in titles:
            continue

        title = escape(unescape(titles[topic]))
        href = f"../../../{subject}/{subject}.html#topic-{quote(topic, safe='')}"
        navigation = (
            '\n<link rel="stylesheet" href="../../topical-activities.css">\n'
            '<nav class="activity-topic-nav" aria-label="Topic navigation">\n'
            f'  <a href="{href}">← Back to {title}</a>\n'
            '</nav>\n'
        )
        for filename in filenames:
            path = output / "resources" / subject / topic / filename
            activity = path.read_text(encoding="utf-8", errors="surrogateescape")
            activity, inserted = ACTIVITY_BODY.subn(
                lambda match: match[0] + navigation, activity, count=1
            )
            if inserted:
                path.write_text(activity, encoding="utf-8", errors="surrogateescape")


def excluded_files(folder, names):
    relative = Path(folder).relative_to(ROOT)
    if relative == Path("amath"):
        return {"reflection-amath.html"} & set(names)
    if relative == Path("resources"):
        return {"My_Maths_Question_Bank.docx"} & set(names)
    if (
        not PUBLISH_NATIONAL_PAPERS
        and len(relative.parts) == 2
        and relative.parts[0] == "resources"
        and relative.name in MAIN_FOLDER
    ):
        return {MAIN_FOLDER[relative.name]} & set(names)
    return ()


def build(output):
    copy_sources = (ROOT / name for name in SITE_FOLDERS)
    if output == ROOT or any(output.is_relative_to(source) for source in copy_sources):
        raise ValueError("Choose an output directory outside the source folders.")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError("Choose an empty output directory.")

    output.mkdir(parents=True, exist_ok=True)
    for name in SITE_FOLDERS:
        shutil.copytree(ROOT / name, output / name, ignore=excluded_files)
    for name in SITE_FILES:
        if (ROOT / name).is_file():
            shutil.copy2(ROOT / name, output / name)

    activities = generate_manifests(output / "resources", include_national=PUBLISH_NATIONAL_PAPERS)
    for subject, folder in MAIN_FOLDER.items():
        page = output / subject / f"{subject}.html"
        reserved_space = "    <!-- national-papers -->\n"
        table = ""
        if PUBLISH_NATIONAL_PAPERS:
            manifest_url = f"../resources/{subject}/{folder}/manifest.json"
            table = "    " + NATIONAL_PAPERS_TABLE.format(manifest_url=manifest_url) + "\n"
        page_html = page.read_text(encoding="utf-8").replace(reserved_space, table)
        page.write_text(page_html, encoding="utf-8")
        add_activity_navigation(output, subject, page_html, activities[subject])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", type=Path, default=ROOT / "_site")
    args = parser.parse_args()
    try:
        build(args.output.resolve())
    except ValueError as error:
        parser.error(str(error))
