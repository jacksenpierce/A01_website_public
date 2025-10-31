# P01 MVP Build Brief: Docusaurus Static Knowledge Site

## 1. Purpose
Deliver a static, GitHub Pages–friendly Docusaurus site that unifies three content idioms—Wiki (reference), Blog (chronological updates), and Lab Notebook (structured experiment entries)—plus lightweight project hubs. The site must be simple, deterministic to build, and extensible without rewriting content. All artifacts are generated at build time with no runtime fetching. The visual tone embraces a minimal, modern gray-and-orange palette with restrained typography.

## 2. Non-Negotiable Constraints
1. **Static generation only** – Every page, index, and search artifact is produced during `docusaurus build`. Client-side behavior operates solely on prebuilt data.
2. **GitHub Pages ready** – The repo builds without paid tooling, deploys via GitHub Pages (with optional custom domain), and avoids server components.
3. **Single content substrate** – Author content once in Markdown/MDX with front matter. Reuse the same source files across wiki, blog, lab, and project contexts.
4. **Low complexity** – Prefer default Docusaurus presets and theme components. Any customization must remain readable without JavaScript, with enhancements layered progressively.
5. **Multi-idiom participation** – Leverage front matter metadata and tag-based relationships so a single document can surface in multiple idioms without duplication.
6. **Stable, human-readable links** – Adopt predictable slugs. Integrate the official link checker (`docusaurus-lint-links`) into CI before publish.

## 3. Information Architecture & Routing
- **Top-level routes**: `/` (landing with ENTER gate), `/home` (interior landing), `/docs` (wiki + projects), `/blog` (updates), `/lab` (lab notebook), `/tags` (aggregate tag pages), `/search` (client-side search UI), `/contact`, `/donate`, `/legal`.
- **Wiki & projects**: Organized under `/docs`, with sidebars grouping evergreen topics and project hubs.
- **Blog**: Uses built-in blog plugin for chronological posts with archives and tag filtering.
- **Lab notebook**: Custom docs plugin instance (e.g., second docs plugin) at `/lab` with its own sidebar hierarchy.
- **Projects**: Dedicated doc category (e.g., `/docs/projects/<project>`). Each project page aggregates related blog posts and lab entries via metadata-driven lists.

## 4. Content Model
Use Markdown/MDX files stored under `content/` with structured front matter shared across idioms.

### 4.1 Shared Front Matter Fields
- `id` – Stable identifier for the piece.
- `title`
- `slug` – Human-readable URL segment.
- `tags` – Array from a curated vocabulary.
- `summary` – 1–2 sentence description.
- `projects` – Optional array linking the item to project hub IDs.

### 4.2 Idiom-Specific Additions
- **Wiki docs**: Optional `sidebar_label`, `description`.
- **Blog posts**: `date`, optional `authors`, `draft`.
- **Lab entries**: Structured block stored as front matter or MDX component props:
  ```yaml
  lab:
    aim: ""
    method: ""
    observations: ""
    result: ""
    next: ""
  ```

## 5. Directory Layout (proposed)
```
root/
├─ docusaurus.config.js
├─ sidebars.js
├─ content/
│  ├─ wiki/
│  │  └─ ... Markdown/MDX reference pages
│  ├─ lab/
│  │  └─ ... lab entry Markdown files
│  ├─ projects/
│  │  └─ ... project hub pages (MD/MDX)
│  └─ blog/
│     └─ ... dated post folders with index.md
├─ src/
│  ├─ components/
│  │  ├─ LabEntryHeader.tsx (renders lab block)
│  │  └─ ProjectRelatedList.tsx (shared list component)
│  ├─ css/ (light theme overrides)
│  └─ pages/
│     ├─ index.tsx (landing gate with ENTER interaction)
│     ├─ home.tsx (interior landing page)
│     ├─ search.tsx (search interface wired to static index)
│     ├─ contact.md
│     ├─ donate.md
│     └─ legal.md
├─ static/
│  └─ favicon, images, `search-index.json`
└─ scripts/
   └─ build-search-index.mjs (build-time generator)
```

