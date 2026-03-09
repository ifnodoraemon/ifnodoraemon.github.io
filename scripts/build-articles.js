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

// Custom renderer for code blocks
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  // Mermaid diagrams → rendered by Mermaid.js on the client
  if (lang === 'mermaid') {
    return `<pre class="mermaid">\n${text}\n</pre>\n`;
  }
  const langClass = lang ? ` class="language-${lang}"` : '';
  return `<pre><code${langClass}>${escapeHtml(text)}</code></pre>\n`;
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

for (const file of mdFiles) {
  const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
  const { data: fm, content: mdContent } = matter(raw);

  // Validate frontmatter
  if (!fm.title || !fm.slug || !fm.date || !fm.tag || !fm.description) {
    console.warn(`⚠️  Skipping ${file}: missing required frontmatter`);
    continue;
  }

  // Render markdown to HTML
  const htmlContent = marked.parse(mdContent);

  // Format date
  const dateObj = new Date(fm.date);
  const isoDate = dateObj.toISOString().split('T')[0];
  const dateFormatted = isoDate.replace(/-/g, '.');

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
    .replace(/\{\{content\}\}/g, htmlContent);

  // Write output
  const outDir = path.join(ROOT, 'articles', fm.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf-8');

  articles.push({
    ...fm,
    isoDate,
    dateFormatted,
  });

  console.log(`  ✓ ${fm.slug} → articles/${fm.slug}/index.html`);
}

// ── Sort articles by date (newest first) ──
articles.sort((a, b) => new Date(b.date) - new Date(a.date));

// ── Generate articles listing page ──
generateListingPage(articles);

// ── Generate sitemap.xml ──
generateSitemap(articles);

console.log(`\n✅ Done! Generated ${articles.length} articles, listing page, and sitemap.xml`);


// =============================================================================
// Listing page generator
// =============================================================================
function generateListingPage(articles) {
  const listItems = articles.map((a, i) => {
    const isFeatured = i === 0;
    const tagsHtml = a.extraTags
      ? a.extraTags.map(t => `<span class="mini-tag">${t}</span>`).join('\n              ')
      : '';

    return `
          <a href="/articles/${a.slug}/" class="article-list-item${isFeatured ? ' article-list-featured' : ''}" data-tag="${a.tag}">
            <div class="article-list-meta">
              <span class="tag ${a.tagClass || ''}">${a.tag}</span>
              ${isFeatured ? '<span class="article-list-pin">📌 置顶</span>' : ''}
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

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>全部文章 — AI 大模型观察</title>
  <meta name="description" content="AI 大模型观察全部技术文章列表。涵盖提示工程、AI Agent、RAG、模型微调、多模态等前沿 AI 主题。">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://ifnodoraemon.github.io/articles/">
  <meta name="theme-color" content="#06060b">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ifnodoraemon.github.io/articles/">
  <meta property="og:title" content="全部文章 — AI 大模型观察">
  <meta property="og:description" content="AI 大模型观察全部技术文章列表。涵盖提示工程、AI Agent、RAG、模型微调、多模态等前沿 AI 主题。">
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
    "name": "全部文章",
    "description": "AI 大模型观察全部技术文章列表",
    "url": "https://ifnodoraemon.github.io/articles/",
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
          <div class="section-tag">ALL ARTICLES</div>
          <h1>全部文章</h1>
          <p class="page-hero-desc">探索 AI 大模型领域的 ${articles.length} 篇技术文章与深度解析</p>
        </div>
      </div>
    </section>
    <section class="section section-tight">
      <div class="container">
        <div class="articles-filter fade-in">
          <button class="filter-btn active" data-filter="all">全部 (${articles.length})</button>
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

  fs.writeFileSync(path.join(ROOT, 'articles', 'index.html'), html, 'utf-8');
  console.log(`  ✓ articles/index.html (listing page)`);
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
    xml += `  <url>
    <loc>https://ifnodoraemon.github.io/articles/${a.slug}/</loc>
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
