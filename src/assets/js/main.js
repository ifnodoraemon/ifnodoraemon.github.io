// ============================================
// 大雄话AI — Main Entry Point
// ============================================
import { renderNav } from './components/nav.js';
import { renderFooter } from './components/footer.js';
import {
  getPageState,
  getSearchIndexPath,
  highlightSearchMatches,
} from './utils/site.js';

document.addEventListener('DOMContentLoaded', () => {

  // — Detect current page —
  const path = window.location.pathname;
  const { activePage, footerStyle } = getPageState(path);

  // — Render shared components —
  renderNav(activePage);
  renderFooter(footerStyle);

  // — Navbar scroll effect —
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // — Scroll-triggered fade-in —
  const faders = document.querySelectorAll('.fade-in');
  if (faders.length && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0,
      rootMargin: '0px 0px -60px 0px'
    });

    faders.forEach(el => observer.observe(el));
  }

  // — Smooth scroll for same-page anchor links —
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // — Ambient Particles —
  initParticles();

  // — Terminal Hero Animation —
  initTerminalAnimation();

  // — Reading Progress Bar (Articles only) —
  const articleContent = document.querySelector('.article-detail-content');
  if (articleContent) {
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress-bar';
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      progressBar.style.width = scrolled + '%';
    }, { passive: true });
  }

  // — External Links Handler (Articles only) —
  if (articleContent) {
    const links = articleContent.querySelectorAll('a[href^="http"]');
    links.forEach(link => {
      if (!link.href.includes(window.location.hostname)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
        link.classList.add('external-link');
      }
    });
  }

  // — Copy Code Button with $ Stripping —
  document.querySelectorAll('.copy-code-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.nextElementSibling;
      if (!codeBlock) return;
      
      let code = codeBlock.innerText;
      // Strip starting '$ ' from bash commands before copying
      const lines = code.split('\n');
      const cleanLines = lines.map(line => line.trim().startsWith('$ ') ? line.trim().substring(2) : line);
      code = cleanLines.join('\n');

      navigator.clipboard.writeText(code).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        setTimeout(() => {
          btn.innerHTML = originalHtml;
        }, 2000);
      });
    });
  });

  // — Back to Top —
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) {
        backToTop.classList.add('visible');
      } else {
        backToTop.classList.remove('visible');
      }
    }, { passive: true });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // — Medium Zoom —
  if (typeof mediumZoom !== 'undefined') {
    mediumZoom('.article-detail-content img', {
      margin: 24,
      background: '#0a0a1a'
    });
  }

});


// ============================================
// Floating Particles System
// ============================================
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];
  const PARTICLE_COUNT = 40;
  const COLORS = [
    'rgba(99, 102, 241, 0.3)',
    'rgba(139, 92, 246, 0.25)',
    'rgba(34, 211, 238, 0.2)',
    'rgba(129, 140, 248, 0.2)'
  ];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);

    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.pulse += 0.01;

      // Wrap around
      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse));

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, currentOpacity + ')');
      ctx.fill();

      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d.]+\)$/, currentOpacity * 0.2 + ')');
      ctx.fill();
    });

    // Draw occasional connection lines between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.04 * (1 - dist / 150)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize, { passive: true });
  init();
  animate();
}

