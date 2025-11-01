import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const contentRoots = [path.join(projectRoot, 'content'), path.join(projectRoot, 'lab')];

const blogPosts = [];
const wikiArticles = [];
const projectEntries = [];
const projectDomains = new Map();
const searchEntries = [];

await Promise.all(contentRoots.map((dir) => collectDocuments(dir)));

writeOutputs().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function collectDocuments(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectDocuments(entryPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      await processDocument(entryPath);
    }
  }
}

async function processDocument(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const normalized = raw.replace(/^\uFEFF/, '');
  const frontMatterMatch = normalized.match(/^<!--\s*\n?([\s\S]*?)\s*-->/);
  if (!frontMatterMatch) {
    return;
  }

  let meta;
  try {
    meta = JSON.parse(frontMatterMatch[1]);
  } catch (error) {
    throw new Error(`Invalid front matter in ${path.relative(projectRoot, filePath)}: ${error.message}`);
  }

  if (!meta || typeof meta !== 'object') {
    return;
  }

  const surfaces = meta.surfaces ?? {};
  if (!surfaces || typeof surfaces !== 'object') {
    return;
  }

  const relativePath = path.relative(projectRoot, filePath).split(path.sep).join('/');
  const slugFromFile = path.basename(filePath, path.extname(filePath));

  if (surfaces.blog) {
    const blogConfig = surfaces.blog;
    const slug = blogConfig.slug ?? meta.slug ?? slugFromFile;
    if (!blogConfig.date) {
      throw new Error(`Blog document ${relativePath} is missing a publication date.`);
    }
    blogPosts.push({
      slug,
      title: blogConfig.title ?? meta.title ?? slug,
      date: blogConfig.date,
      type: blogConfig.type ?? 'Update',
      summary: blogConfig.summary ?? meta.summary ?? '',
      contentPath: relativePath,
      tags: Array.isArray(blogConfig.tags) ? blogConfig.tags : Array.isArray(meta.tags) ? meta.tags : [],
    });
  }

  if (surfaces.wiki) {
    const wikiConfig = surfaces.wiki;
    const id = wikiConfig.id ?? meta.id ?? slugFromFile;
    wikiArticles.push({
      id,
      title: wikiConfig.title ?? meta.title ?? id,
      subtitle: wikiConfig.subtitle ?? meta.subtitle ?? '',
      summary: wikiConfig.summary ?? meta.summary ?? '',
      contentPath: relativePath,
      updated: wikiConfig.updated ?? meta.updated ?? '',
    });
  }

  if (surfaces.projects) {
    const projectConfig = surfaces.projects;
    const slug = projectConfig.slug ?? meta.slug ?? slugFromFile;
    const domainConfig = normalizeDomain(projectConfig.domain);
    const existingDomain = projectDomains.get(domainConfig.name);
    if (!existingDomain) {
      projectDomains.set(domainConfig.name, domainConfig);
    } else {
      const merged = {
        name: domainConfig.name,
        description: domainConfig.description || existingDomain.description,
        order: Number.isFinite(domainConfig.order) ? domainConfig.order : existingDomain.order,
      };
      projectDomains.set(domainConfig.name, merged);
    }

    projectEntries.push({
      slug,
      title: projectConfig.title ?? meta.title ?? slug,
      domain: domainConfig.name,
      sequence: projectConfig.sequence ?? null,
      summary: projectConfig.summary ?? meta.summary ?? '',
      updated: projectConfig.updated ?? meta.updated ?? '',
      tags: Array.isArray(projectConfig.tags)
        ? projectConfig.tags
        : Array.isArray(meta.tags)
        ? meta.tags
        : [],
      contentPath: relativePath,
      spotlight: Array.isArray(projectConfig.spotlight) ? projectConfig.spotlight : [],
    });
  }

  if (surfaces.search) {
    const searchConfig = surfaces.search;
    const url =
      searchConfig.url ??
      inferUrl({
        relativePath,
        slugFromFile,
        meta,
        surfaces,
      });
    searchEntries.push({
      title: searchConfig.title ?? meta.title ?? slugFromFile,
      description: searchConfig.description ?? meta.summary ?? '',
      url,
      tags: Array.isArray(searchConfig.tags)
        ? searchConfig.tags
        : Array.isArray(meta.tags)
        ? meta.tags
        : [],
    });
  }
}

function normalizeDomain(input) {
  if (!input) {
    return { name: 'General', description: '', order: Number.MAX_SAFE_INTEGER };
  }
  if (typeof input === 'string') {
    return { name: input, description: '', order: Number.MAX_SAFE_INTEGER };
  }
  return {
    name: input.name ?? 'General',
    description: input.description ?? '',
    order: Number.isFinite(Number(input.order)) ? Number(input.order) : Number.MAX_SAFE_INTEGER,
  };
}

function inferUrl({ relativePath, slugFromFile, meta, surfaces }) {
  if (surfaces.blog) {
    const slug = surfaces.blog.slug ?? meta.slug ?? slugFromFile;
    return `modules/blog/post.html?slug=${slug}`;
  }
  if (surfaces.wiki) {
    const id = surfaces.wiki.id ?? meta.id ?? slugFromFile;
    return `modules/wiki/article.html?doc=${id}`;
  }
  if (surfaces.projects) {
    const slug = surfaces.projects.slug ?? meta.slug ?? slugFromFile;
    return `modules/projects/project.html?slug=${slug}`;
  }
  if (surfaces.lab && surfaces.lab.url) {
    return surfaces.lab.url;
  }
  return relativePath;
}

async function writeOutputs() {
  blogPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
  wikiArticles.sort((a, b) => a.title.localeCompare(b.title));
  projectEntries.sort((a, b) => {
    const domainOrderA = projectDomains.get(a.domain)?.order ?? Number.MAX_SAFE_INTEGER;
    const domainOrderB = projectDomains.get(b.domain)?.order ?? Number.MAX_SAFE_INTEGER;
    if (domainOrderA !== domainOrderB) {
      return domainOrderA - domainOrderB;
    }
    if (a.domain !== b.domain) {
      return a.domain.localeCompare(b.domain);
    }
    if (a.sequence !== b.sequence) {
      if (a.sequence == null) return 1;
      if (b.sequence == null) return -1;
      return a.sequence - b.sequence;
    }
    return a.title.localeCompare(b.title);
  });
  searchEntries.sort((a, b) => a.title.localeCompare(b.title));

  const domainsObject = {};
  Array.from(projectDomains.values())
    .sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      return a.name.localeCompare(b.name);
    })
    .forEach((domain) => {
      domainsObject[domain.name] = {
        description: domain.description,
        order: Number.isFinite(domain.order) ? domain.order : undefined,
      };
      if (domainsObject[domain.name].order === undefined) {
        delete domainsObject[domain.name].order;
      }
    });

  await Promise.all([
    writeJson(['data', 'blog', 'posts.json'], { posts: blogPosts }),
    writeJson(['data', 'wiki', 'articles.json'], { articles: wikiArticles }),
    writeJson(['data', 'projects', 'projects.json'], { domains: domainsObject, projects: projectEntries }),
    writeJson(['data', 'search', 'index.json'], searchEntries),
  ]);
}

async function writeJson(segments, data) {
  const targetPath = path.join(projectRoot, ...segments);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(targetPath, `${payload}\n`, 'utf8');
}
