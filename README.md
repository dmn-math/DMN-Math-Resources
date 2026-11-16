# DMN Math Resources

A mathematics revision website for secondary school students studying **G2 Mathematics**, **G3 Mathematics**, and **Additional Mathematics**.

The site brings together topical worksheets, difficult-topic practice, a TYS question-bank template, and preliminary examination papers to help students become resilient problem solvers, self-directed learners, and critical thinkers.

[Browse the repository](https://github.com/dmn-math/DMN-Math-Resources)

## Revision approach

1. **Revise by topic.** Strengthen understanding using topical exercises and compilations.
2. **Build a TYS question bank.** Save questions you get stuck on and retry them before checking the solutions.
3. **Practise preliminary examination papers.** Build confidence with further school-based practice.

## Resources and features

| Section | Resources |
| --- | --- |
| G2 Mathematics | Topical revision, difficult-topic practice, TYS question bank and prelim papers |
| G3 Mathematics | Topical revision, difficult-topic practice, TYS question bank and prelim papers |
| Additional Mathematics | Topical revision, difficult-topic practice, TYS question bank and prelim papers |

- Topical PDF links displayed with their uploaded filenames.
- Separate question-paper and solution links where files are available.
- Dedicated practice pages for selected difficult topics.
- Topic completion checkboxes and a progress summary.
- Paper tables generated from JSON manifests, with newer years listed first.

Topic completion is saved in the browser using `localStorage`. It is specific to that browser and website address; it does not sync between devices or between different hosted versions of the site.

## Technology

The website uses HTML, CSS and JavaScript, with Google Fonts for typography. The GitHub Actions workflow builds the site and generates its listings on every push to `main`. The resource pages do not require an application server or an npm build step.

## Folder structure

Keep the subject and topic folder names consistent when uploading files.

| Path | Purpose |
| --- | --- |
| `index.html` | Homepage |
| `g2/g2.html` | G2 resource page |
| `g2/g2-topic-*.html` | G2 difficult-topic pages |
| `g3/g3.html` | G3 resource page |
| `g3/g3-topic-*.html` | G3 difficult-topic pages |
| `amath/amath.html` | Additional Mathematics resource page |
| `amath/amath-topic-*.html` | Additional Mathematics difficult-topic pages |
| `resources/g2/` | G2 PDFs and manifests |
| `resources/g3/` | G3 PDFs and manifests |
| `resources/amath/` | Additional Mathematics PDFs and manifests |
| `resources/My_Maths_Question_Bank.docx` | Editable student template |
| `scripts/generate_manifest.py` | Paper and topical PDF listing generator |
| `scripts/build_site.py` | Student-site build and national-paper visibility setting |
| `.github/workflows/generate-manifest.yml` | Builds and publishes the student website |

Each subject's resources include topic folders and `prelim-papers/`. National papers belong in `n-level-papers/` for G2 and `o-level-papers/` for G3 and Additional Mathematics.

## Adding resources

### Topical worksheets

Place each PDF directly in the existing chapter folder. For example:

```text
resources/amath/integration/Integration Revision Set 1.pdf
resources/amath/integration/Integration Revision Set 1 Solutions.pdf
```

Commit and push from GitHub Desktop. The next deployment lists each PDF using its exact filename, including spaces and the extension. Keep the names descriptive so students can tell worksheets and solutions apart. The newer listing also includes existing files such as `tys.pdf` and `compilation.pdf`. Adding a new chapter still requires a corresponding topic card on the subject page.

### National examination papers

Use these filenames in the appropriate national-paper folder:

```text
2025-paper-1-qp.pdf
2025-paper-1-solution.pdf
2025-paper-2-qp.pdf
2025-paper-2-solution.pdf
```

### Preliminary examination papers

Include a lowercase school code in the filename:

```text
2025-dmn-paper-1-qp.pdf
2025-dmn-paper-1-solution.pdf
```

The generator converts the school code into the displayed label, such as **DMN Prelim Paper 1**. School codes may contain lowercase letters and digits. Filenames must match the naming pattern exactly to appear in the generated tables.

## Publish with GitHub Desktop

1. Apply the update to the repository root, keeping the folder structure.
2. On GitHub, open **Settings → Pages** and select **GitHub Actions** under **Source**.
3. In GitHub Desktop, commit the changes to `main` and select **Push origin**.
4. On GitHub, check the **Publish student website** run in **Actions**. Open the website after the run succeeds.

For Cloudflare Pages, use `python3 scripts/build_site.py` as the build command and `_site` as the build output directory if that host serves the same student site.

## Preview locally

From the repository root, build into a fresh directory and serve that directory:

```bash
python3 scripts/build_site.py
python3 -m http.server 8000 --directory _site
```

Open [http://localhost:8000](http://localhost:8000). For a subsequent build, use an empty output directory or pass another output path to the build script.

## Restore national papers

The student build excludes G2 national papers, G3 and A-Math O-Level papers, and the standalone A-Math reflection page. The original files remain in the source repository. Direct links to those files in the public GitHub repository still work.

To show the national papers again, set `PUBLISH_NATIONAL_PAPERS = True` in `scripts/build_site.py`, then commit and push. The tables reappear below the question-bank button. A-Math reflection remains excluded.

Before publishing an update:

- Check navigation between the homepage and all three subject pages.
- Open updated worksheet, question-paper and solution links.
- Confirm new topical PDFs and prelim papers appear after the site builds.
- Check topic completion and the progress summary.
- Review the layout on both desktop and mobile screens.

## Resource attribution

Examination papers and other third-party materials remain the property of their respective owners. This repository brings resources together for student revision; inclusion does not imply ownership of the original materials.
[README.md](https://github.com/user-attachments/files/32885928/README.md)
