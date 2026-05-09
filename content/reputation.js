// Tracks per-handle history of pressure scores so that handles which
// consistently post manipulative content get an extra reputation bonus on
// every subsequent tweet.
//
// Storage layout (chrome.storage.local):
//   {
//     manipulator_reputation: {
//       handle1: { count: 12, total: 84, avg: 7.0, lastScore: 8, lastSeen: ts },
//       handle2: ...
//     }
//   }
//
// In-memory mirror is kept hot so score.js can read it synchronously.

const _repCache = new Map();
let _repLoaded = false;
let _writeScheduled = false;

const REP_KEY = 'manipulator_reputation';
const MIN_SAMPLES = 2;            // need ≥2 tweets before reputation kicks in
const FULL_CONFIDENCE_AT = 10;    // confidence reaches 1.0 at this many samples
const BENIGN_THRESHOLD = 3;       // avg score ≤3 = benign account (no bonus)

// ── Load / persist ──────────────────────────────────────────────────────────

async function loadReputation() {
  if (_repLoaded) return;
  _repLoaded = true;
  try {
    const data = await chrome.storage.local.get(REP_KEY);
    const stored = data?.[REP_KEY] || {};
    for (const [handle, stats] of Object.entries(stored)) {
      _repCache.set(handle, stats);
    }
  } catch (_) {}
}

function _scheduleWrite() {
  if (_writeScheduled) return;
  _writeScheduled = true;
  setTimeout(async () => {
    _writeScheduled = false;
    try {
      const obj = {};
      for (const [k, v] of _repCache) obj[k] = v;
      await chrome.storage.local.set({ [REP_KEY]: obj });
    } catch (_) {}
  }, 3000);
}

// ── Public API ──────────────────────────────────────────────────────────────

function getHandleReputation(handle) {
  if (!handle) return { score: 0, count: 0, avg: 0 };
  const stats = _repCache.get(handle);

  if (!stats || stats.count < MIN_SAMPLES) {
    return { score: 0, count: stats?.count || 0, avg: stats?.avg || 0 };
  }

  const confidence = Math.min(stats.count / FULL_CONFIDENCE_AT, 1);
  const badness = Math.max(0, stats.avg - BENIGN_THRESHOLD) / (10 - BENIGN_THRESHOLD);
  return {
    score: confidence * badness,
    count: stats.count,
    avg: stats.avg,
  };
}

function recordScore(handle, score) {
  if (!handle || typeof score !== 'number') return;
  const cur = _repCache.get(handle) || { count: 0, total: 0, avg: 0, lastScore: 0, lastSeen: 0 };
  cur.count += 1;
  cur.total += score;
  cur.avg = cur.total / cur.count;
  cur.lastScore = score;
  cur.lastSeen = Date.now();
  _repCache.set(handle, cur);
  _scheduleWrite();
}

// Eagerly load — load is async but fast (<10ms typical).
loadReputation();

// Expose for other scripts (loaded after this one).
window._manipulator_getHandleReputation = getHandleReputation;
window._manipulator_recordScore = recordScore;
