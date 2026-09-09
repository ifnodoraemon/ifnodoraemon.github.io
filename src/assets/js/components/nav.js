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
    `<a href="${item.href}"${activePage === item.id ? ' class="active" aria-current="page"' : ''}><span>${item.title}</span></a>`
  ).join('\n          ');

  nav.setAttribute('aria-label', isEn ? 'Main navigation' : '主导航');
  nav.innerHTML = `
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
          <span class="brand-text-zh">${isEn ? 'NOBITA TALKS AI' : '大雄话AI'}</span>
          <span class="brand-text-en">${isEn ? 'AI Architecture & Engineering' : 'AI 架构与技术笔记'}</span>
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
    </div>
  `;

  // Mobile menu toggle
  const toggle = nav.querySelector('#menu-toggle');
  const navLinks = nav.querySelector('#nav-links');

  function openMenu() {
    toggle.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', isEn ? 'Close menu' : '关闭菜单');
    navLinks.classList.add('open');
    nav.classList.add('menu-open');
  }

  function closeMenu() {
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', isEn ? 'Open menu' : '打开菜单');
    navLinks.classList.remove('open');
    nav.classList.remove('menu-open');
  }

  function toggleMenu() {
    if (navLinks.classList.contains('open')) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  if (toggle && navLinks) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    const handleOutsideClick = (e) => {
      if (navLinks.classList.contains('open') && !nav.contains(e.target)) {
        closeMenu();
      }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick, { passive: true });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navLinks.classList.contains('open')) {
        closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && navLinks.classList.contains('open')) {
        closeMenu();
      }
    }, { passive: true });
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
