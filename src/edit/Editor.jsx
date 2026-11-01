/* The editor page (/edit). Sign in with GitHub, pick the homepage or an essay, edit it as
   visitors see it, Publish.

   Full editing: sections can be added from the library, moved, duplicated and deleted, and
   every word, link and photo inside them is a field. That is safe here because the editor
   and the public page share one definition per page type (src/site/config.jsx for the
   homepage, src/site/essay.jsx for an essay) and one file per page (src/content/page.json,
   src/content/essays/<address>.json): Publish writes exactly what the editor holds, with
   no mapping in between that a new or moved section could break.

   Publish = one commit on the live branch (the page's file + any new photos) -> Netlify
   rebuilds -> live in about two minutes. Unpublished work is kept in this browser
   (localStorage, per page), so closing the tab loses nothing. Git is the version history:
   any publish can be undone. */

import { useEffect, useMemo, useState } from 'react';
import { Puck } from '@measured/puck';
import { makeConfig } from '../site/config';
import { makeEssayConfig } from '../site/essay';
import { ImgSrc } from '../site/kit';
import { getToken, setToken, signIn, whoAmI, loadContent, listFiles, commitFiles, contentFile } from './github';
import { photoField, photoSrc, pendingFiles, referencedPhotos, clearPending } from './photo-field';
import { loadPageCss, scopeCss } from './scope-css';
import pageCssUrl from '../index.css?url';
import { REPO, CONTENT_PATH, ESSAYS_DIR } from './repo';
import bundled from '../content/page.json';
import { ESSAYS } from '../content/essays';

const DRAFT_PREFIX = 'dtm-editor-draft:';
const draftKey = (path) => (path === CONTENT_PATH ? 'dtm-editor-draft' : `${DRAFT_PREFIX}${path}`);

