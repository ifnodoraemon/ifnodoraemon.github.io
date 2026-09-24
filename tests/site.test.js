import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getPageState,
  getSearchIndexPath,
  highlightSearchMatches,
  isEnglishPath,
  stripLangPrefix,
} from '../src/assets/js/utils/site.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

test('route helpers normalize zh and en paths consistently', () => {
  assert.equal(isEnglishPath('/en/articles/'), true);
  assert.equal(isEnglishPath('/articles/'), false);
  assert.equal(stripLangPrefix('/en/about/'), '/about/');
  assert.equal(stripLangPrefix('/en'), '/');
  assert.deepEqual(getPageState('/articles/'), {
    activePage: 'articles',
    footerStyle: 'simple',
    normalizedPath: '/articles/',
  });
  assert.deepEqual(getPageState('/en/models/'), {
    activePage: 'models',
    footerStyle: 'simple',
    normalizedPath: '/models/',
  });
  assert.deepEqual(getPageState('/tools/'), {
    activePage: 'tools',
    footerStyle: 'simple',
    normalizedPath: '/tools/',
  });
  assert.deepEqual(getPageState('/en/tools/'), {
    activePage: 'tools',
    footerStyle: 'simple',
    normalizedPath: '/tools/',
  });
  assert.deepEqual(getPageState('/en/articles/agent-runtime-practices/'), {
    activePage: '',
    footerStyle: 'simple',
    normalizedPath: '/articles/agent-runtime-practices/',
  });
});

test('search highlighter escapes regex characters safely', () => {
  const highlighted = highlightSearchMatches('Promptfoo (CI) guide', 'promptfoo (ci)');
  assert.match(highlighted, /<mark>Promptfoo<\/mark>/i);
  assert.match(highlighted, /<mark>\(CI\)<\/mark>/);
});

test('deploy workflow runs the full build and smoke checks', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'deploy.yml'), 'utf-8');
  assert.match(workflow, /run:\s+npm run build/);
  assert.match(workflow, /run:\s+npm run test:smoke/);
  assert.ok(!workflow.includes('npx vite build'));
});

test('build outputs include root search index and generated article OG images', () => {
  const searchIndexPath = path.join(ROOT, 'dist', getSearchIndexPath().replace(/^\//, ''));
  const zhOgPath = path.join(ROOT, 'dist', 'og', 'zh', 'agent-runtime-practices.svg');
  const enOgPath = path.join(ROOT, 'dist', 'og', 'en', 'agent-runtime-practices.svg');

  assert.ok(fs.existsSync(searchIndexPath), 'expected dist/search-index.json to exist');
  assert.ok(fs.existsSync(zhOgPath), 'expected zh OG image to exist');
  assert.ok(fs.existsSync(enOgPath), 'expected en OG image to exist');
});

test('built assets reference the correct search index path and article pages include related content', () => {
  const assetsDir = path.join(ROOT, 'dist', 'assets');
  const mainBundles = fs.readdirSync(assetsDir).filter(file => file.startsWith('main-') && file.endsWith('.js'));
  assert.ok(mainBundles.length > 0, 'expected at least one built main bundle');

  const bundledJs = mainBundles
    .map(file => fs.readFileSync(path.join(assetsDir, file), 'utf-8'))
    .join('\n');
  assert.match(bundledJs, /\/search-index\.json/);
  assert.ok(!bundledJs.includes('/public/search-index.json'));

  const zhArticleHtml = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'agent-runtime-practices', 'index.html'), 'utf-8');
  const enArticleHtml = fs.readFileSync(path.join(ROOT, 'dist', 'en', 'articles', 'agent-runtime-practices', 'index.html'), 'utf-8');

  assert.match(zhArticleHtml, /class="article-related fade-in"/);
  assert.match(zhArticleHtml, /\/og\/zh\/agent-runtime-practices\.svg/);
  assert.match(enArticleHtml, /class="article-related fade-in"/);
  assert.match(enArticleHtml, /\/og\/en\/agent-runtime-practices\.svg/);
});

