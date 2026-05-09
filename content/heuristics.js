const ENGAGEMENT_BAIT_PHRASES = [
  // Direct interaction prompts
  'like if you agree', 'like and retweet', 'like and share',
  'retweet if', 'rt if', 'rt to', 'rt this',
  'share if', 'share this', 'reply with', 'reply if',
  'tag someone who', 'tag a friend', 'tag yourself',
  'comment below', 'comments below', 'drop a', 'drop your',
  'name a better', 'name one', 'name a more iconic',
  'follow for more', 'follow me for', 'turn on notifications',
  'quote tweet', 'quote with', 'quote this',
  'who else', 'who agrees', 'who else thinks',
  'am i the only', "am i the only one", 'is it just me',
  "tell me i'm not", 'change my mind', 'prove me wrong',
  'fight me', "don't @ me", 'don’t @ me', "don't quote me",
  // Faux-secret / forbidden-knowledge framing
  "most people don't know", "nobody knows", 'nobody talks about',
  "no one is talking about", "why is no one talking", "why isn't anyone",
  "they don't want you to know", 'they don’t want you', 'wake up',
  'do your research', 'open your eyes', 'big pharma', 'big tech',
  'hidden truth', 'the truth is', 'the truth about',
  // Cliffhanger / hook setups
  "you won't believe", 'wait until you see', 'wait until you hear',
  'wait for it', 'watch till the end', 'watch to the end',
  'this changed my life', 'this changed everything',
  'plot twist', 'twist at the end',
  // Reaction clichés
  'imagine being', 'imagine if', 'imagine having', 'imagine getting',
  'imagine a world',
  'pure cinema', 'absolute cinema', 'this is cinema',
  'this is everything', 'this is peak', 'peak performance',
  'main character', 'main character energy',
  'deserves a', 'deserves an oscar', 'deserves a nobel',
  'absolutely insane', 'absolutely wild', 'absolutely sending me',
  'broke the internet', 'breaking the internet', 'breaking twitter', 'broke twitter',
  'going viral', 'this just went viral', 'this is going viral',
  'mind blown', 'mind = blown', 'jaw dropped', 'jaw on the floor',
  'goosebumps', 'gave me chills', 'sent chills', 'speechless',
  'hits different', 'hits hard', 'hits harder than',
  'living rent free', 'rent free in my head',
  'no thoughts head empty', 'no thoughts only',
  // Hot-take framing
  'hot take', 'hot take:', 'controversial opinion', 'unpopular opinion',
  'cold take', 'spicy take', 'lukewarm take',
  // Manufactured-emotion vocabulary
  'heartwarming', 'wholesome', 'faith in humanity', 'restored my faith',
  'restoring faith', 'restores your faith', 'restores my faith',
  'feel good', 'feels good', 'feel-good',
  'random act of kindness', 'acts of kindness', 'simple act',
  'beautiful moment', 'precious moment', 'priceless moment',
  'pure joy', 'pure love', 'too pure', 'good people exist',
  'this is humanity', 'humanity at its',
  // Marketing / commercial-copy phrases (food / lifestyle clip farms)
  'loaded with', 'packed with', 'bursting with', 'topped with',
  'fresh flavors', 'fresh flavor', 'every bite', 'every sip',
  'in every', 'perfect for', 'absolute perfection', 'sheer perfection',
  'so good', 'so satisfying', 'so addicting', 'so addictive',
  'oddly satisfying', 'crowd pleaser', 'must try', 'gotta try',
  'goes hard', 'slaps', 'bangs', 'fire 🔥', 'is fire',
  // Narrative-setup hooks ("X was just Y, until Z…")
  'was just', 'were just', 'was simply', 'were simply',
  'until a ', 'until they', 'until someone', 'until this',
  'turned into', 'turned the', 'turns into',
  // Thread / serial bait
  'thread 🧵', '🧵👇', '🧵', 'a thread:', 'thread:', 'thread incoming',
  '1/', '1 of ', 'part 1', 'part one',
  // Breaking-news framing
  'breaking:', 'breaking news', 'just in:', 'developing:',
  'huge news', 'massive news', 'this is huge',
  // Memes / question hooks
  'tell me without telling me', 'show me without showing me',
  'what in the', 'and i oop', 'asking for a friend',
  'i need to know', 'we need to talk about',
  'why did no one tell me', 'somebody had to say it', 'someone had to say it',
  'best i ever', 'worst i ever', 'most underrated',
];

const CLIFFHANGER_PHRASES = [
  'wait for it',
  "you won't believe",
  'this is wild',
  'watch till the end',
];

