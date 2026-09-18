import katex from 'katex';

/**
 * Custom KaTeX extension for Marked
 *
 * Solves:
 * 1. Adjacent Chinese & English punctuation/characters without requiring ASCII spaces (e.g. `（$A_i$）`, `$A_i$：`, `值$A_i$`, `$A_i > 0$，`).
 * 2. Block math with single-line `$$ ... $$`, multi-line `$$\n...\n$$`, and list-indented formulas.
 * 3. Prevents false positive matching of currency tokens (e.g. `$20/月`, `$2.50`, `$15.00`, `$7/小时 = $168/天`).
 * 4. Prevents cross-column matching over Markdown table pipes (`|`).
 * 5. Robust error recovery: malformed math renders raw text instead of throwing.
 */
export default function markedKatex(options = {}) {
  const katexOptions = {
    throwOnError: false,
    ...options,
  };

  const blockMath = {
    name: 'blockMath',
    level: 'block',
    start(src) {
      return src.indexOf('$$');
    },
    tokenizer(src) {
      // Matches:
      // ^[ \t]*\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)
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
          if (nextTwo !== -1 && !src.slice(index + 2, nextTwo).includes('\n')) {
            return index;
          }
          index++;
          continue;
        }

        // Single dollar: next character cannot be digit, whitespace, $, newline, or pipe
        const next = src[index + 1];
        if (!next || /[0-9\s\$\n|]/.test(next)) continue;

        // Search for matching unescaped closing $ on the same line before any table pipe
        let closing = index;
        let found = false;
        while ((closing = src.indexOf('$', closing + 1)) !== -1) {
          if (src[closing - 1] === '\\') continue;
          const between = src.slice(index + 1, closing);
          if (between.includes('\n') || between.includes('|')) break;
          // Math formula inside cannot end with whitespace
          if (between.endsWith(' ') || between.endsWith('\t')) continue;
          found = true;
          break;
        }

        if (found) return index;
      }
      return -1;
    },
    tokenizer(src) {
      // Inline display mode: $$...$$
      if (src.startsWith('$$')) {
        const doubleMatch = src.match(/^\$\$([^\$\n]+?)\$\$/);
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
      // Opening $ not followed by digit, space, $, newline, pipe
      // Content does not contain unescaped $, newline, pipe
      // Closing $ not preceded by space or unescaped backslash
      const singleMatch = src.match(/^\$((?![0-9\s\$\n|])(?:\\.|[^\\\$\n|])*?(?<![\s\\]))\$/);
      if (singleMatch) {
        return {
          type: 'inlineMath',
          raw: singleMatch[0],
          text: singleMatch[1].trim(),
          displayMode: false,
        };
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
