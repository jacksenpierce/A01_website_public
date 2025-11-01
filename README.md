# Minimal Landing Page

This repository now serves a single-screen landing page built around a gently pulsing network of social links.

## Legacy site

The previous multi-page site and all supporting assets have been moved to [`legacy_site/`](legacy_site/).

To restore the legacy experience at the repository root:

1. Back up or remove the new `index.html` file (and any other new assets you may have added).
2. Move the contents of `legacy_site/` back into the repository root:

   ```bash
   cd /path/to/A01_website_public
   shopt -s dotglob
   mv legacy_site/* .
   shopt -u dotglob
   ```

3. Optionally delete the now-empty `legacy_site/` folder.

All original documentation, assets, and build scripts remain untouched inside `legacy_site/` should you need to reattach them.
