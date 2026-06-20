// Background SW: ensures the offscreen ML doc exists and proxies CLASSIFY_TWEET
// messages from content scripts to it.
let creating = null;

async function ensureOffscreen() {
  if (await chrome.offscreen.hasDocument()) return;
  if (creating) { await creating; return; }
  creating = chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['DOM_SCRAPING'],
    justification: 'Run local zero-shot classifier for tweet manipulation scoring',
  });
  await creating;
  creating = null;
}

function setHiddenBadge(tabId, count) {
  const text = count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ tabId, text });
  if (count > 0) {
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#c62828' });
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.sendMessage(tabId, { type: 'REQUEST_HIDDEN_COUNT' }).catch(() => {
    setHiddenBadge(tabId, 0);
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'HIDDEN_COUNT') {
    const tabId = sender.tab?.id;
    if (tabId != null) setHiddenBadge(tabId, msg.count || 0);
    return false;
  }

  if (msg?.type !== 'CLASSIFY_TWEET') return false;

  (async () => {
    try {
      await ensureOffscreen();
      const result = await chrome.runtime.sendMessage({
        type: 'CLASSIFY_TWEET_OFFSCREEN',
        target: 'offscreen',
        handle: msg.handle,
        displayName: msg.displayName,
        text: msg.text,
      });
      sendResponse(result);
    } catch (err) {
      sendResponse({ error: String(err) });
    }
  })();

  return true; // keep channel open for async response
});
