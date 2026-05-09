// Parses "1.2M", "500K", "3,412", "1.2M views, view analytics", etc. → integer
function parseViewCount(text) {
  if (!text) return null;
  // Grab the first number-like token (digits, optional decimal, optional K/M/B suffix)
  const m = text.replace(/,/g, '').match(/([\d]+(?:\.[\d]+)?)\s*([KMBkmb]?)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const suffix = m[2].toUpperCase();
  if (suffix === 'K') n *= 1_000;
  if (suffix === 'M') n *= 1_000_000;
  if (suffix === 'B') n *= 1_000_000_000;
  return Math.round(n);
}

// X Creator monetisation pays roughly $3–$8 CPM (cost per 1 000 impressions)
// for ads shown to monetisation-eligible followers.
// We show a range to make the estimate honest.
const CPM_LOW  = 3;   // $/1 000 views
const CPM_HIGH = 8;

function estimateIncome(viewCount) {
  if (!viewCount || viewCount < 500) return null;
  const low  = (viewCount / 1000) * CPM_LOW;
  const high = (viewCount / 1000) * CPM_HIGH;
  return { low, high, views: viewCount };
}

function formatMoney(v) {
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return '$' + Math.round(v / 1_000) + 'k';
  return '$' + Math.round(v);
}

function incomeLabel(income) {
  if (!income) return null;
  return `${formatMoney(income.low)}–${formatMoney(income.high)}`;
}

function incomeTooltipText(income) {
  if (!income) return null;
  const views = income.views >= 1_000_000
    ? (income.views / 1_000_000).toFixed(1) + 'M'
    : income.views >= 1_000
      ? Math.round(income.views / 1_000) + 'K'
      : income.views.toString();
  return [
    `Est. creator earnings`,
    `• Views: ${views}`,
    `• Rate: $${CPM_LOW}–$${CPM_HIGH} CPM (X creator avg.)`,
    `• Range: ${formatMoney(income.low)} – ${formatMoney(income.high)}`,
  ].join('\n');
}
