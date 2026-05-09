/** X blue check (~#1D9BF0); org/gold and government/grey use different fills. */
const X_BLUE_VERIFIED_RGB = { r: 29, g: 155, b: 240 };

function parseRgbFill(str) {
  if (!str || str === 'none' || str === 'transparent') return null;
  const s = String(str).trim();
  let m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const h = m[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  return null;
}

function rgbDist(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function isBlueVerifiedRgb(rgb) {
  return rgbDist(rgb, X_BLUE_VERIFIED_RGB) < 52;
}

function isGoldBadgeRgb(rgb) {
  if (isBlueVerifiedRgb(rgb)) return false;
  // X org gold / amber — tolerate branding variance & gradients flattened to one RGB.
  if (rgb.r >= 165 && rgb.g >= 115 && rgb.r + rgb.g > rgb.b * 1.2 && rgb.r >= rgb.b && rgb.g >= rgb.b) {
    return true;
  }
  return rgb.r >= 195 && rgb.g >= 145 && rgb.r + rgb.g > rgb.b * 1.45;
}

function isGreyBadgeRgb(rgb) {
  if (isBlueVerifiedRgb(rgb)) return false;
  const mx = Math.max(rgb.r, rgb.g, rgb.b);
  const mn = Math.min(rgb.r, rgb.g, rgb.b);
  if (mx - mn > 42) return false;
  return mx >= 65 && mx <= 195;
}

/** X sometimes paints checks via currentColor on SVG — sample ancestors + svg styles. */
function rgbFromPaintChain(el, stopEl) {
  for (let n = el; n && n !== stopEl; n = n.parentElement) {
    for (const attr of ['fill', 'stroke']) {
      const raw = n.getAttribute(attr);
      const rgb = parseRgbFill(raw);
      if (rgb && !isBlueVerifiedRgb(rgb)) return rgb;
    }
    try {
      const style = globalThis.getComputedStyle(n);
      for (const prop of ['color', 'fill']) {
        const rgb = parseRgbFill(style[prop]);
        if (rgb && !isBlueVerifiedRgb(rgb)) return rgb;
      }
    } catch (_) {}
  }
  return null;
}

function classifyNonBlueRgb(rgb) {
  if (isGoldBadgeRgb(rgb)) return 'gold';
  if (isGreyBadgeRgb(rgb)) return 'grey';
  return null;
}

/**
 * Gold (organizations) and grey (government) verification badges lower the
 * manipulation score; blue checks do not.
 * @returns {{ badgeKind: 'gold'|'grey'|'blue'|null }}
 */
function detectVerificationBadge(userNameRoot) {
  const none = { badgeKind: null };
  if (!userNameRoot) return none;

  const bits = [];
  try {
    userNameRoot.querySelectorAll('[aria-label],[title]').forEach(el => {
      bits.push(el.getAttribute('aria-label') || '', el.getAttribute('title') || '');
    });
  } catch (_) {}
  const blobRaw = (userNameRoot.innerText || '') + ' ' + bits.join(' ');
  const blob = blobRaw.toLowerCase();

  // Government / multilateral before generic "verified organization".
  if (
    blob.includes('government account') ||
    blob.includes('government organization') ||
    blob.includes('multilateral organization') ||
    blob.includes('multilateral account')
  ) {
    return { badgeKind: 'grey' };
  }

  if (
    blob.includes('verified organization') ||
    /\bverified\b.*\borganization\b|\borganization\b.*\bverified\b/i.test(blobRaw)
  ) {
    return { badgeKind: 'gold' };
  }

  // Turkish UI (and similar): verified organization strings.
  if (/doğrulanmış|dogrulanmis/i.test(blob) && /kuruluş|kurulus/i.test(blob)) {
    return { badgeKind: 'gold' };
  }
  if (/onaylı|onayli/i.test(blob) && /kuruluş|kurulus/i.test(blob)) {
    return { badgeKind: 'gold' };
  }

  let foundGold = false;
  let foundGrey = false;
  let foundBlue = false;

  function inspectSvg(svg) {
    let w = 24;
    let h = 24;
    try {
      const r = svg.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        w = r.width;
        h = r.height;
      }
    } catch (_) {}
    if (w > 36 || h > 36) return;

    const chainRgb = rgbFromPaintChain(svg, userNameRoot);
    if (chainRgb) {
      const kind = classifyNonBlueRgb(chainRgb);
      if (kind === 'gold') foundGold = true;
      else if (kind === 'grey') foundGrey = true;
    }

    try {
      const svgFill = parseRgbFill(globalThis.getComputedStyle(svg).fill);
      if (svgFill && !isBlueVerifiedRgb(svgFill)) {
        const kind = classifyNonBlueRgb(svgFill);
        if (kind === 'gold') foundGold = true;
        else if (kind === 'grey') foundGrey = true;
      }
    } catch (_) {}

    for (const node of svg.querySelectorAll('path, circle')) {
      let fill = node.getAttribute('fill');
      if (!fill || fill === 'currentColor') {
        try {
          fill = globalThis.getComputedStyle(node).fill;
        } catch (_) {
          fill = '';
        }
      }
      const rgb = parseRgbFill(fill);
      if (!rgb) continue;
      if (isBlueVerifiedRgb(rgb)) {
        foundBlue = true;
        continue;
      }
      if (isGoldBadgeRgb(rgb)) foundGold = true;
      else if (isGreyBadgeRgb(rgb)) foundGrey = true;
    }
  }

  try {
    userNameRoot.querySelectorAll('[data-testid="icon-verified"]').forEach(el => {
      const svg =
        el.tagName === 'SVG'
          ? el
          : el.closest('svg') || (el.querySelector && el.querySelector('svg'));
      if (svg) inspectSvg(svg);
    });
  } catch (_) {}

  for (const svg of userNameRoot.querySelectorAll('svg')) {
    inspectSvg(svg);
  }

  if (foundGold) return { badgeKind: 'gold' };
  if (foundGrey) return { badgeKind: 'grey' };
  if (foundBlue) return { badgeKind: 'blue' };

  return none;
}

/**
 * Prefer the main post permalink (usually the header link that wraps <time>), not
 * /analytics, embedded /i/status/, or other nested status URLs that appear first in DOM order.
 */
function pickPrimaryStatusPermalink(root) {
  if (!root?.querySelectorAll) return null;
  const anchors = Array.from(root.querySelectorAll('a[href*="/status/"]'));
  if (!anchors.length) return null;

  function rank(a) {
    const href = a.getAttribute('href') || '';
    const hasTime = !!a.querySelector('time');
    const analytics = /\/analytics/i.test(href);
    const iEmbed = /\/i\/status\//i.test(href);
    let score = 0;
    if (hasTime) score += 100;
    if (!analytics) score += 40;
    if (!iEmbed) score += 15;
    return score;
  }

  let best = anchors[0];
  let bestR = rank(best);
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i];
    const r = rank(a);
    if (r > bestR) {
      best = a;
      bestR = r;
    }
  }
  return best;
}

