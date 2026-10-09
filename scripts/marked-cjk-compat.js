/**
 * Marked extension for CJK-friendly strong emphasis (**...**)
 *
 * Background & Problem:
 * In CommonMark/GFM specification, emphasis delimiter runs (like `**`)
 * adjacent to Unicode punctuation (such as Chinese fullwidth quotes `“`/`”`,
 * book titles `《`/`》`, or fullwidth parentheses `（`/`）`) fail left-flanking
 * or right-flanking rules when immediately touching CJK characters without ASCII whitespace:
 * - `**端到端（End-to-End）**的` -> right-flanking fails because preceded by `）` and followed by `的`
 * - `灾难性的**“拥塞崩溃”**：` -> left-flanking fails because preceded by `的` and followed by `“`
 * - `**《从 Docker 到 K8s》**的` -> right-flanking fails because preceded by `》` and followed by `的`
 *
 * This extension provides robust, CJK-compatible inline strong tokenization.
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
