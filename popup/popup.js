const STORAGE_KEY = 'manipulator_analytics';

async function init() {
  // Version label from manifest
  try {
    const m = chrome.runtime.getManifest();
    document.getElementById('version').textContent = `v${m.version}`;
  } catch (_) {}

  const data = await chrome.storage.local.get(STORAGE_KEY);
  const stored = data[STORAGE_KEY] || {};
  const optIn = stored.optIn === true;

  const toggle = document.getElementById('analytics-toggle');
  toggle.checked = optIn;
  updateStatus(optIn);

  toggle.addEventListener('change', async () => {
    const next = toggle.checked;
    const fresh = await chrome.storage.local.get(STORAGE_KEY);
    const obj = fresh[STORAGE_KEY] || {};
    obj.optIn = next;
    await chrome.storage.local.set({ [STORAGE_KEY]: obj });
    updateStatus(next);
  });

  document.getElementById('privacy-link').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('PRIVACY.md') });
  });

  document.getElementById('permissions-link').addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: chrome.runtime.getURL('PERMISSIONS.md') });
  });
}

function updateStatus(optIn) {
  const el = document.getElementById('analytics-status');
  el.textContent = optIn
    ? 'On — thanks for helping improve the extension.'
    : 'Off — nothing is sent.';
}

init();
