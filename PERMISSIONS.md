# Permission justifications — Chrome Web Store review

When you submit Manipulator to the Chrome Web Store, the dashboard will ask
you to justify each permission. Copy/paste from below.

---

## Single purpose
Surface attention-extraction scores for tweets on x.com so users can identify
manipulative or engagement-farmed content patterns at a glance.

---

## API permissions

### `storage`
Stores per-handle scoring history, the About-page cache (7-day TTL), and the
user's analytics opt-in preference. All values stay in `chrome.storage.local`
and are never transmitted unless the user explicitly enables analytics.

### `offscreen`
Hosts an offscreen document that runs a local zero-shot ML classifier
(`Xenova/nli-deberta-v3-xsmall`) via Hugging Face Transformers.js. Inference
happens entirely on-device. The offscreen document is required because
service workers in MV3 cannot run WebGPU/WASM ML pipelines reliably.

---

## Host permissions

### `https://x.com/*`, `https://twitter.com/*`
The extension is a content script for x.com / twitter.com. It injects the
scoring badge UI into tweet articles and reads the timeline DOM to extract
tweet text, handle, media presence, and view counts.

### `https://huggingface.co/*`, `https://*.huggingface.co/*`, `https://cdn-lfs.huggingface.co/*`
Used **once per install** to download the ML model weights
(`Xenova/nli-deberta-v3-xsmall`, ~70 MB). After first download the model is
cached in IndexedDB and no further requests are made to these hosts.

### `https://cdn.jsdelivr.net/*`
Used **once per install** to load the `@huggingface/transformers` JavaScript
library. Cached by the browser thereafter.

### `https://www.google-analytics.com/*`
**Optional and off by default.** Only contacted when the user explicitly
opts in to anonymous usage analytics via the extension popup. Sends
category-level events only — no tweet content, no handles, no PII.
See the bundled `PRIVACY.md` for a complete event list.

---

## Remote code

This extension does not execute remotely-hosted code in violation of the
Chrome Web Store policy.

- The ML model files (`Xenova/nli-deberta-v3-xsmall`) are ONNX **model weights**,
  not executable JavaScript. They are run by the bundled inference library.
- The Hugging Face Transformers.js library is loaded from `cdn.jsdelivr.net`.
  This is a third-party JS dependency. If your store reviewer flags this, you
  can vendor the library locally to fully eliminate remote-script loading.
  (See `offscreen/offscreen.js` for the import statement to replace.)

---

## Data handling disclosure (matches the listing form)

**Personally identifiable information:** Not collected.
**Health information:** Not collected.
**Financial / payment information:** Not collected.
**Authentication information:** Not collected.
**Personal communications:** Not collected.
**Location:** Not collected.
**Web history:** Not collected.
**User activity:** Yes (only when the user opts in) — clicks/hovers on the
extension's own UI elements and category-level scoring events. See
`PRIVACY.md` for the exact event schema.
**Website content:** Read locally (tweet text/metadata) for scoring; never
transmitted. The optional analytics never includes any of this content.

I do **not**:
- Sell or transfer user data to third parties (outside of Google Analytics
  for the opted-in usage events).
- Use or transfer user data for purposes unrelated to the extension's single
  purpose.
- Use or transfer user data to determine creditworthiness or for lending.
