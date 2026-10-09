/**
 * Marked extension for CJK-friendly strong emphasis (**...**)
 */
export default function markedCjkCompat() {
  const customStrong = {
    name: 'strong',
    level: 'inline',
    start(src) {
      const match = src.match(/(?<!\\)\*\*/);
      return match ? match.index : -1;
    },
    tokenizer(src, tokens) {
      const match = /^\*\*([^\*]+?)\*\*/s.exec(src);
      if (match && !match[1].includes('\n\n') && match[1].trim().length > 0) {
        return {
          type: 'strong',
          raw: match[0],
          text: match[1],
          tokens: this.lexer.inlineTokens(match[1]),
        };
      }
    },
  };

  return {
    extensions: [customStrong],
  };
}
