import { useState } from 'react';
import { Img, SyllabusForm, POPUP_KEY, store } from './kit.jsx';
import { essayCards } from '../content/essays.js';

/* A post on this site opens in the same tab; anything else (an old Wix link, a PDF) in a new one. */
const ext = (link) => (/^https?:/i.test(link || '') ? { target: '_blank', rel: 'noreferrer' } : {});

/* The Syllabus: signup plus the blog posts, in one section. Marker look chosen by Tim 2026-10-13.
   Colours are palette rows only: ink, paper, red, blood. */

/* Whole graphic, never a cropped title. A tall one (taller than wide) is cropped from the top instead,
   because its title sits there and the full height would be a sliver. */
function CardImg({ src, className = '' }) {
  const [tall, setTall] = useState(false);
  return (
    <Img src={src} alt="" loading="lazy" onLoad={(e) => setTall(e.currentTarget.naturalHeight > e.currentTarget.naturalWidth)}
      className={`h-full w-full bg-night ${tall ? 'object-cover object-top' : 'object-contain'} ${className}`} />
  );
}

const done = () => store.set(POPUP_KEY, 'subscribed');

function MarkerWord({ children, tilt = '-1.2deg' }) {
  return (
    <span className="relative inline-block px-[0.12em]" style={{ '--tilt': tilt }}>
      <span aria-hidden className="absolute inset-x-0 bottom-[0.04em] top-[0.1em] -z-10 origin-left bg-red" style={{ transform: 'skewX(-6deg) rotate(var(--tilt))', animation: 'sweep .9s .15s cubic-bezier(.2,.8,.2,1) both' }} />
      <span className="relative text-cream">{children}</span>
    </span>
  );
}

function Marker({ s }) {
  const [first, ...rest] = s.posts;
  return (
    <div className="isolate">
      <p className="mono text-xs text-red">{s.eyebrow}</p>
      <h2 className="display mt-5 text-[clamp(4.5rem,13vw,12rem)]">
        <span className="block">The</span>
        <MarkerWord>Syllabus</MarkerWord>
      </h2>
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <p className="max-w-xl text-2xl leading-snug text-paper">{s.body}</p>
        <ul className="flex flex-wrap gap-2">
          {s.bullets.map((b, i) => <li key={i} className="mono bg-paper px-3 py-2 text-[11px] text-ink">{b.text}</li>)}
        </ul>
      </div>
      <div className="mt-10 bg-red p-6 text-cream sm:p-8">
        <p className="display mb-4 text-3xl">One letter a month. Free.</p>
        <div className="on-night"><SyllabusForm button={s.button} onDone={done} /></div>
      </div>

      <div className="mt-24 flex items-end justify-between gap-6 border-b-4 border-red pb-4">
        <h3 className="display text-4xl sm:text-6xl">{s.postsHeading}</h3>
        <span className="mono text-[10px] text-paper/60">{s.posts.length} columns</span>
      </div>
      {first && (
        <a href={first.link} {...ext(first.link)} className="group mt-8 grid gap-8 bg-paper text-ink md:grid-cols-[1.2fr_1fr]">
          {first.image && <span className="block overflow-hidden"><CardImg src={first.image} className="transition-transform duration-700 group-hover:scale-105" /></span>}
          <span className="block p-8 sm:p-10 md:col-start-2 md:row-start-1">
            <span className="mono inline-block bg-blood px-2 py-1 text-[10px] text-cream">{first.kicker} · latest</span>
            <span className="display mt-4 block text-5xl sm:text-6xl">{first.title}</span>
            <span className="mt-4 block text-lg text-ink/75">{first.dek}</span>
            <span className="mono mt-8 inline-block border-b-2 border-red text-[11px] group-hover:bg-red group-hover:text-cream">{s.readLabel} →</span>
          </span>
        </a>
      )}
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((p, i) => (
          <a key={i} href={p.link} {...ext(p.link)} className="group block border border-paper/20 transition-all duration-300 hover:-translate-y-1 hover:border-red hover:shadow-[6px_6px_0_var(--color-red)]">
            {p.image && <span className="block aspect-[16/10] overflow-hidden"><CardImg src={p.image} className="transition-transform duration-700 group-hover:scale-105" /></span>}
            <span className="block p-6">
              <span className="mono text-[10px] text-red">{p.kicker}{p.date ? ` · ${p.date}` : ''}</span>
              <span className="display mt-2 block text-3xl">{p.title}</span>
              <span className="mt-3 block text-paper/70">{p.dek}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function SyllabusSection({ shellClass, mark, ...s }) {
  // No posts typed in the editor = every essay on the site, newest first (src/content/essays.js).
  const data = { ...s, bullets: s.bullets || [], posts: s.posts?.length ? s.posts : essayCards() };
  return (
    <section {...mark} className={`bg-ink text-paper ${shellClass}`}>
      <Marker s={data} />
    </section>
  );
}
