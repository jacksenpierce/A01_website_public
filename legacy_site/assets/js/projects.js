const stackContainer = document.querySelector('#projects-stack');
const domainsList = document.querySelector('#projects-domains');
const detailArticle = document.querySelector('#project-detail');
const detailBody = document.querySelector('#project-body');
const detailRelated = document.querySelector('#project-related');
const detailSequence = document.querySelector('#project-sequence');
const detailDomain = document.querySelector('#project-domain');
const detailUpdated = document.querySelector('#project-updated');
const detailTitle = document.querySelector('#project-title');
const detailSummary = document.querySelector('#project-summary');
const detailTags = document.querySelector('#project-tags');
const domainLinks = document.querySelector('#project-domains');
const projectsCount = document.querySelector('#projects-count');
const projectsUpdated = document.querySelectorAll('#projects-updated');

if (stackContainer || detailArticle) {
  initProjects();
}

async function initProjects() {
  try {
    const response = await fetch(window.resolveAssetPath('data/projects/projects.json'));
    if (!response.ok) throw new Error('Failed to load project index');
    const data = await response.json();
    const domains = data.domains || {};
    const projects = (data.projects || []).map((project) => ({
      ...project,
      updatedDate: project.updated ? new Date(project.updated) : null,
    }));

    projects.sort((a, b) => {
      if (a.domain === b.domain) {
        return (a.sequence || 0) - (b.sequence || 0) || a.title.localeCompare(b.title);
      }
      const orderA = domains[a.domain]?.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = domains[b.domain]?.order ?? Number.MAX_SAFE_INTEGER;
      return orderA === orderB ? a.domain.localeCompare(b.domain) : orderA - orderB;
    });

    if (stackContainer) {
      renderProjectIndex(projects, domains);
    }

    if (detailArticle) {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('slug') || projects[0]?.slug;
      renderProjectDetail(slug, projects, domains);
    }

    updateMeta(projects, domains);
  } catch (error) {
    console.error(error);
    if (stackContainer) {
      stackContainer.innerHTML = '<p>Unable to load projects.</p>';
    }
    if (detailArticle) {
      detailArticle.innerHTML = '<p>Unable to load this project.</p>';
    }
    if (projectsCount) {
      projectsCount.textContent = 'Unable to load project roster.';
    }
  }
}

