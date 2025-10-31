const articleContainer = document.querySelector('#wiki-article');
const tocContainer = document.querySelector('#wiki-toc');
const relatedList = document.querySelector('#wiki-related-list');
const updatedSpan = document.querySelector('#wiki-updated');

if (articleContainer) {
  const params = new URLSearchParams(window.location.search);
  const defaultArticle = document.body.dataset.wikiArticle;
  const requestedArticle = params.get('doc') || defaultArticle;

  initWiki(requestedArticle);
}

async function initWiki(articleId) {
  try {
    const response = await fetch(window.resolveAssetPath('data/wiki/articles.json'));
    if (!response.ok) throw new Error('Failed to load wiki index');
    const data = await response.json();
    const articles = data.articles || [];

    if (!articles.length) {
      articleContainer.innerHTML = '<p>Wiki index is empty.</p>';
      return;
    }

    const article = articles.find((item) => item.id === articleId) || articles[0];
    renderArticle(article, articles);
  } catch (error) {
    console.error(error);
    articleContainer.innerHTML = '<p>Unable to load the wiki article.</p>';
  }
}

async function renderArticle(article, articles) {
  try {
    const response = await fetch(window.resolveAssetPath(article.contentPath));
    if (!response.ok) throw new Error('Failed to load article content');
    const html = await response.text();
    articleContainer.innerHTML = html;
  } catch (error) {
    console.error(error);
    articleContainer.innerHTML = '<p>Unable to load the wiki article content.</p>';
    return;
  }

  document.title = `${article.title} · Normal Rooms Wiki`;
  if (updatedSpan) {
    updatedSpan.textContent = article.updated || 'unknown';
  }

  buildTableOfContents();
  renderRelatedArticles(article, articles);
}

function buildTableOfContents() {
  if (!tocContainer) return;
  tocContainer.innerHTML = '';

  const sections = Array.from(articleContainer.querySelectorAll('section[id]'));
  if (!sections.length) {
    tocContainer.innerHTML = '<p>No sections available.</p>';
    return;
  }

  const list = document.createElement('ol');
  sections.forEach((section) => {
    const heading = section.querySelector('h2, h3');
    const title = heading ? heading.textContent : section.id.replace(/-/g, ' ');
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${section.id}`;
    link.textContent = title;
    item.appendChild(link);
    list.appendChild(item);
  });

  tocContainer.appendChild(list);
}

function renderRelatedArticles(currentArticle, articles) {
  if (!relatedList) return;
  relatedList.innerHTML = '';

  const others = articles.filter((item) => item.id !== currentArticle.id);
  if (!others.length) {
    relatedList.innerHTML = '<li>No related articles yet.</li>';
    return;
  }

  others.forEach((item) => {
    const entry = document.createElement('li');
    const link = document.createElement('a');
    link.href = `article.html?doc=${item.id}`;
    link.textContent = item.title;
    entry.appendChild(link);

    const summary = document.createElement('p');
    summary.className = 'wiki-related__summary';
    summary.textContent = item.summary;
    entry.appendChild(summary);

    relatedList.appendChild(entry);
  });
}
