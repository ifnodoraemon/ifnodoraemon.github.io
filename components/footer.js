// Shared Footer Component
export function renderFooter(style = 'full') {
  const footer = document.getElementById('site-footer') || createFooterElement();

  const isEn = window.location.pathname.startsWith('/en/');
  const langPrefix = isEn ? '/en' : '';
  const siteTitle = isEn ? 'AI Tech Observer' : 'AI 大模型观察';
  const desc = isEn ? 'Focusing on AI foundation models and tech insights.' : '专注 AI 大模型技术研究与实践分享。记录前沿技术的发展脉络。';
  
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
    footer.innerHTML = `
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
          </div>
        </div>
        <div class="footer-bottom">
          <span class="footer-copy">© 2026 ifnodoraemon · Built with ❤️ and AI</span>
        </div>
      </div>
    `;
  } else {
    footer.innerHTML = `
      <div class="container">
        <div class="footer-bottom">
          <span class="footer-copy">© 2026 ifnodoraemon · Built with ❤️ and AI</span>
        </div>
      </div>
    `;
  }

  return footer;
}

function createFooterElement() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.id = 'site-footer';
  document.body.appendChild(footer);
  return footer;
}
