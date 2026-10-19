import { SyllabusSection } from './syllabus.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Page, Accent, BANDS, Img, Thermo, MeterRail, Player, MarqueeRow, ThemeSwitch, SyllabusPopup,
  InquiryForm, POPUP_KEY, store, useScroll, useTheme, ytThumb, usePage,
} from './kit';
import { FillIn, Docket, TrueFalse } from './worksheets';

/* The whole site as a Puck config. ONE definition, used twice:
     - the public page renders src/content/page.json through it (src/main.jsx, <Render>)
     - the editor at /edit edits page.json through it (src/edit/Editor.jsx, <Puck>)
   so what Tim sees in the editor is the page visitors get, and anything he adds, moves,
   duplicates or deletes in the editor is just a change to page.json.

   makeConfig takes the photo field from the caller: the editor passes its upload field,
   the public page passes a plain text field it never shows. That keeps editor code out of
   the public bundle. */

/* ---------- field helpers ---------- */

const text = (label, extra = {}) => ({ type: 'text', label, ...extra });
const area = (label, extra = {}) => ({ type: 'textarea', label, ...extra });
const list = (label, arrayFields, defaultItemProps, getItemSummary) => ({ type: 'array', label, arrayFields, defaultItemProps, getItemSummary });
const choice = (label, options) => ({ type: 'select', label, options: options.map(([value, l]) => ({ value, label: l })) });
const yesNo = (label) => ({ type: 'radio', label, options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] });

const ACCENT = 'Wrap a word in *stars* for red, or ~tildes~ for outlined. A new line is a line break.';

/* Every section: where the menu and the gauge point. */
const placement = {
  anchor: text('Link name for this section (used in menu links as #name)'),
  gauge: text('Word on the scroll gauge (leave empty to skip)'),
};

const bandField = choice('Background', [['ink', 'Dark (flips in light mode)'], ['paper', 'Light (flips in dark mode)'], ['navy', 'Navy'], ['red', 'Red']]);

/* Anchor + gauge as attributes on a section's outer element. */
const mark = ({ anchor, gauge }) => ({ id: anchor || undefined, 'data-gauge': gauge || undefined });

const SECTION = 'px-5 py-24 sm:px-10 lg:pl-28';

function Heading({ text: t, className = '', outline }) {
  return <h2 className={`display ${className}`}><Accent text={t} outline={outline} /></h2>;
}

function Eyebrow({ children, className = 'text-red' }) {
  if (!children) return null;
  return <p className={`mono text-xs ${className}`}>{children}</p>;
}

/* ---------- root: site settings, header, footer, and the page's moving parts ---------- */

function Root({ children, puck, editMode, ...s }) {
  const editing = Boolean(puck?.isEditing ?? editMode);
  const ref = useRef(null);
  const [theme, chooseTheme] = useTheme(ref);
  const { p, stops, active } = useScroll(ref);
  const [playing, setPlaying] = useState(null);
  const [popup, setPopup] = useState(false);
  const play = useCallback((id) => setPlaying(id), []);

  useEffect(() => { if (!editing && s.title) document.title = s.title; }, [editing, s.title]);

  // Offer The Syllabus once, after the reader is part way down. Never in the editor.
  const offered = useRef(false);
  useEffect(() => {
    const force = new URLSearchParams(window.location.search).get('popup') === '1';
    offered.current = !force && Boolean(store.get(POPUP_KEY));
  }, []);
  const at = Math.min(0.9, Math.max(0.05, Number(s.popupAt || 30) / 100));
  useEffect(() => {
    if (editing || s.popupOn !== 'yes' || offered.current || p < at) return;
    offered.current = true;
    setPopup(true);
  }, [p, at, editing, s.popupOn]);
  const closePopup = useCallback(() => { setPopup(false); store.set(POPUP_KEY, 'dismissed'); }, []);

  const menu = (s.menu || []).filter((m) => m.label);
  const socials = (s.socials || []).filter((x) => x.label && x.link);

  return (
    <Page.Provider value={{ play, contactEmail: s.contactEmail, sendfoxUrl: s.sendfoxUrl, editing, socials }}>
      <div ref={ref} className={`dtm grain min-h-screen overflow-x-hidden bg-ink text-paper ${theme === 'light' ? 'hub-light' : ''}`}>
        <MeterRail p={p} stops={stops} active={active} />
        <Player id={playing} onClose={() => setPlaying(null)} />
        <SyllabusPopup show={popup} onClose={closePopup} kicker={s.popupKicker} title={s.popupTitle} body={s.popupBody} />

        {s.previewNote && (
          <div className="mono border-b border-paper/10 bg-paper px-5 py-2 text-center text-[10px] text-ink lg:pl-28">{s.previewNote}</div>
        )}

        <div className="flex items-center justify-between gap-4 px-5 py-5 sm:px-10 lg:pl-28">
          <a href="#top" className="display text-2xl tracking-wide lg:hidden">DaTruth<span className="text-red">Meter</span></a>
          <span className="mono hidden text-[10px] text-paper/60 xl:block">{s.tagline}</span>
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="mono hidden gap-5 whitespace-nowrap text-[11px] md:flex" aria-label="Main">
              {menu.map((m, i) => <a key={i} href={m.link} className="hover:text-red">{m.label}</a>)}
            </nav>
            {s.phoneLabel && <a href={s.phoneLink} className="mono whitespace-nowrap text-[10px] hover:text-red md:hidden">{s.phoneLabel}</a>}
            <ThemeSwitch theme={theme} onChoose={chooseTheme} />
          </div>
        </div>

        {children}

        <footer className="border-t border-paper/10 px-5 pb-16 pt-12 sm:px-10 lg:pl-28">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex items-center gap-4">
              <Thermo className="h-20 w-6" fill={0.8} />
              <div>
                <p className="display text-4xl">DaTruth<span className="text-red">Meter</span></p>
                <p className="mono text-[10px] text-paper/60">{s.footerLine}</p>
              </div>
            </div>
            <div className="mono flex flex-wrap items-center gap-5 text-[10px] text-paper/60">
              {socials.map((x, i) => <a key={i} href={x.link} target="_blank" rel="noreferrer" className="hover:text-red">{x.label}</a>)}
              {(s.footerLinks || []).filter((x) => x.label).map((x, i) => <a key={`f${i}`} href={x.link} className="hover:text-red">{x.label}</a>)}
              {s.contactEmail && <a href={`mailto:${s.contactEmail}`} className="hover:text-red">{s.contactEmail}</a>}
              <ThemeSwitch theme={theme} onChoose={chooseTheme} />
            </div>
          </div>
        </footer>
      </div>
    </Page.Provider>
  );
}

