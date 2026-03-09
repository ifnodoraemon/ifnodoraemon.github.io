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
      threshold: 0.1,
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