test('build outputs include IndexNow key and articles with FAQPage / TechArticle schema', () => {
  const indexNowKeyPath = path.join(ROOT, 'dist', 'd0b17a8c4e6f9a2b5d8e1f4c7a0b3e6f.txt');
  assert.ok(fs.existsSync(indexNowKeyPath), 'expected dist IndexNow key file to exist');

  const vllmHtml = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'vllm-serving-guide', 'index.html'), 'utf-8');
  assert.match(vllmHtml, /"@type":\s*"TechArticle"/);
  assert.match(vllmHtml, /"@type":\s*"FAQPage"/);
  assert.match(vllmHtml, /"url":\s*"https:\/\/blog\.llmgo\.top\/favicon\.svg"/);

  const distArticles = [
    ...fs.readdirSync(path.join(ROOT, 'dist', 'articles')).map(d => path.join(ROOT, 'dist', 'articles', d, 'index.html')),
    ...fs.readdirSync(path.join(ROOT, 'dist', 'en', 'articles')).map(d => path.join(ROOT, 'dist', 'en', 'articles', d, 'index.html')),
  ].filter(f => fs.existsSync(f) && fs.statSync(f).isFile());

  assert.equal(distArticles.length, 64, 'expected 64 built articles');

  for (const file of distArticles) {
    const html = fs.readFileSync(file, 'utf-8');
    const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    let foundFaq = false;
    let foundTechArticle = false;

    for (const block of jsonLdBlocks) {
      const parsed = JSON.parse(block[1]);
      if (parsed['@type'] === 'FAQPage') foundFaq = true;
      if (parsed['@type'] === 'TechArticle') foundTechArticle = true;
    }

    assert.ok(foundFaq, `expected FAQPage schema in ${file}`);
    assert.ok(foundTechArticle, `expected TechArticle schema in ${file}`);
  }
});

test('built CSS preserves critical responsive layout styles and mobile components', () => {
  const assetsDir = path.join(ROOT, 'dist', 'assets');
  const cssFile = fs.readdirSync(assetsDir).find(file => file.startsWith('main-') && file.endsWith('.css'));
  assert.ok(cssFile, 'expected built main css bundle');

  const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
  const requiredStyles = [
    'toc-container',
    'article-list-item',
    'filter-btn',
    'usecase-grid',
    'usecase-card',
    'timeline',
    'about-terminal-body',
    'katex-display',
  ];

  for (const style of requiredStyles) {
    assert.ok(css.includes(style), `expected built CSS to contain "${style}"`);
  }
});

test('mobile navigation dropdown preserves containing block safety and responsive styles', () => {
  const assetsDir = path.join(ROOT, 'dist', 'assets');
  const cssFile = fs.readdirSync(assetsDir).find(file => file.startsWith('main-') && file.endsWith('.css'));
  assert.ok(cssFile, 'expected built main css bundle');

  const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
  assert.ok(css.includes('.nav-links-main'), 'expected .nav-links-main container');
  assert.ok(css.includes('.nav-links-extra'), 'expected .nav-links-extra container');
  assert.ok(/\.navbar:?:before/.test(css), 'expected navbar background blur on pseudo element');
  assert.ok(css.includes('.menu-toggle.active'), 'expected animated active hamburger icon');
});

