# Minimal Landing Page

This repository now serves a single-screen landing page built around a gently pulsing network of social links.

## Updating the graph

Links, labels, and visibility are all controlled from a single YAML document at [`config/sites.yaml`](config/sites.yaml). Each entry should contain:

* `label` – the text shown next to the node.
* `url` – the destination opened when the node is tapped or clicked.
* `state` – optional. Use `active` (default) for regular styling, `inactive` to keep the node visible but dimmed, or `hidden` to omit it entirely without deleting the entry.

The first valid node in the list (or any node marked `hub: true`) becomes the center of the graph. All other visible nodes automatically connect to it, so you only need to edit this one file—there’s no need to update separate link definitions. Malformed or duplicate entries are skipped so bad data doesn’t break the visualization.

### Additional YAML fields

* `meta.title` controls the browser tab title.
* `theme` keys (background color, link color, etc.) are optional overrides; if omitted the built-in orange-on-black presentation is used.

If the YAML cannot be parsed or produces no valid nodes, the page falls back to a single hub entry so you can see that the graph is still running.
