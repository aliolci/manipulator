// Country name / alias → ISO 3166-1 alpha-2 code
// Sorted longest-first at lookup time to avoid partial matches (e.g. "iran" in "ukraine")
const COUNTRY_NAMES = {
  'united states of america': 'US', 'united states': 'US', 'u.s.a.': 'US', 'u.s.': 'US', 'usa': 'US', 'america': 'US',
  'united kingdom': 'GB', 'great britain': 'GB', 'england': 'GB', 'scotland': 'GB', 'wales': 'GB', 'britain': 'GB', 'uk': 'GB',
  'united arab emirates': 'AE', 'uae': 'AE',
  'south africa': 'ZA', 'south korea': 'KR', 'north korea': 'KP', 'new zealand': 'NZ',
  'saudi arabia': 'SA', 'czech republic': 'CZ', 'czechia': 'CZ',
  'hong kong': 'HK', 'el salvador': 'SV', 'costa rica': 'CR', 'puerto rico': 'PR',
  'sri lanka': 'LK', 'ivory coast': 'CI', "cote d'ivoire": 'CI',
  'dominican republic': 'DO', 'trinidad and tobago': 'TT', 'trinidad': 'TT',
  'bosnia': 'BA', 'north macedonia': 'MK', 'republic of ireland': 'IE',
  'türkiye': 'TR', 'turkiye': 'TR', 'turkey': 'TR',
  'germany': 'DE', 'deutschland': 'DE',
  'france': 'FR',
  'japan': 'JP',
  'korea': 'KR',
  'china': 'CN',
  'india': 'IN',
  'brazil': 'BR', 'brasil': 'BR',
  'canada': 'CA',
  'australia': 'AU',
  'russia': 'RU',
  'spain': 'ES', 'españa': 'ES',
  'italy': 'IT', 'italia': 'IT',
  'mexico': 'MX', 'méxico': 'MX',
  'argentina': 'AR',
  'netherlands': 'NL', 'holland': 'NL',
  'pakistan': 'PK',
  'indonesia': 'ID',
  'nigeria': 'NG',
  'egypt': 'EG',
  'iran': 'IR',
  'israel': 'IL',
  'ukraine': 'UA',
  'poland': 'PL',
  'sweden': 'SE',
  'norway': 'NO',
  'denmark': 'DK',
  'finland': 'FI',
  'switzerland': 'CH',
  'austria': 'AT',
  'belgium': 'BE',
  'portugal': 'PT',
  'greece': 'GR',
  'romania': 'RO',
  'hungary': 'HU',
  'thailand': 'TH',
  'malaysia': 'MY',
  'singapore': 'SG',
  'philippines': 'PH',
  'vietnam': 'VN',
  'taiwan': 'TW',
  'colombia': 'CO',
  'chile': 'CL',
  'peru': 'PE',
  'venezuela': 'VE',
  'ghana': 'GH',
  'kenya': 'KE',
  'ethiopia': 'ET',
  'bangladesh': 'BD',
  'nepal': 'NP',
  'iraq': 'IQ',
  'jordan': 'JO',
  'lebanon': 'LB',
  'morocco': 'MA',
  'algeria': 'DZ',
  'tunisia': 'TN',
  'ireland': 'IE',
  'croatia': 'HR',
  'serbia': 'RS',
  'slovakia': 'SK',
  'bulgaria': 'BG',
  'cuba': 'CU',
  'jamaica': 'JM',
  'ecuador': 'EC',
  'bolivia': 'BO',
  'paraguay': 'PY',
  'uruguay': 'UY',
  'panama': 'PA',
  'guatemala': 'GT',
  'honduras': 'HN',
  'nicaragua': 'NI',
  'ethiopia': 'ET',
  'tanzania': 'TZ',
  'uganda': 'UG',
  'cameroon': 'CM',
  'senegal': 'SN',
  'zimbabwe': 'ZW',
  'zambia': 'ZM',
  'myanmar': 'MM', 'burma': 'MM',
  'cambodia': 'KH',
  'qatar': 'QA',
  'kuwait': 'KW',
  'bahrain': 'BH',
  'oman': 'OM',
  'yemen': 'YE',
  'syria': 'SY',
  'afghanistan': 'AF',
  'kazakhstan': 'KZ',
  'uzbekistan': 'UZ',
  'azerbaijan': 'AZ',
  'georgia': 'GE',
  'armenia': 'AM',
  'moldova': 'MD',
  'belarus': 'BY',
  'latvia': 'LV',
  'lithuania': 'LT',
  'estonia': 'EE',
  'slovenia': 'SI',
  'albania': 'AL',
  'malta': 'MT',
  'cyprus': 'CY',
  'iceland': 'IS',
  'luxembourg': 'LU',
  'europe': 'EU', 'european union': 'EU',
};

