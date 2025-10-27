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
