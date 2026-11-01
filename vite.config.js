import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/* The repo the editor reads and writes, taken from Netlify's build environment so a repo
   transfer (CTRL Tech's GitHub to Tim's) needs no code change. src/edit/repo.js explains. */
const repoFromEnv = (() => {
  const m = /github\.com[/:]([^/]+\/[^/.]+)/.exec(process.env.REPOSITORY_URL || '');
  return m ? m[1] : '';
})();

const SITE = 'https://datruthmeter.com';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/* One real HTML file per essay (dist/post/<slug>/index.html), so a shared link shows the
   essay's own title, description and graphic, and search engines read the right page.
   The file is the built index.html with its head swapped; the app then renders the essay
   from the address (src/main.jsx). Netlify serves an existing file before the catch-all. */
function essayPages() {
  let outDir = 'dist';
  return {
    name: 'dtm-essay-pages',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const dir = join(process.cwd(), 'src/content/essays');
      let files = [];
      try { files = readdirSync(dir).filter((f) => f.endsWith('.json')); } catch { return; }
      const index = readFileSync(join(outDir, 'index.html'), 'utf8');
      for (const f of files) {
        const slug = f.slice(0, -5);
        const p = JSON.parse(readFileSync(join(dir, f), 'utf8')).root?.props || {};
        const title = `${p.title || slug} · DaTruthMeter`;
        const head = [
          `<title>${esc(title)}</title>`,
          `<meta name="description" content="${esc(p.dek || p.title || '')}" />`,
          `<link rel="canonical" href="${SITE}/post/${slug}" />`,
          `<meta property="og:type" content="article" />`,
          `<meta property="og:title" content="${esc(p.title || slug)}" />`,
          `<meta property="og:description" content="${esc(p.dek || '')}" />`,
          `<meta property="og:url" content="${SITE}/post/${slug}" />`,
          p.image ? `<meta property="og:image" content="${SITE}${esc(p.image)}" />` : '',
        ].filter(Boolean).join('\n    ');
        const html = index
          .replace(/<title>[\s\S]*?<\/title>/, '')
          .replace(/<meta name="description"[^>]*\/?>/, '')
          .replace('</head>', `    ${head}\n  </head>`);
        mkdirSync(join(outDir, 'post', slug), { recursive: true });
        writeFileSync(join(outDir, 'post', slug, 'index.html'), html);
      }
      console.log(`  essay pages: ${files.length} written to ${outDir}/post/`);
    },
  };
}

export default defineConfig({
  define: { __REPO__: JSON.stringify(repoFromEnv) },
  plugins: [react(), tailwindcss(), essayPages()],
  // Two pages: the site at / (and /post/<slug>) and its editor at /edit.
  build: {
    rollupOptions: { input: { main: 'index.html', edit: 'edit/index.html' } },
  },
});