const linkItem = { label: text('Words'), link: text('Link (#section-name, or a full web address)') };

/* ---------- sections ---------- */

function Hero({ eyebrow, headline, body, portrait, portraitAlt, latestId, latestKicker, latestTitle, ...m }) {
  const { play, socials } = usePage();
  return (
    <section {...mark(m)} className="relative lg:pl-20">
      <div className="grid min-h-[88vh] lg:grid-cols-[1.25fr_1fr]">
        <div className="relative z-10 flex flex-col justify-between px-5 pb-10 pt-6 sm:px-10">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="display mt-6 text-[clamp(5rem,15vw,15rem)]"><Accent text={headline} /></h1>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="max-w-lg space-y-4 text-paper/85">
              {String(body || '').split(/\n\s*\n/).filter(Boolean).map((para, i) => (
                <p key={i} className={i === 0 ? 'text-xl leading-snug text-paper' : 'text-base leading-relaxed'}>{para}</p>
              ))}
            </div>
            <div className="mono flex flex-col gap-2 text-[11px]">
              {socials.map((x, i) => <a key={i} href={x.link} target="_blank" rel="noreferrer" className="hover:text-red">{x.label}</a>)}
            </div>
          </div>
        </div>
        <div className="relative min-h-[70vh] overflow-hidden">
          <div className="group absolute inset-0">
            <Img src={portrait} alt={portraitAlt} className="grade-hover h-full w-full object-cover object-[50%_30%]" />
          </div>
          <div className="absolute inset-0 bg-linear-to-r from-ink via-ink/20 to-transparent" />
          {latestId && (
            <button onClick={() => play(latestId)} className="group absolute bottom-0 left-0 right-0 m-5 flex items-stretch border border-paper/25 bg-ink/85 text-left backdrop-blur hover:border-red sm:m-10">
              <span className="flex w-20 shrink-0 items-center justify-center bg-red transition-colors group-hover:bg-blood">
                <svg viewBox="0 0 20 20" className="h-7 w-7 fill-cream"><path d="M5 3l12 7-12 7z" /></svg>
              </span>
              <span className="p-5">
                <span className="mono block text-[10px] text-red">{latestKicker}</span>
                <span className="display mt-1 block text-2xl sm:text-3xl">{latestTitle}</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Episodes({ eyebrow, heading, linkLabel, link, episodes = [], shortsHeading, shortsNote, shorts = [], ...m }) {
  const { play } = usePage();
  return (
    <section {...mark(m)} className={SECTION}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading text={heading} className="mt-4 text-[clamp(3.5rem,9vw,8rem)]" />
        </div>
        {linkLabel && <a href={link} target="_blank" rel="noreferrer" className="mono text-xs underline decoration-red underline-offset-4 hover:text-red">{linkLabel}</a>}
      </div>

      {episodes.length > 0 && (
        <div className="mt-14 border-t border-paper/15">
          {episodes.map((e, i) => (
            <button key={i} onClick={() => play(e.videoId)}
              className="group grid w-full grid-cols-[auto_1fr] items-center gap-5 border-b border-paper/15 py-7 text-left sm:grid-cols-[7rem_1fr_16rem] sm:gap-10">
              <span className="display text-7xl text-paper/20 transition-colors group-hover:text-red sm:text-8xl">{e.number ? String(e.number).padStart(2, '0') : '▶'}</span>
              <span>
                <span className="mono block text-[10px] text-paper/50">{e.date}</span>
                <span className="display mt-1 block text-3xl leading-none sm:text-5xl">{e.title}</span>
                <span className="mt-2 block max-w-xl text-paper/65">{e.blurb}</span>
              </span>
              <span className="col-span-2 block aspect-video overflow-hidden sm:col-span-1">
                <Img src={ytThumb(e.videoId, e.thumb)} alt="" loading="lazy" className="grade-hover h-full w-full object-cover" />
              </span>
            </button>
          ))}
        </div>
      )}

      {shorts.length > 0 && (
        <div className="mt-24">
          <div className="flex items-baseline justify-between">
            <h3 className="display text-4xl sm:text-5xl">{shortsHeading}</h3>
            <span className="mono text-[10px] text-paper/50">{shortsNote}</span>
          </div>
          <div className="-mx-5 mt-8 flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:-mx-10 sm:px-10">
            {shorts.map((c, i) => (
              <button key={i} onClick={() => play(c.videoId)}
                className={`group relative aspect-[9/14] w-56 shrink-0 snap-start overflow-hidden text-left sm:w-64 ${i % 2 ? 'mt-10' : ''}`}>
                <Img src={ytThumb(c.videoId, c.thumb)} alt="" loading="lazy" className="grade-hover absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 bg-linear-to-t from-night via-night/30 to-transparent" />
                <span className="absolute bottom-0 p-4 text-cream">
                  {c.note && <span className="mono block text-[9px] text-red">{c.note}</span>}
                  <span className="display mt-1 block text-2xl leading-none">{c.title}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Guides({ eyebrow, heading, intro, printLabel, sheets: Sheets, ...m }) {
  return (
    <section {...mark(m)} className={`fixed-paper rec-root border-t border-ink/10 bg-paper text-ink ${SECTION}`}>
      <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <Eyebrow className="text-blood">{eyebrow}</Eyebrow>
          <Heading text={heading} outline="outline-red" className="mt-4 text-[clamp(3.5rem,9vw,8.5rem)]" />
        </div>
        <div className="max-w-sm pb-4">
          <p className="text-lg text-ink/80">{intro}</p>
          {printLabel && <button onClick={() => window.print()} className="rec-btn rec-noprint mt-5">{printLabel}</button>}
        </div>
      </div>
      <Sheets className="mt-10 grid items-start gap-8 lg:grid-cols-12" minEmptyHeight={160} />
    </section>
  );
}

const SHAPES = { tall: 'aspect-[4/5]', square: 'aspect-square', wide: 'aspect-[4/3]' };

function PhotoWall({ heading, linkLabel, link, photos = [], ...m }) {
  return (
    <section {...mark(m)} className={`border-t border-paper/10 ${SECTION}`}>
      <div className="flex flex-wrap items-end justify-between gap-6 border-t-4 border-paper pt-5">
        <Heading text={heading} className="text-[clamp(3rem,8vw,7rem)]" />
        {linkLabel && <a href={link} target="_blank" rel="noreferrer" className="mono text-xs underline decoration-red underline-offset-4 hover:text-red">{linkLabel}</a>}
      </div>
      <div className="feed-cols mt-12">
        {photos.map((f, i) => {
          const pic = <Img src={f.image} alt={f.caption} loading="lazy" className={`grade-hover w-full object-cover ${SHAPES[f.shape] || SHAPES.tall}`} />;
          return (
            <figure key={i}>
              {f.link
                ? <a href={f.link} target="_blank" rel="noreferrer" className="group block overflow-hidden">{pic}</a>
                : <div className="group overflow-hidden">{pic}</div>}
              {f.caption && <figcaption className="mt-3 border-b border-paper/20 pb-3 text-[15px] italic leading-snug text-paper/80">{f.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function Newsletter({ anchor, gauge, ...rest }) {
  return <SyllabusSection {...rest} mark={mark({ anchor, gauge })} shellClass={`border-t border-paper/10 ${SECTION}`} />;
}

function Essays({ eyebrow, heading, intro, essays = [], readLabel, band = 'navy', ...m }) {
  return (
    <section {...mark(m)} className={`${BANDS[band] || BANDS.navy} ${SECTION}`}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow className="opacity-60">{eyebrow}</Eyebrow>
          <Heading text={heading} className="mt-4 text-[clamp(3rem,8vw,7rem)]" />
        </div>
        <p className="max-w-sm text-lg opacity-75">{intro}</p>
      </div>
      <div className="mt-12 grid gap-px bg-current/20 md:grid-cols-[1.4fr_1fr]">
        {essays.map((e, i) => (
          <a key={i} href={e.link} target="_blank" rel="noreferrer"
            className={`group p-8 transition-colors sm:p-10 ${BANDS[band] || BANDS.navy} hover:brightness-90 ${i === 0 ? 'md:row-span-2' : ''}`}>
            <span className="mono text-[10px] opacity-60">{e.kicker}</span>
            <span className={`display mt-3 block ${i === 0 ? 'text-5xl sm:text-7xl' : 'text-4xl'}`}>{e.title}</span>
            <span className="mt-4 block max-w-lg text-lg opacity-75">{e.dek}</span>
            <span className="mono mt-8 block text-[11px] group-hover:text-red">{readLabel}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Shop({ heading, intro, products = [], ...m }) {
  const { editing } = usePage();
  if (!products.length && !editing) return null;
  return (
    <section {...mark(m)} className={SECTION}>
      <Heading text={heading} className="text-[clamp(3rem,8vw,7rem)]" />
      {intro && <p className="mt-4 max-w-xl text-lg text-paper/75">{intro}</p>}
      {!products.length && <p className="mono mt-8 text-[11px] text-paper/50">Add a product on the right. This section stays hidden on the site until it has one.</p>}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((x, i) => (
          <a key={i} href={x.link} target="_blank" rel="noreferrer" className="group block border border-paper/15 hover:border-red">
            <span className="block aspect-[4/3] overflow-hidden"><Img src={x.image} alt="" className="grade-hover h-full w-full object-cover" /></span>
            <span className="block p-6">
              <span className="display block text-3xl">{x.title}</span>
              {x.price && <span className="mono mt-2 block text-[11px] text-paper/60">{x.price}</span>}
              <span className="mt-2 block text-paper/70">{x.description}</span>
              <span className="mono mt-5 block text-[11px] text-red">{x.button || 'Get it'}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Booking({ eyebrow, heading, cards = [], photo, photoAlt, quoteLabel, quote, formHeading, formOptions = [], ...m }) {
  return (
    <section {...mark(m)} className={SECTION}>
      <div className="border-t-4 border-paper pt-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading text={heading} className="mt-4 text-[clamp(3.5rem,9vw,8rem)]" />
      </div>
      <div className="mt-12 grid items-start gap-6 lg:grid-cols-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          {cards.map((c, i) => (
            <div key={i} className={`border border-paper/25 p-5 ${i === 0 ? 'flex flex-col sm:row-span-2' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="mono text-[10px] text-red">No. {i + 1}</p>
                <Thermo className="h-10 w-3" fill={Math.min(1, 0.35 + i * 0.25)} />
              </div>
              <h3 className={`display mt-2 leading-none ${i === 0 ? 'text-5xl' : 'text-3xl'}`}>{c.title}</h3>
              <p className={`mt-3 leading-snug text-paper/80 ${i === 0 ? 'text-lg' : ''}`}>{c.description}</p>
              <p className="mono mt-3 text-[10px] text-paper/50">{c.who}</p>
              {i === 0 && photo && (
                <div className="group mt-5 flex-1 overflow-hidden">
                  <Img src={photo} alt={photoAlt} className="grade-hover h-full min-h-[200px] w-full object-cover" />
                </div>
              )}
            </div>
          ))}
          {quote && (
            <div className="border border-paper/25 bg-paper/[.04] p-5">
              <p className="mono text-[10px] text-red">{quoteLabel}</p>
              <p className="mt-2 text-2xl italic leading-snug">“{quote}”</p>
            </div>
          )}
        </div>
        <div className="lg:col-span-5"><InquiryForm heading={formHeading} options={formOptions.map((o) => o.label).filter(Boolean)} /></div>
      </div>
    </section>
  );
}

function About({ eyebrow, heading, paragraphs = [], belief, storyEyebrow, bigNumber, tagline, intro, quote, quoteCite, stats = [], videoId, buttonLabel, band = 'paper', ...m }) {
  const { play } = usePage();
  const dark = band === 'paper';
  const rule = dark ? 'border-ink' : 'border-current';
  return (
    <section {...mark(m)} className={`relative overflow-hidden ${BANDS[band] || BANDS.paper} ${SECTION}`}>
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading text={heading} className="mt-4 text-[clamp(3rem,8vw,7rem)]" />
        </div>
        <div className="space-y-5 pt-2 text-xl leading-snug">
          {paragraphs.map((x, i) => <p key={i}>{x.text}</p>)}
          {belief && <p className="display text-3xl leading-[1.1] sm:text-4xl"><Accent text={belief} /></p>}
        </div>
      </div>

      {(bigNumber || quote) && (
        <div className={`mt-24 grid items-center gap-12 border-t-2 pt-16 lg:grid-cols-[1.2fr_1fr] ${rule}`}>
          <div>
            <Eyebrow>{storyEyebrow}</Eyebrow>
            <p className="display mt-4 text-[clamp(9rem,30vw,26rem)] leading-[.75] text-red">{bigNumber}</p>
            {tagline && <p className="display mt-6 text-4xl sm:text-6xl"><Accent text={tagline} /></p>}
          </div>
          <div>
            {intro && <p className="text-lg opacity-80">{intro}</p>}
            {quote && <blockquote className="mt-6 text-2xl leading-snug sm:text-3xl">“{quote}”</blockquote>}
            {quoteCite && <p className="mono mt-5 text-[10px] opacity-60">{quoteCite}</p>}
            {stats.length > 0 && (
              <dl className={`mt-10 grid border-t-2 ${rule}`} style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
                {stats.map((x, i) => (
                  <div key={i} className="border-r border-current/20 py-5 pr-3 last:border-r-0 [&:not(:first-child)]:pl-4">
                    <dt className="display text-5xl">{x.value}</dt>
                    <dd className="mt-1 text-sm opacity-70">{x.label}</dd>
                  </div>
                ))}
              </dl>
            )}
            {videoId && buttonLabel && (
              <button onClick={() => play(videoId)} className={`display mt-8 px-6 py-4 text-xl hover:bg-red hover:text-cream ${dark ? 'bg-ink text-paper' : 'bg-cream text-night'}`}>{buttonLabel}</button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- general sections Tim can add anywhere ---------- */

function TextBlock({ eyebrow, heading, paragraphs = [], buttonLabel, buttonLink, band = 'ink', ...m }) {
  return (
    <section {...mark(m)} className={`${BANDS[band] || BANDS.ink} ${SECTION}`}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          {heading && <Heading text={heading} className="mt-4 text-[clamp(3rem,8vw,7rem)]" />}
        </div>
        <div className="space-y-5 pt-2 text-xl leading-snug">
          {paragraphs.map((x, i) => <p key={i}>{x.text}</p>)}
          {buttonLabel && <a href={buttonLink} className="display inline-block bg-red px-7 py-3 text-xl text-cream hover:bg-blood">{buttonLabel}</a>}
        </div>
      </div>
    </section>
  );
}

function PhotoAndText({ photo, photoAlt, side = 'left', eyebrow, heading, paragraphs = [], buttonLabel, buttonLink, band = 'ink', ...m }) {
  return (
    <section {...mark(m)} className={`${BANDS[band] || BANDS.ink} ${SECTION}`}>
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className={`group overflow-hidden ${side === 'right' ? 'lg:order-2' : ''}`}>
          <Img src={photo} alt={photoAlt} className="grade-hover aspect-[4/5] w-full object-cover" />
        </div>
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          {heading && <Heading text={heading} className="mt-4 text-[clamp(2.75rem,6vw,5.5rem)]" />}
          <div className="mt-6 space-y-5 text-xl leading-snug">
            {paragraphs.map((x, i) => <p key={i}>{x.text}</p>)}
          </div>
          {buttonLabel && <a href={buttonLink} className="display mt-8 inline-block bg-red px-7 py-3 text-xl text-cream hover:bg-blood">{buttonLabel}</a>}
        </div>
      </div>
    </section>
  );
}

function Quote({ quote, cite, band = 'red', ...m }) {
  return (
    <section {...mark(m)} className={`${BANDS[band] || BANDS.red} ${SECTION}`}>
      <blockquote className="display max-w-5xl text-[clamp(2.5rem,6vw,5.5rem)] leading-[.95]"><Accent text={quote} /></blockquote>
      {cite && <p className="mono mt-8 text-[11px] opacity-75">{cite}</p>}
    </section>
  );
}

function Video({ eyebrow, heading, videoId, caption, ...m }) {
  const { play } = usePage();
  return (
    <section {...mark(m)} className={SECTION}>
      <Eyebrow>{eyebrow}</Eyebrow>
      {heading && <Heading text={heading} className="mt-4 text-[clamp(3rem,8vw,7rem)]" />}
      {videoId && (
        <button onClick={() => play(videoId)} className="group relative mt-10 block aspect-video w-full overflow-hidden text-left">
          <Img src={ytThumb(videoId)} alt="" className="grade-hover h-full w-full object-cover" />
          <span className="absolute bottom-0 left-0 flex h-20 w-20 items-center justify-center bg-red group-hover:bg-blood">
            <svg viewBox="0 0 20 20" className="h-8 w-8 fill-cream"><path d="M5 3l12 7-12 7z" /></svg>
          </span>
        </button>
      )}
      {caption && <p className="mt-4 max-w-2xl text-lg text-paper/75">{caption}</p>}
    </section>
  );
}

function Banner({ heading, body, buttonLabel, buttonLink, band = 'red', ...m }) {
  return (
    <section {...mark(m)} className={`${BANDS[band] || BANDS.red} px-5 py-16 sm:px-10 lg:pl-28`}>
      <div className="flex flex-wrap items-end justify-between gap-8">
        <div className="max-w-3xl">
          <Heading text={heading} className="text-[clamp(2.5rem,6vw,5rem)]" />
          {body && <p className="mt-4 text-xl leading-snug opacity-85">{body}</p>}
        </div>
        {buttonLabel && <a href={buttonLink} className="display border-2 border-current px-7 py-3 text-xl hover:bg-night hover:text-cream">{buttonLabel}</a>}
      </div>
    </section>
  );
}

function Marquee({ words = [] }) {
  return <MarqueeRow words={words.map((w) => w.word).filter(Boolean)} />;
}

/* ---------- the config ---------- */

const para = list('Paragraphs', { text: area('Paragraph') }, { text: '' }, (x) => (x.text || '').slice(0, 40) || 'Paragraph');
const sheetHead = (photo) => ({
  kicker: text('Label (top left)'),
  title: text('Title'),
  titleItalic: text('Title, italic part'),
  objective: area('Objective'),
  width: choice('Width on a computer', [['wide', 'Full row'], ['left', 'Wider half'], ['right', 'Narrower half']]),
  ...photo,
});
const discuss = list('Discussion questions', { question: area('Question') }, { question: '' }, (x) => (x.question || '').slice(0, 40) || 'Question');
const source = { sourceText: area('Source (who said it)'), sourceLink: text('Link to the essay') };

export function makeConfig(photoField = (label) => ({ type: 'text', label })) {
  return {
    categories: {
      signature: { title: 'DaTruthMeter sections', components: ['Hero', 'Episodes', 'Guides', 'PhotoWall', 'Newsletter', 'Essays', 'Shop', 'Booking', 'About'] },
      general: { title: 'General sections', components: ['TextBlock', 'PhotoAndText', 'Quote', 'Video', 'Banner', 'Marquee'] },
      worksheets: { title: 'Worksheets (drag into a guides section)', components: ['FillIn', 'Docket', 'TrueFalse'] },
    },

    root: {
      fields: {
        title: text('Browser tab title'),
        previewNote: text('Note across the very top (leave empty to hide)'),
        tagline: text('Line at the top left'),
        menu: list('Menu links', linkItem, { label: 'New link', link: '#' }, (x) => x.label || 'Link'),
        phoneLabel: text('Menu button on phones'),
        phoneLink: text('Menu button on phones: link'),
        socials: list('Social links (hero and footer)', linkItem, { label: '', link: 'https://' }, (x) => x.label || 'Link'),
        contactEmail: text('Contact email'),
        sendfoxUrl: text('SendFox form address (from SendFox > Forms > Embed)'),
        popupOn: yesNo('Show The Syllabus pop-up'),
        popupAt: { type: 'number', label: 'Pop-up appears after this % of the page', min: 5, max: 90 },
        popupKicker: text('Pop-up small line'),
        popupTitle: text('Pop-up title'),
        popupBody: area('Pop-up text'),
        footerLine: text('Footer line under the name'),
        footerLinks: list('Extra footer links', linkItem, { label: '', link: '#' }, (x) => x.label || 'Link'),
      },
      defaultProps: { menu: [], socials: [], footerLinks: [], popupOn: 'yes', popupAt: 30 },
      render: Root,
    },

    components: {
      Hero: {
        label: 'Hero (top of page)',
        fields: {
          eyebrow: text('Small line above the headline'),
          headline: area('Headline', { description: ACCENT }),
          body: area('Text under the headline (leave a blank line between paragraphs)'),
          portrait: photoField('Photo'),
          portraitAlt: text('Photo description (for screen readers)'),
          latestId: text('Latest episode: YouTube video ID (the part after watch?v=)'),
          latestKicker: text('Latest episode: small line'),
          latestTitle: text('Latest episode: title'),
          ...placement,
        },
        defaultProps: { eyebrow: 'The DaTruthMeter Podcast', headline: 'New\n*headline.*', body: '', portrait: '', portraitAlt: '', latestId: '', latestKicker: '', latestTitle: '', anchor: '', gauge: '' },
        render: Hero,
      },

      Episodes: {
        label: 'Episodes and short clips',
        fields: {
          eyebrow: text('Small line above the heading'),
          heading: text('Heading', { description: ACCENT }),
          linkLabel: text('Link at the right'),
          link: text('Link at the right: address'),
          episodes: list('Episodes (top of the list shows first)', {
            videoId: text('YouTube video ID'), number: text('Episode number'), date: text('Date'), title: text('Title'), blurb: area('One line about it'), thumb: photoField('Thumbnail (leave empty to use YouTube’s)'),
          }, { videoId: '', number: '', date: '', title: 'New episode', blurb: '', thumb: '' }, (x) => `${x.number ? `${x.number} · ` : ''}${x.title || 'Episode'}`),
          shortsHeading: text('Short clips: heading'),
          shortsNote: text('Short clips: note at the right'),
          shorts: list('Short clips', {
            videoId: text('YouTube video ID'), title: text('Title'), note: text('Small line (views, date)'), thumb: photoField('Thumbnail (leave empty to use YouTube’s)'),
          }, { videoId: '', title: 'New clip', note: '', thumb: '' }, (x) => x.title || 'Clip'),
          ...placement,
        },
        defaultProps: { eyebrow: '', heading: 'Season ~Two~', linkLabel: 'Every episode on YouTube', link: 'https://www.youtube.com/@datruthmeter', episodes: [], shortsHeading: 'In a minute', shortsNote: 'Short clips · YouTube', shorts: [], anchor: '', gauge: '' },
        render: Episodes,
      },

      Guides: {
        label: 'Truth Resource Guides (worksheet band)',
        fields: {
          eyebrow: text('Small line above the heading'),
          heading: text('Heading', { description: ACCENT }),
          intro: area('Text at the right'),
          printLabel: text('Print button (leave empty to hide)'),
          sheets: { type: 'slot', label: 'Worksheets', allow: ['FillIn', 'Docket', 'TrueFalse'] },
          ...placement,
        },
        defaultProps: { eyebrow: 'Educate', heading: 'The Truth ~Resource~ Guides', intro: '', printLabel: 'Print a guide', sheets: [], anchor: '', gauge: '' },
        render: Guides,
      },

      FillIn: {
        label: 'Worksheet: fill in the blanks',
        inline: true,
        fields: {
          ...sheetHead(),
          blanks: list('Blanks', {
            before: area('Words before the blank'), answer: text('Correct number'), leeway: text('Allowed difference (0 for exact)'), after: area('Words after the blank'),
          }, { before: '', answer: '0', leeway: '0', after: '' }, (x) => `${(x.before || '').slice(0, 30)} ___`),
          hint: text('Hint shown when an answer is wrong'),
          discuss,
          ...source,
        },
        defaultProps: { kicker: 'Guide No. 0', title: 'New worksheet', titleItalic: '', objective: '', width: 'wide', blanks: [], hint: '', discuss: [], sourceText: '', sourceLink: '' },
        render: FillIn,
      },

      Docket: {
        label: 'Worksheet: docket (rulings or timeline)',
        inline: true,
        fields: {
          ...sheetHead(),
          rows: list('Rows', {
            term: text('Year or term'), name: text('Name'), disposition: text('Outcome'), tone: choice('Outcome color', [['red', 'Red'], ['navy', 'Navy'], ['gray', 'Gray']]), text: area('What happened (opens when clicked)'),
          }, { term: '', name: 'New row', disposition: '', tone: 'gray', text: '' }, (x) => `${x.term ? `${x.term} · ` : ''}${x.name || 'Row'}`),
          discuss,
          ...source,
        },
        defaultProps: { kicker: 'Guide No. 0', title: 'New docket', titleItalic: '', objective: '', width: 'wide', rows: [], discuss: [], sourceText: '', sourceLink: '' },
        render: Docket,
      },

      TrueFalse: {
        label: 'Worksheet: true or false',
        inline: true,
        fields: {
          ...sheetHead(),
          questions: list('Statements', {
            statement: area('Statement'), answer: { type: 'radio', label: 'The answer', options: [{ value: 'true', label: 'True' }, { value: 'false', label: 'False' }] }, note: area('Explanation shown after answering'), cite: text('Where the fact comes from'),
          }, { statement: '', answer: 'true', note: '', cite: '' }, (x) => (x.statement || '').slice(0, 40) || 'Statement'),
          ...source,
        },
        defaultProps: { kicker: 'Guide No. 0', title: 'True or false', titleItalic: '', objective: '', width: 'wide', questions: [], sourceText: '', sourceLink: '' },
        render: TrueFalse,
      },

      PhotoWall: {
        label: 'Photo wall (From the Feed)',
        fields: {
          heading: text('Heading', { description: ACCENT }),
          linkLabel: text('Link at the right'),
          link: text('Link at the right: address'),
          photos: list('Photos', {
            image: photoField('Photo'), caption: area('Caption'), link: text('Link (an Instagram post, optional)'), shape: choice('Shape', [['tall', 'Tall'], ['square', 'Square'], ['wide', 'Wide']]),
          }, { image: '', caption: '', link: '', shape: 'tall' }, (x) => (x.caption || '').slice(0, 40) || 'Photo'),
          ...placement,
        },
        defaultProps: { heading: 'From the *feed*', linkLabel: '@datruthmeter on Instagram', link: 'https://www.instagram.com/datruthmeter', photos: [], anchor: '', gauge: '' },
        render: PhotoWall,
      },

      Newsletter: {
        label: 'The Syllabus (newsletter signup)',
        fields: {
          eyebrow: text('Small line above the heading'),
          heading: text('Heading', { description: ACCENT }),
          body: area('Text'),
          bullets: list('Points', { text: text('Point') }, { text: '' }, (x) => x.text || 'Point'),
          button: text('Button'),
          postsHeading: text('Heading above the blog posts'),
          readLabel: text('Link wording'),
          posts: list('Blog posts (the first one shows large)', {
            kicker: text('Topic'), title: text('Title'), dek: area('One line about it'), date: text('Date (optional)'),
            image: photoField('His graphic (optional)'), link: text('Link to the post'),
          }, { kicker: '', title: 'New post', dek: '', date: '', image: '', link: '' }, (x) => x.title || 'Post'),
          ...placement,
        },
        defaultProps: { eyebrow: 'The newsletter · monthly', heading: 'The ~Syllabus~', body: '', bullets: [], button: 'Get The Syllabus', postsHeading: 'From the blog', readLabel: 'Read', posts: [], anchor: '', gauge: '' },
        render: Newsletter,
      },

      Essays: {
        label: 'Essays (the blog)',
        fields: {
          eyebrow: text('Small line above the heading'),
          heading: text('Heading', { description: ACCENT }),
          intro: area('Text at the right'),
          essays: list('Essays (the first one shows large)', {
            kicker: text('Topic'), title: text('Title'), dek: area('One line about it'), link: text('Link to the essay'),
          }, { kicker: '', title: 'New essay', dek: '', link: '' }, (x) => x.title || 'Essay'),
          readLabel: text('Link wording'),
          band: bandField,
          ...placement,
        },
        defaultProps: { eyebrow: '', heading: 'Essays', intro: '', essays: [], readLabel: 'Read', band: 'navy', anchor: '', gauge: '' },
        render: Essays,
      },

      Shop: {
        label: 'Shop (links to Gumroad or any store)',
        fields: {
          heading: text('Heading', { description: ACCENT }),
          intro: area('Text under the heading'),
          products: list('Products', {
            title: text('Name'), description: area('Description'), price: text('Price (optional)'), image: photoField('Photo'), link: text('Link to buy (Gumroad or your store)'), button: text('Button wording'),
          }, { title: 'New product', description: '', price: '', image: '', link: '', button: 'Get it' }, (x) => x.title || 'Product'),
          ...placement,
        },
        defaultProps: { heading: 'Shop', intro: '', products: [], anchor: 'shop', gauge: '' },
        render: Shop,
      },

      Booking: {
        label: 'Book T-Mac (offers and inquiry form)',
        fields: {
          eyebrow: text('Small line above the heading'),
          heading: text('Heading', { description: ACCENT }),
          cards: list('Offers (the first one shows large, with the photo)', {
            title: text('Title'), description: area('Description'), who: text('Who it is for'),
          }, { title: 'New offer', description: '', who: '' }, (x) => x.title || 'Offer'),
          photo: photoField('Photo in the first offer'),
          photoAlt: text('Photo description'),
          quoteLabel: text('Quote box: small line'),
          quote: area('Quote box: quote (leave empty to hide)'),
          formHeading: text('Form heading'),
          formOptions: list('Form choices', { label: text('Choice') }, { label: '' }, (x) => x.label || 'Choice'),
          ...placement,
        },
        defaultProps: { eyebrow: '', heading: 'Book *T-Mac*', cards: [], photo: '', photoAlt: '', quoteLabel: 'In his words', quote: '', formHeading: 'Get in touch', formOptions: [], anchor: '', gauge: '' },
        render: Booking,
      },

      About: {
        label: 'About (what DaTruthMeter is, and the 1.69 story)',
        fields: {
          eyebrow: text('Small line above the heading'),
          heading: text('Heading', { description: ACCENT }),
          paragraphs: para,
          belief: area('Large closing line', { description: ACCENT }),
          storyEyebrow: text('Story: small line'),
          bigNumber: text('Story: big number (leave empty to hide the story)'),
          tagline: text('Story: line under the number', { description: ACCENT }),
          intro: area('Story: first line'),
          quote: area('Story: quote'),
          quoteCite: text('Story: who said it, and where'),
          stats: list('Story: facts', { value: text('Number or word'), label: text('What it means') }, { value: '', label: '' }, (x) => `${x.value} ${x.label}`.trim() || 'Fact'),
          videoId: text('Story: YouTube video ID for the button'),
          buttonLabel: text('Story: button'),
          band: bandField,
          ...placement,
        },
        defaultProps: { eyebrow: 'About', heading: 'About', paragraphs: [], belief: '', storyEyebrow: '', bigNumber: '', tagline: '', intro: '', quote: '', quoteCite: '', stats: [], videoId: '', buttonLabel: '', band: 'paper', anchor: '', gauge: '' },
        render: About,
      },

      TextBlock: {
        label: 'Text',
        fields: { eyebrow: text('Small line above the heading'), heading: text('Heading', { description: ACCENT }), paragraphs: para, buttonLabel: text('Button (optional)'), buttonLink: text('Button link'), band: bandField, ...placement },
        defaultProps: { eyebrow: '', heading: 'New section', paragraphs: [{ text: 'Write something here.' }], buttonLabel: '', buttonLink: '', band: 'ink', anchor: '', gauge: '' },
        render: TextBlock,
      },

      PhotoAndText: {
        label: 'Photo and text',
        fields: {
          photo: photoField('Photo'), photoAlt: text('Photo description'), side: choice('Photo side', [['left', 'Left'], ['right', 'Right']]),
          eyebrow: text('Small line above the heading'), heading: text('Heading', { description: ACCENT }), paragraphs: para,
          buttonLabel: text('Button (optional)'), buttonLink: text('Button link'), band: bandField, ...placement,
        },
        defaultProps: { photo: '', photoAlt: '', side: 'left', eyebrow: '', heading: 'New section', paragraphs: [{ text: 'Write something here.' }], buttonLabel: '', buttonLink: '', band: 'ink', anchor: '', gauge: '' },
        render: PhotoAndText,
      },

      Quote: {
        label: 'Big quote',
        fields: { quote: area('Quote', { description: ACCENT }), cite: text('Who said it'), band: bandField, ...placement },
        defaultProps: { quote: 'Let’s tell da truth.', cite: '', band: 'red', anchor: '', gauge: '' },
        render: Quote,
      },

      Video: {
        label: 'Video',
        fields: { eyebrow: text('Small line above the heading'), heading: text('Heading', { description: ACCENT }), videoId: text('YouTube video ID'), caption: area('Caption'), ...placement },
        defaultProps: { eyebrow: '', heading: 'Watch', videoId: '', caption: '', anchor: '', gauge: '' },
        render: Video,
      },

      Banner: {
        label: 'Banner with a button',
        fields: { heading: text('Heading', { description: ACCENT }), body: area('Text'), buttonLabel: text('Button'), buttonLink: text('Button link'), band: bandField, ...placement },
        defaultProps: { heading: 'New banner', body: '', buttonLabel: '', buttonLink: '', band: 'red', anchor: '', gauge: '' },
        render: Banner,
      },

      Marquee: {
        label: 'Moving words strip',
        fields: { words: list('Words', { word: text('Word') }, { word: '' }, (x) => x.word || 'Word') },
        defaultProps: { words: [{ word: 'Activate' }, { word: 'Motivate' }, { word: 'Educate' }, { word: 'Resuscitate' }] },
        render: Marquee,
      },
    },
  };
}
