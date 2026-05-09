// Zero-shot classifier running in an offscreen document.
// Two judgments per tweet:
//   1) Is the account name a themed/clip-farm brand? ("Cats with Aura" → yes)
//   2) Is the tweet text describing what's in a video?  ("the way she…"  → yes)
//
// Model: Xenova/nli-deberta-v3-xsmall  (~70 MB, ONNX-quantized)
// Runtime: WebGPU when available, WASM fallback.

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';

env.allowLocalModels = false;
env.useBrowserCache = true;

// ── Label sets ──────────────────────────────────────────────────────────────
// First label in each list is the "manipulation-positive" hypothesis. We
// always read its probability as the signal value.
const HANDLE_LABELS = [
  'a themed clip-farm or content-aggregator account',
  'an authentic personal account',
];
const HANDLE_TEMPLATE = 'This Twitter account is {}.';

const TEXT_LABELS = [
  'describing what is happening in a video clip',
  'a personal opinion, reaction, or thought',
  'sharing news or factual information',
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