test('renderNav initializes mobile navigation and toggles dropdown state correctly', async () => {
  const { renderNav } = await import('../src/assets/js/components/nav.js');

  const classList = (initial = []) => {
    const set = new Set(initial);
    return {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      toggle: (c) => {
        if (set.has(c)) { set.delete(c); return false; }
        set.add(c);
        return true;
      },
      contains: (c) => set.has(c)
    };
  };

  const mockToggle = {
    classList: classList(),
    attrs: {},
    setAttribute: function(k, v) { this.attrs[k] = v; },
    addEventListener: function(evt, fn) { if (evt === 'click') this.onclick = fn; }
  };

  const mockLinks = {
    classList: classList(),
    querySelectorAll: () => [],
    addEventListener: () => {}
  };

  const mockNav = {
    classList: classList(),
    setAttribute: () => {},
    innerHTML: '',
    querySelector: function(sel) {
      if (sel === '#menu-toggle') return mockToggle;
      if (sel === '#nav-links') return mockLinks;
      return null;
    },
    contains: () => false
  };

  const originalWindow = global.window;
  const originalDocument = global.document;

  global.window = {
    location: { pathname: '/', search: '', hash: '' },
    innerWidth: 375,
    addEventListener: () => {}
  };

  global.document = {
    body: { classList: classList() },
    documentElement: { classList: classList() },
    getElementById: (id) => id === 'navbar' ? mockNav : null,
    addEventListener: () => {}
  };

  try {
    renderNav('home');

    assert.ok(mockNav.innerHTML.includes('class="nav-links-main"'));
    assert.ok(mockNav.innerHTML.includes('class="nav-links-extra"'));
    assert.ok(mockNav.innerHTML.includes('id="menu-toggle"'));

    // Open dropdown
    mockToggle.onclick({ stopPropagation: () => {} });
    assert.equal(mockToggle.classList.contains('active'), true);
    assert.equal(mockLinks.classList.contains('open'), true);
    assert.equal(mockNav.classList.contains('menu-open'), true);
    assert.equal(mockToggle.attrs['aria-expanded'], 'true');

    // Close via toggle click
    mockToggle.onclick({ stopPropagation: () => {} });
    assert.equal(mockToggle.classList.contains('active'), false);
    assert.equal(mockLinks.classList.contains('open'), false);
    assert.equal(mockNav.classList.contains('menu-open'), false);
    assert.equal(mockToggle.attrs['aria-expanded'], 'false');
  } finally {
    global.window = originalWindow;
    global.document = originalDocument;
  }
});

test('math formulas are rendered with KaTeX without unparsed delimiters', () => {
  const grpoHtml = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'test-time-compute-grpo', 'index.html'), 'utf-8');
  assert.ok(grpoHtml.includes('class="katex"'), 'expected KaTeX inline elements');
  assert.ok(grpoHtml.includes('class="katex-display"'), 'expected KaTeX display elements');
  assert.ok(!grpoHtml.includes('$A_i$'), 'raw $A_i$ should not remain unparsed');
  assert.ok(!grpoHtml.includes('$$D_{KL}'), 'raw $$D_{KL} should not remain unparsed');
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'vendor', 'katex', 'katex.min.css')), 'expected vendor katex css');
});

test('build outputs include 404 pages and no uncompiled template variables leak into dist HTML', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', '404.html')), 'expected dist/404.html');
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'en', '404.html')), 'expected dist/en/404.html');

  const grpoHtml = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'test-time-compute-grpo', 'index.html'), 'utf-8');
  assert.ok(grpoHtml.includes('content="zh_CN"'), 'expected resolved zh_CN og:locale');
  assert.ok(!grpoHtml.includes('{{#if'), 'no uncompiled Handlebars if tags');

  const grpoEnHtml = fs.readFileSync(path.join(ROOT, 'dist', 'en', 'articles', 'test-time-compute-grpo', 'index.html'), 'utf-8');
  assert.ok(grpoEnHtml.includes('content="en_US"'), 'expected resolved en_US og:locale');
});

test('all pages include valid RSS alternate links and feeds are generated correctly', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'feed.xml')), 'expected dist/feed.xml');
  assert.ok(fs.existsSync(path.join(ROOT, 'dist', 'en', 'feed.xml')), 'expected dist/en/feed.xml');

  const zhFeed = fs.readFileSync(path.join(ROOT, 'dist', 'feed.xml'), 'utf-8');
  const enFeed = fs.readFileSync(path.join(ROOT, 'dist', 'en', 'feed.xml'), 'utf-8');

  assert.match(zhFeed, /<title>大雄话AI<\/title>/);
  assert.match(zhFeed, /<link>https:\/\/blog\.llmgo\.top\/<\/link>/);
  assert.match(enFeed, /<title>Nobita Talks AI<\/title>/);
  assert.match(enFeed, /<link>https:\/\/blog\.llmgo\.top\/en\/<\/link>/);

  const samplePages = [
    path.join(ROOT, 'dist', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'index.html'),
    path.join(ROOT, 'dist', 'about', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'about', 'index.html'),
    path.join(ROOT, 'dist', 'models', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'models', 'index.html'),
    path.join(ROOT, 'dist', 'projects', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'projects', 'index.html'),
    path.join(ROOT, 'dist', 'tools', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'tools', 'index.html'),
    path.join(ROOT, 'dist', 'articles', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'articles', 'index.html'),
    path.join(ROOT, 'dist', 'articles', 'vllm-serving-guide', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'articles', 'vllm-serving-guide', 'index.html'),
  ];

  for (const p of samplePages) {
    const html = fs.readFileSync(p, 'utf-8');
    assert.match(html, /<link\s+rel="alternate"\s+type="application\/rss\+xml"/, `expected RSS alternate tag in ${p}`);
  }
});