// Sorted by key length descending, built once
const COUNTRY_KEYS_SORTED = Object.keys(COUNTRY_NAMES).sort((a, b) => b.length - a.length);

function codeToFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  const base = 0x1F1E6 - 65;
  return String.fromCodePoint(base + cc.toUpperCase().charCodeAt(0), base + cc.toUpperCase().charCodeAt(1));
}

function extractCountryFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const key of COUNTRY_KEYS_SORTED) {
    // Word-boundary match so "iran" doesn't match "ukraine"
    const re = new RegExp('(?:^|[\\s,/|·•(])' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:[\\s,/|·•)]|$)', 'i');
    if (re.test(lower)) return { code: COUNTRY_NAMES[key], flag: codeToFlag(COUNTRY_NAMES[key]) };
  }
  return null;
}

// ── Profile fetch + cache ────────────────────────────────────────────────────

function _fmtDate(str) {
  // "Sun Sep 21 01:22:55 +0000 2014" → "September 2014"
  try { return new Date(str).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
  catch (_) { return null; }
}

function _fmtMsec(msec) {
  // "1743335555659" → "March 2025"
  try { return new Date(parseInt(msec, 10)).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); }
  catch (_) { return null; }
}

// Exposed as window properties so content.js (loaded after) can read the cache
window._profileCache = new Map(); // handle (lowercase) → about payload | null

const PROFILE_STORAGE_KEY = 'manipulator_profile_about_v1';
const PROFILE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // refresh About data at most once per week

let _hydratePromise = null;

function ensureHydrated() {
  if (!_hydratePromise) {
    _hydratePromise = new Promise(resolve => {
      try {
        chrome.storage.local.get(PROFILE_STORAGE_KEY, obj => {
          try {
            const blob = obj[PROFILE_STORAGE_KEY];
            const now = Date.now();
            let mutated = false;
            const next = {};
            if (blob && typeof blob === 'object') {
              for (const [key, entry] of Object.entries(blob)) {
                if (!entry || typeof entry.savedAt !== 'number') {
                  mutated = true;
                  continue;
                }
                if (now - entry.savedAt > PROFILE_TTL_MS) {
                  mutated = true;
                  continue;
                }
                next[key] = entry;
                window._profileCache.set(key, entry.info);
              }
            }
            if (mutated && Object.keys(next).length !== Object.keys(blob || {}).length) {
              chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: next });
            }
          } catch (_) {}
          resolve();
        });
      } catch (_) {
        resolve();
      }
    });
  }
  return _hydratePromise;
}

function _persistProfileEntry(handle, info) {
  const h = String(handle || '').toLowerCase();
  if (!h) return;
  try {
    chrome.storage.local.get(PROFILE_STORAGE_KEY, obj => {
      const blob = { ...(obj[PROFILE_STORAGE_KEY] || {}) };
      const now = Date.now();
      blob[h] = { savedAt: now, info };
      for (const k of Object.keys(blob)) {
        const e = blob[k];
        if (!e || now - e.savedAt > PROFILE_TTL_MS) delete blob[k];
      }
      chrome.storage.local.set({ [PROFILE_STORAGE_KEY]: blob });
    });
  } catch (_) {}
}

/** Memory + durable cache so we do not repeat About requests after reload. */
function _setCached(handle, info, persist) {
  const h = String(handle || '').toLowerCase();
  window._profileCache.set(h, info);
  if (persist) _persistProfileEntry(h, info);
}

// Serial queue with throttle to stay under X's rate limit
const _aboutQueue = [];
let _queueRunning = false;
const _GAP_MS = 4500;             // minimum spacing between About API calls
const _BACKOFF_MS = 8 * 60_000;   // pause after 429 (8 min)
const _BACKOFF_KEY = '_manipulator_about_backoff_until';

