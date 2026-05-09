// Maps BCP-47 language codes to { code: ISO-3166-1 alpha-2, label }
// English is intentionally absent — too ambiguous (US/UK/AU/CA/etc.)
const LANG_MAP = {
  tr: { code: 'TR', label: 'Turkey' },
  ja: { code: 'JP', label: 'Japan' },
  ko: { code: 'KR', label: 'Korea' },
  de: { code: 'DE', label: 'Germany' },
  fr: { code: 'FR', label: 'France' },
  es: { code: 'ES', label: 'Spain' },
  it: { code: 'IT', label: 'Italy' },
  pt: { code: 'BR', label: 'Brazil/Portugal' },
  ru: { code: 'RU', label: 'Russia' },
  ar: { code: 'SA', label: 'Arabic region' },
  zh: { code: 'CN', label: 'China' },
  nl: { code: 'NL', label: 'Netherlands' },
  pl: { code: 'PL', label: 'Poland' },
  sv: { code: 'SE', label: 'Sweden' },
  no: { code: 'NO', label: 'Norway' },
  nb: { code: 'NO', label: 'Norway' },
  da: { code: 'DK', label: 'Denmark' },
  fi: { code: 'FI', label: 'Finland' },
  hi: { code: 'IN', label: 'India' },
  id: { code: 'ID', label: 'Indonesia' },
  ms: { code: 'MY', label: 'Malaysia' },
  th: { code: 'TH', label: 'Thailand' },
  vi: { code: 'VN', label: 'Vietnam' },
  uk: { code: 'UA', label: 'Ukraine' },
  he: { code: 'IL', label: 'Israel' },
  cs: { code: 'CZ', label: 'Czech Republic' },
  ro: { code: 'RO', label: 'Romania' },
  hu: { code: 'HU', label: 'Hungary' },
  el: { code: 'GR', label: 'Greece' },
  bg: { code: 'BG', label: 'Bulgaria' },
  hr: { code: 'HR', label: 'Croatia' },
  sk: { code: 'SK', label: 'Slovakia' },
  lt: { code: 'LT', label: 'Lithuania' },
  lv: { code: 'LV', label: 'Latvia' },
  et: { code: 'EE', label: 'Estonia' },
  fa: { code: 'IR', label: 'Iran' },
  ur: { code: 'PK', label: 'Pakistan' },
  bn: { code: 'BD', label: 'Bangladesh' },
  ta: { code: 'IN', label: 'India' },
  te: { code: 'IN', label: 'India' },
  ml: { code: 'IN', label: 'India' },
  mr: { code: 'IN', label: 'India' },
  gu: { code: 'IN', label: 'India' },
  pa: { code: 'IN', label: 'India' },
  sr: { code: 'RS', label: 'Serbia' },
  ca: { code: 'ES', label: 'Catalonia/Spain' },
  eu: { code: 'ES', label: 'Basque/Spain' },
  gl: { code: 'ES', label: 'Galicia/Spain' },
  af: { code: 'ZA', label: 'South Africa' },
  sw: { code: 'KE', label: 'Kenya' },
  am: { code: 'ET', label: 'Ethiopia' },
};

function countryCodeToFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  const base = 0x1F1E6 - 65; // 🇦 is U+1F1E6; 'A' is 65
  return String.fromCodePoint(
    base + cc.toUpperCase().charCodeAt(0),
    base + cc.toUpperCase().charCodeAt(1)
  );
}

function resolveLocation(location) {
  if (!location) return null;

  if (location.source === 'place' && location.text) {
    return { flag: '📍', label: location.text };
  }

  if (location.source === 'lang' && location.lang) {
    const base = location.lang.split('-')[0].toLowerCase();
    if (base === 'en') return { flag: '🌐', label: 'English' };
    const entry = LANG_MAP[base];
    if (entry) return { flag: countryCodeToFlag(entry.code), label: entry.label };
  }

  return null;
}
