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

Documents are authored as HTML files in `content/` or `lab/` with a JSON front matter block stored in a leading HTML comment. Drop a new file into the correct folder, keep the front matter up to date, and run `npm run build:documents` (automatically executed before `npm test`). The build script reads every document, generates the module indexes in `data/`, and refreshes the global search payload. No manual JSON editing is required.

Each document declares the surfaces it should appear on:

- **Blog posts** belong in `content/blog/` and include `"blog"` metadata (slug, date, type, tags).
- **Wiki articles** live in `content/wiki/` with `"wiki"` metadata (id, subtitle, updated).
- **Project hubs** live in `content/projects/` with `"projects"` metadata (slug, domain, sequence, tags, spotlight links).
- **Lab notes** remain in `lab/` and can opt into search by providing `"lab"` metadata with a canonical URL.

Any document can opt into the global search index by providing a `"search"` surface with a description and tags. URLs for blog, wiki, and project surfaces are inferred automatically.

## Template reference

Use the following snippets as copy-ready starting points when adding new content. Replace placeholder values before publishing.

### Front matter reference

**Document comment with JSON front matter**

```html
<!--
{
  "title": "Document title",
  "summary": "A short description used in search and cards.",
  "surfaces": {
    "blog": {
      "slug": "your-slug",
      "date": "YYYY-MM-DD",
      "type": "Announcement",
      "tags": ["tag-one", "tag-two"]
    },
    "search": {
      "description": "One-sentence description that fits in cards and search results.",
      "tags": ["blog", "announcement"]
    }
  }
}
-->
```

Add or remove surfaces as needed. The build script infers URLs for blog, wiki, and project surfaces and respects an explicit `url` field when present (for example, lab notes).

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

When you paste the final HTML into `content/`, keep the JSON front matter comment at the top so the build script can parse it.

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
