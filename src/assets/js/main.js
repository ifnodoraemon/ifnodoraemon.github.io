// ============================================
// 大雄话AI — Main Entry Point
// ============================================
import { renderNav } from './components/nav.js';
import { renderFooter } from './components/footer.js';

document.addEventListener('DOMContentLoaded', () => {

  // — Detect current page —
  const path = window.location.pathname;
  let activePage = 'home';
  let footerStyle = 'full';

  if (path.startsWith('/about')) {
    activePage = 'about';
    footerStyle = 'simple';
  } else if (path.startsWith('/models')) {
    activePage = 'models';
    footerStyle = 'simple';
  } else if (path.startsWith('/projects')) {
    activePage = 'projects';
    footerStyle = 'simple';
  } else if (path === '/articles/' || path === '/articles') {
    activePage = 'articles';
    footerStyle = 'simple';
  } else if (path.startsWith('/articles')) {
    activePage = '';
    footerStyle = 'simple';
  }

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

  const items = Array.from(articlesList.querySelectorAll('.article-list-item'));
  const filterBtns = document.querySelectorAll('.filter-btn');
  const pagination = document.querySelector('.articles-pagination');
  const numbersContainer = document.querySelector('.pagination-numbers');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
  const searchInput = document.getElementById('article-search-input');
  const clearBtn = document.getElementById('search-clear-btn');
  const searchDropdown = document.getElementById('search-results-dropdown');
  const currentLang = searchInput ? searchInput.dataset.lang : 'en';

  const ITEMS_PER_PAGE = 8;
  let currentPage = 1;
  let filteredItems = [...items];
  
  // -- Pagination Logic --
  function renderPagination() {
    const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    
    // Hide pagination if only 1 page
    if (totalPages <= 1) {
      if (pagination) pagination.style.display = 'none';
      return;
    }
    
    if (pagination) pagination.style.display = 'flex';
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
    
    items.forEach(item => item.style.display = 'none');
    
    filteredItems.forEach((item, index) => {
      if (index >= start && index < end) {
        item.style.display = '';
      }
    });
    
    renderPagination();
  }
  
  function goToPage(page) {
    currentPage = page;
    showPage(currentPage);
    // Optional scroll to top of list
    const filterSection = document.getElementById('articles-filter');
    if (filterSection) {
      const offset = filterSection.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    }
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) goToPage(currentPage - 1);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
      if (currentPage < totalPages) goToPage(currentPage + 1);
    });
  }
  
  // -- Filter Logic Override --
  // We need to override the existing filter logic to work with pagination
  filterBtns.forEach(btn => {
    // Remove the old listener attached in HTML template via inline script if possible.
    // Since it's inline, we'll just handle ours and ensure ours runs.
    btn.addEventListener('click', (e) => {
      // Prevent the inline script from breaking pagination
      e.stopPropagation(); 
      
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      
      if (filter === 'all') {
        filteredItems = [...items];
      } else {
        filteredItems = items.filter(item => item.dataset.tag === filter);
      }
      
      currentPage = 1;
      showPage(1);
    }, true); // Use capture to intercept before the inline script
  });
  
  // -- Initial Render --
  showPage(1);

  // -- Search Logic --
  let searchIndex = null;
  let isFetching = false;
  
  async function fetchSearchIndex() {
    if (searchIndex || isFetching) return;
    isFetching = true;
    try {
      const res = await fetch('/public/search-index.json');
      if (res.ok) {
        const data = await fetch('/public/search-index.json').then(res => res.json());
        // Filter by current language
        const langPref = currentLang.startsWith('zh') ? 'zh' : 'en';
        searchIndex = data.filter(item => item.lang === langPref);
      }
    } catch (e) {
      console.error('Failed to load search index', e);
    }
    isFetching = false;
  }
  
  if (searchInput) {
    searchInput.addEventListener('focus', fetchSearchIndex);
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      
      if (query.length > 0) {
        clearBtn.style.display = 'flex';
        executeSearch(query);
      } else {
        clearBtn.style.display = 'none';
        closeSearch();
      }
    });
    
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      closeSearch();
      searchInput.focus();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target) && !clearBtn.contains(e.target)) {
        closeSearch();
      }
    });
  }
  
  function executeSearch(query) {
    if (!searchIndex) return;
    
    const terms = query.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return;
    
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
    .slice(0, 5); // Limit to top 5 results
    
    renderSearchResults(results, query);
  }
  
  function renderSearchResults(results, query) {
    searchDropdown.innerHTML = '';
    
    if (results.length === 0) {
      const noResultsText = currentLang.startsWith('zh') ? '未找到相关文章' : 'No related articles found';
      searchDropdown.innerHTML = `<div class="search-empty">${noResultsText}</div>`;
    } else {
      results.forEach(({ item }) => {
        const a = document.createElement('a');
        a.href = item.url;
        a.className = 'search-result-item';
        
        // Basic highlight function
        const highlight = (text) => {
          if (!query) return text;
          const regex = new RegExp(`(${query.split(/\s+/).join('|')})`, 'gi');
          return text.replace(regex, '<mark>$1</mark>');
        };
        
        a.innerHTML = `
          <div class="search-result-meta">
            <span class="tag">${item.tag}</span>
            <time>${item.date}</time>
          </div>
          <div class="search-result-title">${highlight(item.title)}</div>
          <div class="search-result-desc">${highlight(item.description)}</div>
        `;
        
        searchDropdown.appendChild(a);
      });
    }
    
    searchDropdown.classList.add('active');
  }
  
  function closeSearch() {
    if(searchDropdown) searchDropdown.classList.remove('active');
  }
}
initArticlesListing();