// Phrases that explicitly try to make the reader click / expand / continue
// — the strongest single signal of attention extraction.
const CLICK_BAIT_PHRASES = [
  // Explicit "next" pointers
  'see the next', 'see next', 'next tweet', 'in next tweet',
  'next post', 'next reply', 'in next post', 'check the next',
  // "See / find out / learn"
  'see what happened', 'see what happens', 'see how it ends',
  'see the rest', 'see for yourself', 'see what i mean',
  'see below', 'see this', 'see it here', 'see images below',
  'see the photo', 'see the pic', 'see the image', 'images below', 'photos below',
  'find out', 'find out more', 'find out why', 'find out how',
  'find out what', 'find out the truth',
  'learn more', 'read more', 'read this', 'read on', 'read it here',
  'wait until you see', 'wait until you hear',
  // Direct CTAs
  'click to', 'click here', 'click the link', 'click below',
  'tap to', 'tap here', 'tap below', 'tap the post',
  'swipe for', 'swipe to', 'swipe up', 'swipe right',
  'expand for', 'expand to', 'expand this',
  'open this', 'open the post', 'open the link', 'open the article',
  'open below', 'visit this', 'visit the link', 'check this out',
  // Thread / continuation pointers
  'more in thread', 'thread below', 'full thread', 'whole thread',
  'continued below', 'continued in', 'cont. below', 'cont. in',
  'rest of the', 'rest in thread',
  // Comments / replies redirect
  'check the comments', 'in the comments', 'down in the comments',
  'check replies', 'see comments', 'see the comments',
  // Bio / profile redirect
  'link in bio', 'in my bio', 'in bio',
  'go to my profile', 'check my profile', 'check my bio',
  'go to my page', 'visit my profile',
  'pinned tweet', 'pinned post', 'see my pinned',
  // Urgency / FOMO
  "don't miss this", "don't miss out", "don't miss",
  'last chance', 'limited time', "won't last",
  // Pure arrow emojis ("👇 below" / "see ⬇️" patterns)
  '👇', '⬇️', '⬇', '➡️',
];

// Phrases that signal "the tweet text is narrating what's in the video" — a
// classic engagement-farming pattern (historical clips, "the moment when…")
const VIDEO_NARRATION_PHRASES = [
  // Direct narration cues
  'footage of', 'footage shows', 'clip of', 'clip shows',
  'video of', 'video shows', 'video captures',
  'moment when', 'the moment', 'in the moment',
  'watch as', 'watch how', 'watch what', 'watch this',
  'look at', 'look how', 'look what',
  'see how', 'see this', 'see what',
  'this is when', 'this is what', 'this was', 'this happened',
  'this is how', 'this is why',
  'reportedly', 'allegedly', 'apparently', 'supposedly',
  'caught on', 'caught on camera', 'caught on video', 'caught on tape',
  'caught doing', 'caught stealing', 'caught lying', 'caught cheating',
  'in this video', 'in this clip', 'in this footage',
  'during ', 'back in', 'years ago', 'decades ago',
  // Camera/recording type
  'security cam', 'security camera', 'cctv', 'doorbell cam', 'doorbell camera',
  'bodycam', 'body cam', 'dashcam', 'dash cam', 'gopro',
  'live on', 'live tv', 'live broadcast',
  // Footage descriptors
  'rare footage', 'leaked footage', 'never before seen', 'never-before-seen',
  'recently surfaced', 'newly surfaced', 'just surfaced', 'just leaked',
  'old footage', 'archive footage', 'archived footage', 'vintage footage',
  'unbelievable footage', 'incredible footage', 'shocking footage',
  // Action / outcome verbs
  'goes wrong', 'gone wrong', 'goes viral', 'went viral', 'is going viral',
  'gets caught', 'gets owned', 'gets exposed', 'gets called out',
  'gets destroyed', 'destroys', 'humiliates', 'roasts', 'dismantles',
  'tries to', 'attempts to', 'attempting to',
  'reacts to', 'reacts when', 'reaction to', 'his reaction', 'her reaction',
  'their reaction', 'priceless reaction',
  'finally caught', 'finally exposed', 'finally happened',
  'happens next', 'what happens next', 'happens when',
  'before and after',
  // Reaction clichés (also in engagement-bait, but help here too)
  'pure cinema', 'absolute cinema', 'this is cinema',
  'this is everything', 'iconic', 'unmatched', 'unhinged',
  'main character', 'deserves a',
  'pulled off', 'pulled it off',
  'imagine being', 'imagine if', 'imagine having',
  'must watch', 'must see', "you have to see", "you've got to see",
  'unreal', 'insane moment', 'crazy moment', 'rare moment',
  'has the internet', 'has everyone',
  // Year patterns — catches "In 1997", "in 2014" etc.
  'in 19', 'in 20', '19th century', '20th century',
  // Casual third-person openers (clip-account style)
  'bro ', 'this guy', 'this man', 'this woman', 'this kid', 'this baby',
  'this dude', 'this lady', 'this driver', 'this cop', 'this teacher',
  'this couple', 'this dog', 'this cat',
  'meanwhile in', 'happening right now', 'in real time',
  // Hyperbole / emphasis
  'ultimate ', 'literally ', 'absolutely ', 'completely ',
  'nothing but ', 'nothing short of',
];

