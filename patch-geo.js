import fs from 'fs';

let code = fs.readFileSync('scripts/build-articles.js', 'utf8');

// 1. Update buildTocHtml to use <nav> instead of <div>
code = code.replace(
  '<div class="toc-container"><h4>${tocTitle}</h4><ul class="article-toc-list">\\n${itemsHtml}\\n</ul></div>',
  '<nav class="toc-container" aria-label="Table of Contents"><h4>${tocTitle}</h4><ul class="article-toc-list">\\n${itemsHtml}\\n</ul></nav>'
);

// 2. Add generateFaqSchema function
const faqSchemaFn = `
function generateFaqSchema(markdown) {
  const qaPairs = [];
  const regex = /^(#{2,3})\\s+(.*?[?？])\\s*\\n([\\s\\S]*?)(?=^#{2,3}\\s|\\n*$)/gm;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    const question = match[2].trim();
    let answer = match[3].replace(/<\\/?[^>]+(>|$)/g, "").replace(/[#*[\\]\`]/g, "").trim();
    answer = answer.substring(0, 300).trim() + (answer.length > 300 ? "..." : "");
    if (question && answer) {
      qaPairs.push({ question, answer });
    }
  }
  if (qaPairs.length === 0) return '';
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": qaPairs.map(qa => ({
      "@type": "Question",
      "name": qa.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": qa.answer
      }
    }))
  };
  return \`<script type="application/ld+json">\\n\${JSON.stringify(schema, null, 2)}\\n</script>\`;
}
`;

if (!code.includes('function generateFaqSchema')) {
  code = code + '\n' + faqSchemaFn;
}

// 3. Apply faqSchema in getArticles
// Look for `htmlContent: htmlContent,`
// First we need raw markdown. Wait, `getArticles` has `mdContent`.
// We can attach `faqSchema: generateFaqSchema(mdContent),` to the article object.
if (!code.includes('faqSchema: generateFaqSchema(mdContent)')) {
  code = code.replace(
    'htmlContent: htmlContent,',
    'htmlContent: htmlContent,\n      faqSchema: generateFaqSchema(mdContent),'
  );
}

// 4. Pass faqSchema to applyTemplate
if (!code.includes('faqSchema: article.faqSchema,')) {
  code = code.replace(
    'prevNextHtml,',
    'prevNextHtml,\n      faqSchema: article.faqSchema || "",'
  );
}

fs.writeFileSync('scripts/build-articles.js', code, 'utf8');
console.log('GEO Patch applied!');
