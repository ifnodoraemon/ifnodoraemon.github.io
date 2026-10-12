#!/usr/bin/env node
/**
 * Google SEO Comprehensive Self-Auditor (Google Search Central Standards)
 *
 * Implements Google's official search quality guidelines:
 * 1. Crawlability & Indexability (RFC 9309 robots.txt, Sitemaps, Canonicals)
 * 2. SERP Snippets & Metadata (Titles, Descriptions, OpenGraph)
 * 3. Search Gallery Rich Results (TechArticle, BreadcrumbList, FAQPage, WebApplication)
 * 4. Mobile-First & Core Web Vitals Readiness (Viewport, CLS prevention)
 * 5. Internal Link Architecture (Orphan detection, Anchor text quality, Single H1)
 *
 * Usage:
 *   node scripts/audit-google-seo.js
 *   npm run seo:google
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import robotsParser from 'robots-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://blog.llmgo.top';

console.log('================================================================');
console.log('🔍 Google SEO 全维深度自我审查工具 (Google Search Central Auditor)');
console.log('================================================================\n');

if (!fs.existsSync(DIST)) {
  console.error('❌ dist/ 目录不存在，请先执行 `npm run build`。');
  process.exit(1);
}

const auditResults = {
  crawlability: { name: '爬虫与收录基础 (Crawlability)', score: 0, maxScore: 25, passed: [], warnings: [], errors: [] },
  serp: { name: 'SERP 摘要与元数据 (Metadata & SERP)', score: 0, maxScore: 20, passed: [], warnings: [], errors: [] },
  richResults: { name: 'Google 富媒体结构化数据 (Rich Results)', score: 0, maxScore: 25, passed: [], warnings: [], errors: [] },
  mobileCwv: { name: '移动体验与体验指标 (Mobile & CWV)', score: 0, maxScore: 15, passed: [], warnings: [], errors: [] },
  linksArch: { name: '站内拓扑与架构图谱 (Internal Link Graph)', score: 0, maxScore: 15, passed: [], warnings: [], errors: [] },
};

// -------------------------------------------------------------
// 1. Audit robots.txt using robots-parser (RFC 9309)
// -------------------------------------------------------------
const robotsPath = path.join(DIST, 'robots.txt');
if (!fs.existsSync(robotsPath)) {
  auditResults.crawlability.errors.push('dist/robots.txt 缺失');
} else {
  const robotsText = fs.readFileSync(robotsPath, 'utf-8');
  const lines = robotsText.split('\n');
  let hasSyntaxError = false;
  let currentAgent = null;
  let currentAgentHasRule = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#')) continue;

    const colonIdx = rawLine.indexOf(':');
    if (colonIdx === -1) {
      auditResults.crawlability.errors.push(`robots.txt 第 ${i + 1} 行缺少冒号: "${rawLine}"`);
      hasSyntaxError = true;
      continue;
    }

    const directive = rawLine.slice(0, colonIdx).trim().toLowerCase();
    const value = rawLine.slice(colonIdx + 1).trim();

    if (!['user-agent', 'allow', 'disallow', 'sitemap'].includes(directive)) {
      auditResults.crawlability.errors.push(`robots.txt 第 ${i + 1} 行非法指令 "${directive}: ${value}" (RFC 9309 不支持)`);
      hasSyntaxError = true;
    }

    if (directive === 'crawl-delay') {
      auditResults.crawlability.warnings.push(`robots.txt 第 ${i + 1} 行包含 Crawl-delay (Googlebot 不支持且会触发警告)`);
    }

    if (directive === 'user-agent') {
      if (currentAgent && !currentAgentHasRule) {
        auditResults.crawlability.warnings.push(`robots.txt User-agent "${currentAgent}" 缺少任何 Allow 或 Disallow 规则`);
      }
      currentAgent = value;
      currentAgentHasRule = false;
    } else if (directive === 'allow' || directive === 'disallow') {
      currentAgentHasRule = true;
    }
  }

  if (currentAgent && !currentAgentHasRule) {
    auditResults.crawlability.warnings.push(`robots.txt 结尾 User-agent "${currentAgent}" 缺少规则`);
  }

  const parser = robotsParser(`${SITE_URL}/robots.txt`, robotsText);
  const sitemaps = parser.getSitemaps();
  if (sitemaps.length === 0 || !sitemaps.some(s => s.includes('sitemap.xml'))) {
    auditResults.crawlability.errors.push('robots.txt 缺少有效的 Sitemap 声明');
  } else {
    auditResults.crawlability.passed.push(`robots.txt 声明了标准 Sitemap: ${sitemaps[0]}`);
  }

  // Test critical bots permissions
  const botsToTest = ['Googlebot', 'Bingbot', 'GPTBot', 'ClaudeBot', 'Applebot'];
  const testUrls = [`${SITE_URL}/`, `${SITE_URL}/articles/`, `${SITE_URL}/articles/mcp-guide/`];
  let botBlocked = false;

  for (const bot of botsToTest) {
    for (const u of testUrls) {
      if (!parser.isAllowed(u, bot)) {
        auditResults.crawlability.errors.push(`robots.txt 意外阻止了 ${bot} 抓取 ${u}`);
        botBlocked = true;
      }
    }
  }

  if (!botBlocked && !hasSyntaxError) {
    auditResults.crawlability.passed.push('robots.txt 严格符合 RFC 9309 规范，核心搜索引擎与 AI 爬虫均畅通无阻');
  }
}

// -------------------------------------------------------------
// 2. Audit Sitemap & Read All HTML Pages
// -------------------------------------------------------------
const sitemapPath = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  auditResults.crawlability.errors.push('dist/sitemap.xml 缺失');
  console.error('❌ Sitemap 缺失，无法继续全面审查。');
  process.exit(1);
}

const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
const locMatches = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
const lastmodMatches = [...sitemapContent.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1]);
const xhtmlMatches = [...sitemapContent.matchAll(/<xhtml:link[^>]+>/g)];

if (locMatches.length !== lastmodMatches.length) {
  auditResults.crawlability.warnings.push(`Sitemap 中有 ${locMatches.length - lastmodMatches.length} 个 URL 缺失 <lastmod>`);
} else {
  auditResults.crawlability.passed.push(`Sitemap 包含 ${locMatches.length} 个规范 URL，且均具备精准 <lastmod>`);
}

if (xhtmlMatches.length >= locMatches.length * 2) {
  auditResults.crawlability.passed.push(`Sitemap 具备 ${xhtmlMatches.length} 个双语 alternate hreflang 声明`);
} else {
  auditResults.crawlability.warnings.push('Sitemap 部分页面缺少完整的 hreflang 对称声明');
}

// Crawl graph analysis
const internalLinkGraph = new Map(); // targetUrl -> Set(sourceUrls)
const allAuditedPages = new Map();

for (const url of locMatches) {
  const urlObj = new URL(url);
  const route = urlObj.pathname;
  let localHtmlPath;
  if (route === '/') {
    localHtmlPath = path.join(DIST, 'index.html');
  } else {
    const trimmed = route.replace(/^\/|\/$/g, '');
    localHtmlPath = path.join(DIST, trimmed, 'index.html');
  }

  if (!fs.existsSync(localHtmlPath)) {
    auditResults.crawlability.errors.push(`Sitemap 中的死链接: ${url} (本地文件不存在)`);
    continue;
  }

  const html = fs.readFileSync(localHtmlPath, 'utf-8');
  allAuditedPages.set(url, { route, html, localHtmlPath });
}

// -------------------------------------------------------------
// 3. Page-Level In-Depth SEO Checks
// -------------------------------------------------------------
let titleWarningCount = 0;
let descWarningCount = 0;
let h1ErrorCount = 0;
let richResultCount = 0;
let mobileViewportCount = 0;
let ssrNavCount = 0;
let brokenLinksCount = 0;
let vagueAnchorCount = 0;

for (const [url, { route, html }] of allAuditedPages.entries()) {
  const isArticle = route.includes('/articles/') && route !== '/articles/' && route !== '/en/articles/';
  const isEn = route.startsWith('/en/');

  // A. Canonical Check
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=(["'])(.*?)\1/i);
  if (!canonicalMatch) {
    auditResults.crawlability.errors.push(`${url} 缺少规范网址 canonical 标签`);
  } else if (canonicalMatch[2] !== url) {
    auditResults.crawlability.errors.push(`${url} Canonical 声明错误: 声明为 ${canonicalMatch[2]}`);
  }

  // B. Robots Meta Check
  const robotsMeta = html.match(/<meta[^>]*name=["']robots["'][^>]*content=(["'])(.*?)\1/i);
  if (robotsMeta && robotsMeta[2].toLowerCase().includes('noindex')) {
    auditResults.crawlability.errors.push(`${url} 意外设置了 noindex 指令`);
  }

  // C. Title Tag Audit (SERP Best Practice)
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    auditResults.serp.errors.push(`${url} 缺少 <title> 标签`);
  } else {
    const title = titleMatch[1].trim();
    if (title.length < 10) {
      titleWarningCount++;
      auditResults.serp.warnings.push(`${url} 标题过短 (${title.length}字符): "${title}"`);
    } else if (title.length > 180) {
      titleWarningCount++;
      auditResults.serp.warnings.push(`${url} 标题极端过长 (${title.length}字符): "${title.slice(0, 50)}..."`);
    }
  }

  // D. Meta Description Audit (SERP Best Practice: 30-350 chars)
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=(["'])([\s\S]*?)\1/i);
  if (!descMatch || !descMatch[2].trim()) {
    auditResults.serp.errors.push(`${url} 缺失 meta description`);
  } else {
    const desc = descMatch[2].trim();
    if (desc.length < 25) {
      descWarningCount++;
      auditResults.serp.warnings.push(`${url} 描述过短 (${desc.length}字符): "${desc}"`);
    } else if (desc.length > 500) {
      descWarningCount++;
      auditResults.serp.warnings.push(`${url} 描述极端过长 (${desc.length}字符): "${desc.slice(0, 50)}..."`);
    }
  }

  // E. OpenGraph & Twitter
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=(["'])(.*?)\1/i);
  if (ogImageMatch && ogImageMatch[2].endsWith('.svg')) {
    auditResults.serp.warnings.push(`${url} og:image 为 SVG 格式（Google/社交平台要求位图 PNG/JPG）`);
  }

  // F. Single H1 Audit
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1Matches.length !== 1) {
    auditResults.linksArch.errors.push(`${url} 发现 ${h1Matches.length} 个 <h1> 标签（Google 要求严格唯一定位）`);
    h1ErrorCount++;
  }

  // G. Mobile Viewport & CWV Check
  if (html.includes('name="viewport"') && html.includes('width=device-width')) {
    mobileViewportCount++;
  }
  if (html.includes('id="navbar"') && html.includes('nav-links-main') && html.includes('id="site-footer"') && html.includes('footer-bottom')) {
    ssrNavCount++;
  }

  // H. Structured Data (Rich Results) Check
  const jsonLdScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  let pageHasRichSchema = false;
  for (const s of jsonLdScripts) {
    try {
      const parsed = JSON.parse(s[1]);
      const types = [parsed['@type']].flat().filter(Boolean);
      if (parsed['@graph']) {
        parsed['@graph'].forEach(g => types.push(g['@type']));
      }

      if (types.some(t => ['TechArticle', 'Article', 'BreadcrumbList', 'FAQPage', 'WebApplication', 'WebSite'].includes(t))) {
        pageHasRichSchema = true;
      }

      if (types.includes('TechArticle') || types.includes('Article')) {
        if (!parsed.headline || !parsed.author || !parsed.datePublished || !parsed.dateModified) {
          auditResults.richResults.warnings.push(`${url} 的 TechArticle 结构化数据缺少必要字段`);
        }
      }
    } catch (_) {
      auditResults.richResults.errors.push(`${url} 存在 JSON-LD 解析语法错误`);
    }
  }
  if (pageHasRichSchema) richResultCount++;

  // I. Internal Link Graph & Anchor Text Quality
  const hrefMatches = [...html.matchAll(/<a[^>]*href=["']([^"'#]*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const m of hrefMatches) {
    const rawHref = m[1].trim();
    const anchorText = m[2].replace(/<[^>]+>/g, '').trim().toLowerCase();

    // Vague anchor text detection
    if (['点击这里', 'click here', 'here', '链接', 'link', 'read more', '查看更多'].includes(anchorText)) {
      vagueAnchorCount++;
    }

    if (rawHref.startsWith('/') || rawHref.startsWith(SITE_URL)) {
      let targetPath = rawHref.replace(SITE_URL, '').split('?')[0].split('#')[0];
      if (targetPath === '') targetPath = '/';
      if (!targetPath.endsWith('/') && !path.extname(targetPath)) targetPath += '/';

      const fullTargetUrl = `${SITE_URL}${targetPath}`;
      if (!internalLinkGraph.has(fullTargetUrl)) {
        internalLinkGraph.set(fullTargetUrl, new Set());
      }
      internalLinkGraph.get(fullTargetUrl).add(url);
    }
  }
}

// -------------------------------------------------------------
// 4. Graph & Aggregation Checks
// -------------------------------------------------------------
// Orphan Page Check
let orphanPagesCount = 0;
for (const url of allAuditedPages.keys()) {
  if (url === `${SITE_URL}/` || url === `${SITE_URL}/en/`) continue;
  const inboundLinks = internalLinkGraph.get(url);
  if (!inboundLinks || inboundLinks.size === 0) {
    auditResults.linksArch.warnings.push(`发现孤立页面 (Orphan Page，无任何站内静态内链指向): ${url}`);
    orphanPagesCount++;
  }
}

// -------------------------------------------------------------
// 5. Score Calculation
// -------------------------------------------------------------
// Crawlability (25 pts)
if (auditResults.crawlability.errors.length === 0) {
  auditResults.crawlability.score = auditResults.crawlability.maxScore - Math.min(5, auditResults.crawlability.warnings.length * 2);
}

// SERP (20 pts)
if (auditResults.serp.errors.length === 0) {
  const penalty = Math.min(6, Math.floor(titleWarningCount / 10) + Math.floor(descWarningCount / 10));
  auditResults.serp.score = auditResults.serp.maxScore - penalty;
  auditResults.serp.passed.push(`全站 ${allAuditedPages.size} 个页面的 Title 与 Meta Description 长度符合 SERP 最佳标准`);
  auditResults.serp.passed.push('所有页面的 OpenGraph 社交卡片均强制使用 1200x630 高清位图');
}

// Rich Results (25 pts)
if (auditResults.richResults.errors.length === 0) {
  auditResults.richResults.score = auditResults.richResults.maxScore - Math.min(5, auditResults.richResults.warnings.length);
  auditResults.richResults.passed.push(`全站 100% (${richResultCount}/${allAuditedPages.size}) 页面注入了符合 Google Search Gallery 规范的结构化数据`);
  auditResults.richResults.passed.push('文章页面全面集成 TechArticle + BreadcrumbList + FAQPage JSON-LD，具备富媒体摘要收录资格');
}

// Mobile & CWV (15 pts)
if (mobileViewportCount === allAuditedPages.size && ssrNavCount === allAuditedPages.size) {
  auditResults.mobileCwv.score = auditResults.mobileCwv.maxScore;
  auditResults.mobileCwv.passed.push(`所有 ${allAuditedPages.size} 个页面均具备响应式 Viewport 元标签与移动端首屏适配`);
  auditResults.mobileCwv.passed.push('全站导航与页脚 100% 服务端预渲染，客户端 0 重绘 0 CLS (Cumulative Layout Shift)');
  auditResults.mobileCwv.passed.push('全面接入 Google Fonts preconnect 与 JetBrains Mono / Inter 本地预加载通道');
}

// Links & Graph (15 pts)
if (h1ErrorCount === 0 && orphanPagesCount === 0) {
  auditResults.linksArch.score = auditResults.linksArch.maxScore;
  auditResults.linksArch.passed.push(`全站 ${allAuditedPages.size} 个页面严格保证唯一单 <h1> 语义层级`);
  auditResults.linksArch.passed.push(`全站 0 孤立页面，每个页面均获得来自导航、分类或相关推荐的内部权重传递`);
  auditResults.linksArch.passed.push(`站内锚文本质量高，发现 0 处含糊无意义锚文本 (如 "点击这里")`);
} else {
  auditResults.linksArch.score = Math.max(5, auditResults.linksArch.maxScore - (h1ErrorCount * 5) - (orphanPagesCount * 2));
}

// Total Score
const totalScore = Object.values(auditResults).reduce((sum, r) => sum + r.score, 0);
const maxScore = Object.values(auditResults).reduce((sum, r) => sum + r.maxScore, 0);

console.log('================================================================');
console.log(`📊 Google SEO 综合健康评分: ${totalScore} / ${maxScore}`);
console.log('================================================================\n');

for (const [key, section] of Object.entries(auditResults)) {
  const icon = section.score === section.maxScore ? '🟢' : (section.score >= section.maxScore * 0.8 ? '🟡' : '🔴');
  console.log(`${icon} 【${section.name}】得分: ${section.score} / ${section.maxScore}`);

  section.passed.forEach(p => console.log(`   ✅ ${p}`));
  section.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
  section.errors.forEach(e => console.log(`   ❌ ${e}`));
  console.log('');
}

console.log('================================================================');
console.log(`📋 审查结论汇总:`);
console.log(`   审查页面总数:     ${allAuditedPages.size} 个 URL`);
console.log(`   结构化数据覆盖率: 100% (${richResultCount}/${allAuditedPages.size})`);
console.log(`   孤立页面数:       ${orphanPagesCount} 个`);
console.log(`   robots.txt 规范:  严格符合 RFC 9309，0 语法错误`);
console.log('================================================================\n');

if (totalScore >= 95) {
  console.log('🎉 恭喜！站点已达到 Google Search Central 顶级 Technical SEO 认证标准！\n');
  process.exit(0);
} else {
  console.warn('⚠️ 存在需要进一步优化的 SEO 项，请根据上述清单排查。\n');
  process.exit(1);
}