test('tools page includes full 9-tool suite and WebApplication / FAQPage schema', () => {
  const zhToolsHtml = fs.readFileSync(path.join(ROOT, 'dist', 'tools', 'index.html'), 'utf-8');
  const enToolsHtml = fs.readFileSync(path.join(ROOT, 'dist', 'en', 'tools', 'index.html'), 'utf-8');

  // Tabs for all 9 tools
  const tabIds = [
    'tab-nav-markdown',
    'tab-nav-base64',
    'tab-nav-vram',
    'tab-nav-token',
    'tab-nav-json',
    'tab-nav-jwt',
    'tab-nav-cron',
    'tab-nav-url',
    'tab-nav-codecard'
  ];
  for (const id of tabIds) {
    assert.match(zhToolsHtml, new RegExp(`id="${id}"`), `expected ${id} in zh tools page`);
    assert.match(enToolsHtml, new RegExp(`id="${id}"`), `expected ${id} in en tools page`);
  }

  // App panels for all 9 tools
  const appIds = [
    'markdown-editor-app',
    'base64-tool-app',
    'vram-tool-app',
    'token-tool-app',
    'json-tool-app',
    'jwt-tool-app',
    'cron-tool-app',
    'url-tool-app',
    'codecard-tool-app'
  ];
  for (const id of appIds) {
    assert.match(zhToolsHtml, new RegExp(`id="${id}"`), `expected ${id} in zh tools page`);
    assert.match(enToolsHtml, new RegExp(`id="${id}"`), `expected ${id} in en tools page`);
  }

  // Schema
  assert.match(zhToolsHtml, /"@type":\s*"WebApplication"/);
  assert.match(zhToolsHtml, /"@type":\s*"FAQPage"/);
  assert.match(enToolsHtml, /"@type":\s*"WebApplication"/);
  assert.match(enToolsHtml, /"@type":\s*"FAQPage"/);

  // Vue Island App Mount Target & Bundled Scripts
  assert.match(zhToolsHtml, /id="tools-app"/);
  assert.match(enToolsHtml, /id="tools-app"/);
  assert.match(zhToolsHtml, /<script type="module" crossorigin src="\/assets\/main-[^"]+\.js">/);
  assert.match(enToolsHtml, /<script type="module" crossorigin src="\/assets\/main-[^"]+\.js">/);
});

test('code blocks have copy buttons with appropriate styling and copy-code-btn class', () => {
  const vllmHtml = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'vllm-serving-guide', 'index.html'), 'utf-8');
  assert.match(vllmHtml, /class="copy-code-btn copy-btn"/, 'expected copy-code-btn class on copy buttons');

  const cssFile = fs.readdirSync(path.join(ROOT, 'dist', 'assets')).find(file => file.startsWith('main-') && file.endsWith('.css'));
  const css = fs.readFileSync(path.join(ROOT, 'dist', 'assets', cssFile), 'utf-8');
  assert.ok(css.includes('.copy-code-btn'), 'expected .copy-code-btn in CSS');
  assert.ok(css.includes('.article-toc-list a.active'), 'expected .article-toc-list a.active in CSS');
});

