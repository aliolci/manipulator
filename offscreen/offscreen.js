// Zero-shot classifier running in an offscreen document.
// Two judgments per tweet:
//   1) Is the account name a themed/clip-farm brand? ("Cats with Aura" → yes)
//   2) Is the tweet text describing what's in a video?  ("the way she…"  → yes)
//
// Model: Xenova/nli-deberta-v3-xsmall  (~70 MB, ONNX-quantized)
// Runtime: WebGPU when available, WASM fallback.

// Library is vendored locally so we don't rely on remote-hosted code (Chrome
// Web Store policy disallows remote code execution).
import { pipeline, env } from '../vendor/transformers/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;
// Point ONNX runtime at the locally-bundled WASM shards so it doesn't try to
// fetch them from a CDN at first inference.
try {
  env.backends.onnx.wasm.wasmPaths = chrome.runtime.getURL('vendor/transformers/');
} catch (_) {}

// ── Label sets ──────────────────────────────────────────────────────────────
// Binary labels in each list — the first is "manipulation-positive", the
// second is "manipulation-negative". With only two labels, zero-shot
// probabilities sum to 1.0 cleanly and a 0.6 threshold is meaningful.
//
// The wording deliberately uses natural English the NLI model has seen
// during training ("dedicated to a single topic", "regular personal
// account"). Jargon like "clip-farm" hurts entailment scores.
const HANDLE_LABELS = [
  'an account dedicated to a single topic such as animals, nature, food, history, memes, or cars',
  'a regular personal account run by one individual person',
];
const HANDLE_TEMPLATE = 'This account name describes {}.';

// Text label (positive) covers BOTH literal video narration AND emotional /
// parasocial captions ("look at those pretty eyes…") — the manipulation
// pattern is the same: caption written to make the viewer engage with
// content the poster did not produce.
const TEXT_LABELS = [
  'an emotional caption, video narration, or parasocial reaction designed to maximize engagement',
  'a personal thought, opinion, or piece of factual information from the author',
];
const TEXT_TEMPLATE = 'This tweet is {}.';

// ── Model loading ───────────────────────────────────────────────────────────
const classifierPromise = pipeline(
  'zero-shot-classification',
  'Xenova/nli-deberta-v3-xsmall',
  { device: 'webgpu', dtype: 'q8' }
).catch(() =>
  pipeline(
    'zero-shot-classification',
    'Xenova/nli-deberta-v3-xsmall',
    { device: 'wasm', dtype: 'q8' }
  )
);

// ── Per-handle cache ────────────────────────────────────────────────────────
// The "themed handle" judgment depends only on the account name, not on the
// individual tweet, so cache it. Reset only when the worker is recreated.
const handleCache = new Map();          // handleLower → probability (0..1)
const HANDLE_CACHE_LIMIT = 5_000;       // soft cap

function rememberHandle(handleLower, prob) {
  if (handleCache.size >= HANDLE_CACHE_LIMIT) {
    // Drop oldest few entries.
    const it = handleCache.keys();
    for (let i = 0; i < 50; i++) {
      const k = it.next().value;
      if (k === undefined) break;
      handleCache.delete(k);
    }
  }
  handleCache.set(handleLower, prob);
}

function pickProbability(out, label) {
  if (!out?.labels) return 0;
  for (let i = 0; i < out.labels.length; i++) {
    if (out.labels[i] === label) return out.scores[i];
  }
  return 0;
}

// ── The work ────────────────────────────────────────────────────────────────
async function classifyTweet({ handle, displayName, text }) {
  const cls = await classifierPromise;
  const handleLower = (handle || '').toLowerCase();

  // 1) Themed handle (cached per handle)
  let themedHandle = handleLower ? handleCache.get(handleLower) : undefined;
  if (themedHandle === undefined && (handle || displayName)) {
    const description = displayName
      ? `Account called "${displayName}" with handle @${handle || ''}`
      : `Account with handle @${handle}`;
    const out = await cls(description, HANDLE_LABELS, {
      hypothesis_template: HANDLE_TEMPLATE,
      multi_label: false,
    });
    themedHandle = pickProbability(out, HANDLE_LABELS[0]);
    if (handleLower) rememberHandle(handleLower, themedHandle);
  }
  themedHandle = themedHandle ?? 0;

  // 2) Video-narration text (per-tweet)
  let videoNarration = 0;
  const trimmedText = (text || '').trim();
  if (trimmedText.length > 0) {
    const out = await cls(trimmedText, TEXT_LABELS, {
      hypothesis_template: TEXT_TEMPLATE,
      multi_label: false,
    });
    videoNarration = pickProbability(out, TEXT_LABELS[0]);
  }

  return { themedHandle, videoNarration };
}

// ── Message bridge ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.target !== 'offscreen' || msg?.type !== 'CLASSIFY_TWEET_OFFSCREEN') {
    return false;
  }

  (async () => {
    try {
      const result = await classifyTweet(msg);
      sendResponse(result);
    } catch (err) {
      sendResponse({ themedHandle: 0, videoNarration: 0, error: String(err) });
    }
  })();

  return true; // keep channel open for async sendResponse
});
