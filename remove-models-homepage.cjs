const fs = require('fs');
const path = 'src/templates/pages/index.html';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const startIndex = lines.findIndex(l => l.includes('<!-- ====== Model Comparison ====== -->'));
const endIndex = lines.findIndex((l, idx) => idx > startIndex && l.includes('</section>'));

if (startIndex !== -1 && endIndex !== -1) {
  let actualStart = startIndex;
  // Look backwards for the preceding section divider
  for (let i = 1; i <= 6; i++) {
    if (lines[startIndex - i] && lines[startIndex - i].includes('<!-- Section Divider -->')) {
      actualStart = startIndex - i;
      break;
    }
  }
  
  lines.splice(actualStart, (endIndex - actualStart + 1));
  fs.writeFileSync(path, lines.join('\n'));
  console.log("Model Comparison section removed successfully.");
} else {
  console.log("Could not find the section.");
}
