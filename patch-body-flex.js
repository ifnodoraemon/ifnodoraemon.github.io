import fs from 'fs';
let css = fs.readFileSync('src/assets/css/style.css', 'utf8');

if (!css.includes('display: flex;\n  flex-direction: column;\n  min-height: 100vh;')) {
  css = css.replace(
    'body {\n  background:',
    'body {\n  display: flex;\n  flex-direction: column;\n  min-height: 100vh;\n  background:'
  );
  
  css = css.replace(
    '.page-main {\n  padding-top: 60px;\n}',
    '.page-main {\n  padding-top: 60px;\n  flex: 1;\n}'
  );
  fs.writeFileSync('src/assets/css/style.css', css, 'utf8');
  console.log('Flex body patched!');
}
