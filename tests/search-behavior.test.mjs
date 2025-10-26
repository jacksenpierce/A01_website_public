import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomFromFile } from './helpers/dom.js';

const sampleIndex = [
  {
    title: 'Client-side search prototype benchmark',
    description: 'Lab entry documenting the search benchmark.',
    url: 'lab/search-prototype-benchmark.html',
    tags: ['lab', 'search'],
  },
  {
    title: 'Normal Rooms contact',
    description: 'Reach out to the team.',
    url: 'contact.html',
    tags: ['contact'],
  },
];

test('search renders results matching the query', async () => {
  const dom = await createDomFromFile('search.html', {
    fetchImpl: async () => ({
      ok: true,
      json: async () => sampleIndex,
    }),
  });

  const { document, Event } = dom.window;
  const input = document.querySelector('#search-query');
  const results = document.querySelector('#search-results');

  input.value = 'search';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 0));

  const items = Array.from(results.querySelectorAll('.search__item'));
  assert.equal(items.length, 1);
  assert.match(items[0].textContent, /benchmark/i);
});

test('search shows an empty state when there are no matches', async () => {
  const dom = await createDomFromFile('search.html', {
    fetchImpl: async () => ({
      ok: true,
      json: async () => sampleIndex,
    }),
  });

  const { document, Event } = dom.window;
  const input = document.querySelector('#search-query');
  const results = document.querySelector('#search-results');

  input.value = 'nonexistent';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.match(results.textContent, /No results/i);
});
