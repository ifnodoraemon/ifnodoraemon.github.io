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
