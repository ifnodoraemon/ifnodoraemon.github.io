#!/usr/bin/env node
/**
 * Automated Publisher to DEV.to with SEO Canonical Attribution
 *
 * Usage:
 *   node scripts/publish-devto.js [slug] [--draft]
 *   npm run publish:devto ai-coding-mastery
 *
 * Requirements:
 *   DEV.to API Key in `.devto-api-key` or `DEVTO_API_KEY` env var.
 *   Obtain from: https://dev.to/settings/extensions -> DEV Community API Keys
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EN_ARTICLES_DIR = path.join(ROOT, 'content', 'en', 'articles');
const SITE_URL = 'https://blog.llmgo.top';

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

  for (const def of defaults) {
    if (tags.length < 4 && !tags.includes(def)) tags.push(def);
  }
  return tags.slice(0, 4);
}

// Transform content: convert internal links to absolute and append canonical note
function prepareMarkdown(content, slug, title) {
  // Convert /en/articles/<slug>/ to absolute URL
  let md = content.replace(/\]\(\/en\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, '](https://blog.llmgo.top/en/articles/$1/)');
  md = md.replace(/\]\(\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, '](https://blog.llmgo.top/articles/$1/)');

  // Convert image relative links if any
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

  console.log(`\n📤 正在发布文章至 DEV.to...`);
  console.log(`   📌 标题: ${title}`);
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
    console.error(`\n❌ 发布失败 (${res.status}):`, resData.error || resData.message || JSON.stringify(resData));
    process.exit(1);
  }

  console.log(`\n🎉 发布成功！`);
  console.log(`   🔗 DEV.to 文章地址: ${resData.url}`);
  if (isDraft) {
    console.log(`   👀 预览与草稿编辑: https://dev.to/dashboard`);
  }
}

async function main() {
  console.log('================================================================');
  console.log('🚀 DEV.to 自动化文章发布器 (带 SEO Canonical 穿透)');
  console.log('================================================================\n');

  const apiKey = getApiKey();

  if (!apiKey) {
    console.log('ℹ️  未检测到 DEV.to API Key\n');
    console.log('📌 获取并配置 DEV.to API Key (只需 30 秒):');
    console.log('----------------------------------------------------------------');
    console.log('1. 打开 DEV.to 扩展设置页面:');
    console.log('   👉 https://dev.to/settings/extensions');
    console.log('2. 滚动到底部找到「DEV Community API Keys」:');
    console.log('   - 在 Description 输入框输入: blog-publisher');
    console.log('   - 点击「Generate API Key」生成密钥');
    console.log('3. 复制生成的密钥字符串，并保存至本项目根目录下的 `.devto-api-key` 文件:');
    console.log(`   - 路径: ${path.join(ROOT, '.devto-api-key')}`);
    console.log('   - (已自动在 .gitignore 中忽略，安全绝不泄露)');
    console.log('----------------------------------------------------------------\n');
    return;
  }

  const args = process.argv.slice(2);
  const isDraft = args.includes('--draft');
  const slugArg = args.find(a => !a.startsWith('--'));

  if (!fs.existsSync(EN_ARTICLES_DIR)) {
    console.error(`❌ 英文文章目录不存在: ${EN_ARTICLES_DIR}`);
    process.exit(1);
  }

  const enFiles = fs.readdirSync(EN_ARTICLES_DIR).filter(f => f.endsWith('.en.md'));

  if (!slugArg) {
    console.log('💡 请指定要发布的文章 slug，例如:');
    console.log('   npm run publish:devto ai-coding-mastery\n');
    console.log('📚 可发布的英文文章列表:');
    enFiles.forEach(f => {
      const slug = f.replace(/\.en\.md$/, '');
      console.log(`   - ${slug}`);
    });
    console.log('\n参数说明:');
    console.log('   --draft    以草稿形式发布 (可以在 DEV.to 后台先预览)');
    return;
  }

  const targetFile = enFiles.find(f => f === `${slugArg}.en.md` || f.includes(slugArg));
  if (!targetFile) {
    console.error(`❌ 未找到匹配 "${slugArg}" 的英文文章！`);
    console.log('可用文章:', enFiles.map(f => f.replace(/\.en\.md$/, '')).join(', '));
    process.exit(1);
  }

  await publishArticle(apiKey, path.join(EN_ARTICLES_DIR, targetFile), isDraft);
}

main();
