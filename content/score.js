const SCORE_WEIGHTS = {
  pureClipBait: 0.86,          // video + emoji-only / no real text
  clickBait: 0.13,
  videoNarration: 0.17,
  manipulatorRep: 0.16,        // per-handle history of manipulative posts
  thematicHandle: 0.3,
  viralReach: 0.09,            // view count >= 50K
  engagementBait: 0.07,
  isVideo: 0.2,
  emotionalPunctuation: 0.04,
  cliffhanger: 0.03,
  isForYou: 0.03,
  mlThemedHandle: 0.10,        // ML zero-shot: account is a themed clip-farm
  mlVideoNarration: 0.10,      // ML zero-shot: text describes video content
};

const SCORE_LABELS = {
  pureClipBait: 'Pure clip bait',
  clickBait: 'Click bait',
  videoNarration: 'Video narration',
  manipulatorRep: 'Handle reputation',
  thematicHandle: 'Thematic handle',
  viralReach: 'Viral reach',
  engagementBait: 'Engagement bait',
  isVideo: 'Has video',
  emotionalPunctuation: 'Emotional punctuation',
  cliffhanger: 'Cliffhanger',
  isForYou: 'On For You tab',
  mlThemedHandle: 'Themed handle (ML)',
  mlVideoNarration: 'Video narration (ML)',
  themedClipBoost: 'Themed-clip boost',
  verificationDeduction: 'Trust',
};

/** Bonus when ML detects BOTH a themed handle AND video-describing text on a video tweet. */
const THEMED_CLIP_BOOST_THRESHOLD = 0.6;
const THEMED_CLIP_BOOST_POINTS = 5;

/** Subtract from final score when poster has X gold (org) or grey (gov) check — not blue. */
const VERIFICATION_BADGE_SCORE_DEDUCTION = 5;

/** One decimal place on the 0–10 scale (avoids float dust). */
function roundScore1(x) {
  return Math.round(Number(x) * 10) / 10;
}

function combineScore({ heuristics, reputation, verificationBadgeKind, ml }) {
  const hasGoldOrGreyCheckmark =
    verificationBadgeKind === 'gold' || verificationBadgeKind === 'grey';
  const manipulatorRep = reputation?.score || 0;
  const mlThemedHandle = (ml && typeof ml.themedHandle === 'number') ? ml.themedHandle : 0;
  const mlVideoNarration = (ml && typeof ml.videoNarration === 'number') ? ml.videoNarration : 0;

  const values = {
    pureClipBait: heuristics.pureClipBait,
    clickBait: heuristics.clickBait,
    videoNarration: heuristics.videoNarration,
    manipulatorRep,
    thematicHandle: heuristics.thematicHandle,
    viralReach: heuristics.viralReach,
    engagementBait: heuristics.engagementBait,
    isVideo: heuristics.isVideo,
    emotionalPunctuation: heuristics.emotionalPunctuation,
    cliffhanger: heuristics.cliffhanger,
    isForYou: heuristics.isForYou,
    mlThemedHandle,
    mlVideoNarration,
  };

  // Per-signal contribution to the 0–10 score (in points)
  const contributions = {};
  let raw = 0;
  for (const k of Object.keys(SCORE_WEIGHTS)) {
    const w = SCORE_WEIGHTS[k];
    const v = values[k] || 0;
    raw += w * v;
    contributions[k] = w * v * 10;
  }

  // Map raw [0,1] → score [0,10] with a single decimal digit.
  let score = roundScore1(raw * 10);

  // Floor: any media post (video OR photo) with minimal text (pure emoji,
  // single word, or just a few words) is a clip/photo-farming pattern and
  // must score at least 6. Captures "so polite" + cat photo just as well
  // as "Royal family.." + video.
  const hasMedia = !!heuristics.hasMedia;
  let flooredBy = null;
  if (hasMedia && heuristics.pureClipBait >= 0.5 && score < 6) {
    score = 6;
    flooredBy = 'minimal-text media';
  }

  // Themed-clip boost: when ML says BOTH the handle is a themed clip-farm
  // brand AND the text is engagement-bait, AND there's media attached
  // → add +5 points. Captures both "Cats with Aura" + video narration AND
  // "No Context Cats" + cat photo + "so polite" patterns.
  let themedClipBoost = 0;
  if (
    hasMedia &&
    mlThemedHandle >= THEMED_CLIP_BOOST_THRESHOLD &&
    mlVideoNarration >= THEMED_CLIP_BOOST_THRESHOLD
  ) {
    themedClipBoost = THEMED_CLIP_BOOST_POINTS;
    score = roundScore1(score + themedClipBoost);
    contributions.themedClipBoost = themedClipBoost;
  }

  score = roundScore1(Math.min(score, 10));

  let verificationDeductionPoints = 0;
  if (hasGoldOrGreyCheckmark) {
    verificationDeductionPoints = VERIFICATION_BADGE_SCORE_DEDUCTION;
    score = roundScore1(Math.max(0, score - verificationDeductionPoints));
    contributions.verificationDeduction = -verificationDeductionPoints;
  }

  score = roundScore1(Math.max(0, score));
  if (score < 1) score = 0;

  return {
    score,
    breakdown: {
      ...values,
      verificationDeductionPoints,
      verificationBadgeKind,
      themedClipBoost,
    },
    contributions,
    flooredBy,
    themedClipBoost,
  };
}

window._manipulator_SCORE_LABELS = SCORE_LABELS;
