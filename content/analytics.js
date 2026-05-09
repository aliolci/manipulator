// Lightweight, privacy-conscious analytics for the Manipulator extension.
//
// Sends events via GA4 Measurement Protocol (or any compatible endpoint).
// Never sends tweet content, handles, profile data, or anything that could
// identify the user or the people they're looking at — only category-level
// shape data (score buckets, signal counts, has-video/image, etc.).
//
// To enable:
//   1. Create a GA4 property + Web data stream → measurement_id (G-…).
//   2. In that data stream, create a Measurement Protocol API secret.
//   3. Set ANALYTICS_CONFIG.measurementId and apiSecret below.
//
// Analytics is OFF by default. The user must explicitly opt in via the
// extension popup. All `track()` calls are no-ops unless BOTH:
//   • ANALYTICS_CONFIG.measurementId and apiSecret are set (developer
//     configuration), AND
//   • the user has set `manipulator_analytics.optIn === true` in storage.

const ANALYTICS_CONFIG = {
  /** GA4 measurement ID, e.g. "G-XXXXXXXXXX". Empty = analytics disabled. */
  measurementId: 'G-W3MW21MQG3',
  /** GA4 Measurement Protocol API secret. Empty = analytics disabled. */
  apiSecret: '5_KY7ydGSiue6O6nKw45Aw',
  /** Override endpoint for non-GA backends (Plausible, PostHog, self-hosted). */
  endpoint: 'https://www.google-analytics.com/mp/collect',
  /** Flush queue every N ms (and on visibilitychange→hidden). */
  flushIntervalMs: 30_000,
  /** GA4 MP allows max 25 events per request. */
  maxBatchSize: 25,
  /** Sample rate (1.0 = every event, 0.1 = 10% of events). */
  sampleRate: 1.0,
};

const STORAGE_KEY = 'manipulator_analytics';

let _clientId = null;
let _sessionId = String(Date.now());
let _enabled = false;            // gated by config + opt-out
let _ready = false;              // becomes true once we have a clientId
let _queue = [];
let _flushTimer = null;

function _isConfigured() {
  return !!(ANALYTICS_CONFIG.measurementId && ANALYTICS_CONFIG.apiSecret);
}

async function _init() {
  if (!_isConfigured()) {
    _enabled = false;
    return;
  }

  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const stored = data[STORAGE_KEY] || {};

    if (!stored.clientId) {
      stored.clientId = (crypto.randomUUID && crypto.randomUUID()) ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      stored.installDate = Date.now();
      await chrome.storage.local.set({ [STORAGE_KEY]: stored });
    }
    _clientId = stored.clientId;
    // OFF unless the user has explicitly opted in.
    _enabled = stored.optIn === true;
    _ready = true;
  } catch (_) {
    _enabled = false;
  }

  if (_enabled) _scheduleFlush();

  // React to changes from the popup so opting in/out takes effect immediately
  // without requiring a page reload.
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue || {};
      const wasEnabled = _enabled;
      _enabled = _isConfigured() && next.optIn === true;
      if (next.clientId) _clientId = next.clientId;
      if (_enabled && !wasEnabled) _scheduleFlush();
      // If user just opted out, drop any queued events so they don't get sent.
      if (!_enabled && wasEnabled) _queue.length = 0;
    });
  } catch (_) {}
}

function _scheduleFlush() {
  if (_flushTimer) return;
  _flushTimer = setInterval(_flush, ANALYTICS_CONFIG.flushIntervalMs);
}

async function _flush() {
  if (!_enabled || !_ready || _queue.length === 0) return;
  const events = _queue.splice(0, ANALYTICS_CONFIG.maxBatchSize);

  const url = `${ANALYTICS_CONFIG.endpoint}` +
    `?measurement_id=${encodeURIComponent(ANALYTICS_CONFIG.measurementId)}` +
    `&api_secret=${encodeURIComponent(ANALYTICS_CONFIG.apiSecret)}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      keepalive: true, // ensure send-on-unload
      body: JSON.stringify({
        client_id: _clientId,
        events,
      }),
    });
    // GA4 MP returns 204 on success and 4xx on schema errors. Don't retry on 4xx.
    if (resp.status >= 500 && _queue.length < 200) {
      _queue.unshift(...events);
    }
  } catch (_) {
    // Network error: requeue (capped) so we don't grow unbounded.
    if (_queue.length < 200) _queue.unshift(...events);
  }
}

/**
 * Sanitize event params: GA4 enforces alphanumeric+underscore keys ≤40 chars
 * and string/number values. We strip anything that could leak content.
 */
function _sanitizeParams(params) {
  if (!params || typeof params !== 'object') return {};
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(params)) {
    const key = String(rawKey).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
    if (!key) continue;

    // Allow only primitive numbers, booleans (→ 0/1), and short strings.
    let value = rawVal;
    if (typeof value === 'boolean') value = value ? 1 : 0;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      out[key] = value;
      continue;
    }
    if (typeof value === 'string') {
      // Hard cap: prevent accidental leaks of tweet content.
      out[key] = value.slice(0, 100);
      continue;
    }
    // Skip arrays, objects, undefined, null.
  }
  return out;
}

/**
 * Public: record an event. No-op unless analytics is configured AND enabled.
 *
 * @param {string} eventName  alphanumeric + underscore, ≤40 chars
 * @param {object} [params]   flat object of primitives (numbers/bools/short strings)
 */
function track(eventName, params) {
  if (!_enabled || !_ready) return;
  if (Math.random() > ANALYTICS_CONFIG.sampleRate) return;
  const name = String(eventName).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);
  if (!name) return;

  _queue.push({
    name,
    params: {
      ..._sanitizeParams(params),
      session_id: _sessionId,
      engagement_time_msec: '100',
    },
  });

  if (_queue.length >= ANALYTICS_CONFIG.maxBatchSize) _flush();
}

async function setOptIn(optIn) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    const stored = data[STORAGE_KEY] || {};
    stored.optIn = !!optIn;
    await chrome.storage.local.set({ [STORAGE_KEY]: stored });
    _enabled = !!optIn && _isConfigured();
  } catch (_) {}
}

// Flush on tab hide/unload — `keepalive: true` lets fetch survive.
try {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flush();
  });
} catch (_) {}

window._manipulator_track = track;
window._manipulator_setAnalyticsOptIn = setOptIn;

_init();
