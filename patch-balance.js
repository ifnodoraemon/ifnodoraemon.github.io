import fs from 'fs';
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

if (!css.includes('text-wrap: balance;')) {
  css += '\nh1, h2, h3, .glitch-title { text-wrap: balance; }\n';
  fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
  console.log('Text wrap patched!');
}
