// Output filter for AI-generated captions.
//
// Runs on every generated caption BEFORE it is written to SocialPost.
// Flagged posts are STILL SAVED (as drafts) with the matched terms
// recorded — they are never silently dropped, auto-edited, or rewritten.
// The user must see what was caught and decide.

// Note: bare singular "treat" (a noun — "a little treat") is allowed;
// only the verb forms "treats"/"treating" read as a medical claim.
const BANNED = /\b(treats|treating|cures?|heals?|healing|detox(ify|ing)?|therapeutic|remed(y|ies)|medicinal|clinically|prescribe[sd]?)\b/i;
const CONDITIONS = /\b(anxiety|insomnia|depression|inflammation|arthritis|migraines?|eczema|psoriasis|IBS)\b/i;
// Capture the full number, not just the first digit ("$45", "$1,200.50").
const PRICE = /\$\s?\d[\d,]*(\.\d+)?|\b\d+\s+(dollars|usd)\b/i;

// Split camelCase / PascalCase: insert a space before any uppercase
// letter that follows a lowercase letter or digit. This surfaces banned
// words hidden inside hashtag compounds like "#VibrationalHealing".
function splitCompounds(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

// Normalize a string before matching: strip '#', then split compounds.
function normalize(s) {
  return splitCompounds(String(s).replace(/#/g, ''));
}

// Trim surrounding punctuation from a reported token while preserving a
// leading '#', so the badge shows "#VibrationalHealing" and "anxiety"
// (not "anxiety.").
function cleanToken(tok) {
  const cleaned = tok.replace(/^[^#\w]+/, '').replace(/[^#\w]+$/, '');
  return cleaned || tok;
}

/**
 * Screen a caption for prohibited language.
 * @param {string} text caption content to screen
 * @returns {{ flagged: boolean, terms: string[] }}
 */
export function screenCaption(text) {
  const str = String(text || '');
  const terms = [];
  const push = (t) => {
    if (t && !terms.some((x) => x.toLowerCase() === t.toLowerCase())) terms.push(t);
  };

  // Word matches: examine each whitespace-delimited token against the
  // NORMALIZED token, but report the ORIGINAL token so the badge shows
  // the real text the user wrote (e.g. "#VibrationalHealing"), not the
  // normalized fragment ("healing"). Every BANNED/CONDITIONS entry is a
  // single word, so per-token screening is sufficient.
  const tokens = str.split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    const norm = normalize(tok);
    if (BANNED.test(norm) || CONDITIONS.test(norm)) {
      push(cleanToken(tok));
    }
  }

  // Price: run against the normalized full string and report the matched
  // substring (camelCase splitting is irrelevant here, but '#' stripping
  // keeps behavior consistent).
  const priceMatch = normalize(str).match(PRICE);
  if (priceMatch) push(priceMatch[0].trim());

  return { flagged: terms.length > 0, terms };
}

/**
 * Screen several fields (e.g. content AND hashtags) and merge the matched
 * terms into a single result.
 * @param {...string} values fields to screen
 * @returns {{ flagged: boolean, terms: string[] }}
 */
export function screenFields(...values) {
  const terms = [];
  for (const value of values) {
    for (const t of screenCaption(value).terms) {
      if (!terms.some((x) => x.toLowerCase() === t.toLowerCase())) terms.push(t);
    }
  }
  return { flagged: terms.length > 0, terms };
}
