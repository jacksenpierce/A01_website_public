import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { marked } from 'marked';
import nunjucks from 'nunjucks';
import { glob } from 'glob';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const templatesDir = path.join(rootDir, 'src', 'templates');

marked.setOptions({
  gfm: true,
  breaks: false,
});

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(templatesDir),
  { autoescape: false }
);

env.addFilter('markdown', (value) => marked.parse(value ?? ''));

const idioms = [
  {
    title: 'Wiki',
    description: 'Evergreen reference pages with contextual navigation and deep linking.',
    href: 'wiki.html',
    linkLabel: 'Browse articles',
  },
  {
    title: 'Blog',
    description: 'Chronological updates with archives and tags for historical context.',
    href: 'blog.html',
    linkLabel: 'Read updates',
  },
  {
    title: 'Lab notebook',
    description: 'Structured experiment entries that capture aim, method, and follow-up.',
    href: 'lab.html',
    linkLabel: 'Review experiments',
  },
];

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(date);
}

function monthAnchor(date) {
  return `${date.toLocaleString('en-US', { month: 'long' }).toLowerCase()}-${date.getFullYear()}`;
}

function monthLabel(date) {
  return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function addTagUsage(map, tag, entry) {
  if (!map.has(tag)) {
    map.set(tag, []);
  }
  map.get(tag).push(entry);
}

function buildTagLink(tag, basePath = '') {
  return {
    label: tag,
    href: `${basePath}tags.html#${tag}`,
  };
}

async function loadMarkdownCollection(pattern) {
  const files = await glob(pattern, { windowsPathsNoEscape: true });
  const entries = [];
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const { data, content: body } = matter(content);
    entries.push({ data, body, file });
  }
  return entries;
}

async function readYaml(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return YAML.parse(raw);
}

async function writeFile(targetPath, contents) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents);
}

function createSearchEntry({ title, description, url, tags }) {
  const uniqueTags = Array.from(new Set(tags));
  return { title, description, url, tags: uniqueTags };
}

