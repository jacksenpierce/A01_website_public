---
id: architecture
title: Architecture
summary: How the Docusaurus-inspired structure keeps content consistent.
order: 2
tags:
  - static
  - projects
---
The stack centers on Docusaurus conventions: docs, blog, and custom pages map to our wiki, blog, and lab notebook idioms. Components are kept light to guarantee readability without JavaScript. Navigation chrome is shared across all pages for consistency.

Projects are represented by dedicated MDX files that aggregate links via tags. Each document may appear in multiple idioms by reference, avoiding duplicated truths while supporting multi-entry navigation.


