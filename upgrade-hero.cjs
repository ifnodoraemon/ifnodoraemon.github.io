const fs = require('fs');

// 1. Update index.html
let html = fs.readFileSync('src/templates/pages/index.html', 'utf8');

const coreHtml = `
    <!-- CYBER CORE VISUAL -->
    <div class="cyber-core-container">
      <div class="cyber-core">
        <div class="core-ring ring-1"></div>
        <div class="core-ring ring-2"></div>
        <div class="core-ring ring-3"></div>
        <div class="core-center"></div>
      </div>
      <div class="cyber-live-log" id="liveLogStream">
        <div class="log-header">SYSTEM.LOG_STREAM // ACTIVE</div>
        <div class="log-content"></div>
      </div>
    </div>
`;

if (!html.includes('cyber-core-container')) {
  html = html.replace('<div class="hero-bg-elements">', coreHtml + '\n    <div class="hero-bg-elements">');
}

const logScript = `
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const logs = [
      "Establishing neural link...",
      "Syncing with node [0x9A4F]...",
      "Quantum state: STABLE",
      "Loading memory slices...",
      "Warning: Anomaly detected in vector space",
      "Bypassing security protocols...",
      "Accessing classified AI models...",
      "Compute cores running at 98% capacity",
      "Allocating VRAM for agent tasks...",
      "Model inference: 145 tokens/sec",
      "Running multi-agent consensus...",
      "Swe-bench worker spawned",
      "Memory GC executed. Freed 42GB."
    ];
    const content = document.querySelector('.log-content');
    if (!content) return;
    setInterval(() => {
      const p = document.createElement('p');
      p.innerText = "> " + logs[Math.floor(Math.random() * logs.length)];
      content.appendChild(p);
      if (content.children.length > 8) {
        content.removeChild(content.firstChild);
      }
    }, 1200);
  });
</script>
`;

if (!html.includes('SYSTEM.LOG_STREAM')) {
  html = html.replace('</body>', logScript + '\n</body>');
}

fs.writeFileSync('src/templates/pages/index.html', html);

// 2. Update style.css
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

const cyberCss = `
/* ================= CYBER CORE & LIVE LOG ================= */
.hero {
  position: relative;
  overflow: hidden;
}
.hero-container {
  position: relative;
  z-index: 10;
}
.cyber-core-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
.cyber-core {
  position: absolute;
  top: 50%;
  right: 5%;
  transform: translateY(-50%);
  width: 400px;
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.7;
}
.core-center {
  width: 80px;
  height: 80px;
  background: var(--accent-cyan);
  border-radius: 50%;
  box-shadow: 0 0 60px var(--accent-cyan), 0 0 120px var(--accent-cyan);
  animation: pulseCore 1.5s infinite alternate;
}
.core-ring {
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
}
.ring-1 {
  width: 100%; height: 100%;
  border-top: 2px solid var(--accent-cyan);
  border-bottom: 2px solid var(--accent-purple);
  animation: spinRing 10s linear infinite;
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.2);
}
.ring-2 {
  width: 75%; height: 75%;
  border-left: 2px solid var(--accent-purple);
  border-right: 2px solid var(--accent-cyan);
  animation: spinRing reverse 7s linear infinite;
}
.ring-3 {
  width: 50%; height: 50%;
  border-top: 2px dashed var(--accent-cyan);
  animation: spinRing 4s linear infinite;
}
@keyframes pulseCore {
  0% { transform: scale(0.9); box-shadow: 0 0 40px var(--accent-cyan); }
  100% { transform: scale(1.1); box-shadow: 0 0 100px var(--accent-cyan), 0 0 200px rgba(255,255,255,0.6); }
}
@keyframes spinRing {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.cyber-live-log {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  width: 300px;
  height: 180px;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(34, 211, 238, 0.4);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--accent-cyan);
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.1);
}
.log-header {
  background: rgba(34, 211, 238, 0.15);
  padding: 0.5rem;
  border-bottom: 1px solid rgba(34, 211, 238, 0.4);
  font-weight: bold;
  letter-spacing: 1px;
}
.log-content {
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.log-content p {
  margin: 0;
  opacity: 0;
  animation: fadeInLog 0.3s forwards;
  text-shadow: 0 0 5px rgba(34, 211, 238, 0.5);
}
@keyframes fadeInLog {
  to { opacity: 0.9; }
}

@media (max-width: 1024px) {
  .cyber-core { display: none; }
  .cyber-live-log { display: none; }
}
`;

if (!css.includes('CYBER CORE & LIVE LOG')) {
  fs.writeFileSync('src/assets/css/style.css', css + '\n' + cyberCss);
}
