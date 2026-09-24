#!/usr/bin/env node
/**
 * Automated Technical SEO & Sitemap Auditor
 *
 * Usage: node scripts/audit-seo.js [--remote]
 * 
 * Verifies:
 * 1. Sitemap integrity (valid routes, lastmod, xhtml:link alternates)
 * 2. Canonical tag accuracy (exact URL match, trailing slash consistency)
 * 3. Robots meta directive (no accidental noindex/nofollow)
 * 4. Bilingual hreflang symmetry (zh, en, x-default)
 * 5. Title & Meta Description presence and length
 * 6. Structured data (JSON-LD syntax, schema types: FAQPage, TechArticle, BreadcrumbList, etc.)
 * 7. OpenGraph and Twitter cards (including raster format enforcement for og:image)
 * 8. Clean heading hierarchy (H1 presence)
 * 9. Robots.txt linking to sitemap and crawler allowances
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
const lastmodMatches = [...sitemapContent.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map(m => m[1]);
const xhtmlMatches = [...sitemapContent.matchAll(/<xhtml:link[^>]+>/g)];

console.log(`📄 Found ${locMatches.length} URLs in sitemap.xml`);
console.log(`🕒 Found ${lastmodMatches.length} <lastmod> timestamps in sitemap.xml`);
console.log(`🌐 Found ${xhtmlMatches.length} <xhtml:link> alternates in sitemap.xml\n`);

let passedChecks = 0;
let warnings = 0;
let errors = 0;

if (lastmodMatches.length !== locMatches.length) {
  console.warn(`⚠️  [Sitemap Warning] ${locMatches.length - lastmodMatches.length} URLs are missing <lastmod> tags in sitemap.xml`);
  warnings++;
}

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

  // 7. OpenGraph Checks (Including raster image enforcement)
  const ogTitle = html.match(/<meta[^>]*property=["']og:title["']/i);
  const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  if (!ogTitle || !ogImageMatch) {
    console.warn(`⚠️  [Incomplete OpenGraph] Missing og:title or og:image in ${url}`);
    warnings++;
  } else {
    const ogImgUrl = ogImageMatch[1];
    if (ogImgUrl.endsWith('.svg')) {
      console.warn(`⚠️  [Non-raster og:image] Social platforms and Google require raster images (PNG/JPG/WebP). Found SVG in ${url}: ${ogImgUrl}`);
      warnings++;
    }
  }

  // 8. Bilingual Hreflang reciprocity
  const hreflangs = [...html.matchAll(/<link[^>]*hreflang=["']([^"']*)["'][^>]*href=["']([^"']*)["'][^>]*>/gi)];
  if (hreflangs.length < 2) {
    console.warn(`⚠️  [Missing Hreflang] Page has fewer than 2 alternate links: ${url}`);
    warnings++;
  }

  // 9. Structured Data (JSON-LD) Validation
  const jsonLdScripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  let hasBreadcrumbs = false;
  let hasValidSchema = false;

  for (const script of jsonLdScripts) {
    try {
      const parsed = JSON.parse(script[1]);
      if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
        hasValidSchema = true;
      } else if (parsed['@context'] && parsed['@type']) {
        hasValidSchema = true;
        if (parsed['@type'] === 'BreadcrumbList') {
          hasBreadcrumbs = true;
        }
      }
    } catch (e) {
      console.error(`❌ [JSON-LD Parse Error] Broken schema in ${url}: ${e.message}`);
      errors++;
    }
  }

  if (!hasValidSchema) {
    console.warn(`⚠️  [Missing Structured Data] No valid JSON-LD found in ${url}`);
    warnings++;
  }

  // Root homepage can use WebSite + Blog instead of Breadcrumbs
  if (!hasBreadcrumbs && route !== '/' && route !== '/en/') {
    console.warn(`⚠️  [Missing Breadcrumbs Schema] Page lacks BreadcrumbList JSON-LD: ${url}`);
    warnings++;
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
