(function () {
  const CATEGORIES = ['平台简介', '商家案例', '热点同款'];

  const CATEGORY_IMAGES = {
    '平台简介': 'images/平台简介.jpg',
    '商家案例': 'images/商家案例.jpg',
    '热点同款': 'images/热点同款.jpg'
  };

  let articles = [];
  let currentView = 'home';
  let currentCategory = null;
  let currentSubcategory = null;
  let currentSubSubcategory = null;
  let currentSearch = '';
  let searchTimer = null;

  /* ---- Helper: normalize subcategory to array ---- */
  function getSubcategories(article) {
    if (!article.subcategory) return [];
    if (Array.isArray(article.subcategory)) return article.subcategory;
    return [article.subcategory];
  }

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
  function renderCategory(cat, subcat, subSubcat) {
    currentView = 'category';
    currentCategory = cat;
    currentSubcategory = subcat || null;
    currentSubSubcategory = subSubcat || null;
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
      var subs = getSubcategories(a);
      subs.forEach(function (s) {
        if (subcats.indexOf(s) === -1) subcats.push(s);
      });
    });

    // Filter by subcategory if specified
    if (subcat) {
      catArticles = catArticles.filter(function (a) { return getSubcategories(a).indexOf(subcat) !== -1; });
    }

    // Extract unique sub-subcategories (only when a subcat is active)
    var subSubcats = [];
    if (subcat) {
      catArticles.forEach(function (a) {
        if (a.subSubcategory && subSubcats.indexOf(a.subSubcategory) === -1) {
          subSubcats.push(a.subSubcategory);
        }
      });
    }

    // Filter by sub-subcategory if specified
    if (subSubcat) {
      catArticles = catArticles.filter(function (a) { return a.subSubcategory === subSubcat; });
    }

    if (catArticles.length === 0) {
      contentArea.innerHTML = '';
      if (noResults) noResults.classList.add('visible');
      return;
    }

    var hasSubcats = subcats.length > 0;

    var subPillsHTML = hasSubcats ? `
      <div class="sub-pills">
        <button class="sub-pill${!subcat ? ' active' : ''}" data-subcat="">全部</button>
        ${subcats.map(function (s) {
          return '<button class="sub-pill' + (subcat === s ? ' active' : '') + '" data-subcat="' + escapeHTML(s) + '">' + escapeHTML(s) + '</button>';
        }).join('')}
      </div>` : '';

    var subSubPillsHTML = subSubcats.length > 0 ? `
      <div class="sub-sub-pills">
        <button class="sub-sub-pill${!subSubcat ? ' active' : ''}" data-subsubcat="">全部</button>
        ${subSubcats.map(function (s) {
          return '<button class="sub-sub-pill' + (subSubcat === s ? ' active' : '') + '" data-subsubcat="' + escapeHTML(s) + '">' + escapeHTML(s) + '</button>';
        }).join('')}
      </div>` : '';

    var bodyHTML;
    if (!hasSubcats) {
      bodyHTML = '<div class="grid">' + renderArticleCards(catArticles) + '</div>';
    } else if (subcat) {
      // Filtered by one subcategory → check for special module
      var modArticles = catArticles.filter(function (a) { return a.module === '红人之夜'; });
      var regArticles = catArticles.filter(function (a) { return a.module !== '红人之夜'; });

      if (subcat === '红人商家' && modArticles.length > 0) {
        // Split layout: left grid + right sidebar
        bodyHTML = '<div class="detail-layout">'
          + '<div class="detail-main">' + renderArticleCards(regArticles) + '</div>'
          + createSidebarModule(modArticles)
          + '</div>';
      } else {
        bodyHTML = '<div class="grid">' + renderArticleCards(catArticles) + '</div>';
      }
    } else {
      // Default: show each sub-category as a lightweight section
      bodyHTML = subcats.map(function (s) {
        var subArticles = catArticles.filter(function (a) { return getSubcategories(a).indexOf(s) !== -1; });
        if (subArticles.length === 0) return '';

        if (s === '红人商家') {
          var sMod = subArticles.filter(function (a) { return a.module === '红人之夜'; });
          var sReg = subArticles.filter(function (a) { return a.module !== '红人之夜'; });
          // 1 regular card + 1 module card
          var gridHTML = '';
          if (sReg.length > 0) {
            gridHTML += createCard(sReg[0]);
          }
          if (sMod.length > 0) {
            gridHTML += createModuleCard(sMod);
          }
          return '<div class="sub-section">'
            + '<div class="sub-section__heading">' + escapeHTML(s) + '<span>' + subArticles.length + ' 篇</span></div>'
            + '<div class="sub-section__grid">' + gridHTML + '</div>'
            + '</div>';
        }

        var top2 = subArticles.slice(0, 2);
        return '<div class="sub-section">'
          + '<div class="sub-section__heading">' + escapeHTML(s) + '<span>' + subArticles.length + ' 篇</span></div>'
          + '<div class="sub-section__grid">' + renderArticleCards(top2) + '</div>'
          + '</div>';
      }).join('');
    }

    contentArea.innerHTML = `
      <section class="section">
        <div class="section__header">
          <h2 class="section__title">${escapeHTML(cat)}</h2>
          <span class="section__more" style="color:var(--color-muted);cursor:default;">共 ${catArticles.length} 篇</span>
        </div>
        ${cat === '平台简介' ? '<p class="category-intro">淘宝一直是中国最大的线上服饰消费阵地。但是，淘宝已不仅是单纯的"线上服饰购入平台"，而是进化为引领潮流风向、孵化原创品牌、重塑审美体验的"潮流风向标"。<br>当前，中国服饰电商正经历从"流量驱动"向"设计驱动"转型的关键阶段。面对这一现状，淘宝服饰致力于让用心经营的商家既能"卖货赚钱"，又能"保持调性"。<br>为此，淘宝打造了「超级时装发布」IP，打破传统叫卖式直播局限，助力商家完成从"卖货"到"品牌叙事"的跃迁；同时，淘宝的趋势团队提前捕捉潮流趋势，在穿搭频道的「潮流热单」让消费者第一时间触达前沿时尚；此外，在政策护航方面，淘宝投入千亿资源保护原创，率先实现跨平台打击抄款、严格治理劣质AI假图，为原创设计营造纯净的经营土壤。<br>对于消费者来说，淘宝上不仅有高性价比的基础款服饰，更有快流行一步的趋势单品和原创潮牌；<br>而对于服饰商家来说，淘宝不仅仅是一个"出货渠道"，更是适合打造品牌、值得深耕的主阵地。</p>' : ''}
        ${subPillsHTML}
        ${subSubPillsHTML}
      </section>
      ${bodyHTML}`;
  }

  /* ---- Module Card (for transition page sub-section) ---- */
  function createModuleCard(modArticles) {
    return '<a href="#" class="module-card" data-subcat="红人商家">'
      + '<div class="module-card__title">✦ 红人之夜</div>'
      + '<div class="module-card__intro">平台年度盛事，汇聚头部红人与品牌，共话内容电商新趋势。</div>'
      + '<div class="module-card__links">'
      + modArticles.slice(0, 3).map(function (a) {
          return '<span class="module-card__link">' + escapeHTML(a.title) + '</span>';
        }).join('')
      + '</div>'
      + '</a>';
  }

  /* ---- Sidebar Module (for 红人商家 full page) ---- */
  function createSidebarModule(modArticles) {
    return '<aside class="sidebar-module">'
      + '<div class="sidebar-module__title">✦ 红人之夜</div>'
      + '<p class="sidebar-module__intro">平台年度盛事，汇聚头部红人与品牌，共话内容电商新趋势。本期呈现活动精彩回顾与深度专访。</p>'
      + '<div class="sidebar-module__links">'
      + modArticles.map(function (a) {
          return '<a href="' + escapeHTML(a.url) + '" target="_blank" rel="noopener" class="sidebar-link">'
            + '<span class="sidebar-link__title">' + escapeHTML(a.title) + '</span>'
            + '<time class="sidebar-link__date">' + formatDate(a.date) + '</time>'
            + '</a>';
        }).join('')
      + '</div>'
      + '</aside>';
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
        ${renderArticleCards(filtered)}
      </div>`;
  }

  /* ---- Card ---- */
  function createCard(article) {
    var hasImage = article.image && article.image.trim() !== '';

    if (!hasImage) {
      return '<a href="' + escapeHTML(article.url) + '" target="_blank" rel="noopener" class="card card--text-only">'
        + '<div class="card__body">'
        + '<span class="card__tag--inline">' + escapeHTML(article.category) + '</span>'
        + '<h2 class="card__title">' + escapeHTML(article.title) + '</h2>'
        + (article.originalTitle ? '<p class="card__original-title">' + escapeHTML(article.originalTitle) + '</p>' : '')
        + (article.summary ? '<p class="card__summary">' + escapeHTML(article.summary) + '</p>' : '')
        + renderCapsules(article)
        + '<time class="card__date" datetime="' + article.date + '">' + formatDate(article.date) + '</time>'
        + '</div>'
        + '</a>';
    }

    return `
      <a href="${escapeHTML(article.url)}" target="_blank" rel="noopener" class="card">
        <div class="card__image-wrap">
          <img class="card__image" src="${escapeHTML(article.image)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">
          <div class="card__image--placeholder" style="display:none;"></div>
          <span class="card__tag">${escapeHTML(article.category)}</span>
        </div>
        <div class="card__body">
          <h2 class="card__title">${escapeHTML(article.title)}</h2>
          ${article.originalTitle ? '<p class="card__original-title">' + escapeHTML(article.originalTitle) + '</p>' : ''}
          ${article.summary ? '<p class="card__summary">' + escapeHTML(article.summary) + '</p>' : ''}
          ${renderCapsules(article)}
          <time class="card__date" datetime="${article.date}">${formatDate(article.date)}</time>
        </div>
      </a>`;
  }

  /* ---- Render cards with series grouping ---- */
  function renderArticleCards(artList) {
    var grouped = {};
    var seriesOrder = [];
    artList.forEach(function(a) {
      if (a.series) {
        if (!grouped[a.series]) { grouped[a.series] = []; seriesOrder.push(a.series); }
        grouped[a.series].push(a);
      }
    });
    var renderedIds = {};
    seriesOrder.forEach(function(s) {
      grouped[s].forEach(function(a) { renderedIds[a.id] = s; });
    });

    var html = '';
    artList.forEach(function(a) {
      if (a.series && renderedIds[a.id]) {
        if (grouped[a.series] && grouped[a.series].length > 0) {
          html += createSeriesCard(a.series, grouped[a.series]);
          delete grouped[a.series];
        }
        return;
      }
      if (!a.series) {
        html += createCard(a);
      }
    });
    return html;
  }

  function createSeriesCard(seriesName, seriesArticles) {
    return '<div class="card card--series">'
      + '<div class="card__body">'
      + '<span class="card__series-label">系列</span>'
      + '<h2 class="card__title">' + escapeHTML(seriesName) + '</h2>'
      + '<div class="card__series-links">'
      + seriesArticles.map(function(a) {
          return '<a href="' + escapeHTML(a.url) + '" target="_blank" rel="noopener" class="card__series-link">' + escapeHTML(a.title) + '</a>';
        }).join('')
      + '</div>'
      + '<span class="card__series-count">' + seriesArticles.length + ' 篇文章</span>'
      + '</div>'
      + '</div>';
  }

  /* ---- Article Link (compact, for home sections) ---- */
  function createArticleLink(article) {
    return `
      <a href="${escapeHTML(article.url)}" target="_blank" rel="noopener" class="article-link">
        <span class="article-link__title">${escapeHTML(article.title)}</span>
        ${article.originalTitle ? '<span class="card__original-title">' + escapeHTML(article.originalTitle) + '</span>' : ''}
        ${article.summary ? '<span class="article-link__summary">' + escapeHTML(article.summary) + '</span>' : ''}
        ${renderCapsules(article)}
        <time class="article-link__date">${formatDate(article.date)}</time>
      </a>`;
  }

  /* ---- Capsules (subcategory tags) ---- */
  function renderCapsules(article) {
    var subs = getSubcategories(article);
    if (subs.length === 0) return '';
    return '<div class="card__capsules">'
      + subs.map(function (s) {
          return '<span class="card__capsule" data-subcat="' + escapeHTML(s) + '" data-cat="' + escapeHTML(article.category) + '">' + escapeHTML(s) + '</span>';
        }).join('')
      + '</div>';
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
      if (e.target.classList.contains('sub-sub-pill')) {
        var subsubcat = e.target.dataset.subsubcat;
        renderCategory(currentCategory, currentSubcategory, subsubcat || null);
        return;
      }
      if (e.target.classList.contains('sub-pill')) {
        var subcat = e.target.dataset.subcat;
        renderCategory(currentCategory, subcat || null);
        return;
      }
      // Module card click → navigate to 红人商家 detail
      var card = e.target.closest('.module-card');
      if (card) {
        e.preventDefault();
        renderCategory(currentCategory, '红人商家');
      }
      // Capsule click → navigate to subcategory
      if (e.target.classList.contains('card__capsule')) {
        e.preventDefault();
        e.stopPropagation();
        var subcat = e.target.dataset.subcat;
        var cat = e.target.dataset.cat;
        renderCategory(cat, subcat);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
