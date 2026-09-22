import katex from 'katex';

/**
 * Client-side KaTeX extension for Marked
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
          if (nextTwo !== -1 && !src.slice(index + 2, nextTwo).includes('\n')) {
            return index;
          }
          index++;
          continue;
        }

        const next = src[index + 1];
        if (!next || /[0-9\s\$\n|]/.test(next)) continue;

        let closing = index;
        let found = false;
        while ((closing = src.indexOf('$', closing + 1)) !== -1) {
          if (src[closing - 1] === '\\') continue;
          const between = src.slice(index + 1, closing);
          if (between.includes('\n') || between.includes('|')) break;
          if (between.endsWith(' ') || between.endsWith('\t')) continue;
          found = true;
          break;
        }

        if (found) return index;
      }
      return -1;
    },
    tokenizer(src) {
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

      if (src.startsWith('$')) {
        const singleMatch = src.match(/^\$([^\$\n]+?)\$/);
        if (singleMatch) {
          return {
            type: 'inlineMath',
            raw: singleMatch[0],
            text: singleMatch[1].trim(),
            displayMode: false,
          };
        }
      }
    },
    renderer(token) {
      try {
        return katex.renderToString(token.text, {
          ...katexOptions,
          displayMode: token.displayMode ?? false,
        });
      } catch (e) {
        return `<span class="katex-error">${token.text}</span>`;
      }
    },
  };

  return {
    extensions: [blockMath, inlineMath],
  };
}
