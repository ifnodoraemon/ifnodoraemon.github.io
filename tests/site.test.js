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

