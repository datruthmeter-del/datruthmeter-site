/* Where the editor reads and writes.

   Derived, not hand-edited: Netlify sets REPOSITORY_URL on every build, vite.config.js
   turns it into __REPO__, so when the repo moves from CTRL Tech's GitHub to Tim's, the next
   deploy points the editor at its new home on its own. The literal is only the fallback for
   `npm run dev`, where there is no Netlify build. */

/* global __REPO__ */
export const REPO = (typeof __REPO__ === 'string' && __REPO__) || 'craigoj/datruthmeter-site';
export const BRANCH = 'main';
export const CONTENT_PATH = 'src/content/page.json';
/* One file per essay; the file name is the web address (/post/<name>). src/content/essays.js. */
export const ESSAYS_DIR = 'src/content/essays';
