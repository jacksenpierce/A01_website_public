import test from 'node:test';
import assert from 'node:assert/strict';
import { createDomFromFile } from './helpers/dom.js';

test('footer renders the current year and required links', async () => {
  const dom = await createDomFromFile('home.html');
  const { document } = dom.window;
  const year = document.querySelector('#year');

  assert.ok(year, 'year element is present');
  assert.equal(year.textContent, String(new Date().getFullYear()));

  const footerLinks = Array.from(document.querySelectorAll('.footer__links a')).map((link) => link.textContent.trim());
  assert.deepEqual(footerLinks, ['About', 'Contact', 'Support', 'Legal']);
});
