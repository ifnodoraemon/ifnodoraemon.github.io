import { isEnglishPath } from '../utils/site.js';

// Shared Navigation Component
export function renderNav(activePage = '') {
  const nav = document.getElementById('navbar') || createNavElement();

  const currentPath = window.location.pathname;
  const isEn = isEnglishPath(currentPath);
  const langPrefix = isEn ? '/en' : '';

  const siteTitle = isEn ? 'Nobita Talks AI' : '大雄话AI';
  
  const navItems = isEn ? [
    { id: 'home', title: 'Home', href: '/en/' },
    { id: 'articles', title: 'Articles', href: '/en/articles/' },
    { id: 'models', title: 'Models', href: '/en/models/' },
    { id: 'projects', title: 'Projects', href: '/en/projects/' },
    { id: 'about', title: 'About', href: '/en/about/' }
  ] : [
    { id: 'home', title: '首页', href: '/' },
    { id: 'articles', title: '文章', href: '/articles/' },
    { id: 'models', title: '模型', href: '/models/' },
    { id: 'projects', title: '作品', href: '/projects/' },
    { id: 'about', title: '关于', href: '/about/' }
  ];

  let togglePath = isEn 
    ? currentPath.replace(/^\/en(?=\/|$)/, '') 
    : '/en' + currentPath;
  if (!togglePath || togglePath === '') togglePath = '/';
  togglePath += window.location.search + window.location.hash;

  let linksHtml = navItems.map(item => 
    `<a href="${item.href}"${activePage === item.id ? ' class="active" aria-current="page"' : ''}>${item.title}</a>`
  ).join('\n        ');

  nav.innerHTML = `
    <div class="nav-container">
      <a href="${langPrefix}/" class="nav-brand">
        <div class="brand-icon glow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <div class="brand-text-wrapper">
          <span class="brand-text-zh">${isEn ? 'NOBITA TALKS AI' : '大雄话AI'}<span class="brand-version">v5.4</span></span>
          <span class="brand-text-en"><span class="terminal-prompt">&gt;</span> ${isEn ? 'sys.init()' : '模型核心已装载'}<span class="cursor-blink">_</span></span>
        </div>
        <div class="brand-status">
          <span class="status-dot"></span>
          <span>ONLINE</span>
        </div>
      </a>
      <div class="nav-links" id="nav-links">
        ${linksHtml}
        <a href="https://github.com/ifnodoraemon" target="_blank" rel="noopener" class="github-link">GitHub</a>
        <a href="${togglePath}" class="lang-toggle" title="Toggle Language">
          <span class="lang-bracket">[</span>
          <span class="lang-text">${isEn ? '中文' : 'ENG'}</span>
          <span class="lang-bracket">]</span>
        </a>
      </div>
      <button class="menu-toggle" id="menu-toggle" aria-label="打开菜单">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  `;

  // Mobile menu toggle
  const toggle = nav.querySelector('#menu-toggle');
  const navLinks = nav.querySelector('#nav-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  return nav;
}

function createNavElement() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'navbar';
  nav.setAttribute('aria-label', '主导航');
  document.body.prepend(nav);
  return nav;
}
