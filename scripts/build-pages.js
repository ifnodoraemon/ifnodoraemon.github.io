#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const TEMPLATES_DIR = path.join(ROOT, 'src', 'templates', 'pages');
const LOCALES_DIR = path.join(ROOT, 'src', 'locales');
const BUILD_OUT_DIR = path.join(ROOT, '.temp_build');
const PUBLIC_DIR = path.join(ROOT, 'public');

// Ensure output dirs exist
if (!fs.existsSync(BUILD_OUT_DIR)) {
  fs.mkdirSync(BUILD_OUT_DIR, { recursive: true });
}

// Copy static public assets (like favicon) to temp_build/public
const tempPublicDir = path.join(BUILD_OUT_DIR, 'public');
if (!fs.existsSync(tempPublicDir)) {
  fs.mkdirSync(tempPublicDir, { recursive: true });
}
if (fs.existsSync(PUBLIC_DIR)) {
  fs.cpSync(PUBLIC_DIR, tempPublicDir, { recursive: true });
}

// Ensure locales exist
if (!fs.existsSync(LOCALES_DIR)) {
  fs.mkdirSync(LOCALES_DIR, { recursive: true });
}

// 1. Read locale data
function readLocale(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function getArticles(isEn) {
  const contentDir = isEn ? path.join(ROOT, 'content', 'en', 'articles') : path.join(ROOT, 'content', 'zh', 'articles');
  if (!fs.existsSync(contentDir)) return [];
  const mdFiles = fs.readdirSync(contentDir).filter(f => f.endsWith('.md'));
  const articles = [];
  for (const file of mdFiles) {
    const raw = fs.readFileSync(path.join(contentDir, file), 'utf-8');
    const { data: fm } = matter(raw);
    if (!fm.title || !fm.slug || !fm.date || !fm.description) continue;
    
    const dateObj = new Date(fm.date);
    const isoDate = dateObj.toISOString().split('T')[0];
    const dateFormatted = isoDate.replace(/-/g, '.');
    
    articles.push({
      ...fm,
      isoDate,
      dateFormatted
    });
  }
  return articles.sort((a, b) => new Date(b.date) - new Date(a.date));
}

const zhArticles = getArticles(false);
const enArticles = getArticles(true);

const zhFeatured = zhArticles.find(a => a.featured) || zhArticles[0];
const enFeatured = enArticles.find(a => a.featured) || enArticles[0];

const zhData = {
  ...readLocale('zh'),
  featuredArticle: zhFeatured,
  latestArticles: zhArticles.filter(a => a !== zhFeatured).slice(0, 6)
};

// Inject dynamic relatedArticles for models page
zhData.models.relatedArticles = zhArticles.slice(0, 3).map(a => ({
  tag: a.tag || '深度解析',
  tagClass: a.tagClass || 'tag',
  datetime: a.isoDate,
  date: a.dateFormatted,
  title: a.title,
  desc: a.description,
  link: `/articles/${a.slug}/`
}));

const enData = {
  ...readLocale('en'),
  featuredArticle: enFeatured,
  latestArticles: enArticles.filter(a => a !== enFeatured).slice(0, 6)
};

enData.models.relatedArticles = enArticles.slice(0, 3).map(a => ({
  tag: a.tag || 'Deep Dive',
  tagClass: a.tagClass || 'tag',
  datetime: a.isoDate,
  date: a.dateFormatted,
  title: a.title,
  desc: a.description,
  link: `/en/articles/${a.slug}/`
}));

// 2. Process template
function processTemplate(templateStr, data, isEn) {
  // Common global variables
  const globalData = {
    langAttr: isEn ? 'en' : 'zh-CN',
    linkPrefix: isEn ? '/en' : '',
    ...data
  };

  const template = Handlebars.compile(templateStr);
  return template(globalData);
}

// 3. Main build loop
function buildPages() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    console.error(`Templates directory not found: ${TEMPLATES_DIR}`);
    return;
  }

  const templates = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.html'));

  console.log(`📝 Building ${templates.length} static pages using Handlebars...`);

  for (const templateFile of templates) {
    const templatePath = path.join(TEMPLATES_DIR, templateFile);
    const templateStr = fs.readFileSync(templatePath, 'utf-8');

    const pageName = templateFile.replace('.html', ''); // e.g., 'index', 'about'

    // Build ZH version
    const zhHtml = processTemplate(templateStr, zhData, false);
    // Build EN version
    const enHtml = processTemplate(templateStr, enData, true);

    // Determine output paths
    let outZhDir = BUILD_OUT_DIR;
    let outEnDir = path.join(BUILD_OUT_DIR, 'en');

    if (pageName !== 'index') {
      outZhDir = path.join(BUILD_OUT_DIR, pageName);
      outEnDir = path.join(BUILD_OUT_DIR, 'en', pageName);
    }

    fs.mkdirSync(outZhDir, { recursive: true });
    fs.mkdirSync(outEnDir, { recursive: true });

    fs.writeFileSync(path.join(outZhDir, 'index.html'), zhHtml, 'utf-8');
    fs.writeFileSync(path.join(outEnDir, 'index.html'), enHtml, 'utf-8');

    console.log(`  ✓ Built /${pageName !== 'index' ? pageName + '/' : ''} and /en/${pageName !== 'index' ? pageName + '/' : ''}`);
  }
}

buildPages();
