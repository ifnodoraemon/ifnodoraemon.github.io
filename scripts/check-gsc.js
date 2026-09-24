#!/usr/bin/env node
/**
 * Google Search Console (GSC) Automated Inspector & Diagnostic Tool
 * 
 * Usage:
 *   node scripts/check-gsc.js [url...]
 *   npm run gsc:check
 * 
 * Authentication:
 *   Looks for `gsc-credentials.json` or `gen-lang-client-*.json` in the project root,
 *   or the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SITE_URL = 'https://blog.llmgo.top/';

const DEFAULT_INSPECT_URLS = [
  'https://blog.llmgo.top/',
  'https://blog.llmgo.top/about/',
  'https://blog.llmgo.top/articles/',
  'https://blog.llmgo.top/tools/',
  'https://blog.llmgo.top/models/',
  'https://blog.llmgo.top/articles/ai-coding-mastery/',
  'https://blog.llmgo.top/articles/test-time-compute-grpo/',
  'https://blog.llmgo.top/articles/sglang-vs-vllm-architecture/',
  'https://blog.llmgo.top/en/articles/prompt-engineering-guide/',
  'https://blog.llmgo.top/en/models/'
];

// Helper: base64url encoding
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

// Generate Google OAuth2 Access Token via Service Account JWT
async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(credentials.private_key, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', jwt);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch Google OAuth token: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Query authorized sites for this service account
async function getAuthorizedSites(accessToken) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.siteEntry || [];
}

// Query Google Search Console Sitemaps status
async function getSitemaps(accessToken, siteUrl) {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.sitemap || [];
}

// Submit sitemap directly to Google Search Console
async function submitSitemap(accessToken, siteUrl, sitemapUrl) {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const encodedFeedPath = encodeURIComponent(sitemapUrl);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/sitemaps/${encodedFeedPath}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return res.status === 204 || res.ok;
}

// Query Search Analytics performance (last 28 days)
async function getSearchAnalytics(accessToken, siteUrl, dimension = 'query', limit = 10) {
  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDateObj = new Date();
  startDateObj.setDate(today.getDate() - 28);
  const startDate = startDateObj.toISOString().split('T')[0];

  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: limit
    })
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.rows || [];
}

// Call Google Search Console URL Inspection API
async function inspectUrl(accessToken, siteUrl, inspectionUrl) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    return { error: true, status: res.status, message: errText };
  }

  return await res.json();
}

function findCredentialsFile() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const defaultNamed = path.join(ROOT, 'gsc-credentials.json');
  if (fs.existsSync(defaultNamed)) return defaultNamed;

  const files = fs.readdirSync(ROOT);
  for (const f of files) {
    if (f.endsWith('.json') && (f.startsWith('gen-lang-client') || f.includes('credentials'))) {
      const fullPath = path.join(ROOT, f);
      try {
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
          return fullPath;
        }
      } catch (_) {}
    }
  }
  return null;
}

async function main() {
  console.log('================================================================');
  console.log('🤖 Google Search Console 自动化索引与收录巡检器 (Enhanced)');
  console.log('================================================================\n');

  const credPath = findCredentialsFile();

  if (!credPath) {
    console.log('ℹ️  未检测到 Google Search Console 服务账号凭证 (gsc-credentials.json)\n');
    console.log('📌 如何为本助手配置自动 GSC 巡检权限:');
    console.log('----------------------------------------------------------------');
    console.log('1. 创建 Google Cloud 服务账号 (Service Account)');
    console.log('2. 将下载的 JSON 私钥放在博客根目录下');
    console.log('3. 在 GSC 中授权该服务账号邮箱');
    console.log('----------------------------------------------------------------\n');
    return;
  }

  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ 解析凭证文件失败: ${err.message}`);
    process.exit(1);
  }

  console.log(`📄 找到凭证文件: ${path.basename(credPath)}`);
  console.log(`🔑 服务账号邮箱: ${credentials.client_email}\n`);

  let token;
  try {
    process.stdout.write('⏳ 正在连接 Google OAuth2 验证身份... ');
    token = await getAccessToken(credentials);
    console.log('✅ 认证成功！\n');
  } catch (err) {
    console.log('❌ 认证失败！');
    console.error(`错误详情: ${err.message}`);
    process.exit(1);
  }

  // Check sites
  const authorizedSites = await getAuthorizedSites(token);
  console.log(`📋 当前服务账号拥有权限的 GSC 资源站点 (${authorizedSites.length} 个):`);

  let targetSiteUrl = DEFAULT_SITE_URL;

  if (authorizedSites.length === 0) {
    console.log('   ⚠️  【尚未授权任何站点】\n');
    return;
  }

  authorizedSites.forEach(s => {
    console.log(`   - ${s.siteUrl} (权限级别: ${s.permissionLevel})`);
  });
  console.log('');

  const match = authorizedSites.find(s => s.siteUrl.includes('llmgo.top'));
  if (match) {
    targetSiteUrl = match.siteUrl;
    console.log(`🎯 自动匹配到博客资源属性: ${targetSiteUrl}\n`);
  }

  // 1. Check and submit Sitemap
  console.log('📡 正在检查 GSC Sitemap 提交状态与最新抓取反馈...');
  const sitemaps = await getSitemaps(token, targetSiteUrl);
  if (sitemaps.length > 0) {
    for (const sm of sitemaps) {
      console.log(`   📄 路径:         ${sm.path}`);
      console.log(`   🕒 上次抓取时间: ${sm.lastDownloaded || '等待抓取'}`);
      console.log(`   📊 提交 URL 数:  ${sm.contents?.[0]?.submitted || 0}`);
      console.log(`   ✅ 状态:         ${sm.errors === '0' ? '正常无错误' : '⚠️ 存在 ' + sm.errors + ' 个错误'}`);
    }
  } else {
    console.log('   ℹ️  暂无已记录的 Sitemap，正在主动向 GSC 提交最新 sitemap.xml...');
  }

  const sitemapUrl = `${targetSiteUrl.replace(/\/$/, '')}/sitemap.xml`;
  const submitSuccess = await submitSitemap(token, targetSiteUrl, sitemapUrl);
  if (submitSuccess) {
    console.log(`   🚀 已向 Google 成功发送最新站点地图推送: ${sitemapUrl}\n`);
  }

  // 2. Search Analytics: Recent search queries & impressions
  console.log('📊 正在查询过去 28 天真实搜索展现关键词与热点文章...');
  const topQueries = await getSearchAnalytics(token, targetSiteUrl, 'query', 10);
  if (topQueries.length > 0) {
    console.log('   🔍 搜索词展现排行 Top 10:');
    topQueries.forEach((q, i) => {
      console.log(`      ${i + 1}. "${q.keys[0]}" — 展现量: ${q.impressions}, 点击量: ${q.clicks}, 平均排名: ${q.position?.toFixed(1)}`);
    });
    console.log('');
  } else {
    console.log('   ℹ️  过去 28 天暂无搜索词数据');
  }

  const topPages = await getSearchAnalytics(token, targetSiteUrl, 'page', 5);
  if (topPages.length > 0) {
    console.log('   📄 搜索展现最高页面 Top 5:');
    topPages.forEach((p, i) => {
      console.log(`      ${i + 1}. ${p.keys[0]} — 展现量: ${p.impressions}, 点击量: ${p.clicks}, 平均排名: ${p.position?.toFixed(1)}`);
    });
    console.log('');
  }

  // 3. URL Inspection
  const urlsToInspect = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_INSPECT_URLS;
  console.log(`📡 开始向 Google URL Inspection API 发起实时收录检测 (${urlsToInspect.length} 个 URL)...\n`);

  for (const url of urlsToInspect) {
    console.log(`----------------------------------------------------------------`);
    console.log(`🔗 检查 URL: ${url}`);
    try {
      const result = await inspectUrl(token, targetSiteUrl, url);
      if (result.error) {
        console.error(`   ❌ API 响应错误 (${result.status}): ${result.message}`);
        continue;
      }

      const idx = result.inspectionResult?.indexStatusResult;
      if (!idx) {
        console.log('   ℹ️  暂无索引状态信息');
        continue;
      }

      const verdictIcon = idx.verdict === 'PASS' ? '✅' : (idx.verdict === 'NEUTRAL' ? '⏳' : '❌');
      console.log(`   ${verdictIcon} 综合判定 (Verdict):       ${idx.verdict || '未知'}`);
      console.log(`   📊 覆盖状态 (Coverage):      ${idx.coverageState || '未知'}`);
      console.log(`   🕒 上次抓取时间:             ${idx.lastCrawlTime || '不适用 (尚未实际抓取)'}`);
      console.log(`   🤖 抓取工具:                 ${idx.crawledAs || '不适用'}`);
      console.log(`   📄 网页检索状态 (Fetch):     ${idx.pageFetchState || '不适用'}`);
      console.log(`   🛡️  Robots.txt 状态:         ${idx.robotsTxtState || '不适用'}`);
      console.log(`   🏷️  用户声明的规范网址:      ${idx.userCanonical || '不适用'}`);
      console.log(`   🔍 Google 选择的规范网址:    ${idx.googleCanonical || '不适用'}`);

      const rich = result.inspectionResult?.richResultsResult;
      if (rich?.detectedItems && rich.detectedItems.length > 0) {
        console.log(`   ✨ 结构化数据 (Rich Results):`);
        for (const item of rich.detectedItems) {
          console.log(`      - ${item.richResultType}: ${item.items?.[0]?.issues?.length ? '⚠️ 有警告' : '✅ 正常'}`);
        }
      }
    } catch (e) {
      console.error(`   ❌ 请求异常: ${e.message}`);
    }
  }

  console.log('\n================================================================');
  console.log('✅ GSC 巡检完成！');
  console.log('================================================================');
}

main();
