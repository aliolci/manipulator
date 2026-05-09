// Runs in the page's MAIN world (same JS realm as X's own code).
// Captures auth headers from any GraphQL request X makes (fetch or XHR),
// then replays them when content.js asks for AboutAccountQuery.
(function () {
  let captured = null;
  const ABOUT_QID = 'zUnx-DLN9dkwOkNhTLySjg';

  function snapshotFromHeadersLike(h) {
    try {
      const obj = {};
      if (!h) return null;
      if (h instanceof Headers) {
        h.forEach((v, k) => { obj[k.toLowerCase()] = v; });
      } else if (Array.isArray(h)) {
        for (const [k, v] of h) obj[String(k).toLowerCase()] = v;
      } else if (typeof h === 'object') {
        for (const k of Object.keys(h)) obj[k.toLowerCase()] = h[k];
      }
      if (obj['authorization']) return obj;
    } catch (_) {}
    return null;
  }

  // ── fetch hook ────────────────────────────────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url = typeof input === 'string' ? input : input?.url;
      if (url && url.includes('/i/api/graphql/')) {
        const fromInit = init?.headers && snapshotFromHeadersLike(init.headers);
        const fromReq = !fromInit && input && input.headers && snapshotFromHeadersLike(input.headers);
        const snap = fromInit || fromReq;
        if (snap) captured = snap;
      }
    } catch (_) {}
    return origFetch.apply(this, arguments);
  };

  // ── XHR hook ──────────────────────────────────────────────────────────────
  const XHRopen = XMLHttpRequest.prototype.open;
  const XHRsetHeader = XMLHttpRequest.prototype.setRequestHeader;
  XMLHttpRequest.prototype.open = function (method, url) {
    try { this.__manipUrl = String(url); this.__manipHeaders = {}; } catch (_) {}
    return XHRopen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    try {
      if (this.__manipUrl && this.__manipUrl.includes('/i/api/graphql/') && this.__manipHeaders) {
        this.__manipHeaders[String(name).toLowerCase()] = value;
        if (this.__manipHeaders['authorization']) captured = { ...this.__manipHeaders };
      }
    } catch (_) {}
    return XHRsetHeader.apply(this, arguments);
  };

  // ── Message bridge ────────────────────────────────────────────────────────
  window.addEventListener('message', async (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.type !== 'MANIPULATOR_FETCH_ABOUT') return;
    const { id, handle } = d;
    const reply = (payload) =>
      window.postMessage({ type: 'MANIPULATOR_FETCH_ABOUT_RESULT', id, ...payload }, '*');

    if (!captured) { reply({ error: 'no-auth-captured' }); return; }
    try {
      const vars = encodeURIComponent(JSON.stringify({ screenName: handle }));
      const url = `https://x.com/i/api/graphql/${ABOUT_QID}/AboutAccountQuery?variables=${vars}`;
      const resp = await origFetch(url, { credentials: 'include', headers: captured });
      if (!resp.ok) { reply({ error: 'http-' + resp.status }); return; }
      reply({ json: await resp.json() });
    } catch (err) {
      reply({ error: String(err) });
    }
  });
})();