const _aboutInFlight = new Map(); // handle → Promise (dedupe concurrent requests)

function _getBackoffUntil() {
  try { return parseInt(sessionStorage.getItem(_BACKOFF_KEY), 10) || 0; }
  catch (_) { return 0; }
}
function _setBackoffUntil(ts) {
  try { sessionStorage.setItem(_BACKOFF_KEY, String(ts)); } catch (_) {}
}

// ── Bridge to page-world script (which has X's auth headers) ────────────────
let _msgId = 0;
const _pending = new Map();

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data;
  if (!d || d.type !== 'MANIPULATOR_FETCH_ABOUT_RESULT') return;
  const r = _pending.get(d.id);
  if (!r) return;
  _pending.delete(d.id);
  r(d);
});

function _askPageWorld(handle, timeoutMs) {
  return new Promise((resolve) => {
    const id = ++_msgId;
    _pending.set(id, resolve);
    window.postMessage({ type: 'MANIPULATOR_FETCH_ABOUT', id, handle }, '*');
    setTimeout(() => {
      if (_pending.has(id)) { _pending.delete(id); resolve({ error: 'timeout' }); }
    }, timeoutMs);
  });
}

async function _fetchProfileHtml(handle) {
  const resp = await fetch(`https://x.com/${handle}`, {
    credentials: 'include',
    headers: { 'Accept': 'text/html,application/xhtml+xml' },
  });
  if (!resp.ok) return null;
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const loc = doc.querySelector('[data-testid="UserLocation"]')?.textContent?.trim() || null;
  return loc ? { accountBasedIn: loc, connectedVia: null, dateJoined: null, verifiedSince: null } : null;
}

async function _drainAboutQueue() {
  if (_queueRunning) return;
  _queueRunning = true;
  while (_aboutQueue.length > 0) {
    const wait = Math.max(0, _getBackoffUntil() - Date.now());
    if (wait > 0) {
      await new Promise(r => setTimeout(r, Math.min(wait, 60_000)));
      continue;
    }

    const { handle, resolve } = _aboutQueue.shift();
    if (window._profileCache.has(handle)) {
      resolve(window._profileCache.get(handle));
      continue;
    }

    try {
      const apiResult = await _askPageWorld(handle, 8000);
      if (apiResult.error === 'http-429') {
        _setBackoffUntil(Date.now() + _BACKOFF_MS);
        // Do not cache 429 — allow retry after backoff
        resolve(null);
      } else if (apiResult.error === 'no-auth-captured') {
        const info = await _fetchProfileHtml(handle).catch(() => null);
        if (info) _setCached(handle, info, true);
        resolve(info);
      } else if (apiResult.json) {
        const result = apiResult.json?.data?.user_result_by_screen_name?.result;
        let info = null;
        if (result) {
          const about = result.about_profile;
          const i = {
            accountBasedIn: about?.account_based_in || null,
            connectedVia: about?.source || null,
            dateJoined: result.core?.created_at ? _fmtDate(result.core.created_at) : null,
            verifiedSince: result.verification_info?.reason?.verified_since_msec
              ? _fmtMsec(result.verification_info.reason.verified_since_msec) : null,
          };
          if (Object.values(i).some(v => v !== null)) info = i;
        }
        // Successful HTTP + JSON — cache (even if empty) to avoid repeat pulls for this handle
        _setCached(handle, info, true);
        resolve(info);
      } else {
        // Transient / odd failure — do not cache so we can retry later
        resolve(null);
      }
    } catch (_) {
      resolve(null);
    }

    await new Promise(r => setTimeout(r, _GAP_MS));
  }
  _queueRunning = false;
}

function getProfileLocation(handle) {
  const h = String(handle || '').trim().toLowerCase();
  if (!h) return Promise.resolve(null);

  return ensureHydrated().then(() => {
    if (window._profileCache.has(h)) {
      return Promise.resolve(window._profileCache.get(h));
    }
    const existing = _aboutInFlight.get(h);
    if (existing) return existing;

    let resolveFn;
    const p = new Promise(r => {
      resolveFn = r;
    });
    _aboutInFlight.set(h, p);
    _aboutQueue.push({ handle: h, resolve: resolveFn });
    _drainAboutQueue();
    return p.finally(() => {
      _aboutInFlight.delete(h);
    });
  });
}
