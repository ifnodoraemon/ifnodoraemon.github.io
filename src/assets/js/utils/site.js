export function isEnglishPath(pathname = '') {
  return /^\/en(?:\/|$)/.test(pathname);
}

export function stripLangPrefix(pathname = '/') {
  if (!pathname) return '/';

  const normalized = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

export function getPageState(pathname = '/') {
  const normalizedPath = stripLangPrefix(pathname);
  let activePage = 'home';
  let footerStyle = 'full';

  if (normalizedPath === '/about' || normalizedPath.startsWith('/about/')) {
    activePage = 'about';
    footerStyle = 'simple';
  } else if (normalizedPath === '/models' || normalizedPath.startsWith('/models/')) {
    activePage = 'models';
    footerStyle = 'simple';
  } else if (normalizedPath === '/projects' || normalizedPath.startsWith('/projects/')) {
    activePage = 'projects';
    footerStyle = 'simple';
  } else if (normalizedPath === '/articles' || normalizedPath === '/articles/') {
    activePage = 'articles';
    footerStyle = 'simple';
  } else if (normalizedPath.startsWith('/articles/')) {
    activePage = '';
    footerStyle = 'simple';
  }

  return {
    activePage,
    footerStyle,
    normalizedPath,
  };
}

export function escapeRegExp(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function highlightSearchMatches(text, query) {
  const sourceText = String(text ?? '');
  const terms = String(query ?? '')
    .split(/\s+/)
    .map(term => term.trim())
    .filter(Boolean);

  if (!terms.length) return sourceText;

  const pattern = terms.map(escapeRegExp).join('|');
  if (!pattern) return sourceText;

  return sourceText.replace(new RegExp(`(${pattern})`, 'gi'), '<mark>$1</mark>');
}

export function getSearchIndexPath() {
  return '/search-index.json';
}
