---
id: NR-LAB-005
slug: search-prototype-benchmark
title: Client-side search prototype benchmark
logged: 2024-05-08
status: Completed
description: Benchmarking latency for the static search index.
tags:
  - search
  - quality
related:
  - label: Related blog post
    type: blog
    ref: aligning-static-workflows
    slug: aligning-static-workflows
fields:
  aim: Measure the responsiveness of the static JSON search index under varied dataset sizes.
  method: Executed local Lighthouse runs against 10k synthetic entries while profiling input latency.
  observations: Input responsiveness stayed under 60ms; JSON payload remained under 500kb compressed.
  result: Prototype passes the performance budget and is cleared for inclusion in production builds.
  next: Document integration steps for the build pipeline and add regression checks.
summary: The search payload stays performant even under heavy synthetic datasets.
---

