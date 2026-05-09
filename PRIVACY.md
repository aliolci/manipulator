# Manipulator — Privacy Policy

_Last updated: 2026-05-09_

Manipulator is a Chrome extension that scores tweets by their attention-extraction
patterns. The extension runs **entirely in your browser**. By default, **no data
leaves your device** apart from the network calls that X.com itself would already
make for you, plus a one-time ML-model download.

---

## What stays local (never sent anywhere)

In `chrome.storage.local`:
- A history of per-handle pressure scores, built up as you scroll the X timeline.
- Cached "About" data per handle (date joined, country, verification, "connected
  via") with a 7-day expiry.
- A persistent random client identifier — used only if you opt in to analytics
  (see below).

In `sessionStorage`:
- A rate-limit backoff timestamp so we don't repeatedly hammer X's API after a 429.

In your browser's IndexedDB (managed by the Hugging Face Transformers.js library):
- The ML model weights (~70 MB) downloaded on first use, cached afterward.

---

## What is NEVER collected or transmitted

- Tweet text content
- Account handles or display names you scroll past
- Profile data (location, join date, verification status, posting client)
- Tweet URLs or IDs
- Anything personally identifiable

These categories of data are read in your browser to compute scores, then discarded.
They are not transmitted to any remote service.

---

## Optional analytics (opt-in only — off by default)

If, and only if, you explicitly turn on **"Anonymous usage analytics"** in the
extension popup, Manipulator sends anonymous, category-level events to a Google
Analytics 4 property managed by the developer. The toggle is **off by default**.
You can turn it off again at any time in the same popup.

### Exactly what is sent on opt-in

`extension_init` — fires once per X.com page load:
- `is_for_you` (boolean) — whether you're on the For You tab
- `path` (string, capped at 40 chars) — the URL path, e.g. `/home`

`tweet_scored` — fires for each scored tweet:
- `score_bucket` — one of: `very_low` / `low` / `medium` / `high` / `very_high`
- `has_video`, `has_media`, `is_for_you`, `score_floored`, `themed_clip_boost`,
  `verification_deduction` — booleans (sent as 0/1)
- `ml_latency_ms` — integer milliseconds for the ML inference
- `signals_fired` — count of signals that contributed ≥ 0.1 points

`tooltip_opened` — fires when you hover the badge:
- `score_bucket` — same buckets as above

The payload is enforced at runtime: only primitive values, keys restricted to
`[a-zA-Z0-9_]`, strings hard-capped at 100 characters. Tweet content cannot
slip through.

### Persistent identifier
A random UUID (`client_id`) is generated once per install and stored locally.
It is not derived from your X account, IP address, or any browser fingerprint.
Uninstalling the extension removes it.

### What Google Analytics receives
Only the events above, plus the IP address of your connection (which Google's
Measurement Protocol logs by default). Google's standard data retention applies.

### How to opt out after opting in
Open the extension popup → toggle **"Anonymous usage analytics"** to **Off**.
Already-queued events that haven't been flushed are discarded.

---

## Network requests Manipulator makes regardless of analytics

- `https://x.com/i/api/graphql/.../AboutAccountQuery` — to fetch the "About"
  tab for tweet authors. Uses your existing X session cookies, identical to
  what x.com itself does. Subject to X's normal rate limits.
- `https://huggingface.co/...`, `https://cdn-lfs.huggingface.co/...` — to
  download the local ML model weights on first use.
- `https://cdn.jsdelivr.net/...` — to load the Hugging Face Transformers.js
  library on first use.

These are required for core functionality.

---

## Children

Manipulator is not directed at children under 13 and does not knowingly
collect any data from them.

---

## Changes to this policy

This file is the source of truth. If the policy changes, this file is
updated and the new version is bundled in the next extension release.

---

## Contact

Open an issue at the extension's source repository.
