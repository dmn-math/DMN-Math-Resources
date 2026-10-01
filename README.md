# DMN Math Resources

A mathematics revision website for secondary school students studying **G2 Mathematics**, **G3 Mathematics**, and **Additional Mathematics**.

The site brings together topical worksheets, difficult-topic practice, national examination papers, and preliminary examination papers to help students become resilient problem solvers, self-directed learners, and critical thinkers.

[Browse the repository](https://github.com/dmn-math/DMN-Math-Resources)

## Revision approach

1. **Revise by topic.** Strengthen understanding using topical exercises and compilations.
2. **Attempt national examination papers.** Apply learning under examination conditions.
3. **Practise preliminary examination papers.** Build confidence with further school-based practice.

## Resources and features

| Section | Resources |
| --- | --- |
| G2 Mathematics | Topical revision, difficult-topic practice, N-Level papers and prelim papers |
| G3 Mathematics | Topical revision, difficult-topic practice, O-Level papers and prelim papers |
| Additional Mathematics | Topical revision, difficult-topic practice, O-Level papers and prelim papers |

- Download links for topical TYS worksheets and prelim compilations.
- Separate question-paper and solution links where files are available.
- Dedicated practice pages for selected difficult topics.
- Topic completion checkboxes and a progress summary.
- Paper tables generated from JSON manifests, with newer years listed first.

Topic completion is saved in the browser using `localStorage`. It is specific to that browser and website address; it does not sync between devices or between different hosted versions of the site.

## Technology

The website uses HTML, CSS and JavaScript, with Google Fonts for typography. A Python script generates the paper manifests, and a GitHub Actions workflow can update them automatically. The resource pages do not require an application server or an npm build step.

## Folder structure

The HTML links and generator expect the following locations. Keep filenames and folder names consistent when uploading files.

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
| `scripts/generate_manifest.py` | Paper manifest generator |
| `.github/workflows/generate-manifest.yml` | Automatic manifest update workflow |

Each subject's resources include topic folders and `prelim-papers/`. National papers belong in `n-level-papers/` for G2 and `o-level-papers/` for G3 and Additional Mathematics.

## Adding resources

### Topical worksheets

Place PDFs in the topic folder linked by the relevant subject page:

```text
resources/<subject>/<topic-slug>/tys.pdf
resources/<subject>/<topic-slug>/compilation.pdf
```

For example:

```text
resources/amath/integration/tys.pdf
resources/amath/integration/compilation.pdf
```

Replacing an existing PDF with the same filename keeps the existing download link working. Adding a new topic requires updating the corresponding HTML page and its resource links.

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

### Regenerate paper listings

From the repository root, run:

```bash
python3 scripts/generate_manifest.py
```

The script creates a `manifest.json` in each subject's national-paper and prelim-paper folders. It records question papers and solutions separately, so a paper can be listed even when its solution has not been uploaded.

The supplied GitHub Actions workflow runs when files under `resources/` change on `main`, and can also be started manually. It needs permission to commit updated manifests. If the workflow fails, generate the manifests locally and commit them alongside the PDFs.

## Preview locally

From the repository root, start a local web server:

```bash
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000). Use a web server when checking the paper tables because they load manifests through JavaScript `fetch()`.

## Hosting and maintenance

The static site can be served through GitHub Pages or Cloudflare Pages. Preserve the folder structure and include all HTML pages, PDFs and generated manifests in the published files. Hosting the same repository at two addresses does not share students' browser-saved progress.

Before publishing an update:

- Check navigation between the homepage and all three subject pages.
- Open updated worksheet, question-paper and solution links.
- Confirm new papers appear after regenerating the manifests.
- Check topic completion and the progress summary.
- Review the layout on both desktop and mobile screens.

## Resource attribution

Examination papers and other third-party materials remain the property of their respective owners. This repository brings resources together for student revision; inclusion does not imply ownership of the original materials.
[README.md](https://github.com/user-attachments/files/32885928/README.md)