## 6. Feature Breakdown

### 6.1 Landing Page (`/` + `/home`)
- `/` presents a sparse, centered layout in gray and orange with a single "ENTER" call-to-action (button or link) and the one-sentence purpose beneath it. Minimal animation (e.g., hover color shift) only.
- The ENTER interaction navigates to `/home`, which contains the interior landing content and is directly addressable.
- `/home` repeats the purpose statement, highlights three CTA cards (Wiki, Blog, Lab) with short descriptions, and links to respective indexes.
- An optional “Recent” list (max three items) may appear on `/home` if populated from statically generated JSON produced during the build; otherwise link to full lists.
- Ensure both `/` and `/home` remain fully readable without JavaScript and respect the gray/orange palette via lightweight CSS overrides.

### 6.2 Wiki (`/docs`)
- Use Docusaurus classic preset docs plugin.
- Configure sidebar categories for evergreen topics and a nested "Projects" section.
- Enable MDX for embedding diagrams or linking to lab/blog entries.
- Provide `toc_min_heading_level`/`max` for anchor navigation.

### 6.3 Blog (`/blog`)
- Enable blog plugin with pagination, tags, and archive page.
- Configure authors file if needed.
- Generate `blog/rss.xml` via built-in feed option.

### 6.4 Lab Notebook (`/lab`)
- Register second docs plugin instance with separate `id` and `routeBasePath` set to `lab`.
- Provide sidebar grouping by project or chronology (e.g., year > month > entry).
- Create a reusable MDX component (`<LabEntryHeader />`) that reads front matter to render the aim/method/observations/result/next block.

### 6.5 Project Hubs (`/docs/projects/...`)
- Each project doc contains:
  - Goal summary and status.
  - Auto-generated lists of related blog posts and lab entries filtered by matching `projects` tag via MDX component `ProjectRelatedList`, which consumes prebuilt JSON data.

### 6.6 Static Search (`/search`)
- During build, run `scripts/build-search-index.mjs` to traverse Markdown metadata and produce `static/search-index.json`.
- On the search page, load the static JSON and execute client-side search (e.g., using `lunr` or `minisearch` bundled at build). No network requests beyond the static file.
- Index includes title, summary, tags, and content excerpts from wiki, blog, and lab.

### 6.7 Tags & Aggregation
- Define canonical tag list in `tags.yml` (or plugin config).
- Ensure blog, wiki, and lab share tag components.
- Configure tag routes to display aggregated items across idioms using prebuilt metadata (e.g., `generated/tag-maps.json`).

### 6.8 Navigation Chrome
- Header: persistent links to Home, Wiki, Blog, Lab, Search.
- Footer: sections for About, Contact, Support, Legal. All pages static.
- Use theme `NavbarItem` configuration; keep styling minimal.

### 6.9 Contact & Donate Pages
- `contact.md` with mailto link and short instructions.
- `donate.md` with links to support platforms (Ko-fi, GitHub Sponsors) and summary text.

### 6.10 Legal Page
- `legal.md` with privacy note and attribution/licensing statements.

## 7. Build & Deployment Workflow
1. Author content in `content/` using Markdown/MDX.
2. Run `npm install` (classic preset dependencies plus optional search libraries).
3. Execute `npm run build` (alias for `docusaurus build`).
4. Prebuild scripts (search index, tag aggregation) run via `npm run prebuild` hook.
5. Deploy static `build/` directory to GitHub Pages via GitHub Actions workflow.
6. Integrate `docusaurus-lint-links` or `linkinator` in CI to enforce link stability.

## 8. Extensibility Notes
- Additional idioms (RFCs, changelog) can be added by introducing new docs plugin instances pointing to subdirectories under `content/`.
- Analytics can be layered later using static snippet injection.
- Internationalization can be adopted later via Docusaurus i18n without rewriting content.

## 9. Open Questions & Follow-Ups
- Choose between Lunr vs. Minisearch for index size/performance trade-offs.
- Confirm final tag vocabulary and governance process.
- Determine whether projects should show auto-sorted sections (blog vs. lab) or unified chronological list.
