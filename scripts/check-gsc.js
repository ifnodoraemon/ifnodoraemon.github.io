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
  'https://blog.llmgo.top/about/',
  'https://blog.llmgo.top/articles/',
  'https://blog.llmgo.top/articles/ai-coding-mastery/',
  'https://blog.llmgo.top/en/articles/prompt-engineering-guide/',
  'https://blog.llmgo.top/en/models/',
  'https://blog.llmgo.top/en/projects/',
  'https://blog.llmgo.top/articles/test-time-compute-grpo/',
  'https://blog.llmgo.top/articles/sglang-vs-vllm-architecture/'
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
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
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

  // Search for gen-lang-client or service account json in ROOT
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
  console.log('🤖 Google Search Console 自动化索引与收录巡检器');
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
    console.log('================================================================');
    console.log('👉 只需要最后一步即可启用自动巡检：');
    console.log('1. 打开 Google Search Console: https://search.google.com/search-console');
    console.log('2. 点击左侧底部的「设置 (Settings)」->「用户和权限 (Users and permissions)」');
    console.log('3. 点击右上角「添加用户 (Add user)」');
    console.log(`4. 填入邮箱地址:`);
    console.log(`   👉 \x1b[32m${credentials.client_email}\x1b[0m 👈`);
    console.log('5. 权限请选择:「完整 (Full)」或「所有者 (Owner)」并保存');
    console.log('================================================================\n');
    return;
  }

  authorizedSites.forEach(s => {
    console.log(`   - ${s.siteUrl} (权限级别: ${s.permissionLevel})`);
  });
  console.log('');

  // Auto-detect matching site URL
  const match = authorizedSites.find(s => s.siteUrl.includes('llmgo.top'));
  if (match) {
    targetSiteUrl = match.siteUrl;
    console.log(`🎯 自动匹配到博客资源属性: ${targetSiteUrl}\n`);
  }

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

      // Rich results (schema)
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
