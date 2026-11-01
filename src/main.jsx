import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Render } from '@measured/puck/rsc';
import './index.css';
import { makeConfig } from './site/config';
import { makeEssayConfig } from './site/essay';
import { essayBySlug } from './content/essays';
import page from './content/page.json';

/* The public site. / renders src/content/page.json; /post/<slug> renders
   src/content/essays/<slug>.json. Both are what the editor at /edit writes. Render-only
   import: none of the editor ships to visitors. An address that matches no essay shows
   the homepage (Netlify serves index.html for every path). */

const slug = /^\/post\/([^/]+)\/?$/.exec(window.location.pathname)?.[1];
const essay = slug ? essayBySlug(decodeURIComponent(slug)) : null;

const view = essay
  ? <Render config={makeEssayConfig()} data={essay} />
  : <Render config={makeConfig()} data={page} />;

if (slug && !essay) window.history.replaceState(null, '', '/');

createRoot(document.getElementById('root')).render(<StrictMode>{view}</StrictMode>);
