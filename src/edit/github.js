/**
 * The editor's only backend: the site's own GitHub repo.
 *
 * Sign in is GitHub OAuth through netlify/functions/auth.js (the same proxy every CTRL Tech
 * handoff uses). Whoever signs in needs write access to the repo; the commit carries their
 * name. Reading loads the current page.json straight from the repo so the editor never
 * opens on stale content; publishing writes page.json plus any new photos as ONE commit on
 * the live branch, which Netlify turns into a deploy. Git is the version history.
 *
 * The token lives in sessionStorage for the tab and nowhere else.
 */

import { REPO, BRANCH, CONTENT_PATH } from "./repo";

const API = "https://api.github.com";
const TOKEN_KEY = "dtm-editor-token";

export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));

/** Open the OAuth popup and resolve with a token. Protocol matches auth.js's postMessage. */
export function signIn() {
  return new Promise((ok, fail) => {
    const url = `${window.location.origin}/.netlify/functions/auth?provider=github&scope=repo`;
    const popup = window.open(url, "dtm-github-auth", "width=600,height=700");
    if (!popup) return fail(new Error("The sign-in window was blocked. Allow pop-ups for this site and try again."));
    const onMessage = (e) => {
      if (e.origin !== window.location.origin || typeof e.data !== "string") return;
      const m = e.data.match(/^authorization:github:(success|error):(.*)$/s);
      if (!m) return;
      window.removeEventListener("message", onMessage);
      clearInterval(closed);
      try {
        const body = JSON.parse(m[2]);
        if (m[1] === "success" && body.token) return ok(body.token);
        fail(new Error(body.detail || body.error || "GitHub did not return a token"));
      } catch {
        fail(new Error("Could not read GitHub's reply"));
      }
    };
    window.addEventListener("message", onMessage);
    // The proxy page also waits for this before it posts, in case its own send raced us.
    const nudge = setInterval(() => popup.closed ? clearInterval(nudge) : popup.postMessage("authorizing:github", window.location.origin), 300);
    const closed = setInterval(() => {
      if (popup.closed) {
        clearInterval(closed);
        clearInterval(nudge);
        window.removeEventListener("message", onMessage);
        fail(new Error("Sign-in window closed before finishing"));
      }
    }, 500);
  });
}

async function gh(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try { detail = ((await res.json())).message || detail; } catch { /* keep the status */ }
    if (res.status === 401) setToken(null);
    throw new Error(res.status === 401 ? "Your sign-in expired. Sign in again." : res.status === 404 ? `The repo ${REPO} could not be read with this account. Does it have access?` : detail);
  }
  return res.json();
}

export async function whoAmI(token) {
  const u = await gh(token, "/user");
  return u.login;
}

/** UTF-8 safe base64 for JSON. atob/btoa alone mangle anything outside Latin-1. */
const encodeUtf8 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
};
const decodeUtf8 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

/** A content file (page.json or an essay), as it is on the branch right now. */
export async function loadContent(token, path = CONTENT_PATH) {
  const f = await gh(token, `/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
  return { content: JSON.parse(decodeUtf8(f.content)), sha: f.sha };
}

/** The files in a folder of the repo (the essays), by name. An empty folder is fine. */
export async function listFiles(token, dir) {
  try {
    const items = await gh(token, `/repos/${REPO}/contents/${dir}?ref=${BRANCH}`);
    return (Array.isArray(items) ? items : []).filter((x) => x.type === "file").map((x) => x.name);
  } catch (e) {
    if (/could not be read/.test(String(e?.message))) return [];
    throw e;
  }
}

/**
 * One commit, many files, via the Git Data API: blobs -> tree -> commit -> ref. A
 * per-file "update contents" call would make one commit and one deploy per photo.
 */
export async function commitFiles(token, files, message) {
  const ref = await gh(token, `/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const head = ref.object.sha;
  const parent = await gh(token, `/repos/${REPO}/git/commits/${head}`);
  const tree = [];
  for (const f of files) {
    const blob = await gh(token, `/repos/${REPO}/git/blobs`, { method: "POST", body: JSON.stringify({ content: f.base64, encoding: "base64" }) });
    tree.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await gh(token, `/repos/${REPO}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: parent.tree.sha, tree }) });
  const commit = await gh(token, `/repos/${REPO}/git/commits`, { method: "POST", body: JSON.stringify({ message, tree: newTree.sha, parents: [head] }) });
  await gh(token, `/repos/${REPO}/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
  return commit.sha;
}

export const contentFile = (json, path = CONTENT_PATH) => ({ path, base64: encodeUtf8(JSON.stringify(json, null, 2) + "\n") });
