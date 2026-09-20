#!/usr/bin/env node
/**
 * Export domestic-ready Markdown for Juejin, Zhihu, WeChat, CSDN
 *
 * Usage:
 *   npm run export:domestic [slug]
 *   node scripts/export-domestic.js ai-coding-mastery
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ZH_ARTICLES_DIR = path.join(ROOT, 'content', 'zh', 'articles');
const EXPORT_DIR = path.join(ROOT, 'dist', 'domestic');
const SITE_URL = 'https://blog.llmgo.top';

if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

const args = process.argv.slice(2);
const slugArg = args[0];

const files = fs.readdirSync(ZH_ARTICLES_DIR).filter(f => f.endsWith('.md'));

if (!slugArg) {
  console.log('================================================================');
  console.log('📦 国内平台 Markdown 一键导出工具 (掘金 / 知乎 / 公众号 / CSDN)');
  console.log('================================================================\n');
  console.log('💡 请指定要导出的文章 slug，例如:');
  console.log('   npm run export:domestic ai-coding-mastery\n');
  console.log('📚 可导出的中文文章:');
  files.forEach(f => {
    const s = f.replace(/\.md$/, '');
    console.log(`   - ${s}`);
  });
  process.exit(0);
}

const targetFile = files.find(f => f === `${slugArg}.md` || f.includes(slugArg));
if (!targetFile) {
  console.error(`❌ 未找到文章: ${slugArg}`);
  process.exit(1);
}

const raw = fs.readFileSync(path.join(ZH_ARTICLES_DIR, targetFile), 'utf-8');
const { data, content } = matter(raw);
const slug = data.slug || slugArg;
const title = data.title;
const originalUrl = `${SITE_URL}/articles/${slug}/`;

// Clean up & convert links to absolute
let body = content;
body = body.replace(/\]\(\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, `](${SITE_URL}/articles/$1/)`);
body = body.replace(/\]\(\/en\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, `](${SITE_URL}/en/articles/$1/)`);
body = body.replace(/\]\(\/([^\)]+)\)/g, `](${SITE_URL}/$1)`);

// Prepare domestic header and footer for SEO backlink
const header = `> **本文首发于作者独立技术博客**：[大雄话AI — ${title}](${originalUrl})\n> 专注前沿大模型架构、智能体工程与高性能推理落地实战。\n\n---\n\n`;
const footer = `\n\n---\n\n> **作者简介**：大雄（ifnodoraemon），大模型工程架构实践者。欢迎访问独立博客 [blog.llmgo.top](${SITE_URL}) 获取更多最新前沿大模型与 Agent 深度研究。`;

const finalMarkdown = header + body + footer;
const exportPath = path.join(EXPORT_DIR, `${slug}.md`);

fs.writeFileSync(exportPath, finalMarkdown, 'utf-8');

console.log('================================================================');
console.log('✅ 国内平台适配版 Markdown 导出成功！');
console.log('================================================================\n');
console.log(`📌 标题: ${title}`);
console.log(`📁 导出文件路径: ${exportPath}`);
console.log(`🔗 自动嵌入的外链: ${originalUrl}\n`);
console.log('🚀 如何快速发布到国内平台:');
console.log('1. 【掘金】: 打开 https://juejin.cn/editor/drafts/new -> 复制该文件内容全选粘贴即可发布');
console.log('2. 【知乎】: 打开 https://zhuanlan.zhihu.com/write -> 点击右上角「...」或「文档导入」直接选该文件');
console.log('3. 【多平台一键发】: 借助 Chrome 插件「微信同步助手 (WechatSync)」，粘贴一次即可勾选全发！');
console.log('================================================================\n');
