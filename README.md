# Normal Rooms static site

This repository contains the public, static Normal Rooms website. Content lives in Markdown and YAML under `src/content`, shared templates sit in `src/templates`, and `npm run build` compiles everything into the flat HTML structure that GitHub Pages serves.

## Local development

```bash
npm install
npm run build
```

Open `home.html` (or any other generated page) in your browser to preview the site. Re-run `npm run build` whenever you add or edit content so the HTML pages and search index stay in sync.

### Content authoring

All authoring happens in `src/content`:

- `src/content/blog` — Markdown files for blog posts.
- `src/content/lab` — Markdown files for lab notebook entries.
- `src/content/wiki` — Markdown files for wiki sections.
- `src/content/projects` — Front-matter files describing project hubs.
- `src/content/pages` — Markdown pages (about, contact, etc.) and the `home.yaml` configuration that feeds the hero and overview sections.

The templating layer in `src/templates` keeps headers, footers, cards, and listings consistent across the site. `npm run build` reads the content front matter, renders the Nunjucks templates, and regenerates `data/search-index.json` automatically.

### Scaffolding new entries

Helper scripts create correctly structured Markdown stubs:

```bash
# Create a blog post stub (fills in slug and today’s date)
npm run new:blog -- "Your Post Title"

# Create a lab notebook stub (supply the lab ID)
npm run new:lab -- --id NR-LAB-007 "Experiment Title"
```

Each stub includes TODO placeholders for metadata and body copy. After editing the new file, run `npm run build` to regenerate the HTML output and search index.

### Manual additions

- New wiki sections: add a Markdown file under `src/content/wiki` with `id`, `title`, `summary`, `order`, and `tags` front matter. The build step assembles the sidebar, tag list, and search entry automatically.
- New projects: create a Markdown file under `src/content/projects` that lists related wiki anchors, blog posts, and lab entries in the `links` front matter keys. The projects page and tag map will update on the next build.
- Tags appear anywhere you list them in front matter. The build groups and renders them in `tags.html` and attaches them to the search payload without manual editing.

## Smoke tests

A small automated test suite verifies critical behaviors:

- Internal links resolve without 404s.
- The prebuilt search index is well-formed and renders results in the search UI.
- The responsive navigation toggle updates its accessibility attributes.
- The global footer shows the current year and required navigation links.

Run the full suite with `npm test`. Make sure you rebuild first so the tests inspect the latest HTML and search index artifacts.

Each script can also be invoked individually (for example `npm run test:links`) if you want to focus on a specific check.
