#!/usr/bin/env node
/**
 * Automated Publisher to DEV.to with SEO Canonical Attribution
 *
 * Usage:
 *   node scripts/publish-devto.js [slug] [--draft]
 *   node scripts/publish-devto.js --top
 *   node scripts/publish-devto.js --all
 *   npm run publish:devto --top
 *
 * Requirements:
 *   DEV.to API Key in `.devto-api-key` or `DEVTO_API_KEY` env var.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EN_ARTICLES_DIR = path.join(ROOT, 'content', 'en', 'articles');
const SITE_URL = 'https://blog.llmgo.top';
const PUBLISHED_TRACK_FILE = path.join(ROOT, '.devto-published.json');

// Core top-tier engineering & research articles
const TOP_TIER_SLUGS = [
  'agent-loop-state-machine',
  'agent-memory-architecture',
  'test-time-compute-grpo',
  'sglang-vs-vllm-architecture',
  'speculative-decoding-eagle-guide',
  'vllm-serving-guide',
  'browser-use-agent-architecture',
  'mcp-guide',
  'skills-guide',
  'quantization-hands-on-guide',
  'quantization-precision-guide',
  'fine-tuning-guide',
  'rag-in-practice',
  'prompt-engineering-guide',
  'build-ai-agent',
  'model-comparison-2026',
  'deepseek-v4-kimi-k3-deployment-guide'
];

function getPublishedMap() {
  if (fs.existsSync(PUBLISHED_TRACK_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PUBLISHED_TRACK_FILE, 'utf-8'));
    } catch (_) {}
  }
  return {};
}

function recordPublished(slug, url) {
  const map = getPublishedMap();
  map[slug] = {
    url,
    publishedAt: new Date().toISOString()
  };
  fs.writeFileSync(PUBLISHED_TRACK_FILE, JSON.stringify(map, null, 2));
}

function getApiKey() {
  if (process.env.DEVTO_API_KEY) return process.env.DEVTO_API_KEY.trim();
  const keyFiles = ['.devto-api-key', 'devto-api-key.txt', '.env'];
  for (const file of keyFiles) {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8').trim();
      if (file === '.env') {
        const match = content.match(/DEVTO_API_KEY\s*=\s*(.+)/);
        if (match) return match[1].trim().replace(/^["']|["']$/g, '');
      } else if (content) {
        return content;
      }
    }
  }
  return null;
}

// Convert tags to DEV.to format (max 4 alphanumeric lowercase tags, <= 30 chars each)
function formatTags(tagStr, slug) {
  const defaults = ['ai', 'programming'];
  let tags = [];
  if (tagStr) {
    const clean = tagStr.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean) tags.push(clean);
  }
  if (slug.includes('agent')) tags.push('agents');
  if (slug.includes('vllm') || slug.includes('sglang') || slug.includes('compute')) tags.push('machinelearning');
  if (slug.includes('prompt')) tags.push('promptengineering');
  if (slug.includes('rag')) tags.push('datascience');
  if (slug.includes('quantization')) tags.push('performance');

  for (const def of defaults) {
    if (tags.length < 4 && !tags.includes(def)) tags.push(def);
  }
  return tags.slice(0, 4);
}

// Transform content: convert internal links to absolute and append canonical note
function prepareMarkdown(content, slug, title) {
  let md = content.replace(/\]\(\/en\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, '](https://blog.llmgo.top/en/articles/$1/)');
  md = md.replace(/\]\(\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, '](https://blog.llmgo.top/articles/$1/)');
  md = md.replace(/\]\(\/([^\)]+)\)/g, '](https://blog.llmgo.top/$1)');

  const canonicalUrl = `${SITE_URL}/en/articles/${slug}/`;
  const footer = `\n\n---\n\n*Originally published at [Nobita Talks AI](${canonicalUrl}) on blog.llmgo.top.*`;
  return md + footer;
}

async function publishArticle(apiKey, filePath, isDraft = false) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);

  const slug = data.slug || path.basename(filePath).replace(/\.en\.md$/, '');
  const title = data.title;
  const canonicalUrl = `${SITE_URL}/en/articles/${slug}/`;
  const tags = formatTags(data.tag, slug);
  const markdownBody = prepareMarkdown(content, slug, title);

  console.log(`\n📤 正在发布: "${title}"`);
  console.log(`   🏷️  标签: ${tags.join(', ')}`);
  console.log(`   🔗 Canonical 原文: ${canonicalUrl}`);
  console.log(`   📝 状态: ${isDraft ? '草稿 (Draft)' : '正式公开发布 (Published)'}`);

  const payload = {
    article: {
      title,
      published: !isDraft,
      body_markdown: markdownBody,
      tags,
      canonical_url: canonicalUrl,
      description: data.description || title
    }
  };

  const res = await fetch('https://dev.to/api/articles', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.forem.api-v1+json'
    },
    body: JSON.stringify(payload)
  });

  const resData = await res.json();

  if (!res.ok) {
    console.error(`   ❌ 发布失败 (${res.status}):`, resData.error || resData.message || JSON.stringify(resData));
    return { success: false, error: resData };
  }

  console.log(`   🎉 发布成功！`);
  console.log(`   🔗 DEV.to 文章地址: ${resData.url}`);
  recordPublished(slug, resData.url);
  return { success: true, url: resData.url };
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('================================================================');
  console.log('🚀 DEV.to 自动化文章发布器 (带 SEO Canonical 穿透)');
  console.log('================================================================\n');

  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('ℹ️  未检测到 DEV.to API Key (.devto-api-key)\n');
    return;
  }

  const args = process.argv.slice(2);
  const isDraft = args.includes('--draft');
  const isTop = args.includes('--top') || args.includes('-t');
  const isAll = args.includes('--all') || args.includes('-a');
  const force = args.includes('--force');

  const enFiles = fs.readdirSync(EN_ARTICLES_DIR).filter(f => f.endsWith('.en.md'));
  const publishedMap = getPublishedMap();

  let targetSlugs = [];

  if (isTop) {
    targetSlugs = TOP_TIER_SLUGS;
  } else if (isAll) {
    targetSlugs = enFiles.map(f => f.replace(/\.en\.md$/, ''));
  } else {
    const slugArg = args.find(a => !a.startsWith('--'));
    if (slugArg) {
      targetSlugs = [slugArg];
    }
  }

  if (targetSlugs.length === 0) {
    console.log('💡 使用方式:');
    console.log('   npm run publish:devto -- --top            # 发布全部核心高质量技术长文');
    console.log('   npm run publish:devto <slug>              # 发布单篇指定文章');
    console.log('   npm run publish:devto <slug> --draft      # 发布为草稿');
    console.log('\n📚 核心高质量文章列表 (--top):');
    TOP_TIER_SLUGS.forEach(s => {
      const status = publishedMap[s] ? `✅ 已发布: ${publishedMap[s].url}` : '⏳ 待发布';
      console.log(`   - ${s.padEnd(38)} [${status}]`);
    });
    return;
  }

  console.log(`📋 待发布任务清单 (${targetSlugs.length} 篇):`);

  let count = 0;
  let successCount = 0;

  for (const slug of targetSlugs) {
    count++;
    const targetFile = enFiles.find(f => f === `${slug}.en.md` || f.includes(slug));
    if (!targetFile) {
      console.warn(`\n⚠️ 未找到对应文件: ${slug}，跳过`);
      continue;
    }

    if (publishedMap[slug] && !force) {
      console.log(`\n⏭️  [${count}/${targetSlugs.length}] ${slug} 之前已发布过，跳过 (如需强制重发请加 --force)`);
      console.log(`   已发布链接: ${publishedMap[slug].url}`);
      continue;
    }

    console.log(`\n----------------------------------------------------------------`);
    console.log(`[${count}/${targetSlugs.length}] 正在处理: ${slug}`);

    const res = await publishArticle(apiKey, path.join(EN_ARTICLES_DIR, targetFile), isDraft);
    if (res.success) {
      successCount++;
    } else if (res.error && JSON.stringify(res.error).includes('Rate limit')) {
      const errStr = JSON.stringify(res.error);
      const match = errStr.match(/(\d+)\s*seconds/);
      const waitSec = match ? match[1] : '300';
      console.log(`\n⚠️  触发 DEV.to 新账号频率限制 (Rate Limit):`);
      console.log(`   平台要求新账号每发布一篇需间隔 ${waitSec} 秒 (~5分钟) 防刷。`);
      console.log(`   已发布文章已安全记录在 .devto-published.json 中，5分钟后重新运行命令将自动断点续传！\n`);
      break;
    }

    // Rate limit safety: 2.5 second pause between DEV.to API calls
    if (count < targetSlugs.length) {
      console.log(`⏳ 等待 2.5 秒以符合 DEV.to 频控限制...`);
      await sleep(2500);
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 批量发布任务完成！`);
  console.log(`   本次成功发布: ${successCount} 篇`);
  console.log('================================================================');
}

main();
