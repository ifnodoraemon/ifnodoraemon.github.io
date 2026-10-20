import { marked } from 'marked';

// Inspect rendered links rather than bracket-like text in code examples.
export function extractMarkdownTargets(markdown) {
  const targets = [];
  marked.walkTokens(marked.lexer(markdown), token => {
    if ((token.type === 'link' || token.type === 'image') && token.href) {
      targets.push(token.href);
    }
  });
  return targets;
}
