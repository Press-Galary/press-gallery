(function () {
  const CATEGORIES = ['平台简介', '商家案例', '热点同款'];

  const CATEGORY_IMAGES = {
    '平台简介': 'https://picsum.photos/seed/platform-cat/800/1066',
    '商家案例': 'https://picsum.photos/seed/merchant-cat/800/1066',
    '热点同款': 'https://picsum.photos/seed/trending-cat/800/1066'
  };

  let articles = [];
  let currentView = 'home';
  let currentCategory = null;
  let currentSubcategory = null;
  let currentSearch = '';
  let searchTimer = null;

  /* ---- DOM refs ---- */
  const categoryPills = document.getElementById('categoryPills');
  const searchInput = document.getElementById('searchInput');
  const contentArea = document.getElementById('contentArea');
  const noResults = document.getElementById('noResults');

  /* ---- Guard: ensure all DOM elements exist ---- */
  if (!contentArea) return;

  /* ---- Fetch ---- */
  async function fetchArticles() {
    try {
      const res = await fetch('data/articles.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      articles = await res.json();
      init();
    } catch (err) {
      contentArea.innerHTML =
        '<p style="text-align:center;padding:4rem;color:var(--color-muted);">文章加载失败，请刷新页面重试。</p>';
    }
  }

  /* ---- Init ---- */
  function init() {
    renderPills();
    renderHome();
    bindEvents();
  }

  /* ---- Pills ---- */
  function renderPills() {
    if (!categoryPills) return;
    const pills = ['all', ...CATEGORIES];
    categoryPills.innerHTML = pills
      .map(c =>
        `<button class="pill${c === 'all' ? ' active' : ''}" data-category="${c}">
          ${c === 'all' ? '全部' : c}
        </button>`
      )
      .join('');
  }

  /* ---- Home View ---- */
  function renderHome() {
    currentView = 'home';
    currentCategory = null;
    if (searchInput) searchInput.value = '';
    currentSearch = '';
    if (noResults) noResults.classList.remove('visible');

    const sectionsHTML = CATEGORIES.map((cat, idx) => {
      const catArticles = articles
        .filter(a => a.category === cat)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 4);

      if (catArticles.length === 0) return '';

      const reverse = idx % 2 === 1;

      return `
        <section class="section">
          <div class="section__header">
            <h2 class="section__title">${escapeHTML(cat)}</h2>
            <button class="section__more" data-goto="${escapeHTML(cat)}">查看全部 &rarr;</button>
          </div>
          <div class="section__row${reverse ? ' section__row--reverse' : ''}">
            <div class="section__image-wrap">
              <img class="section__image" src="${CATEGORY_IMAGES[cat]}" alt="${escapeHTML(cat)}" loading="lazy">
            </div>
            <div class="section__articles">
              ${catArticles.map(a => createArticleLink(a)).join('')}
            </div>
          </div>
        </section>`;
    }).join('');

    contentArea.innerHTML = sectionsHTML || '<p style="text-align:center;padding:4rem;color:var(--color-muted);">暂无文章。</p>';

    document.querySelectorAll('.section__more').forEach(btn => {
      btn.addEventListener('click', () => renderCategory(btn.dataset.goto));
    });
  }

  /* ---- Category Detail View ---- */
  function renderCategory(cat, subcat) {
    currentView = 'category';
    currentCategory = cat;
    currentSubcategory = subcat || null;
    if (searchInput) searchInput.value = '';
    currentSearch = '';
    if (noResults) noResults.classList.remove('visible');

    updatePillActive(cat);

    var catArticles = articles
      .filter(function (a) { return a.category === cat; })
      .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    // Extract unique subcategories
    var subcats = [];
    catArticles.forEach(function (a) {
      if (a.subcategory && subcats.indexOf(a.subcategory) === -1) {
        subcats.push(a.subcategory);
      }
    });

    // Filter by subcategory if specified
    if (subcat) {
      catArticles = catArticles.filter(function (a) { return a.subcategory === subcat; });
    }

    if (catArticles.length === 0) {
      contentArea.innerHTML = '';
      if (noResults) noResults.classList.add('visible');
      return;
    }

    var subPillsHTML = subcats.length > 0 ? `
      <div class="sub-pills">
        <button class="sub-pill${!subcat ? ' active' : ''}" data-subcat="">全部</button>
        ${subcats.map(function (s) {
          return '<button class="sub-pill' + (subcat === s ? ' active' : '') + '" data-subcat="' + escapeHTML(s) + '">' + escapeHTML(s) + '</button>';
        }).join('')}
      </div>` : '';

    contentArea.innerHTML = `
      <section class="section">
        <div class="section__header">
          <h2 class="section__title">${escapeHTML(cat)}</h2>
          <span style="font-family:var(--font-sans);font-size:0.8rem;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-muted);">共 ${catArticles.length} 篇</span>
        </div>
        ${subPillsHTML}
      </section>
      <div class="grid">
        ${catArticles.map(function (a) { return createCard(a); }).join('')}
      </div>`;
  }

  /* ---- Search (grid view) ---- */
  function renderSearch(term) {
    currentView = 'category';
    currentCategory = null;
    currentSearch = term;
    if (noResults) noResults.classList.remove('visible');

    updatePillActive('all');

    const filtered = articles
      .filter(a => a.title.toLowerCase().includes(term.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (filtered.length === 0) {
      contentArea.innerHTML = '';
      if (noResults) noResults.classList.add('visible');
      return;
    }

    contentArea.innerHTML = `
      <section class="section">
        <div class="section__header">
          <h2 class="section__title">搜索："${escapeHTML(term)}"</h2>
          <span style="font-family:var(--font-sans);font-size:0.8rem;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-muted);">共 ${filtered.length} 篇</span>
        </div>
      </section>
      <div class="grid">
        ${filtered.map(a => createCard(a)).join('')}
      </div>`;
  }

  /* ---- Card ---- */
  function createCard(article) {
    const hasImage = article.image && article.image.trim() !== '';

    const imageHTML = hasImage
      ? `<img class="card__image" src="${escapeHTML(article.image)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">`
      : '';

    const placeholderHTML = hasImage
      ? `<div class="card__image--placeholder" style="display:none;"></div>`
      : `<div class="card__image--placeholder"></div>`;

    return `
      <a href="${escapeHTML(article.url)}" target="_blank" rel="noopener" class="card">
        <div class="card__image-wrap">
          ${imageHTML}
          ${placeholderHTML}
          <span class="card__tag">${escapeHTML(article.category)}</span>
        </div>
        <div class="card__body">
          ${article.subcategory ? '<span class="card__subtag">' + escapeHTML(article.subcategory) + '</span>' : ''}
          <h2 class="card__title">${escapeHTML(article.title)}</h2>
          <p class="card__summary">${escapeHTML(article.summary)}</p>
          <time class="card__date" datetime="${article.date}">${formatDate(article.date)}</time>
        </div>
      </a>`;
  }

  /* ---- Article Link (compact, for home sections) ---- */
  function createArticleLink(article) {
    return `
      <a href="${escapeHTML(article.url)}" target="_blank" rel="noopener" class="article-link">
        <span class="article-link__title">${escapeHTML(article.title)}</span>
        <span class="article-link__summary">${escapeHTML(article.summary)}</span>
        <time class="article-link__date">${formatDate(article.date)}</time>
      </a>`;
  }

  /* ---- Helpers ---- */
  function updatePillActive(cat) {
    document.querySelectorAll('.pill').forEach(p => {
      p.classList.toggle('active', p.dataset.category === cat);
    });
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const entityMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => entityMap[c]);
  }

  /* ---- Events ---- */
  function bindEvents() {
    if (categoryPills) {
      categoryPills.addEventListener('click', e => {
        if (!e.target.classList.contains('pill')) return;
        var cat = e.target.dataset.category;
        if (cat === 'all') {
          renderHome();
        } else {
          renderCategory(cat);
        }
      });
    }

    // Sub-pill clicks (event delegation on contentArea)
    contentArea.addEventListener('click', function (e) {
      if (!e.target.classList.contains('sub-pill')) return;
      var subcat = e.target.dataset.subcat;
      renderCategory(currentCategory, subcat || null);
    });

    if (searchInput) {
      searchInput.addEventListener('input', e => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          var term = e.target.value.trim();
          if (term) {
            renderSearch(term);
          } else if (currentView === 'category' && currentCategory) {
            renderCategory(currentCategory, currentSubcategory);
          } else {
            renderHome();
          }
        }, 200);
      });
    }
  }

  /* ---- Start ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchArticles);
  } else {
    fetchArticles();
  }
})();