function loadDraft(path) {
  try { const raw = localStorage.getItem(draftKey(path)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveDraft(path, data) {
  try { localStorage.setItem(draftKey(path), JSON.stringify({ data, savedAt: new Date().toISOString() })); } catch { /* losing the safety copy never loses the edit */ }
}
function clearDraft(path) {
  try { localStorage.removeItem(draftKey(path)); } catch { /* same */ }
}

/* ---------- the pages the editor can open ---------- */

const HOME = { path: CONTENT_PATH, label: 'Homepage', kind: 'page' };
const essayDoc = (slug, title) => ({ path: `${ESSAYS_DIR}/${slug}.json`, label: title || slug, kind: 'essay', slug });

/** A web address from a title: "Who Are the True Patriots?" -> "who-are-the-true-patriots". */
export const slugify = (t) => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const today = () => new Date().toISOString().slice(0, 10);
const newEssay = (title) => ({
  root: { props: { kicker: '', title, dek: '', date: today(), image: '', imageAlt: '' } },
  content: [{ type: 'Prose', props: { id: `Prose-${Date.now()}`, body: '' } }],
  zones: {},
});

/** The essays on the branch right now (titles from the build where known). */
async function listEssays(token) {
  const known = Object.fromEntries(ESSAYS.map((e) => [e.slug, e.doc.root?.props?.title]));
  const names = token ? await listFiles(token, ESSAYS_DIR) : ESSAYS.map((e) => `${e.slug}.json`);
  return names.filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -5)).map((slug) => essayDoc(slug, known[slug]));
}

export function Editor() {
  const config = useMemo(() => makeConfig(photoField), []);
  const essayConfig = useMemo(() => makeEssayConfig(photoField), []);
  const [stage, setStage] = useState(getToken() ? { kind: 'loading' } : { kind: 'signin' });
  const [doc, setDoc] = useState(HOME);
  const [docs, setDocs] = useState([HOME]);
  const [publish, setPublish] = useState({ state: 'idle', text: '' });

  // Dev only: ?local=1 opens the editor on the bundled content with no sign-in, so the
  // canvas and fields can be checked without GitHub. Publish is refused in this mode.
  const local = import.meta.env.DEV && new URLSearchParams(window.location.search).get('local') === '1';

  useEffect(() => {
    if (stage.kind !== 'loading' && !(local && stage.kind === 'signin')) return;
    const token = getToken();
    if (!token && !local) { setStage({ kind: 'signin' }); return; }
    (async () => {
      try {
        const bundledDoc = doc.kind === 'essay' ? ESSAYS.find((e) => e.slug === doc.slug)?.doc : bundled;
        const fresh = doc.fresh ? { content: newEssay(doc.label) } : null;
        const [user, live, css, essays] = local
          ? await Promise.all(['local preview', fresh || { content: bundledDoc }, loadPageCss(pageCssUrl), listEssays(null)])
          : await Promise.all([whoAmI(token), fresh || loadContent(token, doc.path), loadPageCss(pageCssUrl), listEssays(token)]);
        const draft = loadDraft(doc.path);
        setDocs([HOME, ...essays, ...(doc.fresh && !essays.some((e) => e.path === doc.path) ? [doc] : [])]);
        setStage({ kind: 'ready', user, css: scopeCss(css), data: draft?.data ?? live.content, draftFrom: draft?.savedAt });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (!getToken() && !local) setStage({ kind: 'signin', error: message });
        else setStage({ kind: 'error', message });
      }
    })();
  }, [stage.kind, local, doc]);

  const open = (next) => {
    if (next.path === doc.path) return;
    setPublish({ state: 'idle', text: '' });
    setDoc(next);
    setStage({ kind: 'loading' });
  };

  const startEssay = () => {
    const title = window.prompt('Title of the new essay (you can change it later):');
    if (!title || !title.trim()) return;
    const slug = slugify(title);
    if (!slug) return window.alert('That title has no letters or numbers to make a web address from.');
    if (docs.some((d) => d.kind === 'essay' && d.slug === slug)) return window.alert(`There is already an essay at /post/${slug}. Open it from the list, or pick a different title.`);
    open({ ...essayDoc(slug, title.trim()), fresh: true });
  };

  const onSignIn = async () => {
    setStage({ kind: 'signin', busy: true });
    try {
      setToken(await signIn());
      setStage({ kind: 'loading' });
    } catch (e) {
      setStage({ kind: 'signin', error: e instanceof Error ? e.message : String(e) });
    }
  };

  const onPublish = async (data) => {
    if (local) return setPublish({ state: 'error', text: 'Local preview: nothing is published from here.' });
    const token = getToken();
    if (!token) return setStage({ kind: 'signin', error: 'Your sign-in expired. Sign in again to publish.' });
    setPublish({ state: 'busy', text: 'Publishing…' });
    try {
      const photos = pendingFiles(referencedPhotos(data));
      const files = [contentFile(data, doc.path), ...photos];
      const what = `${doc.kind === 'essay' ? `essay "${data.root?.props?.title || doc.label}"` : 'homepage'}${photos.length ? ` and ${photos.length} photo${photos.length === 1 ? '' : 's'}` : ''}`;
      const sha = await commitFiles(token, files, `Website update: ${what} (via the editor)`);
      clearPending();
      clearDraft(doc.path);
      if (doc.fresh) setDoc({ ...doc, fresh: false, label: data.root?.props?.title || doc.label });
      const where = doc.kind === 'essay' ? ` It will be at /post/${doc.slug}.` : '';
      setPublish({ state: 'done', text: `Published (${sha.slice(0, 7)}). The live site catches up in about two minutes.${where}` });
    } catch (e) {
      setPublish({ state: 'error', text: `Not published: ${e instanceof Error ? e.message : String(e)}. Your changes are still here; try again.` });
    }
  };

  // Dev only: paste a token instead of running the OAuth proxy, which needs Netlify.
  const devToken = import.meta.env.DEV;

  if (stage.kind === 'signin') {
    return (
      <Shell>
        <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>Edit the website</h1>
        <p style={{ margin: '0 0 20px', color: '#555' }}>Sign in with your GitHub account. Your changes go live about two minutes after you publish.</p>
        <button type="button" onClick={onSignIn} disabled={stage.busy} style={primary}>{stage.busy ? 'Opening GitHub…' : 'Sign in with GitHub'}</button>
        {stage.error && <p role="alert" style={{ color: '#92161D', marginTop: 16 }}>{stage.error}</p>}
        {devToken && (
          <form onSubmit={(e) => { e.preventDefault(); const t = new FormData(e.currentTarget).get('t'); if (typeof t === 'string' && t) { setToken(t.trim()); setStage({ kind: 'loading' }); } }} style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #ddd' }}>
            <p style={{ fontSize: 12, color: '#777', margin: '0 0 6px' }}>Local development only: paste a GitHub token (`gh auth token`).</p>
            <input name="t" type="password" placeholder="ghp_… / gho_…" style={{ font: 'inherit', padding: 6, width: 280, marginRight: 8 }} />
            <button type="submit" style={{ ...primary, padding: '6px 12px' }}>Use token</button>
          </form>
        )}
      </Shell>
    );
  }
  if (stage.kind === 'loading') return <Shell><p>Loading {doc.kind === 'essay' ? `the essay "${doc.label}"` : 'the live site'}…</p></Shell>;
  if (stage.kind === 'error') {
    return (
      <Shell>
        <p role="alert" style={{ color: '#92161D' }}>{stage.message}</p>
        <p style={{ fontSize: 13, color: '#666' }}>Reading {doc.path} from <code>{REPO}</code>.</p>
        {doc.path !== HOME.path && <button type="button" onClick={() => open(HOME)} style={{ ...primary, marginRight: 8 }}>Back to the homepage</button>}
        <button type="button" onClick={() => { setToken(null); setStage({ kind: 'signin' }); }} style={primary}>Sign in again</button>
      </Shell>
    );
  }

  return (
    <div className="editor-shell">
      <style>{stage.css}</style>
      <Banner tone="bar">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#666' }}>Editing</span>
          <select value={doc.path} onChange={(e) => { const d = docs.find((x) => x.path === e.target.value); if (d) open(d); }} style={select} aria-label="Page to edit">
            <optgroup label="Site">
              <option value={HOME.path}>{HOME.label}</option>
            </optgroup>
            <optgroup label="Essays (The Syllabus)">
              {docs.filter((d) => d.kind === 'essay').map((d) => <option key={d.path} value={d.path}>{d.label}</option>)}
            </optgroup>
          </select>
        </label>
        <button type="button" onClick={startEssay} style={link}>+ New essay</button>
        {doc.kind === 'essay' && (
          <span style={{ color: '#666' }}>
            Address: <code>/post/{doc.slug}</code>{doc.fresh ? ' (not published yet)' : ''}
          </span>
        )}
      </Banner>
      {stage.draftFrom && (
        <Banner>
          Picked up where you left off (unpublished changes from {new Date(stage.draftFrom).toLocaleString()}).{' '}
          <button type="button" onClick={() => { clearDraft(doc.path); clearPending(); setStage({ kind: 'loading' }); }} style={link}>Discard them and load the live version instead</button>
        </Banner>
      )}
      {publish.state !== 'idle' && (
        <Banner tone={publish.state === 'error' ? 'error' : publish.state === 'done' ? 'ok' : 'info'}>
          {publish.text}
          {publish.state !== 'busy' && <button type="button" onClick={() => setPublish({ state: 'idle', text: '' })} style={link}>Dismiss</button>}
        </Banner>
      )}
      <ImgSrc.Provider value={photoSrc}>
        <Puck
          key={doc.path}
          config={doc.kind === 'essay' ? essayConfig : config}
          data={stage.data}
          headerTitle={doc.kind === 'essay' ? doc.label : 'DaTruthMeter'}
          headerPath={`signed in as ${stage.user}`}
          onChange={(data) => saveDraft(doc.path, data)}
          onPublish={onPublish}
          iframe={{ waitForStyles: true }}
        />
      </ImgSrc.Provider>
    </div>
  );
}

function Shell({ children }) {
  return (
    <main style={{ maxWidth: 520, margin: '10vh auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      {children}
    </main>
  );
}

function Banner({ children, tone = 'info' }) {
  const bg = { info: '#eef1f5', ok: '#e6f4ea', error: '#fbeae5', bar: '#ffffff' }[tone];
  return (
    <div role={tone === 'bar' ? undefined : 'status'} style={{ background: bg, borderBottom: '1px solid rgba(0,0,0,.08)', padding: '8px 16px', fontSize: 13, fontFamily: 'system-ui, sans-serif', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

const primary = { font: 'inherit', fontSize: 15, padding: '10px 18px', borderRadius: 8, border: 0, background: '#101116', color: '#F5F0E9', cursor: 'pointer' };
const link = { font: 'inherit', fontSize: 13, background: 'none', border: 0, padding: 0, color: '#1E3B57', textDecoration: 'underline', cursor: 'pointer' };
const select = { font: 'inherit', fontSize: 13, padding: '4px 8px', borderRadius: 6, border: '1px solid #ccc', background: '#fff', maxWidth: 320 };