test('build outputs include valid site.webmanifest and pages link to manifest and skip link', () => {
  const manifestDist = path.join(ROOT, 'dist', 'site.webmanifest');
  assert.ok(fs.existsSync(manifestDist), 'expected dist/site.webmanifest to exist');

  const manifestData = JSON.parse(fs.readFileSync(manifestDist, 'utf-8'));
  assert.ok(manifestData.name.includes('Nobita Talks AI'));
  assert.equal(manifestData.display, 'standalone');

  const samplePages = [
    path.join(ROOT, 'dist', 'index.html'),
    path.join(ROOT, 'dist', 'en', 'index.html'),
    path.join(ROOT, 'dist', 'about', 'index.html'),
    path.join(ROOT, 'dist', 'articles', 'index.html'),
    path.join(ROOT, 'dist', 'articles', 'vllm-serving-guide', 'index.html'),
  ];

  for (const p of samplePages) {
    const html = fs.readFileSync(p, 'utf-8');
    assert.match(html, /<link\s+rel="manifest"\s+href="\/site\.webmanifest"/, `expected manifest link in ${p}`);
  }

  const cssFile = fs.readdirSync(path.join(ROOT, 'dist', 'assets')).find(file => file.startsWith('main-') && file.endsWith('.css'));
  const css = fs.readFileSync(path.join(ROOT, 'dist', 'assets', cssFile), 'utf-8');
  assert.ok(css.includes('.skip-link'), 'expected .skip-link in CSS');
});

test('sitemap excludes verification tokens and preserves valid directory routes and AI robots policies', () => {
  const sitemapPath = path.join(ROOT, 'dist', 'sitemap.xml');
  assert.ok(fs.existsSync(sitemapPath), 'expected dist/sitemap.xml to exist');
  const sitemap = fs.readFileSync(sitemapPath, 'utf-8');

  // Must not include verification html files or malformed .html/ paths
  assert.ok(!sitemap.includes('googledb2a852f29a38330'), 'sitemap must not contain google site verification file');
  assert.ok(!sitemap.includes('404'), 'sitemap must not contain 404 page');
  assert.ok(!/\.html\//.test(sitemap), 'sitemap must not have URLs ending with .html/');

  const robotsPath = path.join(ROOT, 'dist', 'robots.txt');
  assert.ok(fs.existsSync(robotsPath), 'expected dist/robots.txt to exist');
  const robots = fs.readFileSync(robotsPath, 'utf-8');
  assert.ok(robots.includes('GPTBot'), 'robots.txt must preserve GPTBot policy');
  assert.ok(robots.includes('ClaudeBot'), 'robots.txt must preserve ClaudeBot policy');
  assert.ok(robots.includes('Sitemap: https://blog.llmgo.top/sitemap.xml'), 'robots.txt must contain sitemap link');
});

test('build outputs include valid llms.txt, enriched ItemList schema, and author E-E-A-T metadata', () => {
  const llmsPath = path.join(ROOT, 'dist', 'llms.txt');
  const llmsFullPath = path.join(ROOT, 'dist', 'llms-full.txt');

  assert.ok(fs.existsSync(llmsPath), 'expected dist/llms.txt');
  assert.ok(fs.existsSync(llmsFullPath), 'expected dist/llms-full.txt');

  const llmsContent = fs.readFileSync(llmsPath, 'utf-8');
  assert.match(llmsContent, /# 大雄话AI \/ Nobita Talks AI/);
  assert.match(llmsContent, /AI Agent 生产级架构师手册/);
  assert.match(llmsContent, /大模型高并发推理与底层架构/);
  assert.match(llmsContent, /现代大模型实战工程与技术选型手册/);
  assert.match(llmsContent, /\/articles\/vllm-serving-guide\//);
  assert.match(llmsContent, /\/en\/articles\/vllm-serving-guide\//);

  const fullContent = fs.readFileSync(llmsFullPath, 'utf-8');
  assert.ok(fullContent.length > llmsContent.length, 'llms-full.txt should contain comprehensive details');
  assert.match(fullContent, /核心 FAQ 解答/);

  // Check ItemList schema on /articles/
  const zhArticlesListing = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'index.html'), 'utf-8');
  assert.match(zhArticlesListing, /"@type":\s*"ItemList"/);
  assert.match(zhArticlesListing, /"numberOfItems":\s*32/);

  // Check author authority on article
  const zhArticleHtml = fs.readFileSync(path.join(ROOT, 'dist', 'articles', 'agent-runtime-practices', 'index.html'), 'utf-8');
  assert.match(zhArticleHtml, /"jobTitle":\s*"LLM Systems Architect"/);
  assert.match(zhArticleHtml, /"knowsAbout"/);
  assert.match(zhArticleHtml, /"isAccessibleForFree":\s*true/);
});



