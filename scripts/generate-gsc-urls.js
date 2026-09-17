#!/usr/bin/env node
/**
 * Generate Google Search Console Priority Inspection URL List
 * 
 * Usage: node scripts/generate-gsc-urls.js
 */

const SITE_URL = 'https://blog.llmgo.top';

const PRIORITY_SLUGS = [
  'quantization-hands-on-guide',
  'rag-in-practice',
  'fine-tuning-guide',
  'vllm-serving-guide',
  'quantization-precision-guide',
  'deepseek-v4-kimi-k3-deployment-guide'
];

console.log('================================================================');
console.log('📌 Google Search Console 核心 URL 检查与提交通道 (Priority Indexing)');
console.log('================================================================\n');

console.log('🚀 第一批核心突破 URL (已包含最新 GSC 关键词、技术选型矩阵与 FAQ Schema):');
PRIORITY_SLUGS.forEach((slug, idx) => {
  console.log(`\n[${idx + 1}] 英文核心页: ${SITE_URL}/en/articles/${slug}/`);
  console.log(`    中文对应页: ${SITE_URL}/articles/${slug}/`);
});

console.log('\n================================================================');
console.log('💡 GSC 提交流程:');
console.log('1. 打开 Google Search Console: https://search.google.com/search-console');
console.log('2. 将上述英文核心 URL 依次粘贴至顶部 "检查任意网址 (Inspect any URL)" 输入框中');
console.log('3. 等待数据抓取后，点击「请求编入索引 (Request Indexing)」');
console.log('================================================================\n');