// Words/themes typical of viral-content farm accounts. If they appear in the
// handle or display name, the account's *brand* is engagement-farming.
const THEMATIC_HANDLE_WORDS = [
  // Wholesome / emotion farms
  'wholesome', 'humanity', 'faith', 'kindness', 'feelgood', 'feel-good',
  'heartwarming', 'goodvibes', 'smile', 'positivity',
  // Viral / clip / vault farms
  'viral', 'trending', 'buzzing', 'gone viral', 'gonewild',
  'clips', 'clip', 'vids', 'videos', 'vault', 'archive',
  'vidshub', 'vidsdaily', 'reels', 'reel', 'shorts',
  'cinematic', 'cinema',
  // Food / snack / lifestyle farms
  'snack', 'snacks', 'food', 'foods', 'foodie',
  'recipe', 'recipes', 'kitchen', 'cooking', 'eats',
  'tasty', 'yum', 'yummy', 'delicious', 'cravings',
  // Theme dumps
  'memes', 'meme', 'dailymemes', 'history', 'historic', 'historical',
  'facts', 'didyouknow', 'tilthat', 'today_i_learned',
  'oddly', 'weird', 'strange', 'mystery', 'mysteries',
  'rare', 'unseen', 'unbelievable', 'incredible', 'amazing',
  // Reaction farms
  'reaction', 'reactions', 'wholesomereactions',
  'cinema', 'cinephile', 'movieclips',
  'epic', 'legend', 'legendary', 'iconic',
  // Cute / animal bait
  'cute', 'cutest', 'adorable', 'pet', 'pets', 'doggos', 'puppy', 'kitten',
  'cat', 'cats', 'kitty', 'kitties', 'kittens', 'feline', 'felines',
  'dog', 'dogs', 'doggo', 'pupper', 'puppers', 'pup', 'pups', 'canine',
  'nocontext', 'no context',
  // Nature / wildlife / animal-content farms
  'nature', 'natural', 'wildlife', 'wild', 'animal', 'animals',
  'creature', 'critter', 'beast', 'fauna',
  'phenomenal', 'phenomena', 'wonders', 'wonder',
  'planet', 'earth', 'geo', 'biosphere', 'wildearth',
  // News-bait farms
  'breaking', 'updates', 'now', 'world', 'global', 'alert', 'watch',
];

function detectThematicHandle(handle, displayName) {
  const h = (handle || '').toLowerCase();
  const d = (displayName || '').toLowerCase();
  let hits = 0;
  for (const w of THEMATIC_HANDLE_WORDS) {
    if (h.includes(w) || d.includes(w)) {
      hits++;
      if (hits >= 2) break;
    }
  }
  if (hits >= 2) return 1;
  if (hits === 1) return 0.7;
  return 0;
}

