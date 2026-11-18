import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import matter from 'gray-matter';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getAllHtmlFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllHtmlFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.html')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });
  
  return arrayOfFiles;
}

function getArticleMeta(slug, isEn, rootDir, gitDates = {}) {
  const zhPath = path.join(rootDir, 'content', 'zh', 'articles', `${slug}.md`);
  const enPath = path.join(rootDir, 'content', 'en', 'articles', `${slug}.en.md`);
  const preferredPath = isEn ? enPath : zhPath;
  const targetPath = fs.existsSync(preferredPath) ? preferredPath : (fs.existsSync(zhPath) ? zhPath : (fs.existsSync(enPath) ? enPath : null));

  let date = null;
  let title = '';
  let description = '';

  if (targetPath) {
    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
      const { data: fm } = matter(content);
      title = fm.title || '';
      description = fm.description || '';
      const rawDate = fm.lastmod || fm.updated || gitDates[slug] || fm.date;
      if (rawDate) {
        date = new Date(rawDate).toISOString().split('T')[0];
      }
    } catch (_) {}
  }

  if (!date && gitDates[slug]) date = gitDates[slug];

  return { date, title, description };
}

export default function seoPlugin({ hostname }) {
  let outDir = '';
  return {
    name: 'vite-plugin-seo',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!fs.existsSync(outDir)) return;
      const rootDir = process.cwd();
      const today = new Date().toISOString().split('T')[0];

      const gitDates = {};
      try {
        const zhDir = path.join(rootDir, 'content', 'zh', 'articles');
        const enDir = path.join(rootDir, 'content', 'en', 'articles');
        if (fs.existsSync(zhDir)) {
          for (const f of fs.readdirSync(zhDir).filter(f => f.endsWith('.md'))) {
            const slug = f.replace(/\.md$/, '');
            try {
              const out = execSync(`git log -1 --format=%cI -- content/zh/articles/${f}`, { cwd: rootDir, encoding: 'utf-8' }).trim();
              if (out) gitDates[slug] = out.split('T')[0];
            } catch (_) {}
          }
        }
        if (fs.existsSync(enDir)) {
          for (const f of fs.readdirSync(enDir).filter(f => f.endsWith('.md'))) {
            const slug = f.replace(/\.en\.md$/, '').replace(/\.md$/, '');
            if (!gitDates[slug]) {
              try {
                const out = execSync(`git log -1 --format=%cI -- content/en/articles/${f}`, { cwd: rootDir, encoding: 'utf-8' }).trim();
                if (out) gitDates[slug] = out.split('T')[0];
              } catch (_) {}
            }
          }
        }
      } catch (_) {}

      const htmlFiles = getAllHtmlFiles(outDir);
      const urls = [];
      
      for (const file of htmlFiles) {
        const baseName = path.basename(file);
        if (baseName !== 'index.html') continue;

        let relative = path.relative(outDir, file);
        relative = relative.replace(/\\/g, '/');
        let route = relative.replace(/index\.html$/, '').replace(/\/$/, '');
        if (route === '') route = '/';
        else route = '/' + route + '/';
        
        if (route.includes('404')) continue;
        
        urls.push(route);
      }
      
      urls.sort();

      const urlEntries = urls.map(url => {
        const isEn = url.startsWith('/en/');
        const zhRoute = isEn ? (url.replace(/^\/en/, '') || '/') : url;
        const enRoute = isEn ? url : ('/en' + (url === '/' ? '/' : url));
        const xDefault = zhRoute;

        let lastmod = today;
        let changefreq = 'monthly';
        let priority = '0.7';

        let imageXml = '';
        if (url === '/' || url === '/en/') {
          priority = '1.0';
          changefreq = 'daily';
          lastmod = today;
        } else if (url === '/articles/' || url === '/en/articles/') {
          priority = '0.9';
          changefreq = 'daily';
          lastmod = today;
        } else if (url === '/tools/' || url === '/en/tools/') {
          priority = '0.9';
          changefreq = 'weekly';
          lastmod = today;
        } else if (url === '/models/' || url === '/en/models/') {
          priority = '0.8';
          changefreq = 'weekly';
          lastmod = today;
        } else if (url.includes('/articles/')) {
          priority = '0.8';
          changefreq = 'monthly';
          const slug = url.replace(/^\/en\/articles\/|^\/articles\/|\/$/g, '');
          const meta = getArticleMeta(slug, isEn, rootDir, gitDates);
          if (meta.date) lastmod = meta.date;
          const langSegment = isEn ? 'en' : 'zh';
          const titleTag = meta.title ? `\n      <image:title>${escapeXml(meta.title)}</image:title>` : '';
          const captionTag = meta.description ? `\n      <image:caption>${escapeXml(meta.description)}</image:caption>` : '';
          imageXml = `\n    <image:image>\n      <image:loc>${hostname}/og/${langSegment}/${slug}.png</image:loc>${titleTag}${captionTag}\n    </image:image>`;
        } else if (url === '/about/' || url === '/en/about/' || url === '/projects/' || url === '/en/projects/') {
          priority = '0.7';
          changefreq = 'monthly';
          lastmod = today;
        }

        return `  <url>
    <loc>${hostname}${url}</loc>
    <xhtml:link rel="alternate" hreflang="zh" href="${hostname}${zhRoute}" />
    <xhtml:link rel="alternate" hreflang="en" href="${hostname}${enRoute}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${hostname}${xDefault}" />
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${imageXml}
  </url>`;
      });

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries.join('\n')}
</urlset>`;

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
      const repoSitemapPath = path.join(rootDir, 'public', 'sitemap.xml');
      fs.writeFileSync(repoSitemapPath, sitemap);
      
      const publicRobotsPath = path.join(rootDir, 'public', 'robots.txt');
      const distRobotsPath = path.join(outDir, 'robots.txt');
      if (fs.existsSync(publicRobotsPath)) {
        let robotsContent = fs.readFileSync(publicRobotsPath, 'utf-8');
        if (!robotsContent.includes('Sitemap:')) {
          robotsContent += `\nSitemap: ${hostname}/sitemap.xml\n`;
        }
        fs.writeFileSync(distRobotsPath, robotsContent);
      } else {
        const robots = `User-agent: *\nAllow: /\n\nSitemap: ${hostname}/sitemap.xml\n`;
        fs.writeFileSync(distRobotsPath, robots);
      }
      console.log(`\n[seo-plugin] Generated enhanced bilingual sitemap.xml with ${urls.length} URLs (lastmod & hreflang) and verified robots.txt`);
    }
  };
}
