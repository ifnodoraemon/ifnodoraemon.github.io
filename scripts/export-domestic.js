#!/usr/bin/env node
/**
 * Export domestic-ready Markdown for Juejin, Zhihu, WeChat, CSDN
 *
 * Usage:
 *   npm run export:domestic [slug]
 *   npm run export:domestic -- --all
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
const isAll = args.includes('--all') || args.includes('-a');
const slugArg = args.find(a => !a.startsWith('--'));

const files = fs.readdirSync(ZH_ARTICLES_DIR).filter(f => f.endsWith('.md'));

function exportOne(file) {
  const raw = fs.readFileSync(path.join(ZH_ARTICLES_DIR, file), 'utf-8');
  const { data, content } = matter(raw);
  const slug = data.slug || file.replace(/\.md$/, '');
  const title = data.title;
  const originalUrl = `${SITE_URL}/articles/${slug}/`;

  let body = content;
  body = body.replace(/\]\(\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, `](${SITE_URL}/articles/$1/)`);
  body = body.replace(/\]\(\/en\/articles\/([a-zA-Z0-9_-]+)\/?\)/g, `](${SITE_URL}/en/articles/$1/)`);
  body = body.replace(/\]\(\/([^\)]+)\)/g, `](${SITE_URL}/$1)`);

  const header = `> **本文首发于作者独立技术博客**：[大雄话AI — ${title}](${originalUrl})\n> 专注前沿大模型架构、智能体工程与高性能推理落地实战。\n\n---\n\n`;
  const footer = `\n\n---\n\n> **作者简介**：大雄（ifnodoraemon），大模型工程架构实践者。欢迎访问独立博客 [blog.llmgo.top](${SITE_URL}) 获取更多最新前沿大模型与 Agent 深度研究。`;

  const finalMarkdown = header + body + footer;
  const exportPath = path.join(EXPORT_DIR, `${slug}.md`);
  fs.writeFileSync(exportPath, finalMarkdown, 'utf-8');
  return { slug, title, exportPath, originalUrl };
}

if (!slugArg && !isAll) {
  console.log('================================================================');
  console.log('📦 国内平台 Markdown 一键导出工具 (掘金 / 知乎 / 公众号 / CSDN)');
  console.log('================================================================\n');
  console.log('💡 使用方式:');
  console.log('   npm run export:domestic -- --all          # 一键导出全部中文文章');
  console.log('   npm run export:domestic <slug>            # 导出指定单篇文章\n');
  console.log('📚 可导出的中文文章:');
  files.forEach(f => {
    const s = f.replace(/\.md$/, '');
    console.log(`   - ${s}`);
  });
  process.exit(0);
}

if (isAll) {
  console.log('================================================================');
  console.log(`📦 正在批量导出全部 ${files.length} 篇国内平台适配版 Markdown...`);
  console.log('================================================================\n');
  files.forEach((f, idx) => {
    const res = exportOne(f);
    console.log(`[${idx + 1}/${files.length}] ✓ 已导出: ${res.slug} → dist/domestic/${res.slug}.md`);
  });
  console.log(`\n🎉 全部文章导出完成！保存在: ${EXPORT_DIR}`);
  console.log('💡 可直接在「微信同步助手 (WechatSync)」中批量导入并同步到掘金、知乎、微信公众号！\n');
  process.exit(0);
}

const targetFile = files.find(f => f === `${slugArg}.md` || f.includes(slugArg));
if (!targetFile) {
  console.error(`❌ 未找到文章: ${slugArg}`);
  process.exit(1);
}

const res = exportOne(targetFile);

console.log('================================================================');
console.log('✅ 国内平台适配版 Markdown 导出成功！');
console.log('================================================================\n');
console.log(`📌 标题: ${res.title}`);
console.log(`📁 导出文件路径: ${res.exportPath}`);
console.log(`🔗 自动嵌入的外链: ${res.originalUrl}\n`);
console.log('🚀 如何快速发布到国内平台:');
console.log('1. 【掘金】: 打开 https://juejin.cn/editor/drafts/new -> 复制该文件内容全选粘贴即可发布');
console.log('2. 【知乎】: 打开 https://zhuanlan.zhihu.com/write -> 点击右上角「...」或「文档导入」直接选该文件');
console.log('3. 【多平台一键发】: 借助 Chrome 插件「微信同步助手 (WechatSync)」，粘贴一次即可勾选全发！');
console.log('================================================================\n');
