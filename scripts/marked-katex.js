import katex from 'katex';

/**
 * Custom KaTeX extension for Marked
 *
 * Solves:
 * 1. Adjacent Chinese & English punctuation/characters without requiring ASCII spaces (e.g. `（$A_i$）`, `$A_i$：`, `值$A_i$`, `$A_i > 0$，`).
 * 2. Block math with single-line `$$ ... $$`, multi-line `$$\n...\n$$`, and list-indented formulas.
 * 3. Prevents false positive matching of currency tokens (e.g. `$20/月`, `$2.50`, `$15.00`, `$7/小时 = $168/天`, `$33,000 / month`).
 * 4. Supports formulas starting with numbers/digits (e.g. `$4 \times 32 = 128$`, `$15\text{ms} \sim 35\text{ms}$`, `$2 \times h$`, `$512 (c_t^{KV})$`).
 * 5. Prevents cross-column matching over Markdown table pipes (`|`), while supporting escaped pipes (`\|`).
 * 6. Multi-line display math fallback inside paragraphs when preceding blank line is omitted.
 * 7. Unicode / Chinese in math mode with strict: false.
 * 8. Robust error recovery: malformed math renders raw text instead of throwing.
 */
function isCurrencyLike(content, afterClosingChar) {
  // If content contains LaTeX commands, backslashes, or common mathematical operators,
  // it is definitively a math formula, NOT currency!
  if (content.includes('\\') || /[\^_{}=<>+*]/.test(content)) {
    return false;
  }

  // 1. If closing $ is immediately followed by a digit, it is almost certainly a currency pair
  // e.g. "$7/小时 = $168/天", "$0.01~$0.05", "$3/$15", "$2.50 | $10.00", "$36K - $50K"
  if (afterClosingChar && /[0-9]/.test(afterClosingChar)) {
    return true;
  }

  // 2. Currency rate or timeframe keywords starting with a digit:
  // e.g. "20/月", "0.25 / 1M", "1,500/day", "7/小时", "0.05 per step"
  if (/^\d[\d\.,]*\s*[kKmMbB]?\s*(?:\/|per|每天成本|vs\s+API|vs\s+OpenAI)\s*(?:小时|月|天|年|次|hour|month|day|year|week|step|M\b|1M|百万)/i.test(content)) {
    return true;
  }

  // 3. Numbers followed by currency range dashes, e.g. "0.01~", "0.01 - ", "36K - "
  if (/^\d+[\d\.,]*\s*[kKmMbB]?\s*[-~至到]\s*$/.test(content)) {
    return true;
  }

  // 4. Currency token with cost description, e.g. "0.25 / 1M Tokens", "0.25/M"
  if (/^\d[\d\.,]*\s*(?:\/\s*(?:1M|M|百万)|Tokens?|百万|成本)/i.test(content) && (content.includes("成本") || /tokens?/i.test(content) || /^\d+[\d\.,]*\s*\/[mM1]/.test(content))) {
    return true;
  }

  // 5. Standalone currency with slash like "3/" in "$3/$15" or "0.25/"
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
        // Skip escaped dollar: \$
        if (index > 0 && src[index - 1] === '\\') continue;

        // Double dollar inline
        if (src[index + 1] === '$') {
          const nextTwo = src.indexOf('$$', index + 2);
          if (nextTwo !== -1) {
            return index;
          }
          index++;
          continue;
        }

        // Single dollar: next character cannot be whitespace, $, newline, or unescaped pipe
        const next = src[index + 1];
        if (!next || /[\s\$\n|]/.test(next)) continue;

        // Search for matching unescaped closing $ on the same line before any table pipe
        let closing = index;
        let found = false;
        while ((closing = src.indexOf('$', closing + 1)) !== -1) {
          if (src[closing - 1] === '\\') continue;
          const between = src.slice(index + 1, closing);
          if (between.includes('\n')) break;
          if (between.includes('|') && !between.includes('\\|')) break;
          // Math formula inside cannot end with whitespace
          if (between.endsWith(' ') || between.endsWith('\t')) continue;
          // Check currency filter
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
      // Inline display mode: $$...$$ (supports single or multi-line)
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

      // Single inline formula: $...$
      // Can start with letters, symbols, OR numbers (e.g. $4 \times 32$, $15\text{ms}$)
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
