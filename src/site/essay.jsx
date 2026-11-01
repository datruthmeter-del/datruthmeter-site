import { Fragment } from 'react';
import { Root, makeConfig } from './config.jsx';
import { Img, SyllabusForm, POPUP_KEY, store } from './kit.jsx';
import { ESSAYS, essayDate, essayPath } from '../content/essays.js';
import page from '../content/page.json';

/* An essay page (/post/<slug>). Same header, footer, theme switch and scroll gauge as the
   homepage (Root, with the homepage's site settings), then the essay: kicker, title, one
   line, date, his graphic whole, the body, three more essays and The Syllabus signup.

   Each essay is its own Puck document (src/content/essays/<slug>.json): the root holds the
   title block, the content is sections. "Essay text" is the section for the writing itself;
   the general sections (photo and text, big quote, video, banner) can go between. */

/* ---------- the writing ----------
   Typed as plain text in one box. Blank line = new paragraph. "## " starts a heading,
   "> " a pulled-out line, "- " a list item. **bold**, _italic_, *red*, [words](link). */

function Inline({ text }) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^\*[^*]+\*$/.test(part)) return <span key={i} className="text-red">{part.slice(1, -1)}</span>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <a key={i} href={link[2]} className="underline decoration-red underline-offset-4 hover:text-red" target={/^https?:/.test(link[2]) ? '_blank' : undefined} rel="noreferrer">{link[1]}</a>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function proseBlocks(body) {
  const blocks = [];
  for (const chunk of String(body || '').split(/\n\s*\n/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.every((l) => l.startsWith('- '))) { blocks.push({ kind: 'list', items: lines.map((l) => l.slice(2)) }); continue; }
    for (const l of lines) {
      if (l.startsWith('## ')) blocks.push({ kind: 'h', text: l.slice(3) });
      else if (l.startsWith('> ')) blocks.push({ kind: 'quote', text: l.slice(2) });
      else if (l.startsWith('- ')) blocks.push({ kind: 'list', items: [l.slice(2)] });
      else if (blocks.length && blocks[blocks.length - 1].kind === 'p' && blocks[blocks.length - 1].open) blocks[blocks.length - 1].lines.push(l);
      else blocks.push({ kind: 'p', lines: [l], open: true });
    }
    blocks.forEach((b) => { b.open = false; });
  }
  return blocks;
}

function Prose({ body, puck, editMode, id }) {
  const blocks = proseBlocks(body);
  const editing = Boolean(puck?.isEditing ?? editMode);
  return (
    <div id={id} className="essay-prose mx-auto max-w-[44rem] px-5 py-10 sm:px-10">
      {!blocks.length && editing && <p className="mono text-[11px] text-paper/50">Write the essay in the box on the right.</p>}
      {blocks.map((b, i) => {
        if (b.kind === 'h') return <h2 key={i} className="display mt-14 text-3xl leading-[.95] sm:text-4xl"><Inline text={b.text} /></h2>;
        if (b.kind === 'quote') return <blockquote key={i} className="display my-12 border-l-4 border-red pl-6 text-3xl leading-[1.05] sm:text-4xl"><Inline text={b.text} /></blockquote>;
        if (b.kind === 'list') return <ul key={i} className="my-6 space-y-3 pl-6 text-xl leading-relaxed">{b.items.map((t, j) => <li key={j} className="list-disc pl-1 marker:text-red"><Inline text={t} /></li>)}</ul>;
        return (
          <p key={i} className={`text-xl leading-relaxed ${i === 0 ? '' : 'mt-6'}`}>
            {b.lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}<Inline text={l} /></Fragment>)}
          </p>
        );
      })}
    </div>
  );
}

/* ---------- the page around it ---------- */

const done = () => store.set(POPUP_KEY, 'subscribed');

