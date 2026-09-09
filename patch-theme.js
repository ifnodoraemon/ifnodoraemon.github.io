import fs from 'fs';
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

const newPalette = `:root {
  /* Palette - Obsidian Iris (Modern High-End AI Engineering) */
  --bg:          #090a0f;
  --bg-surface:  #11131a;
  --bg-elevated: #181b24;
  --border:      rgba(255, 255, 255, 0.08);
  --border-hover:rgba(255, 255, 255, 0.18);

  --text:        #f1f5f9;
  --text-muted:  #94a3b8;
  --text-faint:  #64748b;

  --accent:      #6366f1;
  --accent-light:#818cf8;
  --accent-cyan: #38bdf8;
  --accent-glow: rgba(99, 102, 241, 0.2);
  --gradient:    linear-gradient(135deg, #ffffff 0%, #cbd5e1 45%, #818cf8 100%);
  --selection-bg:rgba(99, 102, 241, 0.35);

  --amber:       #fbbf24;
  --emerald:     #10b981;
  --cyan:        #38bdf8;
  --rose:        #f43f5e;
  --purple:      #a855f7;`;

css = css.replace(/:root\s*{\s*\/\* Palette - .*?--purple:\s*#[a-f0-9]+;/is, newPalette);

if (!css.includes('::selection')) {
  css += '\n::selection { background: var(--selection-bg); color: #fff; }\n::-moz-selection { background: var(--selection-bg); color: #fff; }\n';
}

fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
