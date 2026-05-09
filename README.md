# Manipulator — Chrome Extension v0.1.0

Displays an **attention pressure score (0–10)** next to each tweet in X.com's **For You** timeline. Scoring is computed entirely in your browser — no data ever leaves your device.

---

## How it works

Each tweet is scored using a weighted combination of heuristics (engagement bait, emotional punctuation, cliffhangers, video signals, view reach, handle reputation, etc.). Hover the badge for a full breakdown.

---

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select this folder
4. Navigate to `https://x.com/home`

---

## File structure

```
manipulator/
├── manifest.json
├── content/
│   ├── page-world.js          # MAIN world: auth header capture for About query
│   ├── content.js             # MutationObserver, badge injection
│   ├── heuristics.js          # Rule-based signals
│   ├── tweet-extractor.js     # DOM parsing
│   ├── profile-location.js    # About account info (throttled + cached)
│   ├── reputation.js
│   ├── score.js               # Weighted formula
│   └── badge.css              # Badge + tooltip styles
└── icons/
```

---

## Known limitations

- **X DOM selectors break regularly.** `tweet-extractor.js` uses `data-testid` attributes that X may rename without notice. Check the console if badges stop appearing.
- **For You detection.** Relies on `role="tab"` + text "For you" — may break if X changes tab markup.
- **No Following/other-page filtering at the extension level** — the content script runs on all X pages but only adds badges on detected tweet articles. Pages without `article[data-testid="tweet"]` elements are unaffected.

---

## Recommended v2 next step

**Tune the scoring weights.** After using v1 on a real feed for a week, gather a small labeled sample (manually rate 50–100 tweets) and run a simple linear regression to replace the hand-picked weights in `score.js`. This will make scores feel calibrated rather than heuristic.
