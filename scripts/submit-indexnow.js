#!/usr/bin/env node
/**
 * Submit all site URLs to IndexNow (Bing, Yandex, Seznam, Naver, Perplexity)
 * Protocol: https://www.indexnow.org/documentation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HOST = 'blog.llmgo.top';
const KEY = 'd0b17a8c4e6f9a2b5d8e1f4c7a0b3e6f';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const SITEMAP_PATH = path.join(ROOT, 'dist', 'sitemap.xml');

async function main() {
  console.log('🚀 IndexNow URL Submission Starting...');

  let urls = [];

  if (fs.existsSync(SITEMAP_PATH)) {
    const sitemapContent = fs.readFileSync(SITEMAP_PATH, 'utf-8');
    const matches = sitemapContent.matchAll(/<loc>(.*?)<\/loc>/g);
    for (const match of matches) {
      if (match[1]) {
        urls.push(match[1].trim());
      }
    }
  }

  if (urls.length === 0) {
    console.warn('⚠️ No sitemap.xml found in dist/. Falling back to root domain.');
    urls = [`https://${HOST}/`, `https://${HOST}/en/`, `https://${HOST}/articles/`, `https://${HOST}/en/articles/`];
  }

  console.log(`📋 Found ${urls.length} URLs to submit to IndexNow.`);

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  const endpoints = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Submitting to ${endpoint}...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok || response.status === 200 || response.status === 202) {
        console.log(`  ✓ Successfully submitted to ${endpoint} (Status: ${response.status})`);
      } else {
        const text = await response.text().catch(() => '');
        console.warn(`  ⚠️ Response from ${endpoint}: ${response.status} ${response.statusText} ${text}`);
      }
    } catch (err) {
      console.error(`  ❌ Failed to submit to ${endpoint}:`, err.message);
    }
  }

  console.log('✨ IndexNow submission process completed.\n');
}

main().catch(err => {
  console.error('IndexNow script encountered an error:', err);
  process.exit(0); // non-blocking for CI
});
