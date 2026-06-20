const STORAGE_KEYS = {
  enabled: 'hideFilterEnabled',
  threshold: 'hideThreshold',
};

const DEFAULTS = {
  hideFilterEnabled: false,
  hideThreshold: 7.5,
};

const enabledEl = document.getElementById('hide-enabled');
const thresholdEl = document.getElementById('hide-threshold');
const valueEl = document.getElementById('threshold-value');
const panelEl = document.getElementById('slider-panel');

function formatThreshold(n) {
  const s = Number(n).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

function updateValueDisplay() {
  valueEl.textContent = formatThreshold(thresholdEl.value);
}

function setPanelDisabled(disabled) {
  panelEl.classList.toggle('is-disabled', disabled);
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULTS);
  enabledEl.checked = !!stored.hideFilterEnabled;
  thresholdEl.value = String(stored.hideThreshold ?? DEFAULTS.hideThreshold);
  updateValueDisplay();
  setPanelDisabled(!enabledEl.checked);
}

async function saveSettings() {
  const hideFilterEnabled = enabledEl.checked;
  const hideThreshold = parseFloat(thresholdEl.value);
  await chrome.storage.sync.set({ hideFilterEnabled, hideThreshold });
  setPanelDisabled(!hideFilterEnabled);
}

enabledEl.addEventListener('change', () => { void saveSettings(); });
thresholdEl.addEventListener('input', () => {
  updateValueDisplay();
  void saveSettings();
});

void loadSettings();
