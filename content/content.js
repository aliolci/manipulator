(function () {
  'use strict';

  const seenIds = new Set();
  /**
   * Per-tweet score cache so re-rendered articles (virtual scroll re-mount)
   * get a badge instantly without re-running ML/heuristics.
   * Keyed by tweet id.
   */
  const scoreCache = new Map();
  /** Retries when `time`/anchor isn’t in the DOM yet (virtualized feed hydration). */
  const _badgeInjectAttempts = new WeakMap();
  let isForYou = false;
  let tooltipEl = null;

  // ── Tooltip ──────────────────────────────────────────────────────────────

  function getTooltip() {
    if (!tooltipEl) {
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'manipulator-tooltip';
      tooltipEl.style.display = 'none';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }

  function showTooltip(badge, content) {
    const tip = getTooltip();
    const lines = content.split('\n');
    tip.innerHTML = '';

    const title = document.createElement('span');
    title.className = 'manipulator-tooltip-title';
    title.textContent = lines[0];
    tip.appendChild(title);

    function isSectionTitle(line) {
      if (line === 'Driven by:' || line === 'This Post:') return true;
      return /^About @.+:$/.test(line);
    }

    if (lines.length > 1) {
      const fragment = document.createDocumentFragment();
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (i > 1) fragment.appendChild(document.createTextNode('\n'));
        if (isSectionTitle(line)) {
          const span = document.createElement('span');
          span.className = 'manipulator-tooltip-section-title';
          span.textContent = line;
          fragment.appendChild(span);
        } else {
          fragment.appendChild(document.createTextNode(line));
        }
      }
      tip.appendChild(fragment);
    }
    tip.style.display = 'block';
    positionTooltip(badge);
  }

  function hideTooltip() {
    const tip = getTooltip();
    tip.style.display = 'none';
  }

  function positionTooltip(badge) {
    const tip = getTooltip();
    const rect = badge.getBoundingClientRect();
    const tipW = 260;
    const gap = 8;
    let left = rect.left;
    let top = rect.top - tip.offsetHeight - gap;

    if (left + tipW > window.innerWidth) left = window.innerWidth - tipW - 8;
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + gap;

    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  // ── Badge injection ──────────────────────────────────────────────────────

  function levelFor(score) {
    if (score <= 4) return 'low';
    if (score > 7.5) return 'high';
    return 'medium';
  }

  /** Display pressure score with at most one decimal; whole numbers omit “.0”. */
  function formatScore1(score) {
    if (score === null || score === undefined) return '…';
    const s = Number(score).toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  }

  function connectedViaLabel(connectedVia) {
    if (!connectedVia) return null;
    const v = connectedVia.toLowerCase();
    if (v.includes('app store')) return '📱 iPhone';
    if (v.includes('play store') || v.includes('android')) return '📱 Android';
    if (v.includes('web')) return '🌐 Web';
    return null;
  }

  function buildTooltipText(score, breakdown, contributions, income, aboutInfo, handle, reputation) {
    const pct = v => Math.round((v || 0) * 100) + '%';
    const pt = v => {
      const x = v || 0;
      const a = Math.abs(x);
      if (a < 0.05) return '';
      if (x < 0) return ` −${a.toFixed(1)}pt`;
      return ` +${a.toFixed(1)}pt`;
    };
    const scoreLabels = window._manipulator_SCORE_LABELS || {};
    const lines = [`Pressure score: ${formatScore1(score)}/10`];
    if (breakdown?.flooredBy) {
      lines.push(`Floored to 6 (${breakdown.flooredBy})`);
    }

    const signalRow = (key, valueDisplay) => {
      const c = contributions?.[key] || 0;
      const label = scoreLabels[key] || key;
      return `• ${label}: ${valueDisplay}${pt(c)}`;
    };
    const badgeDeductionLabel =
      breakdown?.verificationBadgeKind === 'gold'
        ? 'Verified organization'
        : breakdown?.verificationBadgeKind === 'grey'
          ? 'Government'
          : 'Gold or grey checkmark';
    const rows = [
      ['pureClipBait', pct(breakdown.pureClipBait)],
      ['clickBait', pct(breakdown.clickBait)],
      ['videoNarration', pct(breakdown.videoNarration)],
      ['mlVideoNarration', pct(breakdown.mlVideoNarration)],
      ['mlThemedHandle', pct(breakdown.mlThemedHandle)],
      ['manipulatorRep', pct(breakdown.manipulatorRep)],
      ['thematicHandle', pct(breakdown.thematicHandle)],
      ['viralReach', pct(breakdown.viralReach)],
      ['engagementBait', pct(breakdown.engagementBait)],
      ['isVideo', breakdown.isVideo ? 'yes' : 'no'],
      ['emotionalPunctuation', pct(breakdown.emotionalPunctuation)],
      ['cliffhanger', breakdown.cliffhanger ? 'yes' : 'no'],
      ['isForYou', breakdown.isForYou ? 'yes' : 'no'],
    ];
    if (contributions?.themedClipBoost) {
      rows.push(['themedClipBoost', 'fired']);
    }
    if (contributions?.verificationDeduction) {
      rows.push(['verificationDeduction', badgeDeductionLabel]);
    }
    if (contributions?.accountAgeDeduction) {
      const yrs = breakdown?.accountAgeYears;
      const label = (yrs != null) ? `${Math.floor(yrs)}y` : 'long-lived account';
      rows.push(['accountAgeDeduction', label]);
    }
    const rowsFiltered = rows
      .filter(([k]) => Math.abs(contributions?.[k] || 0) >= 0.05)
      .sort(
        (a, b) =>
          Math.abs(contributions?.[b[0]] || 0) - Math.abs(contributions?.[a[0]] || 0)
      );

    if (rowsFiltered.length) {
      lines.push('Driven by:');
      for (const [k, v] of rowsFiltered) lines.push(signalRow(k, v));
    }

    // About <handle>: poster identity + reputation history
    const aboutLines = [];
    const BADGE_ACCOUNT_TYPE = {
      gold: 'Verified organization',
      grey: 'Government',
      blue: 'X Premium paid user',
    };
    const bk = breakdown?.verificationBadgeKind;
    if (bk && BADGE_ACCOUNT_TYPE[bk]) {
      aboutLines.push(`• Account type: ${BADGE_ACCOUNT_TYPE[bk]}`);
    }
    if (reputation && reputation.count >= 1) {
      aboutLines.push(`• History: ${reputation.count} tweets, avg ${reputation.avg.toFixed(1)}/10`);
    }
    if (aboutInfo) {
      if (aboutInfo.accountBasedIn) {
        const country = extractCountryFromText(aboutInfo.accountBasedIn);
        const flag = country?.flag ? country.flag + ' ' : '';
        aboutLines.push(`• Origin: ${flag}${aboutInfo.accountBasedIn}`);
      }
      if (aboutInfo.dateJoined) aboutLines.push(`• Date joined: ${aboutInfo.dateJoined}`);
      if (aboutInfo.verifiedSince) aboutLines.push(`• Verified since: ${aboutInfo.verifiedSince}`);
    }
    if (aboutLines.length) {
      lines.push(`About @${handle || 'poster'}:`);
      lines.push(...aboutLines);
    }

    // This Post: per-post stats
    const postLines = [];
    if (income) {
      const views = income.views >= 1_000_000
        ? (income.views / 1_000_000).toFixed(1) + 'M'
        : income.views >= 1_000
          ? Math.round(income.views / 1_000) + 'K'
          : income.views.toString();
      postLines.push(`• Views: ${views}`);
      postLines.push(`• Est. earnings: 💰 ${incomeLabel(income)}`);
    }
    const via = connectedViaLabel(aboutInfo?.connectedVia);
    if (via) postLines.push(`• Posted via: ${via}`);
    if (postLines.length) {
      lines.push('This Post:');
      lines.push(...postLines);
    }

    return lines.join('\n');
  }

  // Store tooltip text on the badge element itself so it can be updated
  // asynchronously (e.g. after profile location fetch) without replacing listeners.
  function attachTooltip(badge) {
    badge.addEventListener('mouseenter', () => {
      if (badge._tip) showTooltip(badge, badge._tip);
    });
    badge.addEventListener('mouseleave', hideTooltip);
    badge.addEventListener('mousemove', () => positionTooltip(badge));
  }

  function setTooltip(badge, score, breakdown, contributions, income, aboutInfo, handle, reputation) {
    badge._tip = buildTooltipText(score, breakdown, contributions, income, aboutInfo, handle, reputation);
  }

  function badgeLabel(score, countryFlag) {
    const scoreStr = `${formatScore1(score)}/10`;
    return countryFlag ? `${countryFlag} ${scoreStr}` : scoreStr;
  }

  function injectBadge(tweetRootEl) {
    const badge = document.createElement('span');
    badge.className = 'manipulator-badge manipulator-badge--loading';
    badge.setAttribute('data-level', 'low');
    badge.setAttribute('role', 'status');
    badge.setAttribute('aria-label', 'Attention pressure score: loading');
    // Animated dots come from CSS (::after content keyframes). Leave the
    // element empty so the pseudo-element is the only visible content.
    badge.textContent = '';
    attachTooltip(badge);

    try {
      const pick = window._manipulator_pickPrimaryStatusPermalink;
      const permalink = pick ? pick(tweetRootEl) : null;
      let anchor = permalink;
      if (!permalink?.querySelector('time')) {
        let timeEl = tweetRootEl.querySelector('a[href*="/status/"] time') || tweetRootEl.querySelector('time');
        anchor = timeEl?.closest('a') || timeEl?.parentElement || permalink;
      }
      if (!anchor) {
        anchor =
          tweetRootEl.querySelector('a[href*="/status/"]:not([href*="/analytics"])') ||
          tweetRootEl.querySelector('a[href*="/status/"]');
      }
      if (anchor) {
        anchor.insertAdjacentElement('afterend', badge);
      } else {
        const userName = tweetRootEl.querySelector('[data-testid="User-Name"]');
        if (userName) userName.insertAdjacentElement('afterend', badge);
        else return null;
      }
    } catch (_) { return null; }

    return badge;
  }

  /**
   * X sometimes omits `article` and uses `div[data-testid="tweet"]` or a bare
   * `cellInnerDiv` wrapper. Gather every plausible tweet root under `node`.
   */
  function collectTweetRoots(node) {
    const roots = new Set();
    const add = el => {
      if (el && el.nodeType === 1) roots.add(el);
    };

    if (!(node instanceof Element)) return [];

    if (node.matches('article[data-testid="tweet"]')) add(node);
    if (node.matches('[data-testid="tweet"]')) add(node);

    node.querySelectorAll('article[data-testid="tweet"]').forEach(add);
    node.querySelectorAll('[data-testid="tweet"]').forEach(add);

    node.querySelectorAll('[data-testid="tweetText"]').forEach(textEl => {
      const tweetArticle =
        textEl.closest('article[data-testid="tweet"]') ||
        textEl.closest('[data-testid="tweet"]');
      if (tweetArticle) {
        add(tweetArticle);
        return;
      }
      const cell = textEl.closest('[data-testid="cellInnerDiv"]');
      if (cell) {
        add(cell);
        return;
      }
      let p = textEl.parentElement;
      for (let d = 0; p && d < 26; d++, p = p.parentElement) {
        if (!p.querySelector || !p.contains(textEl)) break;
        if (!p.querySelector('a[href*="/status/"]')) continue;
        if (!p.querySelector('[data-testid="User-Name"]')) continue;
        const texts = p.querySelectorAll('[data-testid="tweetText"]');
        if (texts.length < 1) continue;
        add(p);
        break;
      }
    });

    return [...roots];
  }

  function updateBadge(badge, score, breakdown, contributions, income, aboutInfo, handle, reputation) {
    if (!badge) return;
    const country = aboutInfo?.accountBasedIn ? extractCountryFromText(aboutInfo.accountBasedIn) : null;
    badge.classList.remove('manipulator-badge--loading');
    badge.setAttribute('data-level', levelFor(score));
    badge.setAttribute('aria-label', `Attention pressure score: ${formatScore1(score)} out of 10`);
    badge.textContent = badgeLabel(score, country?.flag);
    setTooltip(badge, score, breakdown, contributions, income, aboutInfo, handle, reputation);
  }

  // ── For You detection ────────────────────────────────────────────────────

  function detectForYou() {
    try {
      const tabs = document.querySelectorAll('[role="tab"]');
      for (const tab of tabs) {
        if (
          tab.getAttribute('aria-selected') === 'true' &&
          /for you/i.test(tab.textContent)
        ) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // ── Process a single tweet article ──────────────────────────────────────

  function scheduleBadgeRetry(articleEl) {
    const n = (_badgeInjectAttempts.get(articleEl) || 0) + 1;
    if (n > 30) return;
    _badgeInjectAttempts.set(articleEl, n);
    const delay = Math.min(40 + n * 25, 500);
    setTimeout(() => {
      if (!articleEl.isConnected) return;
      processTweet(articleEl);
    }, delay);
  }

  // ── ML bridge ────────────────────────────────────────────────────────────

  function classifyTweet({ handle, displayName, text }) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'CLASSIFY_TWEET', handle, displayName, text },
          (resp) => {
            if (chrome.runtime.lastError) {
              resolve({ themedHandle: 0, videoNarration: 0 });
            } else {
              resolve(resp || { themedHandle: 0, videoNarration: 0 });
            }
          },
        );
      } catch (_) {
        resolve({ themedHandle: 0, videoNarration: 0 });
      }
    });
  }

  function processTweet(articleEl) {
    try {
      const tweetData = extractTweet(articleEl);
      if (!tweetData) return;

      // Already badged this DOM element? Nothing to do.
      if (articleEl.querySelector('.manipulator-badge')) {
        seenIds.add(tweetData.id);
        return;
      }

      // Re-rendered tweet (X virtual-scroll re-mount): we have cached score,
      // just inject a fresh badge with the cached data — no re-classification.
      if (scoreCache.has(tweetData.id)) {
        const cached = scoreCache.get(tweetData.id);
        const badge = injectBadge(articleEl);
        if (!badge) { scheduleBadgeRetry(articleEl); return; }
        _badgeInjectAttempts.delete(articleEl);
        const handleKey = cached.handle ? cached.handle.toLowerCase() : '';
        const aboutInfo = handleKey && window._profileCache?.has(handleKey)
          ? window._profileCache.get(handleKey)
          : null;
        updateBadge(
          badge, cached.score, cached.breakdown, cached.contributions,
          cached.income, aboutInfo, cached.handle, cached.reputation,
        );
        return;
      }

      // First-time-seen ID, but already being processed asynchronously by another
      // article instance — retry so we can pick up the cached score once it lands.
      if (seenIds.has(tweetData.id)) {
        scheduleBadgeRetry(articleEl);
        return;
      }

      const meta = {
        isVideo: tweetData.hasVideo,
        hasImage: tweetData.hasImage,
        hasMedia: tweetData.hasMedia,
        isForYou,
        authorHandle: tweetData.authorHandle,
        displayName: tweetData.displayName,
        viewCount: tweetData.viewCount,
      };
      const heuristics = computeHeuristics(tweetData.text, meta);
      const income = estimateIncome(tweetData.viewCount);

      const badge = injectBadge(articleEl);
      if (!badge) {
        scheduleBadgeRetry(articleEl);
        return;
      }

      seenIds.add(tweetData.id);
      _badgeInjectAttempts.delete(articleEl);

      const handle = tweetData.authorHandle;
      const tweetId = tweetData.id;

      void (async () => {
        const reputation = window._manipulator_getHandleReputation
          ? window._manipulator_getHandleReputation(handle)
          : { score: 0, count: 0, avg: 0 };

        const ml = await classifyTweet({
          handle,
          displayName: tweetData.displayName,
          text: tweetData.text,
        });

        // If we already have About data cached for this handle, fold it into
        // the initial scoring so the age deduction applies immediately.
        const handleKey = handle ? handle.toLowerCase() : '';
        const cachedInfo = handleKey && window._profileCache.has(handleKey)
          ? window._profileCache.get(handleKey)
          : null;

        const scoreWith = (aboutInfo) => {
          const out = combineScore({
            heuristics,
            reputation,
            verificationBadgeKind: tweetData.verificationBadgeKind,
            ml,
            aboutInfo,
          });
          out.breakdown.flooredBy = out.flooredBy;
          return out;
        };

        let { score, breakdown, contributions } = scoreWith(cachedInfo);

        if (handle && window._manipulator_recordScore) {
          window._manipulator_recordScore(handle, score);
        }

        // Cache so future re-renders of this tweet can re-inject without recomputing.
        scoreCache.set(tweetId, {
          score, breakdown, contributions, income, handle, reputation,
        });

        updateBadge(badge, score, breakdown, contributions, income, cachedInfo, handle, reputation);

        if (handleKey && !window._profileCache.has(handleKey)) {
          getProfileLocation(handle).then(aboutInfo => {
            if (!badge.isConnected) return;
            // Re-score with the now-known account age, then refresh the badge
            // + cache. Reputation isn't re-recorded — we already booked it.
            const refreshed = scoreWith(aboutInfo);
            score = refreshed.score;
            breakdown = refreshed.breakdown;
            contributions = refreshed.contributions;
            scoreCache.set(tweetId, {
              score, breakdown, contributions, income, handle, reputation,
            });
            updateBadge(badge, score, breakdown, contributions, income, aboutInfo, handle, reputation);
          });
        }
      })();
    } catch (_) {}
  }

  // ── MutationObserver ─────────────────────────────────────────────────────

  function handleMutations(mutations) {
    try {
      const todo = new Set();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          for (const root of collectTweetRoots(node)) todo.add(root);
        }
      }
      for (const root of todo) processTweet(root);
    } catch (_) {}
  }

  function startObserver() {
    const main = document.querySelector('main[role="main"]') || document.body;
    const observer = new MutationObserver(handleMutations);
    observer.observe(main, { childList: true, subtree: true });
    const existing = collectTweetRoots(main);
    for (const root of existing) processTweet(root);
  }

  // ── Tab change detection ─────────────────────────────────────────────────

  function watchTabChanges() {
    document.addEventListener('click', (e) => {
      try {
        const tab = e.target.closest('[role="tab"]');
        if (tab) {
          // Re-evaluate after the DOM settles
          setTimeout(() => { isForYou = detectForYou(); }, 300);
        }
      } catch (_) {}
    }, true);
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    isForYou = detectForYou();
    startObserver();
    watchTabChanges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
