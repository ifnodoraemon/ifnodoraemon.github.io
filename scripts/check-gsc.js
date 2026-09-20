#!/usr/bin/env node
/**
 * Google Search Console (GSC) Automated Inspector & Diagnostic Tool
 * 
 * Usage:
 *   node scripts/check-gsc.js [url...]
 *   npm run gsc:check
 * 
 * Authentication:
 *   Looks for `gsc-credentials.json` in the project root, or
 *   the `GOOGLE_APPLICATION_CREDENTIALS` environment variable.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SITE_URL = 'https://blog.llmgo.top/';

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

async function main() {
  console.log('================================================================');
  console.log('🤖 Google Search Console 自动化索引与收录巡检器');
  console.log('================================================================\n');

  // Check for credentials
  let credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) {
    const defaultFile = path.join(ROOT, 'gsc-credentials.json');
    if (fs.existsSync(defaultFile)) {
      credPath = defaultFile;
    }
  }

  if (!credPath || !fs.existsSync(credPath)) {
    console.log('ℹ️  未检测到 Google Search Console 服务账号凭证 (gsc-credentials.json)\n');
    console.log('📌 如何为本助手配置自动 GSC 巡检权限 (只需 3 步):');
    console.log('----------------------------------------------------------------');
    console.log('1. 创建 Google Cloud 服务账号:');
    console.log('   - 访问: https://console.cloud.google.com/apis/library/searchconsole.googleapis.com');
    console.log('   - 启用「Google Search Console API」');
    console.log('   - 在「凭据」页面创建服务账号 (Service Account)，为该账号创建 JSON 密钥');
    console.log('2. 将 JSON 密钥保存至本项目:');
    console.log(`   - 命名为: gsc-credentials.json 并存放在根目录 (${path.join(ROOT, 'gsc-credentials.json')})`);
    console.log('   - (已自动在 .gitignore 中忽略，绝不会泄露或提交到 GitHub)');
    console.log('3. 在 Google Search Console 中授权:');
    console.log('   - 打开: https://search.google.com/search-console');
    console.log('   - 进入「设置」->「用户和权限」->「添加用户」');
    console.log('   - 填入服务账号邮箱 (如: xxx@project.iam.gserviceaccount.com)，权限选择「完整」或「所有者」');
    console.log('----------------------------------------------------------------\n');
    console.log('💡 配置完成后，直接运行 `npm run gsc:check` 即可自动调用 Google 官方 API 巡检所有页面真实收录状态！\n');
    return;
  }

  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  } catch (err) {
    console.error(`❌ 解析凭证文件失败: ${err.message}`);
    process.exit(1);
  }

  console.log(`🔑 使用服务账号: ${credentials.client_email}`);
  console.log(`🌐 站点属性: ${SITE_URL}\n`);

  let token;
  try {
    console.log('⏳ 正在向 Google OAuth2 请求安全凭证令牌...');
    token = await getAccessToken(credentials);
    console.log('✅ Google API 授权成功！\n');
  } catch (err) {
    console.error(`❌ 授权失败: ${err.message}`);
    process.exit(1);
  }

  const urlsToInspect = process.argv.slice(2).length > 0 ? process.argv.slice(2) : DEFAULT_INSPECT_URLS;

  console.log(`📡 开始向 Google URL Inspection API 发起实时查询 (${urlsToInspect.length} 个 URL)...\n`);

  for (const url of urlsToInspect) {
    console.log(`----------------------------------------------------------------`);
    console.log(`🔗 检查 URL: ${url}`);
    try {
      const result = await inspectUrl(token, SITE_URL, url);
      if (result.error) {
        console.error(`   ❌ API 响应错误 (${result.status}): ${result.message}`);
        continue;
      }

      const idx = result.inspectionResult?.indexStatusResult;
      if (!idx) {
        console.log('   ℹ️  暂无索引状态信息');
        continue;
      }

      console.log(`   📌 综合判定 (Verdict):       ${idx.verdict || '未知'}`);
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
          console.log(`      - ${item.richResultType}: ${item.items?.[0]?.issues?.length ? '有警告' : '✅ 正常'}`);
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