// ============================================
// Terminal Hero Animation System
// ============================================
function initTerminalAnimation() {
  const terminalObj = document.getElementById('hero-terminal');
  if (!terminalObj) return;

  // Add class to show we have JS running
  terminalObj.classList.add('js-enabled');
  
  const seqContainer = terminalObj.querySelector('.term-seq-container');
  if (!seqContainer) return;

  // Configuration timeline
  const sequenceTiming = [
    { target: '.term-seq-1', type: 'typing', delayBefore: 800 },
    { target: '.term-seq-2', type: 'reveal', delayBefore: 400 },
    { target: '.term-seq-3', type: 'reveal', delayBefore: 800 },
    { target: '.term-seq-4', type: 'typing', delayBefore: 600 },
    { target: '.term-seq-5', type: 'reveal', delayBefore: 400 },
    { target: '.term-seq-6', type: 'typing', delayBefore: 800 },
    { target: '.term-seq-7', type: 'reveal', delayBefore: 400 },
    { target: '.term-seq-8', type: 'typing', delayBefore: 800 },
    { target: '.term-seq-9', type: 'reveal', delayBefore: 400 },
    { target: '.term-seq-10', type: 'reveal', delayBefore: 400 } // active prompt
  ];

  let currentStep = 0;

  function typeText(element, text, speed, callback) {
    element.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      element.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setTimeout(callback, 200);
      }
    }, speed);
  }

  function advanceSequence() {
    if (currentStep >= sequenceTiming.length) return;
    
    const stepObj = sequenceTiming[currentStep];
    const elements = seqContainer.querySelectorAll(stepObj.target);
    
    setTimeout(() => {
      elements.forEach(el => el.classList.remove('hidden'));
      
      if (stepObj.type === 'typing') {
        const typeEl = elements[0].querySelector('.type-text');
        if (typeEl && typeEl.dataset.text) {
          typeText(typeEl, typeEl.dataset.text, 35, () => {
            currentStep++;
            advanceSequence();
          });
        } else {
          currentStep++;
          advanceSequence();
        }
      } else {
        currentStep++;
        advanceSequence();
      }
    }, stepObj.delayBefore);
  }

  // Hide the terminal fallback elements which are shown by default for non-JS
  const fallback = terminalObj.querySelector('.terminal-fallback');
  if (fallback) fallback.classList.add('hidden');

  // Start sequence
  advanceSequence();
}
// ============================================
// Articles Listing: Pagination & Search
// ============================================
function initArticlesListing() {
  const articlesList = document.getElementById('articles-list');
  if (!articlesList) return;

  const rows = Array.from(articlesList.querySelectorAll('.article-list-item-wrapper'));
  const filterBtns = document.querySelectorAll('.filter-btn');
  const pagination = document.querySelector('.articles-pagination');
  const numbersContainer = document.querySelector('.pagination-numbers');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');

  const searchInput = document.getElementById('article-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const searchDropdown = document.getElementById('search-results-dropdown');
  const searchInputWrapper = searchInput?.closest('.search-input-wrapper') || null;
  const emptyState = document.getElementById('articles-empty-state') || (() => {
    const state = document.createElement('div');
    state.id = 'articles-empty-state';
    state.className = 'articles-empty-state';
    state.hidden = true;
    state.setAttribute('aria-live', 'polite');
    articlesList.insertAdjacentElement('afterend', state);
    return state;
  })();
  const currentLang = searchInput ? searchInput.dataset.lang : 'en';
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const availableTags = new Set(Array.from(filterBtns, btn => btn.dataset.filter));
  const rowRecords = rows.map(row => ({
    row,
    tag: row.dataset.tag || 'all',
    searchText: row.textContent.toLowerCase(),
  }));

  const ITEMS_PER_PAGE = 8;
  let currentPage = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1);
  let selectedTag = params.get('tag') || 'all';
  let searchQuery = params.get('q')?.trim() || '';
  let filteredRows = [...rows];
  let searchIndex = null;
  let isFetching = false;
  let activeSearchResultIndex = -1;
  let searchResultItems = [];

  if (searchDropdown && searchInputWrapper) {
    searchDropdown.classList.add('search-results-floating');
    document.body.appendChild(searchDropdown);
  }

  if (!availableTags.has(selectedTag)) selectedTag = 'all';
  if (searchInput) searchInput.value = searchQuery;
  if (clearBtn) clearBtn.style.display = searchQuery ? 'flex' : 'none';

  function getTotalPages() {
    return Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  }

  function updateUrlState() {
    const nextUrl = new URL(window.location.href);

    if (selectedTag !== 'all') nextUrl.searchParams.set('tag', selectedTag);
    else nextUrl.searchParams.delete('tag');

    if (searchQuery) nextUrl.searchParams.set('q', searchQuery);
    else nextUrl.searchParams.delete('q');

    if (currentPage > 1) nextUrl.searchParams.set('page', String(currentPage));
    else nextUrl.searchParams.delete('page');

    const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextPath !== currentPath) {
      window.history.replaceState({}, '', nextPath);
    }
  }

  function updateFilterButtons() {
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === selectedTag);
    });
  }

  function renderEmptyState() {
    const emptyText = currentLang.startsWith('zh')
      ? '没有匹配当前筛选条件的文章。'
      : 'No articles matched the current filters.';

    emptyState.textContent = emptyText;
    emptyState.hidden = filteredRows.length > 0;
  }

  function renderPagination() {
    const totalPages = getTotalPages();

    if (!pagination || !numbersContainer) return;

    if (filteredRows.length === 0 || totalPages <= 1) {
      numbersContainer.innerHTML = '';
      if (pagination) pagination.style.display = 'none';
      return;
    }

    pagination.style.display = 'flex';
    numbersContainer.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => goToPage(i));
      numbersContainer.appendChild(btn);
    }

    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
  }

  function showPage(page) {
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;

    rows.forEach(row => row.style.display = 'none');

    filteredRows.forEach((row, index) => {
      if (index >= start && index < end) {
        row.style.display = '';
      }
    });

    renderEmptyState();
    renderPagination();
  }

  function scrollListingIntoView() {
    const filterSection = document.getElementById('articles-filter');
    if (!filterSection) return;

    const offset = filterSection.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }

  function goToPage(page, options = {}) {
    const { shouldScroll = true } = options;
    currentPage = page;
    showPage(currentPage);
    updateUrlState();

    if (shouldScroll) scrollListingIntoView();
  }

  function applyFilters(options = {}) {
    const { resetPage = false, shouldScroll = false } = options;
    const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);

    filteredRows = rowRecords
      .filter(record => {
        const matchesTag = selectedTag === 'all' || record.tag === selectedTag;
        const matchesQuery = terms.length === 0 || terms.every(term => record.searchText.includes(term));
        return matchesTag && matchesQuery;
      })
      .map(record => record.row);

    if (resetPage) currentPage = 1;
    currentPage = Math.min(currentPage, getTotalPages());

    updateFilterButtons();
    goToPage(currentPage, { shouldScroll });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) goToPage(currentPage - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = getTotalPages();
      if (currentPage < totalPages) goToPage(currentPage + 1);
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedTag = btn.dataset.filter || 'all';
      applyFilters({ resetPage: true, shouldScroll: true });
    });
  });

  async function fetchSearchIndex() {
    if (searchIndex || isFetching) return;
    isFetching = true;
    try {
      const res = await fetch(getSearchIndexPath());
      if (res.ok) {
        const data = await res.json();
        // Filter by current language
        const langPref = currentLang.startsWith('zh') ? 'zh' : 'en';
        searchIndex = data.filter(item => item.lang === langPref);
      }
    } catch (e) {
      console.error('Failed to load search index', e);
    }
    isFetching = false;
  }

  function syncSearchDropdownFocus() {
    searchResultItems.forEach((item, index) => {
      const isActive = index === activeSearchResultIndex;
      item.classList.toggle('active', isActive);
      item.classList.toggle('focused', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
  }

  function updateSearchDropdownPosition() {
    if (!searchDropdown || !searchInputWrapper) return;

    const rect = searchInputWrapper.getBoundingClientRect();
    searchDropdown.style.left = `${rect.left}px`;
    searchDropdown.style.top = `${rect.bottom + 8}px`;
    searchDropdown.style.width = `${rect.width}px`;
  }

  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      updateSearchDropdownPosition();
      void fetchSearchIndex().then(() => {
        if (searchQuery) executeSearch(searchQuery.toLowerCase());
      });
    });

    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      const query = searchQuery.toLowerCase();

      applyFilters({ resetPage: true });
      updateSearchDropdownPosition();

      if (query.length > 0) {
        clearBtn.style.display = 'flex';
        void fetchSearchIndex().then(() => {
          if (searchInput.value.trim().toLowerCase() === query) executeSearch(query);
        });
        executeSearch(query);
      } else {
        clearBtn.style.display = 'none';
        closeSearch();
      }
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearBtn.style.display = 'none';
      applyFilters({ resetPage: true });
      closeSearch();
      searchInput.focus();
    });

    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target) && !clearBtn.contains(e.target)) {
        closeSearch();
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (!searchDropdown.classList.contains('active') || searchResultItems.length === 0) {
        if (e.key === 'Escape') closeSearch();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeSearchResultIndex = (activeSearchResultIndex + 1) % searchResultItems.length;
        syncSearchDropdownFocus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeSearchResultIndex = activeSearchResultIndex <= 0
          ? searchResultItems.length - 1
          : activeSearchResultIndex - 1;
        syncSearchDropdownFocus();
      } else if (e.key === 'Enter') {
        const targetIndex = activeSearchResultIndex >= 0 ? activeSearchResultIndex : 0;
        const target = searchResultItems[targetIndex];
        if (target) {
          e.preventDefault();
          window.location.href = target.href;
        }
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });
  }

  window.addEventListener('resize', updateSearchDropdownPosition, { passive: true });
  window.addEventListener('scroll', () => {
    if (searchDropdown?.classList.contains('active')) {
      updateSearchDropdownPosition();
    }
  }, { passive: true });

  function executeSearch(query) {
    if (!searchIndex || !searchDropdown) return;

    const terms = query.split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      closeSearch();
      return;
    }

    const results = searchIndex.map(item => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();
      const tagLower = item.tag.toLowerCase();

      terms.forEach(term => {
        if (titleLower.includes(term)) score += 10;
        if (tagLower.includes(term)) score += 5;
        if (descLower.includes(term)) score += 2;
      });

      return { item, score };
    })
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

    renderSearchResults(results, query);
  }

  function renderSearchResults(results, query) {
    if (!searchDropdown) return;

    searchDropdown.innerHTML = '';
    activeSearchResultIndex = -1;

    if (results.length === 0) {
      const noResultsText = currentLang.startsWith('zh') ? '未找到相关文章' : 'No related articles found';
      searchDropdown.innerHTML = `<div class="search-empty">${noResultsText}</div>`;
    } else {
      results.forEach(({ item }, index) => {
        const a = document.createElement('a');
        a.href = item.url;
        a.className = 'search-result-item';
        a.dataset.index = String(index);
        a.setAttribute('role', 'option');
        a.setAttribute('aria-selected', 'false');

        a.innerHTML = `
          <div class="search-result-meta">
            <span class="tag">${item.tag}</span>
            <time>${item.date}</time>
          </div>
          <div class="search-result-title">${highlightSearchMatches(item.title, query)}</div>
          <div class="search-result-desc">${highlightSearchMatches(item.description, query)}</div>
        `;

        a.addEventListener('mouseenter', () => {
          activeSearchResultIndex = index;
          syncSearchDropdownFocus();
        });

        searchDropdown.appendChild(a);
      });
    }

    searchResultItems = Array.from(searchDropdown.querySelectorAll('.search-result-item'));
    updateSearchDropdownPosition();
    searchDropdown.classList.add('active');
  }

  function closeSearch() {
    activeSearchResultIndex = -1;
    searchResultItems = [];
    if (searchDropdown) searchDropdown.classList.remove('active');
  }

  applyFilters({ shouldScroll: false });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      if (searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    }
    if (e.key === 'Escape') {
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
        closeSearch();
      }
    }
  });
}
initArticlesListing();
