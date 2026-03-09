// Shared Footer Component
export function renderFooter(style = 'full') {
  const footer = document.getElementById('site-footer') || createFooterElement();

  if (style === 'full') {
    footer.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col footer-brand-col">
            <span class="footer-logo">◆ AI 大模型观察</span>
            <p class="footer-desc">专注 AI 大模型技术研究与实践分享。记录前沿技术的发展脉络。</p>
          </div>
          <div class="footer-col">
            <h4 class="footer-heading">快速链接</h4>
            <a href="/" class="footer-link">首页</a>
            <a href="/models/" class="footer-link">模型对比</a>
            <a href="/about/" class="footer-link">关于本站</a>
          </div>
          <div class="footer-col">
            <h4 class="footer-heading">热门主题</h4>
            <a href="/articles/prompt-engineering-guide/" class="footer-link">提示工程</a>
            <a href="/articles/build-ai-agent/" class="footer-link">AI Agent</a>
            <a href="/articles/rag-in-practice/" class="footer-link">RAG 应用</a>
            <a href="/articles/fine-tuning-guide/" class="footer-link">模型微调</a>
          </div>
          <div class="footer-col">
            <h4 class="footer-heading">联系我们</h4>
            <a href="https://github.com/ifnodoraemon" target="_blank" rel="noopener" class="footer-link">GitHub</a>
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
