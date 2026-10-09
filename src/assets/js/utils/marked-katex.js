import katex from 'katex';

/**
 * Client-side KaTeX extension for Marked
 */
function isCurrencyLike(content, afterClosingChar) {
  // If content contains LaTeX commands, backslashes, or common mathematical operators,
  // it is definitively a math formula, NOT currency!
  if (content.includes('\\') || /[\^_{}=<>+*]/.test(content)) {
    return false;
  }

  // 1. If closing $ is immediately followed by a digit, it is almost certainly a currency pair
  if (afterClosingChar && /[0-9]/.test(afterClosingChar)) {
    return true;
  }

  // 2. Currency rate or timeframe keywords starting with a digit:
  if (/^\d[\d\.,]*\s*[kKmMbB]?\s*(?:\/|per|每天成本|vs\s+API|vs\s+OpenAI)\s*(?:小时|月|天|年|次|hour|month|day|year|week|step|M\b|1M|百万)/i.test(content)) {
    return true;
  }

  // 3. Numbers followed by currency range dashes
  if (/^\d+[\d\.,]*\s*[kKmMbB]?\s*[-~至到]\s*$/.test(content)) {
    return true;
  }

  // 4. Currency token with cost description
  if (/^\d[\d\.,]*\s*(?:\/\s*(?:1M|M|百万)|Tokens?|百万|成本)/i.test(content) && (content.includes("成本") || /tokens?/i.test(content) || /^\d+[\d\.,]*\s*\/[mM1]/.test(content))) {
    return true;
  }

  // 5. Standalone currency with slash
  if (/^\d[\d\.,]*\s*\/$/.test(content)) {
    return true;
  }

  return false;
}

export default function markedKatex(options = {}) {
  const katexOptions = {
    throwOnError: false,
    strict: false,
    ...options,
  };

  const blockMath = {
    name: 'blockMath',
    level: 'block',
    start(src) {
      return src.indexOf('$$');
    },
    tokenizer(src) {
      const match = src.match(/^(?:[ \t]*)\$\$([\s\S]+?)\$\$(?:[ \t]*(?:\n|$))/);
      if (match) {
        return {
          type: 'blockMath',
          raw: match[0],
          text: match[1].trim(),
        };
      }
    },
    renderer(token) {
      try {
        return `<div class="katex-display">${katex.renderToString(token.text, { ...katexOptions, displayMode: true })}</div>\n`;
      } catch (e) {
        return `<div class="katex-display katex-error">${token.text}</div>\n`;
      }
    },
  };

  const inlineMath = {
    name: 'inlineMath',
    level: 'inline',
    start(src) {
      let index = -1;
      while ((index = src.indexOf('$', index + 1)) !== -1) {
        if (index > 0 && src[index - 1] === '\\') continue;

        if (src[index + 1] === '$') {
          const nextTwo = src.indexOf('$$', index + 2);
          if (nextTwo !== -1) {
            return index;
          }
          index++;
          continue;
        }

        const next = src[index + 1];
        if (!next || /[\s\$\n|]/.test(next)) continue;

        let closing = index;
        let found = false;
        while ((closing = src.indexOf('$', closing + 1)) !== -1) {
          if (src[closing - 1] === '\\') continue;
          const between = src.slice(index + 1, closing);
          if (between.includes('\n')) break;
          if (between.includes('|') && !between.includes('\\|')) break;
          if (between.endsWith(' ') || between.endsWith('\t')) continue;
          const afterClosing = src[closing + 1] || '';
          if (isCurrencyLike(between, afterClosing)) continue;

          found = true;
          break;
        }

        if (found) return index;
      }
      return -1;
    },
    tokenizer(src) {
      if (src.startsWith('$$')) {
        const doubleMatch = src.match(/^\$\$([\s\S]+?)\$\$/);
        if (doubleMatch) {
          return {
            type: 'inlineMath',
            raw: doubleMatch[0],
            text: doubleMatch[1].trim(),
            displayMode: true,
          };
        }
      }

      const singleMatch = src.match(/^\$((?![ \t\$\n|])(?:\\.|[^\\\$\n|])*?(?<![\s\\]))\$/);
      if (singleMatch) {
        const formulaText = singleMatch[1];
        const afterClosing = src[singleMatch[0].length] || '';
        if (!isCurrencyLike(formulaText, afterClosing)) {
          return {
            type: 'inlineMath',
            raw: singleMatch[0],
            text: formulaText.trim(),
            displayMode: false,
          };
        }
      }
    },
    renderer(token) {
      try {
        const rendered = katex.renderToString(token.text, {
          ...katexOptions,
          displayMode: !!token.displayMode,
        });
        if (token.displayMode) {
          return `<div class="katex-display">${rendered}</div>`;
        }
        return rendered;
      } catch (e) {
        return token.raw;
      }
    },
  };

  return {
    extensions: [blockMath, inlineMath],
  };
}
