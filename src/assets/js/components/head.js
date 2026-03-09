// Shared <head> meta tags helper
export function getHeadMeta({ title, description, url, keywords }) {
  return `
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="keywords" content="${keywords || 'AI大模型,GPT-5.4,Claude 4.6,Gemini 3.1,提示工程,AI Agent,RAG,LLM'}">
  <meta name="author" content="ifnodoraemon">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#06060b">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="https://ifnodoraemon.github.io/og-image.png">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:site_name" content="大雄话AI">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="https://ifnodoraemon.github.io/og-image.png">
  <meta name="google-adsense-account" content="ca-pub-5078775507335151">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/og-image.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">`;
}
