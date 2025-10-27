---
id: publishing
title: Publishing workflow
summary: Single-source Markdown pipeline with static search indexing.
order: 3
tags:
  - build
  - quality
---
Content authors work in a single repository folder structure mirroring Docusaurus docs, blog posts, lab entries, and project hubs. Each file includes light front matter for title, description, and tags. A build script generates the static site, local search index, and integrity checks before deployment.

Because the build emits all pages, indexes, and search data, the public site serves only static files. GitHub Pages hosts the result for free, and link stability checks catch regressions before publishing.


