import fs from 'fs';
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

const newPalette = `:root {
  /* Palette - Oceanic Aurora (Modern Deep Indigo/Cyan) */
  --bg:          #050814;
  --bg-surface:  #0a0f25;
  --bg-elevated: #111836;
  --border:      rgba(99, 102, 241, 0.15);
  --border-hover:rgba(99, 102, 241, 0.35);

  --text:        #f8fafc;
  --text-muted:  #94a3b8;
  --text-faint:  #475569;

  --accent:      #38bdf8;
  --accent-light:#7dd3fc;
  --accent-cyan: #22d3ee;
  --accent-glow: rgba(56, 189, 248, 0.25);
  --gradient:    linear-gradient(135deg, #6366f1 0%, #38bdf8 100%);
  --selection-bg:rgba(56, 189, 248, 0.3);

  --amber:       #fbbf24;
  --emerald:     #34d399;
  --cyan:        #22d3ee;`;

css = css.replace(/:root\s*{\s*\/\* Palette - Vercel.*?--cyan:\s*#[a-f0-9]+;/is, newPalette);

// Add custom selection style
if (!css.includes('::selection')) {
  css += '\n::selection { background: var(--selection-bg); color: #fff; }\n::-moz-selection { background: var(--selection-bg); color: #fff; }\n';
}

fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
