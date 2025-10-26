import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomFromMarkup } from './helpers/dom.js';

const markup = `
<!DOCTYPE html>
<html lang="en">
  <body>
    <button class="nav-toggle" aria-expanded="false" aria-controls="primary-navigation"></button>
    <nav id="primary-navigation" data-open="false"></nav>
  </body>
</html>
`;

test('navigation toggle flips aria-expanded and data-open attributes', async () => {
  const dom = await createDomFromMarkup(markup);
  const { document, Event } = dom.window;
  const toggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('#primary-navigation');

  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(navigation.getAttribute('data-open'), 'false');

  toggle.dispatchEvent(new Event('click', { bubbles: true }));
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(navigation.getAttribute('data-open'), 'true');

  toggle.dispatchEvent(new Event('click', { bubbles: true }));
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(navigation.getAttribute('data-open'), 'false');
});
