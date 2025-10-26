import { JSDOM } from 'jsdom';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(projectRoot, 'script.js');

const defaultFetch = async () => ({
  ok: true,
  json: async () => [],
});

export async function createDomFromMarkup(markup, { fetchImpl = defaultFetch } = {}) {
  const dom = new JSDOM(markup, {
    url: 'https://normalrooms.test/',
    runScripts: 'outside-only',
  });

  const { window } = dom;
  window.fetch = fetchImpl;
  window.console.error = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};

  const scriptContent = await readFile(scriptPath, 'utf8');
  window.eval(scriptContent);

  await new Promise((resolve) => setTimeout(resolve, 0));
  return dom;
}

export async function createDomFromFile(relativePath, { fetchImpl = defaultFetch } = {}) {
  const htmlPath = path.join(projectRoot, relativePath);
  const html = await readFile(htmlPath, 'utf8');
  return createDomFromMarkup(html, {
    fetchImpl,
  });
}
