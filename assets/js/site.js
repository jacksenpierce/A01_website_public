const navToggle = document.querySelector('.nav-toggle');
const navigation = document.querySelector('#primary-navigation');
const yearSpan = document.querySelector('#year');

if (navToggle && navigation) {
  navToggle.addEventListener('click', () => {
    const isOpen = navigation.getAttribute('data-open') === 'true';
    navigation.setAttribute('data-open', String(!isOpen));
    navToggle.setAttribute('aria-expanded', String(!isOpen));
  });
}

if (yearSpan) {
  yearSpan.textContent = new Date().getFullYear();
}

document.addEventListener('click', (event) => {
  const anchor = event.target.closest('a[href^="#"]');
  if (!anchor) {
    return;
  }

  const href = anchor.getAttribute('href');
  if (!href || href === '#') {
    return;
  }

  const targetId = href.slice(1);
  const target = document.getElementById(targetId);

  if (target) {
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    if (navigation) {
      navigation.setAttribute('data-open', 'false');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  }
});

function resolveAssetPath(asset) {
  const script = document.currentScript || document.querySelector('script[src*="site.js"]');
  if (!script) return asset;
  const src = script.getAttribute('src');
  if (!src) return asset;
  const scriptUrl = new URL(src, window.location.href);
  const rootPath = scriptUrl.pathname.replace(/assets\/js\/site\.js.*$/, '');
  const origin = scriptUrl.origin;
  const normalizedAsset = asset.startsWith('/') ? asset.slice(1) : asset;
  return `${origin}${rootPath}${normalizedAsset}`;
}

window.resolveAssetPath = resolveAssetPath;

async function setupSearch() {
  const searchInput = document.querySelector('#search-query');
  const resultsContainer = document.querySelector('#search-results');

  if (!searchInput || !resultsContainer) {
    return;
  }

  let index = [];
  try {
    const response = await fetch(resolveAssetPath('data/search/index.json'));
    if (!response.ok) throw new Error('Failed to load search index');
    index = await response.json();
  } catch (error) {
    resultsContainer.innerHTML = '<p class="search__error">Unable to load the search index.</p>';
    console.error(error);
    return;
  }

  const renderResults = (query) => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      resultsContainer.innerHTML = '<p class="search__empty">Start typing to see matching pages.</p>';
      return;
    }

    const matches = index.filter((item) => {
      const haystack = `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase();
      return haystack.includes(normalized);
    });

    if (!matches.length) {
      resultsContainer.innerHTML = `<p class="search__empty">No results for "${query}".</p>`;
      return;
    }

    const list = document.createElement('ul');
    list.className = 'search__list';

    matches.forEach((item) => {
      const entry = document.createElement('li');
      entry.className = 'search__item';
      entry.innerHTML = `
        <a href="${item.url}">
          <span class="search__item-title">${item.title}</span>
          <span class="search__item-desc">${item.description}</span>
          <span class="search__item-tags">${item.tags.map((tag) => `#${tag}`).join(' ')}</span>
        </a>
      `;
      list.appendChild(entry);
    });

    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(list);
  };

  searchInput.addEventListener('input', (event) => {
    renderResults(event.target.value);
  });
}

setupSearch();
