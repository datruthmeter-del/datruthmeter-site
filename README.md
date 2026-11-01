# DaTruthMeter: website

The website for DaTruthMeter Media Group LLC (Timothy McKinney Jr.).
One page, built with Vite, React and Tailwind, with its own editor at `/edit`.
Built by CTRL Tech. This repo is meant to live in Tim's own GitHub account, so the site
is owned outright by DaTruthMeter.

## Changing the site: use /edit

Go to `/edit` on the site, click **Sign in with GitHub**, and edit the page as visitors
see it. The picker at the top switches between the homepage and each essay; **+ New
essay** starts one (its web address, `/post/<name>`, comes from the title and is fixed
once published). Tim signs in with **his own GitHub account**, added to this repo once. Nothing
about the login is tied to CTRL Tech.

Full editing:

- **Every section can be added, moved, duplicated and deleted.** The library on the left
  has the DaTruthMeter sections (hero, episodes and short clips, the Truth Resource
  Guides, the photo wall, The Syllabus, essays, shop, Book T-Mac, about) and general
  sections (text, photo and text, big quote, video, banner, moving words strip).
- **Worksheets** (fill in the blanks, docket, true or false) are sections that go inside
  a Truth Resource Guides band. Every question, answer and source is editable.
- **Every word, link and photo** inside a section is a field on the right.
- **Site settings** (click empty space around the page, or "Page" at the top right):
  menu links, social links, contact email, the SendFox form address, The Syllabus pop-up,
  and the footer.
- In headings, `*word*` makes a word red and `~word~` makes it outlined.

**Publish** commits the change to this repo as one commit, Netlify rebuilds, and it is
live about two minutes later. Git keeps every version, so any publish can be undone.

What the editor does not change: colours, fonts, the thermometer mark, and the design of
each section type. Those are code changes, through CTRL Tech.

## How it is built

- `src/site/config.jsx` defines every section once. The public page (`src/main.jsx`)
  renders `src/content/page.json` through it; the editor (`src/edit/Editor.jsx`) edits
  `page.json` through it. Same code both ways, so the editor shows exactly what ships,
  and adding or moving sections cannot break publishing.
- Essays live one per file in `src/content/essays/<address>.json` and render at
  `/post/<address>` through `src/site/essay.jsx` (same header, footer and theme as the
  homepage). The addresses are the ones the old Wix site used, so old links keep working.
  `src/content/essays.js` indexes the folder at build time: The Syllabus on the homepage
  lists every essay automatically (newest first, unless posts are typed in by hand), and
  the build writes a real HTML file per essay (`dist/post/<address>/index.html`) so shared
  links carry the right title and graphic. The essay text is one box: blank line for a
  paragraph, `## ` heading, `> ` pulled-out line, `- ` list item, `**bold**`, `_italic_`.
- Photos picked in the editor are resized and stripped of location data in the browser,
  then committed to `public/images/uploads/` with the page.
- `netlify/functions/auth.js` is the GitHub sign-in. The token stays in the browser tab.

## Turning the editor on (one time)

1. Create a GitHub OAuth App (github.com/settings/developers) with callback
   `https://<site>/.netlify/functions/auth/callback`. Details at the top of
   `netlify/functions/auth.js`.
2. Netlify, Site settings, Environment variables: set `OAUTH_CLIENT_ID` and
   `OAUTH_CLIENT_SECRET` from that app, then redeploy.
3. Give Tim write access to this repo (he needs a free GitHub account).

Netlify environment variables do not travel with a site transfer. If the site moves
between Netlify accounts, re-enter both or sign-in fails.

`REPO` in `src/edit/repo.js` is derived from Netlify's `REPOSITORY_URL` at build time, so a
repo transfer repoints the editor on the next deploy.

## Local development

```
npm install
npm run dev          # site at /, editor at /edit/?local=1 (no sign-in, publish disabled)
npm run build
npm run lint
```
