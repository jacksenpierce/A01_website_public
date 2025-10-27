# Normal Rooms static site

This repository contains the public, static Normal Rooms website. The project is organized so that content and presentation are clearly separated:

- `content/` holds the raw wiki and blog documents as HTML fragments.
- `modules/` contains the wiki and blog shells that render those documents in the browser.
- `assets/` provides shared CSS and JavaScript, while module-specific styles and logic live alongside the shells.
- `data/` stores machine-readable indexes that power navigation, search, and module lookups.

Open any of the HTML files (for example `home.html` or `modules/wiki/index.html`) in a browser to explore the content locally.

## Local development

No build step is required. Edit the HTML, CSS, or JavaScript files and refresh your browser to see updates.

## Smoke tests

A small automated test suite verifies critical behaviors:

- Internal links resolve without 404s.
- The prebuilt search index is well-formed and renders results in the search UI.
- The responsive navigation toggle updates its accessibility attributes.
- The global footer shows the current year and required navigation links.

Run the full suite with:

```bash
npm install
npm test
```

Each script can also be invoked individually (for example `npm run test:links`) if you want to focus on a specific check.

## Content management

Administrators can publish new material by editing the HTML fragments in `content/`, the lab notebook in `lab/`, and the JSON indexes in `data/`:

- **Blog posts** live in `content/blog/`. Each entry must also be described in `data/blog/posts.json` so the module shell can surface it in listings.
- **Wiki articles** live in `content/wiki/` with their metadata stored in `data/wiki/articles.json`.
- **Project hubs** live in `content/projects/` with structure and spotlight links declared in `data/projects/projects.json`.
- **Lab notes** live in `lab/`. They are linked directly from the lab index HTML and should receive a `data/search/index.json` entry so global search can find them.

After adding or renaming a document, update `data/search/index.json` with a concise summary and the correct module URL. This keeps the search dialog synchronized with the published surfaces.

## Template reference

Use the following snippets as copy-ready starting points when adding new content. Replace placeholder values before publishing and mirror the metadata in the appropriate JSON files.

### Metadata snippets

**Blog post (`data/blog/posts.json`)**

```json
{
  "slug": "your-slug",
  "title": "Readable Title",
  "date": "YYYY-MM-DD",
  "type": "Announcement",
  "summary": "One-sentence description that fits in cards and search results.",
  "contentPath": "content/blog/your-slug.html",
  "tags": ["tag-one", "tag-two"]
}
```

**Wiki article (`data/wiki/articles.json`)**

```json
{
  "id": "concise-id",
  "title": "Article title",
  "subtitle": "Short descriptor",
  "summary": "Single-sentence overview for cards and search.",
  "contentPath": "content/wiki/concise-id.html",
  "updated": "YYYY-MM-DD"
}
```

**Project hub (`data/projects/projects.json`)**

```json
{
  "slug": "project-slug",
  "title": "Project title",
  "domain": "Knowledge graph",
  "sequence": 1,
  "summary": "Focused blurb describing the project scope.",
  "updated": "YYYY-MM-DD",
  "tags": ["workflow", "quality"],
  "contentPath": "content/projects/project-slug.html",
  "spotlight": [
    {"label": "Wiki", "title": "Related article", "url": "../wiki/article.html?doc=concise-id"},
    {"label": "Blog", "title": "Release notes", "url": "../blog/post.html?slug=your-slug"}
  ]
}
```

Add the new object to the existing array in the JSON file and maintain chronological ordering when relevant.

### Document scaffolds

**Atomic document authoring template** – create a Markdown file with YAML front matter while drafting, then convert the body to HTML before saving it in `content/` or `lab/`.

```markdown
---
title: Document title
summary: A short description used in search and cards
updated: YYYY-MM-DD
tags:
  - tag-one
  - tag-two
---

## Opening statement

Describe the context for the work.

## Key details

- Capture critical facts in list form.
- Reference related wiki articles or projects with descriptive link text.

## Next steps

Outline follow-up tasks or open questions.
```

When you paste the final HTML into `content/`, keep the YAML block in an HTML comment at the top if you want to preserve the metadata for future edits:

```html
<!--
---
title: Document title
summary: A short description used in search and cards
updated: YYYY-MM-DD
tags:
  - tag-one
  - tag-two
---
-->

<section>
  <h2>Opening statement</h2>
  <p>Describe the context for the work.</p>
  <h2>Key details</h2>
  <ul>
    <li>Capture critical facts in list form.</li>
    <li>Reference related wiki articles or projects with descriptive link text.</li>
  </ul>
  <h2>Next steps</h2>
  <p>Outline follow-up tasks or open questions.</p>
</section>
```

**Project hub content skeleton (`content/projects/*.html`)**

```html
<header class="project-card__header">
  <h1>Project title</h1>
  <p class="project-card__summary">One sentence that conveys scope and progress.</p>
</header>
<section>
  <h2>Objectives</h2>
  <ul>
    <li>Primary outcome number one.</li>
    <li>Primary outcome number two.</li>
  </ul>
</section>
<section>
  <h2>Milestones</h2>
  <p>Call out recent releases or checkpoints.</p>
</section>
```

### Linking guidelines

- Use relative URLs so the static site works when browsed locally (for example `../wiki/article.html?doc=architecture-overview`).
- Prefer descriptive link text over raw URLs.
- Mirror any new links in the search index when they introduce a new concept or surface.
