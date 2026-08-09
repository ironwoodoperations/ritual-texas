// Plain assertion script for the caption output filter.
// Run with:  node src/lib/socialGuard.test.js
// Exits non-zero if any case fails, so it's verifiable without an LLM.

import { screenCaption, screenFields } from './socialGuard.js';
import process from 'process';

let failures = 0;

function expectFlagged(input, shouldFlag, expectedTerm) {
  const { flagged, terms } = screenCaption(input);
  const okFlag = flagged === shouldFlag;
  const okTerm =
    expectedTerm === undefined ||
    terms.some((t) => t === expectedTerm);
  if (!okFlag || !okTerm) {
    failures += 1;
    console.error(
      `FAIL  screenCaption(${JSON.stringify(input)}) => ` +
        `{ flagged: ${flagged}, terms: ${JSON.stringify(terms)} } ; ` +
        `expected flagged: ${shouldFlag}` +
        (expectedTerm !== undefined ? `, term includes: ${JSON.stringify(expectedTerm)}` : ''),
    );
  } else {
    console.log(`ok    ${JSON.stringify(input)} -> flagged:${flagged} ${JSON.stringify(terms)}`);
  }
}

function expectFieldsFlagged(content, hashtags, shouldFlag, expectedTerms) {
  const { flagged, terms } = screenFields(content, hashtags);
  const okFlag = flagged === shouldFlag;
  const okTerms =
    !expectedTerms || expectedTerms.every((e) => terms.includes(e));
  if (!okFlag || !okTerms) {
    failures += 1;
    console.error(
      `FAIL  screenFields(${JSON.stringify(content)}, ${JSON.stringify(hashtags)}) => ` +
        `{ flagged: ${flagged}, terms: ${JSON.stringify(terms)} } ; ` +
        `expected flagged: ${shouldFlag}` +
        (expectedTerms ? `, terms include: ${JSON.stringify(expectedTerms)}` : ''),
    );
  } else {
    console.log(`ok    fields(${JSON.stringify(content)}, ${JSON.stringify(hashtags)}) -> ${JSON.stringify(terms)}`);
  }
}

// --- Item 1: camelCase / hashtag compounds MUST flag true ---
expectFlagged('#VibrationalHealing', true, '#VibrationalHealing');
expectFlagged('#DeepHealing', true, '#DeepHealing');
expectFlagged('#SelfHealing', true, '#SelfHealing');
expectFlagged('#DetoxRitual', true, '#DetoxRitual');
expectFlagged('#TherapeuticTouch', true, '#TherapeuticTouch');

// --- Item 1: plain terms MUST still flag true ---
expectFlagged('healing', true, 'healing');
expectFlagged('treats', true, 'treats');
expectFlagged('anxiety', true, 'anxiety');
expectFlagged('$45', true, '$45'); // item 3: full number, not "$4"

// --- Item 1: these MUST flag false ---
expectFlagged('#VibrationalEnergy', false);
expectFlagged('#SoundBath', false);
expectFlagged('#Stillness', false);
expectFlagged('a treat', false); // bare noun, not the verb "treats"

// --- Item 3: wider price captures ---
expectFlagged('$1,200.50', true, '$1,200.50');

// --- Item 2: hashtags field is screened and merged with content ---
expectFieldsFlagged('A calm evening.', '#DeepHealing #SoundBath', true, ['#DeepHealing']);
expectFieldsFlagged('This treats tension.', '#Stillness', true, ['treats']);
expectFieldsFlagged('A quiet morning.', '#SoundBath #Stillness', false, []);

// --- Bare verb "treat" restored to BANNED, with a noun carve-out ---
// MUST FLAG:
expectFlagged('This will treat your tension', true, 'treat');
expectFlagged('designed to treat stress', true, 'treat');
expectFlagged('treat, treats, treating', true, 'treat');
expectFlagged('treat, treats, treating', true, 'treats');
expectFlagged('treat, treats, treating', true, 'treating');
// MUST NOT FLAG (indulgence noun / word-boundary):
expectFlagged('a treat', false);
expectFlagged('a little treat', false);
expectFlagged('such a treat', false);
expectFlagged('retreat', false);
expectFlagged('#Retreat', false);

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll socialGuard tests passed.');
}