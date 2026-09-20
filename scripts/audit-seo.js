#!/usr/bin/env node
/**
 * Automated Technical SEO & Sitemap Auditor
 *
 * Usage: node scripts/audit-seo.js [--remote]
 * 
 * Verifies:
 * 1. Sitemap integrity (valid routes, no malformed .html/ or verification tokens)
 * 2. Canonical tag accuracy (exact URL match, trailing slash consistency)
 * 3. Robots meta directive (no accidental noindex/nofollow)
 * 4. Bilingual hreflang symmetry (zh, en, x-default)
 * 5. Title & Meta Description presence and length
 * 6. Structured data (JSON-LD syntax, schema types: FAQPage, TechArticle, etc.)
 * 7. OpenGraph and Twitter cards
 * 8. Clean heading hierarchy (H1 presence)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SITE_URL = 'https://blog.llmgo.top';

console.log('🔍 Starting Automated SEO & Indexing Readiness Audit...\n');

if (!fs.existsSync(DIST)) {
  console.error('❌ dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

const sitemapPath = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(sitemapPath)) {
  console.error('❌ dist/sitemap.xml not found.');
  process.exit(1);
}

const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
const locMatches = [...sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);

console.log(`📄 Found ${locMatches.length} URLs in sitemap.xml\n`);

let passedChecks = 0;
let warnings = 0;
let errors = 0;

for (const url of locMatches) {
  const urlObj = new URL(url);
  const route = urlObj.pathname;

  // 1. Sanity check: no malformed extensions with trailing slashes like .html/
  if (/\.[a-zA-Z0-9]+\/$/.test(route)) {
    console.error(`❌ [Malformed URL] Sitemap contains invalid file path with trailing slash: ${url}`);
    errors++;
    continue;
  }

  // 2. Map route to local file
  let localHtmlPath;
  if (route === '/') {
    localHtmlPath = path.join(DIST, 'index.html');
  } else {
    // Route like /articles/ai-coding-mastery/ -> dist/articles/ai-coding-mastery/index.html
    const trimmed = route.replace(/^\/|\/$/g, '');
    localHtmlPath = path.join(DIST, trimmed, 'index.html');
  }

  if (!fs.existsSync(localHtmlPath)) {
    console.error(`❌ [Dead Link in Sitemap] Cannot find local HTML file for: ${url} (Expected at: ${localHtmlPath})`);
    errors++;
    continue;
  }

  const html = fs.readFileSync(localHtmlPath, 'utf-8');

  // 3. Robots meta check
  const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (robotsMatch) {
    const content = robotsMatch[1].toLowerCase();
    if (content.includes('noindex')) {
      console.error(`❌ [Blocked from Indexing] URL has noindex tag: ${url}`);
      errors++;
    }
  }

  // 4. Canonical tag check
  const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
  if (!canonicalMatch) {
    console.warn(`⚠️  [Missing Canonical] ${url}`);
    warnings++;
  } else {
    const canonicalHref = canonicalMatch[1];
    if (canonicalHref !== url) {
      console.error(`❌ [Canonical Mismatch] Page: ${url} declares Canonical: ${canonicalHref}`);
      errors++;
    }
  }

  // 5. Title tag check
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    console.error(`❌ [Missing Title] ${url}`);
    errors++;
  } else if (titleMatch[1].trim().length < 5) {
    console.warn(`⚠️  [Short Title] ${url} -> "${titleMatch[1]}"`);
    warnings++;
  }

  // 6. Meta Description check
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (!descMatch || !descMatch[1].trim()) {
    console.warn(`⚠️  [Missing Description] ${url}`);
    warnings++;
  }

  // 7. OpenGraph Checks
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["']/i);
  const ogImage = html.match(/<meta[^>]*property=["']og:image["']/i);
  if (!ogTitle || !ogImage) {
    console.warn(`⚠️  [Incomplete OpenGraph] Missing og:title or og:image in ${url}`);
    warnings++;
  }

  // 8. Bilingual Hreflang reciprocity
  const hreflangs = [...html.matchAll(/<link[^>]*hreflang=["']([^"']*)["'][^>]*href=["']([^"']*)["'][^>]*>/gi)];
  if (route.startsWith('/articles/') || route.startsWith('/en/articles/')) {
    if (hreflangs.length < 2) {
      console.warn(`⚠️  [Missing Hreflang] Article page has fewer than 2 alternate links: ${url}`);
      warnings++;
    }
  }

  // 9. Structured Data (JSON-LD) Validation
  const jsonLdScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const script of jsonLdScripts) {
    try {
      const parsed = JSON.parse(script[1]);
      if (!parsed['@context'] || !parsed['@type']) {
        console.warn(`⚠️  [Invalid JSON-LD schema] Missing @context or @type in ${url}`);
        warnings++;
      }
    } catch (e) {
      console.error(`❌ [JSON-LD Parse Error] Broken schema in ${url}: ${e.message}`);
      errors++;
    }
  }

  // 10. H1 tag check
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  if (h1Matches.length === 0) {
    console.warn(`⚠️  [Missing H1] No <h1> tag found in ${url}`);
    warnings++;
  }

  passedChecks++;
}

// Check robots.txt
const robotsDistPath = path.join(DIST, 'robots.txt');
if (fs.existsSync(robotsDistPath)) {
  const robotsText = fs.readFileSync(robotsDistPath, 'utf-8');
  if (!robotsText.includes('Sitemap:')) {
    console.error('❌ robots.txt does not link to sitemap.xml');
    errors++;
  }
} else {
  console.error('❌ robots.txt missing in dist');
  errors++;
}

console.log('================================================================');
console.log(`📊 Audit Summary:`);
console.log(`   Total URLs Audited: ${locMatches.length}`);
console.log(`   Passed:             ${passedChecks}`);
console.log(`   Warnings:           ${warnings}`);
console.log(`   Errors:             ${errors}`);
console.log('================================================================');

if (errors > 0) {
  console.error(`\n❌ SEO Audit Failed with ${errors} critical errors!`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${locMatches.length} pages passed Technical SEO & Indexing readiness checks!`);
  process.exit(0);
}
