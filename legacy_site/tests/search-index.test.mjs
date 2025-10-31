import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './helpers/dom.js';

const indexPath = path.join(projectRoot, 'data', 'search', 'index.json');

test('search index is a non-empty array with required fields', async () => {
  const raw = await readFile(indexPath, 'utf8');
  const data = JSON.parse(raw);

  assert.ok(Array.isArray(data), 'index should be an array');
  assert.ok(data.length > 0, 'index should contain entries');

  for (const entry of data) {
    assert.equal(typeof entry.title, 'string');
    assert.ok(entry.title.length > 0, 'title should not be empty');
    assert.equal(typeof entry.description, 'string');
    assert.equal(typeof entry.url, 'string');
    assert.ok(Array.isArray(entry.tags), 'tags should be an array');
    for (const tag of entry.tags) {
      assert.equal(typeof tag, 'string');
      assert.ok(tag.length > 0, 'tags should not be empty strings');
    }
  }
});