function renderProjectIndex(projects, domains) {
  stackContainer.innerHTML = '';
  const grouped = projects.reduce((acc, project) => {
    if (!acc[project.domain]) {
      acc[project.domain] = [];
    }
    acc[project.domain].push(project);
    return acc;
  }, {});

  const domainEntries = Object.keys(grouped)
    .sort((a, b) => {
      const orderA = domains[a]?.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = domains[b]?.order ?? Number.MAX_SAFE_INTEGER;
      return orderA === orderB ? a.localeCompare(b) : orderA - orderB;
    });

  domainEntries.forEach((domain) => {
    const section = document.createElement('section');
    section.className = 'module-stack__domain';
    const anchorId = `domain-${slugify(domain)}`;
    section.id = anchorId;

    const header = document.createElement('header');
    const title = document.createElement('h2');
    title.textContent = domain;
    const description = document.createElement('p');
    description.textContent = domains[domain]?.description || '';
    header.appendChild(title);
    if (description.textContent) {
      header.appendChild(description);
    }
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'module-stack__items';

    grouped[domain].forEach((project) => {
      const card = document.createElement('article');
      card.className = 'module-card project-card';
      card.innerHTML = `
        <div class="module-card__meta">
          <span>${formatDate(project.updated)} · ${project.domain}</span>
        </div>
        <h3 class="module-card__title"><a href="project.html?slug=${project.slug}">${project.title}</a></h3>
        <p class="module-card__description">${project.summary}</p>
        <div class="module-card__tags">${project.tags.map((tag) => `#${tag}`).join(' ')}</div>
        ${renderSpotlight(project.spotlight)}
      `;
      list.appendChild(card);
    });

    section.appendChild(list);
    stackContainer.appendChild(section);
  });

  if (domainsList) {
    domainsList.innerHTML = '';
    domainEntries.forEach((domain) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#domain-${slugify(domain)}`;
      link.textContent = domain;
      item.appendChild(link);
      const description = domains[domain]?.description || '';
      if (description) {
        const span = document.createElement('span');
        span.textContent = description;
        item.appendChild(span);
      }
      domainsList.appendChild(item);
    });
  }
}

function renderProjectDetail(slug, projects, domains) {
  const project = projects.find((item) => item.slug === slug);
  if (!project) {
    detailArticle.innerHTML = '<p>Project not found.</p>';
    return;
  }

  detailTitle.textContent = project.title;
  detailSummary.textContent = project.summary;
  detailDomain.textContent = `Domain · ${project.domain}`;
  detailUpdated.textContent = project.updated ? `Updated ${formatDate(project.updated)}` : 'Updated —';

  if (detailTags) {
    detailTags.innerHTML = '';
    project.tags.forEach((tag) => {
      const tagEl = document.createElement('span');
      tagEl.className = 'tag';
      tagEl.textContent = `#${tag}`;
      detailTags.appendChild(tagEl);
    });
  }

  if (detailRelated) {
    detailRelated.innerHTML = '';
    if (!project.spotlight?.length) {
      detailRelated.innerHTML = '<li>No related documents listed yet.</li>';
    } else {
      project.spotlight.forEach((item) => {
        const entry = document.createElement('li');
        entry.innerHTML = `<a href="${item.url}">${item.title}<span>${item.label}</span></a>`;
        detailRelated.appendChild(entry);
      });
    }
  }

  if (detailSequence) {
    detailSequence.innerHTML = '';
    const siblings = projects.filter((item) => item.domain === project.domain);
    siblings
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0) || a.title.localeCompare(b.title))
      .forEach((item) => {
        const entry = document.createElement('li');
        if (item.slug === project.slug) {
          entry.textContent = `${item.sequence ?? '—'} · ${item.title}`;
        } else {
          entry.innerHTML = `<a href="project.html?slug=${item.slug}">${item.sequence ?? '—'} · ${item.title}</a>`;
        }
        detailSequence.appendChild(entry);
      });
  }

  if (domainLinks) {
    domainLinks.innerHTML = '';
    const domainEntries = Object.keys(domains)
      .sort((a, b) => {
        const orderA = domains[a]?.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = domains[b]?.order ?? Number.MAX_SAFE_INTEGER;
        return orderA === orderB ? a.localeCompare(b) : orderA - orderB;
      });
    domainEntries.forEach((domain) => {
      const item = document.createElement('li');
      item.innerHTML = `<a href="index.html#domain-${slugify(domain)}">${domain}</a>`;
      domainLinks.appendChild(item);
    });
  }

  loadProjectBody(project.contentPath);
}

async function loadProjectBody(path) {
  if (!detailBody) return;
  try {
    const response = await fetch(window.resolveAssetPath(path));
    if (!response.ok) throw new Error('Failed to load project content');
    const html = await response.text();
    detailBody.innerHTML = html;
  } catch (error) {
    console.error(error);
    detailBody.innerHTML = '<p>Unable to load project content.</p>';
  }
}

function renderSpotlight(items = []) {
  if (!items.length) {
    return '';
  }
  const links = items
    .map((item) => `<li><span>${item.label}</span><a href="${item.url}">${item.title}</a></li>`)
    .join('');
  return `<div class="project-card__spotlight"><p>Foregrounds</p><ul>${links}</ul></div>`;
}

function updateMeta(projects, domains) {
  if (projectsCount) {
    const domainCount = new Set(projects.map((project) => project.domain)).size;
    projectsCount.textContent = `${projects.length} projects across ${domainCount} domains`;
  }

  if (projectsUpdated.length) {
    const newest = projects.reduce((latest, project) => {
      if (!latest) return project;
      if (!project.updatedDate) return latest;
      if (!latest.updatedDate || project.updatedDate > latest.updatedDate) return project;
      return latest;
    }, null);
    const value = newest?.updated ? formatDate(newest.updated) : '—';
    projectsUpdated.forEach((node) => {
      node.textContent = value;
    });
  }

  if (domainsList) {
    // ensure domain list populated even if no projects
    if (!domainsList.children.length) {
      Object.keys(domains).forEach((domain) => {
        const item = document.createElement('li');
        item.textContent = domain;
        domainsList.appendChild(item);
      });
    }
  }
}

function formatDate(input) {
  if (!input) return '—';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function slugify(value = '') {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