function EssayRoot({ children, puck, editMode, kicker, title, dek, date, image, imageAlt }) {
  const editing = Boolean(puck?.isEditing ?? editMode);
  const site = page.root?.props || {};
  const more = ESSAYS.filter((e) => e.doc.root?.props?.title !== title).slice(0, 3);
  return (
    <Root {...site} title={title ? `${title} · DaTruthMeter` : site.title} previewNote="" puck={puck} editMode={editMode} atHome={false}>
      <article className="px-5 pt-6 sm:px-10 lg:pl-28">
        <a href="/#syllabus" className="mono text-[11px] text-paper/60 hover:text-red">← The Syllabus · every column</a>
        <header className="mt-10 max-w-5xl">
          <p className="mono text-xs text-red">{kicker}{date ? <span className="text-paper/50"> · {essayDate(date)}</span> : null}</p>
          <h1 className={`display mt-5 ${String(title || '').length > 60 ? 'text-[clamp(2.75rem,6.5vw,6rem)]' : 'text-[clamp(3.5rem,9vw,8.5rem)]'}`}>{title}</h1>
          {dek && <p className="mt-6 max-w-2xl text-2xl leading-snug text-paper/80">{dek}</p>}
        </header>
        {image && (
          <figure className="mt-12 max-w-5xl bg-night">
            <Img src={image} alt={imageAlt || ''} className="max-h-[80vh] w-full object-contain" />
          </figure>
        )}
        {(!image && editing) && <p className="mono mt-8 text-[11px] text-paper/50">Add his graphic for this post on the right (optional).</p>}
      </article>

      <div className="pb-16">{children}</div>

      <section className="border-t border-paper/10 px-5 py-20 sm:px-10 lg:pl-28">
        <div className="bg-red p-6 text-cream sm:p-8">
          <p className="mono text-[10px]">The Syllabus · monthly</p>
          <p className="display mb-4 mt-2 text-3xl">One letter a month. Free.</p>
          <div className="on-night"><SyllabusForm onDone={done} /></div>
        </div>
        {more.length > 0 && (
          <>
            <div className="mt-20 flex items-end justify-between gap-6 border-b-4 border-red pb-4">
              <h2 className="display text-4xl sm:text-6xl">More from the blog</h2>
              <a href="/#syllabus" className="mono text-[11px] hover:text-red">All columns →</a>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map(({ slug, doc }) => {
                const p = doc.root?.props || {};
                return (
                  <a key={slug} href={essayPath(slug)} className="group block border border-paper/20 transition-all duration-300 hover:-translate-y-1 hover:border-red hover:shadow-[6px_6px_0_var(--color-red)]">
                    {p.image && <span className="block aspect-[16/10] overflow-hidden bg-night"><Img src={p.image} alt="" loading="lazy" className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105" /></span>}
                    <span className="block p-6">
                      <span className="mono text-[10px] text-red">{p.kicker}{p.date ? ` · ${essayDate(p.date)}` : ''}</span>
                      <span className="display mt-2 block text-3xl">{p.title}</span>
                      <span className="mt-3 block text-paper/70">{p.dek}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </section>
    </Root>
  );
}

/* ---------- the config: what the editor shows for an essay ---------- */

const BODY_HELP = 'Blank line = new paragraph. Start a line with "## " for a heading, "> " for a pulled-out line, "- " for a list item. **bold**, _italic_, *red word*, [words](link).';

export function makeEssayConfig(photoField = (label) => ({ type: 'text', label })) {
  const base = makeConfig(photoField).components;
  const general = ['PhotoAndText', 'Quote', 'Video', 'Banner', 'Marquee', 'TextBlock'];
  return {
    categories: {
      essay: { title: 'The essay', components: ['Prose'] },
      general: { title: 'Sections you can add between', components: general },
    },
    root: {
      fields: {
        kicker: { type: 'text', label: 'Topic (small red line)' },
        title: { type: 'text', label: 'Title' },
        dek: { type: 'textarea', label: 'One line under the title' },
        date: { type: 'text', label: 'Date (YYYY-MM-DD, used to order the posts)' },
        image: photoField('His graphic for this post (shown whole)'),
        imageAlt: { type: 'text', label: 'Graphic description (for screen readers)' },
      },
      defaultProps: { kicker: '', title: 'New essay', dek: '', date: '', image: '', imageAlt: '' },
      render: EssayRoot,
    },
    components: {
      Prose: {
        label: 'Essay text',
        fields: { body: { type: 'textarea', label: 'The essay', description: BODY_HELP } },
        defaultProps: { body: '' },
        render: Prose,
      },
      ...Object.fromEntries(general.map((k) => [k, base[k]])),
    },
  };
}
