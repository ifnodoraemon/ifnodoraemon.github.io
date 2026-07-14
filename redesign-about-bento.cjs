const fs = require('fs');

const path = 'src/templates/pages/index.html';
let content = fs.readFileSync(path, 'utf8');

const startIndex = content.indexOf('<!-- ====== About ====== -->');
const endIndex = content.indexOf('</main>', startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find About section.");
  process.exit(1);
}

const bentoCss = `
        <style>
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: minmax(180px, auto);
          gap: 1.5rem;
          margin-top: 2rem;
          margin-bottom: 4rem;
        }
        .bento-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .bento-card:hover {
          transform: translateY(-5px);
          border-color: rgba(34, 211, 238, 0.3);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 211, 238, 0.1);
        }
        .bento-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(circle at top left, rgba(34, 211, 238, 0.1), transparent 70%);
          pointer-events: none;
        }
        .bento-main {
          grid-column: span 2;
          grid-row: span 2;
          justify-content: flex-end;
        }
        .bento-main h3 {
          font-size: 2.2rem;
          margin-bottom: 1rem;
          background: linear-gradient(to right, #fff, var(--accent-cyan));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .bento-main p {
          color: #a1a1aa;
          line-height: 1.8;
          font-size: 1.05rem;
        }
        .bento-stat {
          grid-column: span 1;
          grid-row: span 1;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .bento-stat .stat-num {
          font-size: 3.5rem;
          font-weight: 700;
          color: #fff;
          line-height: 1;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(255,255,255,0.3);
        }
        .bento-stat .stat-label {
          color: var(--accent-cyan);
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 600;
        }
        .bento-stack {
          grid-column: span 2;
          grid-row: span 1;
        }
        .bento-stack h4 {
          color: #fff;
          margin-bottom: 1rem;
          font-size: 1.2rem;
          letter-spacing: 1px;
        }
        .stack-icons {
          display: flex;
          gap: 0.8rem;
          flex-wrap: wrap;
        }
        .stack-chip {
          padding: 0.5rem 1.2rem;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          font-size: 0.85rem;
          color: #e4e4e7;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .bento-links {
          grid-column: span 1;
          grid-row: span 2;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
        .bento-links:hover {
          transform: none;
        }
        .bento-link-btn {
          flex: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          text-decoration: none;
          transition: all 0.3s ease;
          gap: 0.8rem;
          backdrop-filter: blur(20px);
        }
        .bento-link-btn:hover {
          background: rgba(34, 211, 238, 0.1);
          border-color: var(--accent-cyan);
          color: var(--accent-cyan);
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }
        @media (max-width: 1024px) {
          .bento-grid { grid-template-columns: repeat(2, 1fr); }
          .bento-main { grid-column: span 2; }
          .bento-links { grid-column: span 2; grid-row: span 1; flex-direction: row; }
        }
        @media (max-width: 640px) {
          .bento-grid { grid-template-columns: 1fr; }
          .bento-main, .bento-stat, .bento-stack, .bento-links { grid-column: span 1; }
          .bento-links { flex-direction: column; }
        }
        </style>
`;

const newAboutHtml = `
    <!-- ====== Premium Bento About ====== -->
    <section id="about" class="section section-tight">
      <div class="container">
        <div class="section-header fade-in" style="margin-bottom: 0;">
          <div class="section-tag">
            <span class="tag-bracket">[</span>
            <span class="tag-text">CREATOR / FOUNDER</span>
            <span class="tag-bracket">]</span>
          </div>
          <h2 class="section-title">
            <span>关于作者</span>
          </h2>
        </div>
        ${bentoCss}
        <div class="bento-grid fade-in">
          
          <!-- Main Bio -->
          <div class="bento-card bento-main">
            <h3>ifnodoraemon</h3>
            <p>专注 AI 大模型底座能力解析与 Agent 架构落地。致力于在通用人工智能（AGI）加速到来的前沿，打磨最硬核的技术实战方案。不拘泥于传统的开发模式，而是站在硅基时代的视角探索未来计算的边界。</p>
          </div>

          <!-- Links -->
          <div class="bento-card bento-links">
            <a href="https://github.com/ifnodoraemon" target="_blank" rel="noopener" class="bento-link-btn">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              <span style="font-weight: 600; font-size: 1.1rem;">GitHub</span>
            </a>
            <a href="https://x.com/ifnodoraemon" target="_blank" rel="noopener" class="bento-link-btn">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              <span style="font-weight: 600; font-size: 1.1rem;">Twitter</span>
            </a>
          </div>

          <!-- Stats -->
          <div class="bento-card bento-stat">
            <div class="stat-num">50<span style="color: var(--accent-cyan);">+</span></div>
            <div class="stat-label">深度评测研报</div>
          </div>
          <div class="bento-card bento-stat">
            <div class="stat-num">12<span style="color: var(--accent-cyan);">V</span></div>
            <div class="stat-label">前沿评测维度</div>
          </div>

          <!-- Tech Stack -->
          <div class="bento-card bento-stack">
            <h4>TECH MATRIX</h4>
            <div class="stack-icons">
              <span class="stack-chip">LLM Fine-Tuning</span>
              <span class="stack-chip">Agentic Workflows</span>
              <span class="stack-chip">RAG Architecture</span>
              <span class="stack-chip">Computer Vision</span>
              <span class="stack-chip">Transformer</span>
            </div>
          </div>

        </div>
      </div>
    </section>
`;

// Also I should remove the "Newsletter CTA" section entirely since the Bento links replace it
const newsletterStart = content.indexOf('<!-- ====== Newsletter CTA ====== -->');
const newsletterEnd = content.indexOf('<!-- Section Divider -->', newsletterStart);

let cleanContent = content;
if (newsletterStart !== -1 && newsletterEnd !== -1) {
  // we remove from newsletterStart to the END of the section divider right before About
  cleanContent = content.substring(0, newsletterStart) + content.substring(startIndex);
}

const finalStartIndex = cleanContent.indexOf('<!-- ====== About ====== -->');
const finalEndIndex = cleanContent.indexOf('</main>', finalStartIndex);

const finalHtml = cleanContent.substring(0, finalStartIndex) + newAboutHtml + '\n  </main>';
fs.writeFileSync(path, finalHtml);
console.log("Bento grid About section injected and Newsletter removed!");