async function build() {
  const tagIndex = new Map();
  const searchEntries = [];

  const wikiEntries = await loadMarkdownCollection(path.join(rootDir, 'src/content/wiki/*.md'));
  const wikiSections = wikiEntries
    .map(({ data, body }) => ({
      id: data.id,
      title: data.title,
      order: data.order ?? 0,
      summary: data.summary,
      tags: ensureArray(data.tags),
      content: marked.parse(body ?? ''),
    }))
    .sort((a, b) => a.order - b.order);

  for (const section of wikiSections) {
    addTagUsage(tagIndex, 'wiki', {
      title: section.title,
      href: `wiki.html#${section.id}`,
      type: 'Wiki',
    });
    for (const tag of section.tags) {
      addTagUsage(tagIndex, tag, {
        title: section.title,
        href: `wiki.html#${section.id}`,
        type: 'Wiki',
      });
    }
    searchEntries.push(
      createSearchEntry({
        title: section.title,
        description: section.summary,
        url: `wiki.html#${section.id}`,
        tags: ['wiki', ...section.tags],
      })
    );
  }

  const blogEntries = await loadMarkdownCollection(path.join(rootDir, 'src/content/blog/*.md'));
  const blogPosts = blogEntries
    .map(({ data, body }) => {
      const date = new Date(data.date);
      const tags = ensureArray(data.tags);
      return {
        slug: data.slug,
        title: data.title,
        date,
        category: data.category,
        description: data.description,
        summary: data.summary,
        tags,
        related: ensureArray(data.related),
        content: marked.parse(body ?? ''),
      };
    })
    .sort((a, b) => b.date - a.date);

  for (const post of blogPosts) {
    const meta = `${formatDate(post.date)} · ${post.category}`;
    addTagUsage(tagIndex, 'blog', {
      title: post.title,
      href: `blog/${post.slug}.html`,
      type: 'Blog',
    });
    for (const tag of post.tags) {
      addTagUsage(tagIndex, tag, {
        title: post.title,
        href: `blog/${post.slug}.html`,
        type: 'Blog',
      });
    }
    searchEntries.push(
      createSearchEntry({
        title: post.title,
        description: post.description,
        url: `blog/${post.slug}.html`,
        tags: ['blog', ...post.tags],
      })
    );
    post.meta = meta;
  }

  const blogMap = new Map(blogPosts.map((post) => [post.slug, post]));

  const labEntriesRaw = await loadMarkdownCollection(path.join(rootDir, 'src/content/lab/*.md'));
  const labEntries = labEntriesRaw
    .map(({ data }) => {
      const date = new Date(data.logged);
      const tags = ensureArray(data.tags);
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        status: data.status,
        description: data.description,
        logged: date,
        tags,
        fields: data.fields ?? {},
        related: ensureArray(data.related),
        summary: data.summary,
      };
    })
    .sort((a, b) => b.logged - a.logged);

  for (const entry of labEntries) {
    addTagUsage(tagIndex, 'lab', {
      title: `${entry.id} · ${entry.title}`,
      href: `lab/${entry.slug}.html`,
      type: 'Lab',
    });
    for (const tag of entry.tags) {
      addTagUsage(tagIndex, tag, {
        title: `${entry.id} · ${entry.title}`,
        href: `lab/${entry.slug}.html`,
        type: 'Lab',
      });
    }
    searchEntries.push(
      createSearchEntry({
        title: `${entry.id} · ${entry.title}`,
        description: entry.description,
        url: `lab/${entry.slug}.html`,
        tags: ['lab', ...entry.tags],
      })
    );
  }

  const labMap = new Map(labEntries.map((entry) => [entry.slug, entry]));

  const projectEntriesRaw = await loadMarkdownCollection(path.join(rootDir, 'src/content/projects/*.md'));
  const projects = projectEntriesRaw
    .map(({ data }) => {
      const tags = ensureArray(data.tags);
      return {
        id: data.id,
        slug: data.slug,
        title: data.title,
        summary: data.summary,
        tags,
        links: {
          wiki: ensureArray(data.links?.wiki),
          blog: ensureArray(data.links?.blog),
          lab: ensureArray(data.links?.lab),
        },
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));

  for (const project of projects) {
    addTagUsage(tagIndex, 'project', {
      title: project.title,
      href: `projects.html#${project.id}`,
      type: 'Project',
    });
    for (const tag of project.tags) {
      addTagUsage(tagIndex, tag, {
        title: project.title,
        href: `projects.html#${project.id}`,
        type: 'Project',
      });
    }
    searchEntries.push(
      createSearchEntry({
        title: project.title,
        description: project.summary,
        url: `projects.html#${project.id}`,
        tags: ['project', ...project.tags],
      })
    );
  }

  const projectMap = new Map(projects.map((project) => [project.slug, project]));

  // Manual search tag entry for the search interface itself.
  addTagUsage(tagIndex, 'search', {
    title: 'Search index',
    href: 'search.html',
    type: 'Search',
  });

  const homeContent = await readYaml(path.join(rootDir, 'src/content/pages/home.yaml'));

  const pagesRaw = await loadMarkdownCollection(path.join(rootDir, 'src/content/pages/*.md'));
  const pages = pagesRaw.map(({ data, body }) => ({
    data,
    body: marked.parse(body ?? ''),
  }));

  function resolveRelated(item, basePath) {
    return item.map((ref) => {
      if (ref.type === 'lab') {
        const target = labMap.get(ref.slug);
        return target
          ? {
              label: ref.label,
              href: `${basePath}lab/${target.slug}.html`,
              text: ref.ref ?? target.id,
            }
          : null;
      }
      if (ref.type === 'blog') {
        const target = blogMap.get(ref.slug);
        return target
          ? {
              label: ref.label,
              href: `${basePath}blog/${target.slug}.html`,
              text: ref.ref ?? target.title,
            }
          : null;
      }
      if (ref.type === 'project') {
        const target = projectMap.get(ref.slug);
        return target
          ? {
              label: ref.label,
              href: `${basePath}projects.html#${target.id}`,
              text: ref.ref ?? target.title,
            }
          : null;
      }
      if (ref.type === 'wiki') {
        const target = wikiSections.find((section) => section.id === ref.slug || section.id === ref.ref);
        return target
          ? {
              label: ref.label,
              href: `${basePath}wiki.html#${target.id}`,
              text: ref.ref ?? target.title,
            }
          : null;
      }
      return null;
    }).filter(Boolean);
  }

  // Render blog posts
  for (const post of blogPosts) {
    const templateContext = {
      page: {
        documentTitle: `${post.title} · Normal Rooms`,
        basePath: '../',
        nav: 'blog',
      },
      post: {
        title: post.title,
        meta: post.meta,
        content: post.content,
        tags: post.tags.map((tag) => buildTagLink(tag, '../')),
        related: resolveRelated(post.related, '../'),
      },
    };
    const output = env.render('pages/blog-post.njk', templateContext);
    await writeFile(path.join(rootDir, 'blog', `${post.slug}.html`), output.trim() + '\n');
  }

  // Render blog index
  const blogGroups = new Map();
  for (const post of blogPosts) {
    const anchor = monthAnchor(post.date);
    if (!blogGroups.has(anchor)) {
      blogGroups.set(anchor, { anchor, label: monthLabel(post.date), posts: [] });
    }
    blogGroups.get(anchor).posts.push({
      title: post.title,
      href: `blog/${post.slug}.html`,
      meta: post.meta,
      summary: post.summary,
      tags: post.tags.map((tag) => buildTagLink(tag)),
    });
  }

  const blogArchives = Array.from(blogGroups.values()).map((group) => ({
    href: `blog.html#${group.anchor}`,
    label: group.label,
  }));

  const blogIndexContext = {
    page: {
      documentTitle: 'Normal Rooms · Blog',
      basePath: '',
      nav: 'blog',
    },
    blog: {
      groups: Array.from(blogGroups.values()),
      archives: blogArchives,
    },
  };
  const blogIndexHtml = env.render('pages/blog.njk', blogIndexContext);
  await writeFile(path.join(rootDir, 'blog.html'), blogIndexHtml.trim() + '\n');

  // Render lab entries
  for (const entry of labEntries) {
    const fields = Object.entries(entry.fields).map(([key, value]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
    }));
    const context = {
      page: {
        documentTitle: `${entry.id} · ${entry.title} · Normal Rooms`,
        basePath: '../',
        nav: 'lab',
      },
      entry: {
        meta: `${entry.id} · Logged ${formatDate(entry.logged)} · ${entry.status}`,
        title: entry.title,
        tags: entry.tags.map((tag) => buildTagLink(tag, '../')),
        fields,
        related: resolveRelated(entry.related, '../'),
      },
    };
    const html = env.render('pages/lab-entry.njk', context);
    await writeFile(path.join(rootDir, 'lab', `${entry.slug}.html`), html.trim() + '\n');
  }

  // Render lab index
  const labIndexContext = {
    page: {
      documentTitle: 'Normal Rooms · Lab Notebook',
      basePath: '',
      nav: 'lab',
    },
    lab: {
      entries: labEntries.map((entry) => ({
        heading: `${entry.id} · ${entry.title}`,
        href: `lab/${entry.slug}.html`,
        status: entry.status,
        logged: formatDate(entry.logged),
        tags: entry.tags.map((tag) => buildTagLink(tag)),
        fields: Object.entries(entry.fields).map(([key, value]) => ({
          label: key.charAt(0).toUpperCase() + key.slice(1),
          value,
        })),
      })),
    },
  };
  const labIndexHtml = env.render('pages/lab.njk', labIndexContext);
  await writeFile(path.join(rootDir, 'lab.html'), labIndexHtml.trim() + '\n');

  // Render wiki page
  const wikiContext = {
    page: {
      documentTitle: 'Normal Rooms · Wiki',
      basePath: '',
      nav: 'wiki',
    },
    wiki: {
      sections: wikiSections.map((section) => ({
        id: section.id,
        title: section.title,
        content: section.content,
        tags: section.tags.map((tag) => buildTagLink(tag)),
      })),
    },
  };
  const wikiHtml = env.render('pages/wiki.njk', wikiContext);
  await writeFile(path.join(rootDir, 'wiki.html'), wikiHtml.trim() + '\n');

  // Render projects page
  const projectsContext = {
    page: {
      documentTitle: 'Normal Rooms · Projects',
      basePath: '',
      nav: 'projects',
    },
    projects: {
      items: projects.map((project) => ({
        id: project.id,
        title: project.title,
        summary: project.summary,
        tags: project.tags.map((tag) => buildTagLink(tag)),
        links: {
          wiki: project.links.wiki.map((link) => ({
            href: `wiki.html#${link.id}`,
            label: link.title,
          })),
          blog: project.links.blog.map((link) => ({
            href: `blog/${link.slug}.html`,
            label: link.title,
          })),
          lab: project.links.lab.map((link) => ({
            href: `lab/${link.slug}.html`,
            label: link.title,
          })),
        },
      })),
    },
  };
  const projectsHtml = env.render('pages/projects.njk', projectsContext);
  await writeFile(path.join(rootDir, 'projects.html'), projectsHtml.trim() + '\n');

  // Render tags page
  const hiddenTags = new Set(['wiki', 'blog', 'project']);
  const sortedTags = Array.from(tagIndex.entries())
    .filter(([tag]) => !hiddenTags.has(tag))
    .map(([tag, items]) => ({
      id: tag,
      label: tag,
      items: items,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  for (const tag of sortedTags) {
    tag.items.sort((a, b) => a.title.localeCompare(b.title));
  }

  const tagsContext = {
    page: {
      documentTitle: 'Normal Rooms · Tags',
      basePath: '',
      nav: 'tags',
    },
    tags: {
      items: sortedTags,
    },
  };
  const tagsHtml = env.render('pages/tags.njk', tagsContext);
  await writeFile(path.join(rootDir, 'tags.html'), tagsHtml.trim() + '\n');

  // Render search page
  const searchContext = {
    page: {
      documentTitle: 'Normal Rooms · Search',
      basePath: '',
      nav: 'search',
    },
  };
  const searchHtml = env.render('pages/search.njk', searchContext);
  await writeFile(path.join(rootDir, 'search.html'), searchHtml.trim() + '\n');

  // Render home page
  const homeContext = {
    page: {
      documentTitle: 'Normal Rooms · Home',
      basePath: '',
    },
    home: {
      hero: homeContent.hero,
      intro: homeContent.intro,
      idioms,
      stats: [
        { label: 'Evergreen Articles', value: wikiSections.length },
        { label: 'Project Hubs', value: projects.length },
        { label: 'Lab Experiments', value: labEntries.length },
      ],
      latestBlog: blogPosts.slice(0, 2).map((post) => ({
        meta: `${formatDate(post.date)} · ${post.category}`,
        title: post.title,
        href: `blog/${post.slug}.html`,
      })),
      latestLab: labEntries.slice(0, 2).map((entry) => ({
        meta: `Experiment · ${entry.id}`,
        title: `${entry.title}`,
        href: `lab/${entry.slug}.html`,
      })),
    },
  };
  const homeHtml = env.render('pages/home.njk', homeContext);
  await writeFile(path.join(rootDir, 'home.html'), homeHtml.trim() + '\n');

  // Render landing page
  const landingContext = {
    landing: {
      documentTitle: 'Normal Rooms',
      heading: 'Documentation, updates, and lab notes in one calm space.',
      description:
        'A minimal, static hub for the Normal Rooms project. Explore the wiki, read the latest updates, and review structured experiment logs—everything generated ahead of time and ready for GitHub Pages.',
      ctaLabel: 'Enter',
    },
  };
  const landingHtml = env.render('pages/landing.njk', landingContext);
  await writeFile(path.join(rootDir, 'index.html'), landingHtml.trim() + '\n');

  // Render standard pages
  for (const pageEntry of pages) {
    const page = pageEntry.data;
    const sections = (page.sections || []).map((section) => ({
      title: section.title,
      body: marked.parse(section.body ?? ''),
    }));
    const context = {
      page: {
        documentTitle: page.title,
        basePath: '',
        nav: page.nav,
        eyebrow: page.eyebrow,
        heading: page.heading,
        description: page.description,
      },
      pageContent: {
        body: pageEntry.body,
        sections,
      },
    };
    const html = env.render('pages/page.njk', {
      page: context.page,
      pageContent: context.pageContent,
    });
    await writeFile(path.join(rootDir, `${page.slug}.html`), html.trim() + '\n');
  }

  // Generate search index JSON
  await writeFile(
    path.join(rootDir, 'data', 'search-index.json'),
    JSON.stringify(searchEntries, null, 2) + '\n'
  );
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
