/**
 * Static component renderer for SSG builds (Navigation & Footer)
 * Ensures 100% crawlable static HTML for Google Search Console and other search engines.
 */

export function renderStaticNav({ isEn, activePage, currentRoute = '' }) {
  const langPrefix = isEn ? '/en' : '';
  const siteTitleZh = '智算架构志';
  const siteTitleEn = 'LLM SYSTEMS ARCHITECTURE';
  const subtitleZh = 'LLM Systems Architecture';
  const subtitleEn = 'AI Systems & Engineering Notes';

  const navItems = isEn ? [
    { id: 'home', title: 'Home', href: '/en/' },
    { id: 'articles', title: 'Articles', href: '/en/articles/' },
    { id: 'models', title: 'Models', href: '/en/models/' },
    { id: 'projects', title: 'Projects', href: '/en/projects/' },
    { id: 'tools', title: 'Tools', href: '/en/tools/' },
    { id: 'about', title: 'About', href: '/en/about/' }
  ] : [
    { id: 'home', title: '首页', href: '/' },
    { id: 'articles', title: '文章', href: '/articles/' },
    { id: 'models', title: '模型', href: '/models/' },
    { id: 'projects', title: '作品', href: '/projects/' },
    { id: 'tools', title: '工具', href: '/tools/' },
    { id: 'about', title: '关于', href: '/about/' }
  ];

  let togglePath = isEn
    ? currentRoute.replace(/^\/en(?=\/|$)/, '')
    : '/en' + currentRoute;
  if (!togglePath || togglePath === '') togglePath = '/';

  const linksHtml = navItems.map(item =>
    `<a href="${item.href}"${activePage === item.id ? ' class="active" aria-current="page"' : ''}><span>${item.title}</span></a>`
  ).join('\n          ');

  return `
    <a href="#main-content" class="skip-link">${isEn ? 'Skip to main content' : '跳至主要内容'}</a>
    <div class="nav-container">
      <a href="${langPrefix}/" class="nav-brand">
        <div class="brand-icon glow">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="brand-text-wrapper">
          <span class="brand-text-zh">${isEn ? siteTitleEn : siteTitleZh}</span>
          <span class="brand-text-en">${isEn ? subtitleEn : subtitleZh}</span>
        </div>
      </a>
      <div class="nav-links" id="nav-links">
        <div class="nav-links-main">
          ${linksHtml}
        </div>
        <div class="nav-links-extra">
          <a href="https://github.com/ifnodoraemon" target="_blank" rel="noopener noreferrer" class="github-link" aria-label="GitHub">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </a>
          <a href="${togglePath}" class="lang-toggle" title="${isEn ? 'Switch to Chinese' : '切换至英文'}" aria-label="Toggle Language">
            <span class="lang-text">${isEn ? '中文' : 'ENG'}</span>
          </a>
        </div>
      </div>
      <button class="menu-toggle" id="menu-toggle" aria-label="${isEn ? 'Open menu' : '打开菜单'}" aria-expanded="false" aria-controls="nav-links">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>`;
}

export function renderStaticFooter({ isEn, style = 'full' }) {
  const langPrefix = isEn ? '/en' : '';
  const siteTitle = isEn ? 'LLM Systems Architecture' : '智算架构志';
  const desc = isEn
    ? 'Focusing on LLM systems architecture, inference engines, and production AI engineering.'
    : '专注大模型系统架构、推理加速内核与工业级智算工程实践。';

  const hLinks = isEn ? 'Quick Links' : '快速链接';
  const lHome = isEn ? 'Home' : '首页';
  const lModels = isEn ? 'Models' : '模型对比';
  const lAbout = isEn ? 'About' : '关于本站';

  const hTopics = isEn ? 'Hot Topics' : '热门主题';
  const tPrompt = isEn ? 'Prompt Eng' : '提示工程';
  const tAgent = isEn ? 'AI Agent' : 'AI Agent';
  const tRag = isEn ? 'RAG' : 'RAG 应用';
  const tFine = isEn ? 'Fine-tuning' : '模型微调';

  const hContact = isEn ? 'Contact' : '联系我们';

  if (style === 'full') {
    return `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col footer-brand-col">
            <span class="footer-logo">◆ ${siteTitle}</span>
            <p class="footer-desc">${desc}</p>
          </div>
          <div class="footer-col">
            <h4 class="footer-heading">${hLinks}</h4>
            <a href="${langPrefix}/" class="footer-link">${lHome}</a>
            <a href="${langPrefix}/models/" class="footer-link">${lModels}</a>
            <a href="${langPrefix}/about/" class="footer-link">${lAbout}</a>
          </div>
          <div class="footer-col">
            <h4 class="footer-heading">${hTopics}</h4>
            <a href="${langPrefix}/articles/prompt-engineering-guide/" class="footer-link">${tPrompt}</a>
            <a href="${langPrefix}/articles/build-ai-agent/" class="footer-link">${tAgent}</a>
            <a href="${langPrefix}/articles/rag-in-practice/" class="footer-link">${tRag}</a>
            <a href="${langPrefix}/articles/fine-tuning-guide/" class="footer-link">${tFine}</a>
          </div>
          <div class="footer-col">
            <h4 class="footer-heading">${hContact}</h4>
            <a href="https://github.com/ifnodoraemon" target="_blank" rel="noopener" class="footer-link">GitHub</a>
            <a href="https://x.com/ifnodoraemon" target="_blank" rel="noopener" class="footer-link">X (Twitter)</a>
            <a href="mailto:ifnodoraemon@gmail.com" class="footer-link">Email</a>
            <a href="${langPrefix}/feed.xml" target="_blank" class="footer-link">RSS Feed</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span class="footer-copy">© 2026 ifnodoraemon · Built with ❤️ and AI</span>
        </div>
      </div>`;
  }

  return `
    <div class="container">
      <div class="footer-bottom">
        <span class="footer-copy">© 2026 ifnodoraemon · Built with ❤️ and AI</span>
      </div>
    </div>`;
}
