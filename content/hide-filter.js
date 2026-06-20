(function () {
  'use strict';

  const DEFAULTS = {
    hideFilterEnabled: false,
    hideThreshold: 7.5,
  };

  let settings = { ...DEFAULTS };

  function formatScore1(score) {
    const s = Number(score).toFixed(1);
    return s.endsWith('.0') ? s.slice(0, -2) : s;
  }

  function levelFor(score) {
    if (score <= 4) return 'low';
    if (score > 7.5) return 'high';
    return 'medium';
  }

  function shouldHide(score) {
    return settings.hideFilterEnabled && score > settings.hideThreshold;
  }

  function getActionBar(articleEl) {
    return (
      articleEl.querySelector('[data-testid="reply"]')?.closest('[role="group"]') ||
      articleEl.querySelector('[data-testid="like"]')?.closest('[role="group"]') ||
      null
    );
  }

  function getUserNameEl(articleEl) {
    return articleEl.querySelector('[data-testid="User-Name"]');
  }

  /** Tweet stack: author row stays visible; overlay covers text + media only. */
  function getTweetCoverTarget(articleEl) {
    const userName = getUserNameEl(articleEl);
    const actionBar = getActionBar(articleEl);

    if (userName) {
      let column = userName.parentElement;
      while (column && column !== articleEl) {
        const hasAction = actionBar && column.contains(actionBar);
        const hasAuthor = column.contains(userName);
        if (hasAuthor && (hasAction || !actionBar)) {
          return { container: column, userName, actionBar };
        }
        column = column.parentElement;
      }
    }

    const region = getTweetContentRegion(articleEl);
    if (!region) return null;
    return { container: region, userName: null, actionBar: null };
  }

  function layoutHideZone(zone, container, userName, actionBar) {
    const containerRect = container.getBoundingClientRect();

    let top = 0;
    if (userName && container.contains(userName)) {
      top = Math.max(0, userName.getBoundingClientRect().bottom - containerRect.top);
    }

    let bottom = 0;
    if (actionBar && container.contains(actionBar)) {
      bottom = Math.max(0, containerRect.bottom - actionBar.getBoundingClientRect().top);
    }

    zone.style.top = `${top}px`;
    zone.style.right = '0';
    zone.style.bottom = `${bottom}px`;
    zone.style.left = '0';
  }

  /** Largest block containing tweet text + media, but not the action bar or author row. */
  function getTweetContentRegion(articleEl) {
    const userName = getUserNameEl(articleEl);
    const actionBar = getActionBar(articleEl);
    const contentSelectors = [
      '[data-testid="tweetText"]',
      '[data-testid="tweetPhoto"]',
      '[data-testid="videoPlayer"]',
      '[data-testid="videoComponent"]',
      '[data-testid="previewInterstitial"]',
      '[data-testid="card.wrapper"]',
      '[data-testid="quoteTweet"]',
    ];

    const anchors = contentSelectors
      .map((sel) => articleEl.querySelector(sel))
      .filter((el) => el && (!actionBar || !actionBar.contains(el)));

    if (!anchors.length) return null;

    let region = anchors[0];
    for (const anchor of anchors.slice(1)) {
      while (region && !region.contains(anchor)) {
        region = region.parentElement;
      }
      if (!region) return null;
    }

    // Expand upward so text, images, video, and cards share one cover box.
    while (region.parentElement && region.parentElement !== articleEl) {
      const parent = region.parentElement;
      if (actionBar && parent.contains(actionBar)) break;
      if (userName && parent.contains(userName)) break;
      if (anchors.every((a) => parent.contains(a))) region = parent;
      else break;
    }

    return region;
  }

  function removeHideOverlay(articleEl) {
    articleEl.querySelectorAll('.manipulator-content-region').forEach((region) => {
      region.classList.remove('manipulator-content-region');
      region.querySelector('.manipulator-hide-zone')?.remove();
    });
    delete articleEl.dataset.manipulatorScore;
  }

  function applyHideOverlay(articleEl, score) {
    if (!shouldHide(score)) {
      removeHideOverlay(articleEl);
      return;
    }

    removeHideOverlay(articleEl);

    const target = getTweetCoverTarget(articleEl);
    if (!target) return;

    const { container, userName, actionBar } = target;

    articleEl.dataset.manipulatorScore = String(score);
    container.classList.add('manipulator-content-region');

    let zone = container.querySelector('.manipulator-hide-zone');
    if (!zone) {
      zone = document.createElement('div');
      zone.className = 'manipulator-hide-zone';
      zone.setAttribute('aria-label', `Tweet hidden — score ${formatScore1(score)} out of 10. Hover to reveal.`);

      const overlay = document.createElement('div');
      overlay.className = 'manipulator-hide-overlay';
      overlay.setAttribute('aria-hidden', 'true');

      const badge = document.createElement('span');
      badge.className = 'manipulator-hide-overlay__badge';
      overlay.appendChild(badge);
      zone.appendChild(overlay);
      container.appendChild(zone);
    }

    layoutHideZone(zone, container, userName, actionBar);

    const badge = zone.querySelector('.manipulator-hide-overlay__badge');
    badge.setAttribute('data-level', levelFor(score));
    badge.textContent = `${formatScore1(score)}/10`;
    zone.setAttribute('aria-label', `Tweet hidden — score ${formatScore1(score)} out of 10. Hover to reveal.`);
  }

  function reportHiddenCount() {
    const count = settings.hideFilterEnabled
      ? document.querySelectorAll('.manipulator-hide-overlay').length
      : 0;
    try {
      chrome.runtime.sendMessage({ type: 'HIDDEN_COUNT', count });
    } catch (_) {}
  }

  function refreshAllScoredTweets(getScoreForRoot) {
    if (typeof getScoreForRoot !== 'function') return;

    document.querySelectorAll('[data-manipulator-score]').forEach((el) => {
      if (!el.isConnected) removeHideOverlay(el);
    });

    const roots = typeof window._manipulator_collectTweetRoots === 'function'
      ? window._manipulator_collectTweetRoots(document.querySelector('main[role="main"]') || document.body)
      : [];

    for (const root of roots) {
      const score = getScoreForRoot(root);
      if (score == null) {
        removeHideOverlay(root);
        continue;
      }
      applyHideOverlay(root, score);
    }
    reportHiddenCount();
  }

  async function loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(DEFAULTS);
      settings = {
        hideFilterEnabled: !!stored.hideFilterEnabled,
        hideThreshold: Number(stored.hideThreshold ?? DEFAULTS.hideThreshold),
      };
    } catch (_) {
      settings = { ...DEFAULTS };
    }
  }

  function init(getScoreForRoot) {
    void loadSettings().then(() => refreshAllScoredTweets(getScoreForRoot));

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.hideFilterEnabled) {
        settings.hideFilterEnabled = !!changes.hideFilterEnabled.newValue;
      }
      if (changes.hideThreshold) {
        settings.hideThreshold = Number(changes.hideThreshold.newValue ?? DEFAULTS.hideThreshold);
      }
      refreshAllScoredTweets(getScoreForRoot);
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg?.type === 'REQUEST_HIDDEN_COUNT') reportHiddenCount();
    });
  }

  window._manipulator_applyHideFilter = function (articleEl, score) {
    applyHideOverlay(articleEl, score);
    reportHiddenCount();
  };

  window._manipulator_initHideFilter = init;
})();
