#!/usr/bin/env node
/**
 * Build Articles — converts Markdown files to HTML pages
 *
 * Reads:   content/{zh,en}/articles/*.md
 * Outputs: articles/{slug}/index.html
 *          en/articles/{slug}/index.html
 *          .temp_build/public/{search-index,sitemap,feed,og/...}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import matter from 'gray-matter';
import markedKatex from 'marked-katex-extension';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BUILD_OUT_DIR = path.join(ROOT, '.temp_build');
const SITE_URL = 'https://ifnodoraemon.github.io';
const REQUIRED_FRONTMATTER = ['title', 'slug', 'date', 'tag', 'description'];
const STATIC_ROUTES = new Set([
  '/',
  '/about/',
  '/models/',
  '/projects/',
  '/articles/',
  '/en/',
  '/en/about/',
  '/en/models/',
  '/en/projects/',
  '/en/articles/',
]);

const zhLocales = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', 'zh.json'), 'utf-8'));
const enLocales = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'locales', 'en.json'), 'utf-8'));

marked.setOptions({
  gfm: true,
  breaks: false,
});

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  if (lang === 'mermaid') {
    return `<pre class="mermaid">\n${text}\n</pre>\n`;
  }

  const langClass = lang ? ` class="language-${lang}"` : '';
  const escapedText = escapeHtml(text);

  return `<div class="code-block-wrapper">
  <button class="copy-code-btn" aria-label="Copy code" title="Copy code">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
  </button>
  <pre><code${langClass}>${escapedText}</code></pre>
</div>\n`;
};

renderer.image = function ({ href, title, text }) {
  let out = `<img src="${href}" alt="${escapeHtml(text || '')}" loading="lazy"`;
  if (title) {
    out += ` title="${escapeHtml(title)}"`;
  }
  out += '>';
  return out;
};

let currentToc = [];
renderer.heading = function ({ text, depth }) {
  const id = text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-')
    .replace(/(^-|-$)/g, '');

  if (depth === 2 || depth === 3) {
    currentToc.push({ text, depth, id });
  }

  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

marked.use({ renderer });
marked.use(markedKatex({ throwOnError: false }));

const templatePath = path.join(ROOT, 'src', 'templates', 'article.html');
const template = fs.readFileSync(templatePath, 'utf-8');

const contentDirZh = path.join(ROOT, 'content', 'zh', 'articles');
const contentDirEn = path.join(ROOT, 'content', 'en', 'articles');

const rawArticles = loadRawArticles();
console.log(`📝 Found ${rawArticles.length} articles\n`);

validateArticlesOrExit(rawArticles);

const zhRawArticles = rawArticles
  .filter(article => !article.isEn)
  .sort((a, b) => new Date(b.fm.date) - new Date(a.fm.date));
const enRawArticles = rawArticles
  .filter(article => article.isEn)
  .sort((a, b) => new Date(b.fm.date) - new Date(a.fm.date));

const articles = prepareArticles(zhRawArticles, false);
const articlesEn = prepareArticles(enRawArticles, true);

writeArticles(articles, false);
writeArticles(articlesEn, true);

generateListingPage(articles, false);
generateListingPage(articlesEn, true);
generateSitemap([...articles, ...articlesEn]);
generateRssFeed(articles, false);
generateRssFeed(articlesEn, true);
generateSearchIndex(articles, articlesEn);

console.log(`\n✅ Done! Generated ${articles.length} zh articles, ${articlesEn.length} en articles`);

function loadRawArticles() {
  const filesZh = fs.existsSync(contentDirZh)
    ? fs.readdirSync(contentDirZh).filter(file => file.endsWith('.md'))
    : [];
  const filesEn = fs.existsSync(contentDirEn)
    ? fs.readdirSync(contentDirEn).filter(file => file.endsWith('.md'))
    : [];

  const fileEntries = [
    ...filesZh.map(file => ({ file, isEn: false, dir: contentDirZh })),
    ...filesEn.map(file => ({ file, isEn: true, dir: contentDirEn })),
  ];

  return fileEntries.map(({ file, isEn, dir }) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
    const { data: fm, content: mdContent } = matter(raw);

    return {
      file,
      dir,
      isEn,
      langKey: isEn ? 'en' : 'zh',
      fm,
      mdContent,
    };
  });
}

function validateArticlesOrExit(articleEntries) {
  const errors = [];
  const slugsByLang = {
    zh: new Map(),
    en: new Map(),
  };
  const knownRoutes = buildKnownRoutes(articleEntries);

  articleEntries.forEach(entry => {
    validateFrontmatter(entry, errors);

    const slugMap = slugsByLang[entry.langKey];
    if (entry.fm.slug) {
      if (slugMap.has(entry.fm.slug)) {
        errors.push(`[${entry.langKey}] duplicate slug "${entry.fm.slug}" in ${entry.file} and ${slugMap.get(entry.fm.slug)}`);
      } else {
        slugMap.set(entry.fm.slug, entry.file);
      }
    }

    validateMarkdownTargets(entry, knownRoutes, errors);
  });

  validateBilingualConsistency(articleEntries, errors);

  if (errors.length > 0) {
    console.error('❌ Article validation failed:\n');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
}

function validateFrontmatter(entry, errors) {
  const { file, fm, langKey } = entry;

  REQUIRED_FRONTMATTER.forEach(field => {
    if (!fm[field]) {
      errors.push(`[${langKey}] ${file}: missing required frontmatter "${field}"`);
    }
  });

  const dateValue = new Date(fm.date);
  if (!fm.date || Number.isNaN(dateValue.valueOf())) {
    errors.push(`[${langKey}] ${file}: invalid date "${fm.date}"`);
  }

  if (fm.extraTags && (!Array.isArray(fm.extraTags) || fm.extraTags.some(tag => typeof tag !== 'string'))) {
    errors.push(`[${langKey}] ${file}: extraTags must be an array of strings`);
  }

  if (fm.featuredStats) {
    const invalidFeaturedStats = !Array.isArray(fm.featuredStats)
      || fm.featuredStats.some(item => typeof item !== 'object' || !item.label || !item.value);

    if (invalidFeaturedStats) {
      errors.push(`[${langKey}] ${file}: featuredStats must be an array of { label, value } objects`);
    }
  }

  if (fm.image) {
    if (!/^https?:\/\//.test(fm.image) && !fm.image.startsWith('/')) {
      errors.push(`[${langKey}] ${file}: image must be a site-absolute path or remote URL`);
    }

    if (fm.image.startsWith('/')) {
      const resolvedImage = resolveSiteAssetPath(fm.image);
      if (!resolvedImage) {
        errors.push(`[${langKey}] ${file}: image path not found "${fm.image}"`);
      }
    }
  }
}

function validateMarkdownTargets(entry, knownRoutes, errors) {
  const targets = extractMarkdownTargets(entry.mdContent);

  targets.forEach(target => {
    if (!target || isExternalTarget(target)) return;

    const cleanTarget = stripQueryAndHash(target);
    if (!cleanTarget) return;

    if (cleanTarget.startsWith('/')) {
      if (hasFileExtension(cleanTarget)) {
        if (!resolveSiteAssetPath(cleanTarget)) {
          errors.push(`[${entry.langKey}] ${entry.file}: missing site asset "${cleanTarget}"`);
        }
      } else if (!knownRoutes.has(normalizeRoute(cleanTarget))) {
        errors.push(`[${entry.langKey}] ${entry.file}: missing internal route "${cleanTarget}"`);
      }
      return;
    }

    if (!hasFileExtension(cleanTarget)) return;

    const resolvedRelativePath = path.resolve(entry.dir, cleanTarget);
    if (!fs.existsSync(resolvedRelativePath)) {
      errors.push(`[${entry.langKey}] ${entry.file}: missing relative asset "${cleanTarget}"`);
    }
  });
}

function validateBilingualConsistency(articleEntries, errors) {
  const zhBySlug = new Map(articleEntries.filter(entry => !entry.isEn).map(entry => [entry.fm.slug, entry]));
  const enBySlug = new Map(articleEntries.filter(entry => entry.isEn).map(entry => [entry.fm.slug, entry]));
  const allSlugs = new Set([...zhBySlug.keys(), ...enBySlug.keys()]);

  allSlugs.forEach(slug => {
    const zhArticle = zhBySlug.get(slug);
    const enArticle = enBySlug.get(slug);

    if (!zhArticle || !enArticle) {
      const missingLang = zhArticle ? 'en' : 'zh';
      errors.push(`bilingual consistency: slug "${slug}" is missing ${missingLang} article`);
      return;
    }

    const comparableFields = ['date', 'tagClass', 'image'];
    comparableFields.forEach(field => {
      const zhValue = normalizeComparableFrontmatterValue(field, zhArticle.fm[field]);
      const enValue = normalizeComparableFrontmatterValue(field, enArticle.fm[field]);
      if (zhValue !== enValue) {
        errors.push(`bilingual consistency: slug "${slug}" has mismatched "${field}" (${zhValue || 'empty'} vs ${enValue || 'empty'})`);
      }
    });

    if (Boolean(zhArticle.fm.featured) !== Boolean(enArticle.fm.featured)) {
      errors.push(`bilingual consistency: slug "${slug}" has mismatched "featured" flag`);
    }
  });
}

function buildKnownRoutes(articleEntries) {
  const knownRoutes = new Set(STATIC_ROUTES);

  articleEntries.forEach(entry => {
    const prefix = entry.isEn ? '/en/articles/' : '/articles/';
    knownRoutes.add(normalizeRoute(`${prefix}${entry.fm.slug || ''}/`));
  });

  return knownRoutes;
}

function prepareArticles(list, isEn) {
  return list.map(entry => {
    const { file, fm, mdContent } = entry;
    currentToc = [];

    const htmlContent = marked.parse(mdContent);
    const isoDate = new Date(fm.date).toISOString().split('T')[0];
    const dateFormatted = isoDate.replace(/-/g, '.');
    const imagePath = fm.image || generateOgImage({
      title: fm.title,
      description: fm.description,
      tag: fm.tag,
      dateFormatted,
      slug: fm.slug,
      isEn,
    });

    const plainText = mdContent.replace(/[#*`_\[\]()]/g, '').replace(/\n/g, ' ');
    const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length + (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const readingTime = Math.max(1, Math.ceil(wordCount / 250));

    return {
      ...fm,
      file,
      isEn,
      isoDate,
      dateFormatted,
      htmlContent,
      tocHtml: buildTocHtml(currentToc, isEn),
      imagePath,
      imageUrl: toSiteUrl(imagePath),
      keywords: [fm.tag, 'AI大模型', 'GPT-5.4', 'Claude 4.6', 'Gemini 3.1', fm.slug.replace(/-/g, ' ')].join(','),
      wordCountText: isEn ? `${wordCount} words` : `约 ${wordCount} 字`,
      readingTimeText: isEn ? `${readingTime} min read` : `预计阅读 ${readingTime} 分钟`,
      meta: isEn ? enLocales.meta : zhLocales.meta,
    };
  });
}

function writeArticles(list, isEn) {
  list.forEach((article, index) => {
    const prevNextHtml = buildPrevNextHtml(list, index, isEn);
    const relatedArticlesHtml = buildRelatedArticlesHtml(article, list, isEn);

    const html = applyTemplate(template, {
      title: article.title,
      slug: article.slug,
      description: article.description,
      date: article.isoDate,
      isoDate: article.isoDate,
      dateFormatted: article.dateFormatted,
      tag: article.tag,
      tagClass: article.tagClass || '',
      keywords: article.keywords,
      image: article.imageUrl,
      toc: article.tocHtml,
      content: article.htmlContent,
      wordCountText: article.wordCountText,
      readingTimeText: article.readingTimeText,
      prevNextHtml,
      relatedArticlesHtml,
      lang: isEn ? 'en' : 'zh-CN',
      articles_link: isEn ? '/en/articles/' : '/articles/',
      articles_prefix: isEn ? '/en' : '',
      encodedTitle: encodeURIComponent(article.title),
      encodedUrl: encodeURIComponent(`${SITE_URL}${isEn ? '/en' : ''}/articles/${article.slug}/`),
      breadcrumb_articles: isEn ? 'Articles' : '文章',
      return_text: isEn ? '← Back to Articles' : '← 返回文章列表',
      'meta.siteName': isEn ? enLocales.meta.siteName : zhLocales.meta.siteName,
    });

    const outDirBase = isEn
      ? path.join(BUILD_OUT_DIR, 'en', 'articles', article.slug)
      : path.join(BUILD_OUT_DIR, 'articles', article.slug);

    fs.mkdirSync(outDirBase, { recursive: true });
    fs.writeFileSync(path.join(outDirBase, 'index.html'), html, 'utf-8');
    console.log(`  ✓ ${article.file} → ${isEn ? 'en/' : ''}articles/${article.slug}/index.html`);
  });
}

function buildTocHtml(tocItems, isEn) {
  if (tocItems.length === 0) return '';

  const tocTitle = isEn ? 'Table of Contents' : '文章目录';
  const itemsHtml = tocItems
    .map(item => `  <li class="toc-level-${item.depth}"><a href="#${item.id}">${item.text}</a></li>`)
    .join('\n');

  return `<div class="toc-container"><h4>${tocTitle}</h4><ul class="article-toc-list">\n${itemsHtml}\n</ul></div>`;
}

function buildPrevNextHtml(list, index, isEn) {
  const nextItem = index > 0 ? list[index - 1] : null;
  const prevItem = index < list.length - 1 ? list[index + 1] : null;
  const prefix = isEn ? '/en/articles/' : '/articles/';
  const prevLabel = isEn ? 'Prev' : '上一篇';
  const nextLabel = isEn ? 'Next' : '下一篇';

  let html = '<div class="article-prev-next">';

  if (prevItem) {
    html += `
        <a href="${prefix}${prevItem.slug}/" class="prev-next-link prev-link">
          <span class="pn-label">← ${prevLabel}</span>
          <span class="pn-title">${escapeHtml(prevItem.title)}</span>
        </a>`;
  } else {
    html += '<div class="prev-next-link empty"></div>';
  }

  if (nextItem) {
    html += `
        <a href="${prefix}${nextItem.slug}/" class="prev-next-link next-link">
          <span class="pn-label">${nextLabel} →</span>
          <span class="pn-title">${escapeHtml(nextItem.title)}</span>
        </a>`;
  } else {
    html += '<div class="prev-next-link empty"></div>';
  }

  html += '</div>';
  return html;
}

function buildRelatedArticlesHtml(article, list, isEn) {
  const relatedArticles = list
    .filter(candidate => candidate.slug !== article.slug)
    .sort((a, b) => {
      const sameTagA = a.tag === article.tag ? 1 : 0;
      const sameTagB = b.tag === article.tag ? 1 : 0;
      if (sameTagA !== sameTagB) return sameTagB - sameTagA;
      return new Date(b.isoDate) - new Date(a.isoDate);
    })
    .slice(0, 3);

  if (relatedArticles.length === 0) return '';

  const sectionTag = isEn ? 'MORE TO READ' : '继续阅读';
  const sectionTitle = isEn ? 'Related Articles' : '相关文章';
  const sectionDesc = isEn
    ? `Start with the same topic, then continue with the latest deep dives.`
    : '优先推荐同标签内容，其次补充最新文章。';
  const prefix = isEn ? '/en/articles/' : '/articles/';

  const cardsHtml = relatedArticles.map(item => `
          <a href="${prefix}${item.slug}/" class="related-article-card">
            <div class="related-article-meta">
              <span class="tag ${item.tagClass || ''}">${escapeHtml(item.tag)}</span>
              <time datetime="${item.isoDate}">${item.dateFormatted}</time>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description)}</p>
          </a>`).join('\n');

  return `
        <section class="article-related fade-in">
          <div class="article-related-header">
            <div class="section-tag">${sectionTag}</div>
            <h2>${sectionTitle}</h2>
            <p>${sectionDesc}</p>
          </div>
          <div class="article-related-grid">
${cardsHtml}
          </div>
        </section>`;
}

function generateListingPage(articlesList, isEn = false) {
  if (articlesList.length === 0 && isEn) return;

  const locales = isEn ? enLocales : zhLocales;
  const articlesLinkPrefix = isEn ? '/en/articles/' : '/articles/';

  const listItems = articlesList.map((article, index) => {
    const isFeatured = index === 0;
    const pinText = isEn ? '📌 Pinned' : '📌 置顶';
    const tagsHtml = article.extraTags
      ? article.extraTags.map(tag => `<span class="mini-tag">${escapeHtml(tag)}</span>`).join('\n              ')
      : '';

    return `
          <div class="unified-article-row article-list-item-wrapper" data-tag="${escapeHtml(article.tag)}">
            <div class="unified-timeline-left">
              <div class="unified-timeline-date">${article.dateFormatted}</div>
            </div>
            <div class="unified-article-right">
              <a href="${articlesLinkPrefix}${article.slug}/" class="article-list-item${isFeatured ? ' article-list-featured' : ''}">
                <div class="article-list-meta">
                  <span class="tag ${article.tagClass || ''}">${escapeHtml(article.tag)}</span>
                  ${isFeatured ? `<span class="article-list-pin">${pinText}</span>` : ''}
                  <time datetime="${article.isoDate}" class="mobile-only-date" style="display:none;">${article.dateFormatted}</time>
                </div>
                <h2>${escapeHtml(article.title)}</h2>
                <p>${escapeHtml(article.description)}</p>
                ${tagsHtml ? `<div class="article-list-tags">${tagsHtml}</div>` : ''}
              </a>
            </div>
          </div>`;
  }).join('\n');

  const tags = [...new Set(articlesList.map(article => article.tag))];
  const filterBtns = tags
    .map(tag => `          <button class="filter-btn" data-filter="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
    .join('\n');

  const lang = isEn ? 'en' : 'zh-CN';
  const pageTitle = isEn ? 'All Articles — AI Tech Observer' : '全部文章 — AI 大模型观察';
  const pageDesc = isEn ? 'All AI technology articles and deep dives.' : 'AI 大模型观察全部技术文章列表。涵盖提示工程、AI Agent、RAG、模型微调、多模态等前沿 AI 主题。';
  const canonicalUrl = isEn ? `${SITE_URL}/en/articles/` : `${SITE_URL}/articles/`;
  const heroTag = 'ALL ARTICLES';
  const heroTitle = isEn ? 'All Articles' : '全部文章';
  const heroDesc = isEn
    ? `Discover ${articlesList.length} in-depth articles on AI`
    : `探索 AI 大模型领域的 ${articlesList.length} 篇技术文章与深度解析`;
  const filterAllBtn = isEn ? `All (${articlesList.length})` : `全部 (${articlesList.length})`;
  const searchPlaceholder = locales.models.listingSearchPlaceholder || (isEn ? 'Search articles...' : '搜索文章...');

  const paginationHtml = `
        <div class="articles-pagination fade-in" style="display: none;">
          <button class="pagination-btn prev-btn" disabled>${locales.models.paginationPrev || 'Prev'}</button>
          <div class="pagination-numbers"></div>
          <button class="pagination-btn next-btn">${locales.models.paginationNext || 'Next'}</button>
        </div>`;

  const searchHtml = `
        <div class="listing-search-container fade-in">
          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="article-search-input" class="article-search-input" placeholder="${searchPlaceholder}" data-lang="${lang}" autocomplete="off">
            <div class="search-shortcut">
              <kbd>⌘</kbd> <kbd>K</kbd>
            </div>
            <button class="search-clear-btn" id="search-clear-btn" style="display: none;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="search-results-dropdown" id="search-results-dropdown" role="listbox"></div>
        </div>`;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" hreflang="zh" href="${SITE_URL}/articles/" />
  <link rel="alternate" hreflang="en" href="${SITE_URL}/en/articles/" />
  <link rel="alternate" hreflang="x-default" href="${SITE_URL}/articles/" />
  <meta name="theme-color" content="#06060b">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta property="og:locale" content="${isEn ? 'en_US' : 'zh_CN'}">
  <meta property="og:site_name" content="${isEn ? 'Nobita Talks AI' : '大雄话AI'}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${pageTitle}">
  <meta name="twitter:description" content="${pageDesc}">
  <meta name="twitter:image" content="${SITE_URL}/og-image.png">
  <meta name="google-adsense-account" content="ca-pub-5078775507335151">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-4WZN5Q7VS6"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-4WZN5Q7VS6');
  </script>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/assets/css/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "${heroTitle}",
    "description": "${pageDesc}",
    "url": "${canonicalUrl}",
    "numberOfItems": ${articlesList.length}
  }
  </script>
</head>
<body>
  <div class="bg-grid" aria-hidden="true"></div>
  <canvas id="particles" aria-hidden="true"></canvas>
  <main class="page-main">
    <section class="page-hero">
      <div class="container">
        <div class="page-hero-content fade-in">
          <div class="section-tag">${heroTag}</div>
          <h1>${heroTitle}</h1>
          <p class="page-hero-desc">${heroDesc}</p>
        </div>
      </div>
    </section>

    <section class="section section-tight articles-search-section" style="padding-bottom: 0;">
      <div class="container">
${searchHtml}
      </div>
    </section>

    <section class="section section-tight articles-list-section">
      <div class="container">
        <div class="articles-filter fade-in" id="articles-filter">
          <button class="filter-btn active" data-filter="all">${filterAllBtn}</button>
${filterBtns}
        </div>
        <div class="unified-articles-list fade-in" id="articles-list">
${listItems}
        </div>
${paginationHtml}
      </div>
    </section>
  </main>
  <script type="module" src="/src/assets/js/main.js"></script>
</body>
</html>`;

  const outDir = isEn ? path.join(BUILD_OUT_DIR, 'en', 'articles') : path.join(BUILD_OUT_DIR, 'articles');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  console.log(`  ✓ ${isEn ? 'en/' : ''}articles/index.html (listing page)`);
}

function generateSearchIndex(articlesZh, articlesEn) {
  const outPath = path.join(BUILD_OUT_DIR, 'public', 'search-index.json');
  const searchData = [];

  const collect = (articlesList, lang) => {
    articlesList.forEach(article => {
      searchData.push({
        title: article.title,
        description: article.description,
        url: lang === 'en' ? `/en/articles/${article.slug}/` : `/articles/${article.slug}/`,
        tag: article.tag,
        date: article.dateFormatted,
        lang,
      });
    });
  };

  collect(articlesZh, 'zh');
  collect(articlesEn, 'en');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(searchData), 'utf-8');
  console.log(`  ✓ public/search-index.json (${searchData.length} items)`);
}

function generateSitemap(articlesList) {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  STATIC_ROUTES.forEach(route => {
    const isHome = route === '/' || route === '/en/';
    const isArticles = route === '/articles/' || route === '/en/articles/';

    xml += `  <url>
    <loc>${SITE_URL}${route === '/' ? '' : route}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${isHome || isArticles ? 'weekly' : 'monthly'}</changefreq>
    <priority>${isHome ? '1.0' : isArticles ? '0.9' : '0.7'}</priority>
  </url>
`;
  });

  articlesList.forEach(article => {
    const slugPrefix = article.isEn ? '/en/articles/' : '/articles/';
    xml += `  <url>
    <loc>${SITE_URL}${slugPrefix}${article.slug}/</loc>
    <lastmod>${article.isoDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  });

  xml += '</urlset>\n';

  const outPath = path.join(BUILD_OUT_DIR, 'public', 'sitemap.xml');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, xml, 'utf-8');
  console.log(`  ✓ public/sitemap.xml (${STATIC_ROUTES.size + articlesList.length} URLs)`);
}

function generateRssFeed(articlesList, isEn = false) {
  if (articlesList.length === 0 && isEn) return;

  const feedPath = isEn ? '/en/feed.xml' : '/feed.xml';
  const outPath = isEn
    ? path.join(BUILD_OUT_DIR, 'public', 'en', 'feed.xml')
    : path.join(BUILD_OUT_DIR, 'public', 'feed.xml');
  const title = isEn ? 'AI Tech Observer' : 'AI 大模型观察';
  const desc = isEn ? 'Focusing on AI foundation models and tech insights' : '专注 AI 大模型技术研究与实践的技术博客';
  const lang = isEn ? 'en' : 'zh-CN';
  const pubDate = new Date().toUTCString();

  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>${title}</title>\n  <link>${SITE_URL}/</link>\n  <description>${desc}</description>\n  <language>${lang}</language>\n  <pubDate>${pubDate}</pubDate>\n  <atom:link href="${SITE_URL}${feedPath}" rel="self" type="application/rss+xml" />\n`;

  articlesList.forEach(article => {
    const slugPrefix = article.isEn ? '/en/articles/' : '/articles/';
    xml += `  <item>
    <title>${escapeHtml(article.title)}</title>
    <link>${SITE_URL}${slugPrefix}${article.slug}/</link>
    <guid>${SITE_URL}${slugPrefix}${article.slug}/</guid>
    <pubDate>${new Date(article.isoDate).toUTCString()}</pubDate>
    <description>${escapeHtml(article.description)}</description>
  </item>
`;
  });

  xml += '</channel>\n</rss>\n';

  fs.writeFileSync(outPath, xml, 'utf-8');
  console.log(`  ✓ public${feedPath}`);
}

function generateOgImage(article) {
  const langSegment = article.isEn ? 'en' : 'zh';
  const ogDir = path.join(BUILD_OUT_DIR, 'public', 'og', langSegment);
  const ogPath = `/og/${langSegment}/${article.slug}.svg`;
  const outPath = path.join(ogDir, `${article.slug}.svg`);
  const titleLines = wrapOgText(article.title, article.isEn ? 26 : 16, 3);
  const descLines = wrapOgText(article.description, article.isEn ? 44 : 24, 2);
  const titleDy = 56;
  const descDy = 32;

  const titleTspans = titleLines.map((line, index) => (
    `<tspan x="88" dy="${index === 0 ? 0 : titleDy}">${escapeHtml(line)}</tspan>`
  )).join('');
  const descTspans = descLines.map((line, index) => (
    `<tspan x="88" dy="${index === 0 ? 0 : descDy}">${escapeHtml(line)}</tspan>`
  )).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06060b" />
      <stop offset="100%" stop-color="#13131c" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#22d3ee" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="22" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect x="56" y="56" width="1088" height="518" rx="28" fill="rgba(13,13,20,0.94)" stroke="rgba(255,255,255,0.08)" />
  <rect x="88" y="88" width="220" height="8" rx="4" fill="url(#accent)" filter="url(#glow)" />
  <circle cx="1036" cy="122" r="132" fill="rgba(99,102,241,0.14)" />
  <circle cx="1110" cy="498" r="112" fill="rgba(34,211,238,0.12)" />
  <text id="title" x="88" y="176" fill="#e4e4e7" font-size="56" font-weight="700" font-family="Inter, Noto Sans SC, sans-serif">${titleTspans}</text>
  <text id="desc" x="88" y="398" fill="#a1a1aa" font-size="26" font-weight="500" font-family="Inter, Noto Sans SC, sans-serif">${descTspans}</text>
  <rect x="88" y="492" width="196" height="52" rx="26" fill="rgba(99,102,241,0.14)" stroke="rgba(99,102,241,0.28)" />
  <text x="118" y="525" fill="#818cf8" font-size="22" font-weight="700" font-family="JetBrains Mono, monospace">${escapeHtml(article.tag)}</text>
  <text x="88" y="566" fill="#71717a" font-size="20" font-weight="500" font-family="JetBrains Mono, monospace">${escapeHtml(article.dateFormatted)}</text>
  <text x="944" y="562" fill="#22d3ee" font-size="22" font-weight="700" font-family="JetBrains Mono, monospace">NOBITA TALKS AI</text>
</svg>`;

  fs.mkdirSync(ogDir, { recursive: true });
  fs.writeFileSync(outPath, svg, 'utf-8');
  return ogPath;
}

function wrapOgText(text, maxChars, maxLines) {
  const normalizedText = String(text || '').trim().replace(/\s+/g, ' ');
  if (!normalizedText) return [];

  const isCjk = /[\u4e00-\u9fff]/.test(normalizedText);
  const units = isCjk ? Array.from(normalizedText) : normalizedText.split(' ');
  const lines = [];
  let currentLine = '';
  let index = 0;

  while (index < units.length && lines.length < maxLines) {
    const unit = units[index];
    const candidate = currentLine
      ? `${currentLine}${isCjk ? '' : ' '}${unit}`
      : unit;

    if (candidate.length <= maxChars || !currentLine) {
      currentLine = candidate;
      index += 1;
      continue;
    }

    lines.push(currentLine);
    currentLine = '';
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  if (index < units.length && lines.length > 0) {
    const lastLine = lines[lines.length - 1].replace(/[.…]+$/g, '');
    lines[lines.length - 1] = `${lastLine.slice(0, Math.max(1, maxChars - 1))}…`;
  }

  return lines;
}

function extractMarkdownTargets(markdown) {
  const targets = [];
  const regex = /!?\[[^\]]*]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(regex)) {
    const rawTarget = match[1]?.trim();
    if (!rawTarget) continue;
    targets.push(rawTarget.split(/\s+/)[0]);
  }

  return targets;
}

function isExternalTarget(target) {
  return /^(https?:\/\/|mailto:|tel:|#)/i.test(target);
}

function hasFileExtension(target) {
  return path.posix.extname(target) !== '';
}

function stripQueryAndHash(target) {
  return target.split('#')[0].split('?')[0];
}

function normalizeRoute(route) {
  if (!route) return '/';
  const normalized = route.startsWith('/') ? route : `/${route}`;
  return normalized.endsWith('/') ? normalized : `${normalized}/`;
}

function resolveSiteAssetPath(target) {
  const cleanTarget = target.replace(/^\/+/, '');
  const candidates = [
    path.join(ROOT, cleanTarget),
    path.join(ROOT, 'public', cleanTarget),
  ];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function normalizeComparableFrontmatterValue(field, value) {
  if (field === 'date') {
    if (!value) return '';
    return new Date(value).toISOString().split('T')[0];
  }

  return value ?? '';
}

function toSiteUrl(resourcePath) {
  if (/^https?:\/\//.test(resourcePath)) return resourcePath;
  return `${SITE_URL}${resourcePath.startsWith('/') ? resourcePath : `/${resourcePath}`}`;
}

function applyTemplate(templateHtml, replacements) {
  return Object.entries(replacements).reduce(
    (html, [key, value]) => html.split(`{{${key}}}`).join(value),
    templateHtml,
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
