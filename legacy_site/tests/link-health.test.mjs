import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { JSDOM } from 'jsdom';
import { projectRoot } from './helpers/dom.js';

const IGNORED_DIRS = new Set(['node_modules', '.git', 'tests']);

async function collectHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

const domCache = new Map();
async function loadDom(filePath) {
  if (!domCache.has(filePath)) {
    const html = await readFile(filePath, 'utf8');
    domCache.set(filePath, new JSDOM(html));
  }
  return domCache.get(filePath);
}

function isExternal(href) {
  return /^(https?:)?\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('data:') || href.startsWith('javascript:');
}

function normalizePath(baseFile, hrefPath) {
  return path.normalize(path.join(path.dirname(baseFile), hrefPath));
}

test('internal links resolve to existing files', async () => {
  const htmlFiles = await collectHtmlFiles(projectRoot);
  const failures = [];

  for (const file of htmlFiles) {
    const dom = await loadDom(file);
    const anchors = dom.window.document.querySelectorAll('a[href]');

    for (const anchor of anchors) {
      const href = anchor.getAttribute('href').trim();
      if (!href || href === '#') {
        continue;
      }
      if (isExternal(href)) {
        continue;
      }

      if (href.startsWith('#')) {
        const targetId = href.slice(1);
        if (!targetId) continue;
        if (!dom.window.document.getElementById(targetId)) {
          failures.push(`${path.relative(projectRoot, file)} → missing local anchor ${href}`);
        }
        continue;
      }

      const [relativeWithQuery, hash] = href.split('#');
      const [relativePath] = relativeWithQuery.split('?');
      const targetPath = relativePath ? normalizePath(file, relativePath) : file;

      try {
        await access(targetPath, fsConstants.F_OK);
      } catch {
        failures.push(`${path.relative(projectRoot, file)} → ${href}`);
        continue;
      }

      if (hash && path.resolve(targetPath) === path.resolve(file)) {
        const targetDom = await loadDom(targetPath);
        if (!targetDom.window.document.getElementById(hash)) {
          failures.push(`${path.relative(projectRoot, file)} → ${href}`);
        }
      }
    }
  }

  assert.deepEqual(failures, [], `Broken links found:\n${failures.join('\n')}`);
});
