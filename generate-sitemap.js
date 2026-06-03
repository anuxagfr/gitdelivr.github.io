const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const BASE_URL = 'https://gitdelivr.in';

// Add any files you do NOT want Google to index here
const IGNORE_FILES = [
  '404.html', 
  'auth.html', 
  'admin.html', 
  'reset-password.html',
  'domo.html',
  'link.html'
];

function getHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getHtmlFiles(filePath, fileList);
    } else if (filePath.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const htmlFiles = getHtmlFiles(PUBLIC_DIR);

let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

let addedCount = 0;
htmlFiles.forEach(filePath => {
  // Get relative path and enforce forward slashes for URLs
  const relativePath = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
  if (IGNORE_FILES.includes(relativePath)) return;

  // Clean URLs: Turn 'index.html' into '' and 'blog/index.html' into 'blog/'
  let urlPath = relativePath.replace(/(^|\/)index\.html$/, '$1');

  // Remove trailing slashes for cleaner URLs
  if (urlPath.length > 0 && urlPath.endsWith('/')) {
    urlPath = urlPath.slice(0, -1);
  }

  const priority = urlPath === '' ? '1.0' : '0.8';
  const lastmod = fs.statSync(filePath).mtime.toISOString().split('T')[0];
  
  sitemapContent += `  <url>\n    <loc>${BASE_URL}/${urlPath}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
  addedCount++;
});

sitemapContent += `</urlset>`;

fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapContent);
console.log(`✅ Sitemap successfully generated with ${addedCount} URLs at public/sitemap.xml`);