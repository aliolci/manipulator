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

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
