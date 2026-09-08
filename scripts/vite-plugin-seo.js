import fs from 'fs';
import path from 'path';

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

export default function seoPlugin({ hostname }) {
  let outDir = '';
  return {
    name: 'vite-plugin-seo',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      if (!fs.existsSync(outDir)) return;
      
      const htmlFiles = getAllHtmlFiles(outDir);
      const urls = [];
      
      for (const file of htmlFiles) {
        // Convert local absolute path to relative path
        let relative = path.relative(outDir, file);
        // Replace Windows backslashes
        relative = relative.replace(/\\/g, '/');
        // Remove index.html
        let route = relative.replace(/index\.html$/, '').replace(/\/$/, '');
        if (route === '') route = '/';
        else route = '/' + route + '/';
        
        // Exclude 404 if it exists
        if (route.includes('404')) continue;
        
        urls.push(route);
      }
      
      // Sort for clean sitemap
      urls.sort();

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url>
    <loc>${hostname}${url}</loc>
    <changefreq>weekly</changefreq>
    <priority>${url === '/' || url === '/en/' ? '1.0' : (url.includes('/articles/') ? '0.8' : '0.6')}</priority>
  </url>`).join('\n')}
</urlset>`;

      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
      
      const robots = `User-agent: *
Allow: /

Sitemap: ${hostname}/sitemap.xml
`;
      fs.writeFileSync(path.join(outDir, 'robots.txt'), robots);
      console.log(`\n[seo-plugin] Generated sitemap.xml with ${urls.length} URLs and robots.txt`);
    }
  };
}