function fallbackTweetIdFromText(text) {
  const slice = Array.from(text || '')
    .slice(0, 64)
    .join('');
  let h = 5381;
  for (let i = 0; i < slice.length; i++) {
    h = ((h << 5) + h + slice.charCodeAt(i)) | 0;
  }
  return 'fb_' + (h >>> 0).toString(16);
}

function extractTweet(articleEl) {
  try {
    // Tweet text
    const textEl = articleEl.querySelector('[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText || textEl.textContent || '' : '';

    // Tweet ID from the primary status permalink (see pickPrimaryStatusPermalink)
    let id = null;
    try {
      const statusLink = pickPrimaryStatusPermalink(articleEl);
      if (statusLink) {
        const match = statusLink.getAttribute('href').match(/\/status\/(\d+)/);
        if (match) id = match[1];
      }
    } catch (_) {}

    if (!id) {
      id = fallbackTweetIdFromText(text);
    }

    // Author handle + display name
    let authorHandle = null;
    let displayName = null;
    let verificationBadgeKind = null;
    try {
      const userNameDiv = articleEl.querySelector('[data-testid="User-Name"]');
      const userNameEl = userNameDiv?.querySelector('a');
      if (userNameEl) {
        const href = userNameEl.getAttribute('href') || '';
        const parts = href.split('/').filter(Boolean);
        authorHandle = parts[parts.length - 1] || null;
      }
      // Display name is the text content of the User-Name container, before
      // the "@handle" and "·" separator (X concatenates them inline).
      if (userNameDiv) {
        const raw = userNameDiv.textContent || '';
        displayName = raw.split('@')[0].split('·')[0].trim() || null;
        verificationBadgeKind = detectVerificationBadge(userNameDiv).badgeKind;
      }
    } catch (_) {}

    // Has video — X uses several testids and structural patterns. Also
    // detect the duration overlay ("0:09") which appears on every video card.
    let hasVideo = false;
    try {
      if (
        articleEl.querySelector('video') ||
        articleEl.querySelector('[data-testid="videoPlayer"]') ||
        articleEl.querySelector('[data-testid="videoComponent"]') ||
        articleEl.querySelector('[data-testid="playButton"]') ||
        articleEl.querySelector('[data-testid="previewInterstitial"]') ||
        articleEl.querySelector('[aria-label*="Embedded video" i]') ||
        articleEl.querySelector('div[role="progressbar"]')
      ) {
        hasVideo = true;
      } else {
        // Duration overlay — small absolutely-positioned element with text like "0:09" or "1:23"
        const spans = articleEl.querySelectorAll('span');
        for (const s of spans) {
          if (/^\d{1,2}:\d{2}$/.test(s.textContent.trim())) { hasVideo = true; break; }
        }
      }
    } catch (_) {}

    // Location: try explicit place links X attaches, fall back to lang attr
    let location = null;
    try {
      // X sometimes links to a place search for geotagged tweets
      const placeLink = articleEl.querySelector(
        'a[href*="place%3A"], a[href*="/places/"], [data-testid="tweet-location"]'
      );
      if (placeLink) {
        location = { source: 'place', text: placeLink.textContent.trim() };
      } else {
        // Fall back to the lang attribute of the tweet text element
        const textEl = articleEl.querySelector('[data-testid="tweetText"]');
        const lang = textEl?.getAttribute('lang');
        if (lang) location = { source: 'lang', lang };
      }
    } catch (_) {}

    // View count — X renders it in the analytics link area
    let viewCount = null;
    try {
      // Try aria-label first (e.g. "1.2M views, view analytics")
      // then fall back to text content of the analytics anchor
      const candidates = [
        articleEl.querySelector('a[href$="/analytics"]'),
        articleEl.querySelector('[data-testid="analyticsButton"]'),
        ...Array.from(articleEl.querySelectorAll('[aria-label]')).filter(el =>
          /\d/.test(el.getAttribute('aria-label')) &&
          /view/i.test(el.getAttribute('aria-label'))
        ),
      ].filter(Boolean);

      for (const el of candidates) {
        const src = el.getAttribute('aria-label') || el.textContent || '';
        const parsed = parseViewCount(src);
        if (parsed !== null) { viewCount = parsed; break; }
      }
    } catch (_) {}

    return {
      id,
      text,
      authorHandle,
      displayName,
      hasVideo,
      location,
      viewCount,
      verificationBadgeKind,
    };
  } catch (_) {
    return null;
  }
}

window._manipulator_pickPrimaryStatusPermalink = pickPrimaryStatusPermalink;
