#!/usr/bin/env node
/**
 * Build Articles — converts Markdown files to HTML pages
 *
 * Reads:   content/articles/*.md  (with YAML frontmatter)
 * Outputs: articles/{slug}/index.html (from templates/article.html)
 *          articles/index.html        (listing page, updated)
 *          public/sitemap.xml         (all pages)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Configure marked ──
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Custom renderer for code blocks and images
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  // Mermaid diagrams → rendered by Mermaid.js on the client
  if (lang === 'mermaid') {
    return `<pre class="mermaid">\n${text}\n</pre>\n`;
  }
  const langClass = lang ? ` class="language-${lang}"` : '';
  return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>\n`;
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
  const id = text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, '-').replace(/(^-|-$)/g, '');
  if (depth === 2 || depth === 3) {
    currentToc.push({ text, depth, id });
  }
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

marked.use({ renderer });

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Read template ──
const templatePath = path.join(ROOT, 'templates', 'article.html');
const template = fs.readFileSync(templatePath, 'utf-8');

// ── Read all markdown files ──
const contentDir = path.join(ROOT, 'content', 'articles');
const mdFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));

console.log(`📝 Found ${mdFiles.length} articles\n`);

const articles = [];
const articlesEn = [];

for (const file of mdFiles) {
  const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
  const { data: fm, content: mdContent } = matter(raw);

  const isEn = file.endsWith('.en.md');

  // Validate frontmatter
  if (!fm.title || !fm.slug || !fm.date || !fm.tag || !fm.description) {
    console.warn(`⚠️  Skipping ${file}: missing required frontmatter`);
    continue;
  }

  // Render markdown to HTML
  currentToc = [];
  const htmlContent = marked.parse(mdContent);

  // Generate TOC HTML
  let tocHtml = '';
  if (currentToc.length > 0) {
    const tocTitle = isEn ? 'Table of Contents' : '文章目录';
    tocHtml = `<div class="toc-container"><h4>${tocTitle}</h4><ul class="article-toc-list">\n`;
    currentToc.forEach(item => {
      tocHtml += `  <li class="toc-level-${item.depth}"><a href="#${item.id}">${item.text}</a></li>\n`;
    });
    tocHtml += '</ul></div>';
  }

  // Format date
  const dateObj = new Date(fm.date);
  const isoDate = dateObj.toISOString().split('T')[0];
  const dateFormatted = isoDate.replace(/-/g, '.');

  // Build image url
  let imageUrl = 'https://ifnodoraemon.github.io/og-image.png';
  if (fm.image) {
    imageUrl = fm.image.startsWith('http') ? fm.image : `https://ifnodoraemon.github.io${fm.image.startsWith('/') ? fm.image : '/' + fm.image}`;
  }

  // Build keywords
  const keywords = [fm.tag, 'AI大模型', 'GPT-5.4', 'Claude 4.6', 'Gemini 3.1', fm.slug.replace(/-/g, ' ')].join(',');

  // Apply template
  let html = template
    .replace(/\{\{title\}\}/g, fm.title)
    .replace(/\{\{slug\}\}/g, fm.slug)
    .replace(/\{\{description\}\}/g, fm.description)
    .replace(/\{\{date\}\}/g, isoDate)
    .replace(/\{\{isoDate\}\}/g, isoDate)
    .replace(/\{\{dateFormatted\}\}/g, dateFormatted)
    .replace(/\{\{tag\}\}/g, fm.tag)
    .replace(/\{\{tagClass\}\}/g, fm.tagClass || '')
    .replace(/\{\{keywords\}\}/g, keywords)
    .replace(/\{\{image\}\}/g, imageUrl)
    .replace(/\{\{toc\}\}/g, tocHtml)
    .replace(/\{\{content\}\}/g, htmlContent)
    .replace(/\{\{lang\}\}/g, isEn ? 'en' : 'zh-CN')
    .replace(/\{\{articles_link\}\}/g, isEn ? '/en/articles/' : '/articles/')
    .replace(/\{\{return_text\}\}/g, isEn ? '← Back to Articles' : '← 返回文章列表');

  // Write output
  const outDirBase = isEn ? path.join(ROOT, 'en', 'articles', fm.slug) : path.join(ROOT, 'articles', fm.slug);
  fs.mkdirSync(outDirBase, { recursive: true });
  fs.writeFileSync(path.join(outDirBase, 'index.html'), html, 'utf-8');
  
  const articleData = {
    ...fm,
    isoDate,
    dateFormatted,
    isEn
  };
  
  if (isEn) {
    articlesEn.push(articleData);
  } else {
    articles.push(articleData);
  }

  console.log(`  ✓ ${file} → ${isEn ? 'en/' : ''}articles/${fm.slug}/index.html`);
}

// ── Sort articles by date (newest first) ──
articles.sort((a, b) => new Date(b.date) - new Date(a.date));
articlesEn.sort((a, b) => new Date(b.date) - new Date(a.date));

// ── Generate articles listing page ──
generateListingPage(articles, false);
generateListingPage(articlesEn, true);

// ── Generate sitemap.xml ──
generateSitemap([...articles, ...articlesEn]);

// ── Generate feed.xml ──
generateRssFeed(articles, false);
generateRssFeed(articlesEn, true);

console.log(`\n✅ Done! Generated ${articles.length} zh articles, ${articlesEn.length} en articles`);


// =============================================================================
// Listing page generator
// =============================================================================
function generateListingPage(articles, isEn = false) {
  if (articles.length === 0 && isEn) return; // Note missing EN articles

  const articlesLinkPrefix = isEn ? '/en/articles/' : '/articles/';
  const listItems = articles.map((a, i) => {
    const isFeatured = i === 0;
    const pinText = isEn ? '📌 Pinned' : '📌 置顶';
    const tagsHtml = a.extraTags
      ? a.extraTags.map(t => `<span class="mini-tag">${t}</span>`).join('\n              ')
      : '';

    return `
          <a href="${articlesLinkPrefix}${a.slug}/" class="article-list-item${isFeatured ? ' article-list-featured' : ''}" data-tag="${a.tag}">
            <div class="article-list-meta">
              <span class="tag ${a.tagClass || ''}">${a.tag}</span>
              ${isFeatured ? `<span class="article-list-pin">${pinText}</span>` : ''}
              <time datetime="${a.isoDate}">${a.dateFormatted}</time>
            </div>
            <h2>${a.title}</h2>
            <p>${a.description}</p>
            ${tagsHtml ? `<div class="article-list-tags">${tagsHtml}</div>` : ''}
          </a>`;
  }).join('\n');

  // Collect unique tags
  const tags = [...new Set(articles.map(a => a.tag))];
  const filterBtns = tags.map(t => `          <button class="filter-btn" data-filter="${t}">${t}</button>`).join('\n');

  const lang = isEn ? 'en' : 'zh-CN';
  const pageTitle = isEn ? 'All Articles — AI Tech Observer' : '全部文章 — AI 大模型观察';
  const pageDesc = isEn ? 'All AI technology articles and deep dives.' : 'AI 大模型观察全部技术文章列表。涵盖提示工程、AI Agent、RAG、模型微调、多模态等前沿 AI 主题。';
  const canonicalUrl = isEn ? 'https://ifnodoraemon.github.io/en/articles/' : 'https://ifnodoraemon.github.io/articles/';
  const heroTag = isEn ? 'ALL ARTICLES' : 'ALL ARTICLES';
  const heroTitle = isEn ? 'All Articles' : '全部文章';
  const heroDesc = isEn ? `Discover ${articles.length} in-depth articles on AI` : `探索 AI 大模型领域的 ${articles.length} 篇技术文章与深度解析`;
  const filterAllBtn = isEn ? `All (${articles.length})` : `全部 (${articles.length})`;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="${pageDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonicalUrl}">
  <meta name="theme-color" content="#06060b">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${pageTitle}">
  <meta property="og:description" content="${pageDesc}">
  <meta name="google-adsense-account" content="ca-pub-5078775507335151">
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-4WZN5Q7VS6"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-4WZN5Q7VS6');
  </script>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "${heroTitle}",
    "description": "${pageDesc}",
    "url": "${canonicalUrl}",
    "numberOfItems": ${articles.length}
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
    <section class="section section-tight">
      <div class="container">
        <div class="articles-filter fade-in">
          <button class="filter-btn active" data-filter="all">${filterAllBtn}</button>
${filterBtns}
        </div>
        <div class="articles-list fade-in">
${listItems}
        </div>
      </div>
    </section>
  </main>
  <script type="module" src="/main.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      const btns = document.querySelectorAll('.filter-btn');
      const items = document.querySelectorAll('.article-list-item');
      btns.forEach(btn => {
        btn.addEventListener('click', () => {
          btns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filter = btn.dataset.filter;
          items.forEach(item => {
            item.style.display = (filter === 'all' || item.dataset.tag === filter) ? '' : 'none';
          });
        });
      });
    });
  </script>
</body>
</html>`;

  const outDir = isEn ? path.join(ROOT, 'en', 'articles') : path.join(ROOT, 'articles');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');
  console.log(`  ✓ ${isEn ? 'en/' : ''}articles/index.html (listing page)`);
}


// =============================================================================
// Sitemap generator
// =============================================================================
function generateSitemap(articles) {
  const today = new Date().toISOString().split('T')[0];

  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'weekly' },
    { loc: '/articles/', priority: '0.9', changefreq: 'weekly' },
    { loc: '/models/', priority: '0.8', changefreq: 'monthly' },
    { loc: '/about/', priority: '0.6', changefreq: 'monthly' },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  for (const p of staticPages) {
    xml += `  <url>
    <loc>https://ifnodoraemon.github.io${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>
`;
  }

  for (const a of articles) {
    const slugPrefix = a.isEn ? 'en/articles/' : 'articles/';
    xml += `  <url>
    <loc>https://ifnodoraemon.github.io/${slugPrefix}${a.slug}/</loc>
    <lastmod>${a.isoDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
  }

  xml += `</urlset>\n`;

  fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), xml, 'utf-8');
  console.log(`  ✓ public/sitemap.xml (${staticPages.length + articles.length} URLs)`);
}

// =============================================================================
// RSS Feed generator
// =============================================================================
function generateRssFeed(articles, isEn = false) {
  if (articles.length === 0 && isEn) return;
  const feedPath = isEn ? '/en/feed.xml' : '/feed.xml';
  const outPath = isEn ? path.join(ROOT, 'public', 'en', 'feed.xml') : path.join(ROOT, 'public', 'feed.xml');
  const title = isEn ? 'AI Tech Observer' : 'AI 大模型观察';
  const desc = isEn ? 'Focusing on AI foundation models and tech insights' : '专注 AI 大模型技术研究与实践的技术博客';
  const lang = isEn ? 'en' : 'zh-CN';
  const pubDate = new Date().toUTCString();
  
  if (isEn) fs.mkdirSync(path.join(ROOT, 'public', 'en'), { recursive: true });

  let xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${title}</title>
  <link>https://ifnodoraemon.github.io/</link>
  <description>${desc}</description>
  <language>${lang}</language>
  <pubDate>${pubDate}</pubDate>
  <atom:link href="https://ifnodoraemon.github.io${feedPath}" rel="self" type="application/rss+xml" />
`;

  for (const a of articles) {
    const slugPrefix = a.isEn ? 'en/articles/' : 'articles/';
    xml += `  <item>
    <title>${escapeHtml(a.title)}</title>
    <link>https://ifnodoraemon.github.io/${slugPrefix}${a.slug}/</link>
    <guid>https://ifnodoraemon.github.io/${slugPrefix}${a.slug}/</guid>
    <pubDate>${new Date(a.date).toUTCString()}</pubDate>
    <description>${escapeHtml(a.description)}</description>
  </item>
`;
  }

  xml += `</channel>
</rss>
`;

  fs.writeFileSync(outPath, xml, 'utf-8');
  console.log(`  ✓ public${feedPath}`);
}