function computeHeuristics(tweetText, tweetMeta) {
  const text = tweetText || '';
  const lower = text.toLowerCase();

  // Engagement bait
  let baitMatches = 0;
  for (const phrase of ENGAGEMENT_BAIT_PHRASES) {
    if (lower.includes(phrase)) baitMatches++;
  }
  const engagementBait = Math.min(baitMatches / 2, 1);

  // Emotional punctuation: ! ? repeats, interrobangs, ALLCAPS words, ellipses,
  // and emoji density (🔥🔥🔥, 💯💯, etc. are pure emotional punctuation)
  const words = text.split(/\s+/);
  const exclaims = (text.match(/!/g) || []).length;
  const questions = (text.match(/\?/g) || []).length;
  const repeatedBangs = (text.match(/!{2,}/g) || []).length;       // !! !!!
  const repeatedQs = (text.match(/\?{2,}/g) || []).length;         // ?? ???
  const interrobangs = (text.match(/[!?][!?]+/g) || []).length;    // ?! !? !?!
  const ellipses = (text.match(/\.{3,}|…/g) || []).length;
  const allcapsWords = words.filter(w => w.length >= 3 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  let emojiCount = 0;
  try {
    emojiCount = (text.match(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu) || []).length;
  } catch (_) {
    emojiCount = (text.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  }
  const punctScore =
    exclaims + questions +
    3 * repeatedBangs + 3 * repeatedQs + 3 * interrobangs +
    2 * allcapsWords + ellipses + 1.5 * emojiCount;
  const emotionalPunctuation = Math.min(punctScore / 6, 1);

  // Cliffhanger
  let cliffhanger = 0;
  for (const phrase of CLIFFHANGER_PHRASES) {
    if (lower.includes(phrase)) { cliffhanger = 1; break; }
  }
  if (!cliffhanger && /\.\.\.\s*$/.test(text.trim())) {
    cliffhanger = 1;
  }

  // Video narration: tweet has a video AND the text is describing it instead
  // of reacting to it. Strong signals: cue phrases, length, and absence of
  // first/second-person pronouns (third-person descriptions like
  // "An exhausted mom gives the bottle to her friend…" are pure narration).
  let videoNarration = 0;
  if (tweetMeta.isVideo) {
    let phraseHits = 0;
    for (const phrase of VIDEO_NARRATION_PHRASES) {
      if (lower.includes(phrase)) phraseHits++;
    }
    const longCaption = text.length >= 70;
    const mediumCaption = text.length >= 35;
    const hasPersonal = /\b(i|me|my|mine|you|your|yours|we|us|our|ours)\b/i.test(text);
    const thirdPersonNarration = mediumCaption && !hasPersonal;

    if (thirdPersonNarration) videoNarration = 1;
    else if (phraseHits >= 2) videoNarration = 1;
    else if (phraseHits >= 1 && longCaption) videoNarration = 0.9;
    else if (longCaption) videoNarration = 0.6;
    else if (phraseHits >= 1) videoNarration = 0.7;
  }

  // Click bait: the worst offender — text that explicitly demands a click,
  // expand, swipe, or trails off with "..." to force the reader to engage.
  let clickBait = 0;
  for (const phrase of CLICK_BAIT_PHRASES) {
    if (lower.includes(phrase)) { clickBait = 1; break; }
  }
  // Trailing dots (2+) or … are a strong click-bait cue ("watch this..", "wait for it…")
  if (!clickBait && /(\.{2,}|…)\s*\S{0,4}\s*$/.test(text.trim())) clickBait = 1;

  const thematicHandle = detectThematicHandle(tweetMeta.authorHandle, tweetMeta.displayName);

  // Pure clip bait: media (video OR photo) posted with no informative text
  // (emoji-only, single word, "👇", etc.). This is the clearest "I'm just
  // farming views off this content" pattern there is — applies equally to
  // a photo of a cat with caption "so polite" as to a video clip + emojis.
  const hasMedia = !!(tweetMeta.hasMedia ?? (tweetMeta.isVideo || tweetMeta.hasImage));
  let pureClipBait = 0;
  if (hasMedia) {
    // Strip emojis, whitespace, and punctuation; count remaining real chars.
    let stripped;
    try {
      stripped = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
    } catch (_) {
      // Fallback for browsers without unicode prop escapes
      stripped = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
    }
    stripped = stripped.replace(/[\s\W_]+/g, '');
    const real = stripped.length;
    if (real === 0) pureClipBait = 1;          // pure emoji / empty
    else if (real <= 6) pureClipBait = 0.95;   // 1 short word + emojis
    else if (real <= 14) pureClipBait = 0.85;  // ≤14 real chars ("so polite")
    else if (real <= 22) pureClipBait = 0.6;   // ≤22 real chars ("Pose IRL")
    else if (real <= 30) pureClipBait = 0.35;  // ≤30 real chars (still thin)
  }

  // Viral reach: views are partly outcome but a 250K-view tweet is engineered
  // to spread regardless of how it got there.
  let viralReach = 0;
  const v = tweetMeta.viewCount || 0;
  if (v >= 1_000_000) viralReach = 1.0;
  else if (v >= 250_000) viralReach = 0.8;
  else if (v >= 50_000) viralReach = 0.5;
  else if (v >= 10_000) viralReach = 0.25;

  return {
    engagementBait,
    emotionalPunctuation,
    cliffhanger,
    clickBait,
    isVideo: tweetMeta.isVideo ? 1 : 0,
    hasMedia: hasMedia ? 1 : 0,
    videoNarration,
    pureClipBait,
    thematicHandle,
    viralReach,
    isForYou: tweetMeta.isForYou ? 1 : 0,
  };
}
