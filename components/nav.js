// Shared Navigation Component
export function renderNav(activePage = '') {
  const nav = document.getElementById('navbar') || createNavElement();

  nav.innerHTML = `
    <div class="nav-container">
      <a href="/" class="nav-brand">
        <span class="brand-icon">◆</span>
        <span class="brand-text">AI 大模型观察</span>
        <span class="brand-status">
          <span class="status-dot"></span>
          ONLINE
        </span>
      </a>
      <div class="nav-links" id="nav-links">
        <a href="/"${activePage === 'home' ? ' class="active"' : ''}>首页</a>
        <a href="/articles/"${activePage === 'articles' ? ' class="active"' : ''}>文章</a>
        <a href="/models/"${activePage === 'models' ? ' class="active"' : ''}>模型</a>
        <a href="/about/"${activePage === 'about' ? ' class="active"' : ''}>关于</a>
        <a href="https://github.com/ifnodoraemon" target="_blank" rel="noopener">GitHub</a>
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
