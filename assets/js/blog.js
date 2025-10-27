const postList = document.querySelector('#blog-post-list');
const archivesList = document.querySelector('#blog-archives');
const postContainer = document.querySelector('#blog-post');
const relatedPosts = document.querySelector('#blog-related');

if (postList || postContainer) {
  initBlog();
}

async function initBlog() {
  try {
    const response = await fetch(window.resolveAssetPath('data/blog/posts.json'));
    if (!response.ok) throw new Error('Failed to load blog index');
    const data = await response.json();
    const posts = (data.posts || []).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (postList) {
      renderPostList(posts);
    }

    if (archivesList) {
      renderArchives(posts);
    }

    if (postContainer) {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('slug') || posts[0]?.slug;
      renderPost(slug, posts);
    }
  } catch (error) {
    console.error(error);
    if (postList) {
      postList.innerHTML = '<li>Unable to load posts.</li>';
    }
    if (postContainer) {
      postContainer.innerHTML = '<p>Unable to load the blog post.</p>';
    }
  }
}

function renderPostList(posts) {
  if (!posts.length) {
    postList.innerHTML = '<li>No posts yet.</li>';
    return;
  }

  const seenMonths = new Set();

  posts.forEach((post) => {
    const item = document.createElement('li');
    item.className = 'blog-card';
    const monthKey = post.date ? post.date.slice(0, 7) : null;
    if (monthKey && !seenMonths.has(monthKey)) {
      item.id = monthKey;
      seenMonths.add(monthKey);
    }
    item.innerHTML = `
      <article>
        <p class="blog-card__meta">${formatDate(post.date)} · ${post.type}</p>
        <h2><a href="post.html?slug=${post.slug}">${post.title}</a></h2>
        <p>${post.summary}</p>
        <p class="blog-card__tags">${post.tags.map((tag) => `#${tag}`).join(' ')}</p>
      </article>
    `;
    postList.appendChild(item);
  });
}

function renderArchives(posts) {
  const grouped = posts.reduce((acc, post) => {
    const date = new Date(post.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {});

  const entries = Object.keys(grouped)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((key) => {
      const [year, month] = key.split('-');
      const label = `${monthName(Number(month))} ${year}`;
      return { key, label };
    });

  if (!entries.length) {
    archivesList.innerHTML = '<li>No archives yet.</li>';
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="index.html#${entry.key}">${entry.label}</a>`;
    archivesList.appendChild(item);
  });
}

async function renderPost(slug, posts) {
  const post = posts.find((item) => item.slug === slug);
  if (!post) {
    postContainer.innerHTML = '<p>Post not found.</p>';
    return;
  }

  try {
    const response = await fetch(window.resolveAssetPath(post.contentPath));
    if (!response.ok) throw new Error('Failed to load post content');
    const html = await response.text();
    postContainer.innerHTML = html;
  } catch (error) {
    console.error(error);
    postContainer.innerHTML = '<p>Unable to load the blog post.</p>';
    return;
  }

  document.title = `${post.title} · Normal Rooms Blog`;

  if (relatedPosts) {
    renderRelatedPosts(post.slug, posts);
  }
}

function renderRelatedPosts(currentSlug, posts) {
  const others = posts.filter((item) => item.slug !== currentSlug);
  if (!others.length) {
    relatedPosts.innerHTML = '<li>No other posts yet.</li>';
    return;
  }

  relatedPosts.innerHTML = '';
  others.slice(0, 5).forEach((post) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="post.html?slug=${post.slug}">${post.title}</a>`;
    relatedPosts.appendChild(item);
  });
}

function formatDate(input) {
  const date = new Date(input);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function monthName(month) {
  return new Date(2000, month - 1, 1).toLocaleDateString(undefined, { month: 'long' });
}
