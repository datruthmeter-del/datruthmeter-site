/* The essays, one file each in src/content/essays/<slug>.json, where <slug> is the web
   address (/post/<slug>). The addresses are the ones the Wix site used, so every link that
   ever pointed at a post keeps working after the domain moves.

   This index is built at build time from whatever files are in the folder: publishing a
   new essay from the editor adds a file, Netlify rebuilds, and it appears here, on the
   homepage list and at its own address, with no code change. */

const files = import.meta.glob('./essays/*.json', { eager: true, import: 'default' });

export const ESSAYS = Object.entries(files)
  .map(([path, doc]) => ({ slug: path.replace(/^.*\/|\.json$/g, ''), doc }))
  .sort((a, b) => String(b.doc.root?.props?.date || '').localeCompare(String(a.doc.root?.props?.date || '')));

export const essayBySlug = (slug) => ESSAYS.find((e) => e.slug === slug)?.doc;

export const essayPath = (slug) => `/post/${slug}`;

/** "2026-04-10" -> "Apr 2026". Anything that is not a date is shown as typed. */
export function essayDate(d) {
  const m = /^(\d{4})-(\d{2})/.exec(String(d || ''));
  if (!m) return String(d || '');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[Number(m[2]) - 1] || ''} ${m[1]}`.trim();
}

/** The essays as the homepage's post cards expect them (newest first). */
export const essayCards = () => ESSAYS.map(({ slug, doc }) => {
  const p = doc.root?.props || {};
  return { kicker: p.kicker || '', title: p.title || slug, dek: p.dek || '', date: essayDate(p.date), image: p.image || '', link: essayPath(slug) };
});
