// Output filter for AI-generated captions.
//
// Runs on every generated caption BEFORE it is written to SocialPost.
// Flagged posts are STILL SAVED (as drafts) with the matched terms
// recorded — they are never silently dropped, auto-edited, or rewritten.
// The user must see what was caught and decide.

const BANNED = /\b(treats?|treating|cures?|heals?|healing|detox(ify|ing)?|therapeutic|remed(y|ies)|medicinal|clinically|prescribe[sd]?)\b/i;
const CONDITIONS = /\b(anxiety|insomnia|depression|inflammation|arthritis|migraines?|eczema|psoriasis|IBS)\b/i;
const PRICE = /\$\s?\d|\b\d+\s+(dollars|usd)\b/i;

/**
 * Screen a caption for prohibited language.
 * @param {string} text caption content to screen
 * @returns {{ flagged: boolean, terms: string[] }}
 */
export function screenCaption(text) {
  const str = String(text || '');
  const terms = [];

  // Collect every distinct banned/claim word that appears.
  const bannedGlobal = new RegExp(BANNED.source, 'gi');
  let m;
  while ((m = bannedGlobal.exec(str)) !== null) {
    const term = m[0];
    if (!terms.some((t) => t.toLowerCase() === term.toLowerCase())) {
      terms.push(term);
    }
  }

  const conditionsGlobal = new RegExp(CONDITIONS.source, 'gi');
  while ((m = conditionsGlobal.exec(str)) !== null) {
    const term = m[0];
    if (!terms.some((t) => t.toLowerCase() === term.toLowerCase())) {
      terms.push(term);
    }
  }

  if (PRICE.test(str)) {
    const priceMatch = str.match(PRICE);
    if (priceMatch) terms.push(priceMatch[0].trim());
  }

  return { flagged: terms.length > 0, terms };
}
