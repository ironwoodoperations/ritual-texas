// Prompt builders for AI social content generation.
//
// ⚠️ COMPLIANCE: The system/user prompt text below — especially the
// ABSOLUTE PROHIBITIONS list — is a compliance requirement and is
// reproduced verbatim. Do not paraphrase, shorten, reorder, or remove
// any part of it.

// ---- CAPTION PROMPT — system portion (verbatim) ----
const CAPTION_SYSTEM = `You are a social media copywriter for Hotel RITUAL, a boutique hotel,
restaurant, and Ayurvedic spa in Jacksonville, Texas. The owner, Whitney,
is a practitioner who teaches Ayurveda. Write in her voice: someone who
knows why something works telling you about it — not a business asking
for a booking.

Teach first, invite last. Prefer the specific over the superlative.
Calm register — no urgency, no exclamation stacking, no all-caps.
Use "I" for spa content (Whitney is the practitioner) and "we" for hotel
and restaurant content.
At most one emoji per caption, and only where it earns its place.

ABSOLUTE PROHIBITIONS — these override every other instruction:
- Never state or imply a price, discount, or dollar figure.
- Never name a treatment, dish, service, or amenity that is not listed
  in the subject matter provided to you.
- Never use these words: treat, treats, treating, cure, cures, heal,
  heals, healing, detox, detoxify, therapeutic, remedy, medicinal,
  clinically, prescribe.
- Never name a medical condition (anxiety, insomnia, depression,
  inflammation, arthritis, migraine, eczema, psoriasis, IBS, or any
  other).
- Never claim, guarantee, or imply a health outcome. Never claim
  superiority over another provider or method.
- Describe sensation and tradition instead. "In Ayurveda, warm oil is
  used to settle the nervous system" describes a tradition and is
  permitted. "This treatment cures insomnia" is a claim and is not.
- Never state capacity, availability, or open spots.
- Never fabricate a review, quote, or testimonial in any form.
- Never mention vendors, software, booking systems, or internal
  operations.`;

// ---- SCHEDULE PROMPT — system portion (verbatim) ----
const SCHEDULE_SYSTEM = `You are a social media scheduling expert for a boutique hotel,
restaurant, and Ayurvedic spa in Jacksonville, Texas (America/Chicago).`;

function formatTreatments(treatments) {
  if (!treatments || treatments.length === 0) {
    return '(no specific treatments — write general, non-specific content)';
  }
  return treatments
    .map((t) => {
      const name = t.name || '(unnamed)';
      const description = t.what_it_is || t.description || '';
      const duration = t.duration_minutes ? `${t.duration_minutes} min` : '';
      return `- ${name} | ${description} | ${duration}`;
    })
    .join('\n');
}

/**
 * Build the caption-generation prompt.
 * @param {object} args
 * @param {string} args.category   hotel | restaurant | spa
 * @param {string} args.pillar     quiet | glow | release | together
 * @param {string} args.platform   instagram | facebook | tiktok
 * @param {string} args.topics     free-text topics/keywords from Whitney
 * @param {Array}  args.treatments subject-matter treatment records
 * @param {number} args.count      how many distinct posts to generate
 */
export function buildCaptionPrompt({ category, pillar, platform, topics, treatments, count }) {
  // ---- CAPTION PROMPT — user portion (verbatim, with values injected) ----
  const user = `Category: ${category}
Pillar: ${pillar}
Platform: ${platform}
Topic / keywords from Whitney: ${topics}

Subject matter — use ONLY what appears here:
${formatTreatments(treatments)}

Content mix for this category:
- spa: treatment education, Ayurvedic principle, practitioner
  perspective, seasonal ritual, self-care lifestyle. NO before-and-after.
- hotel: the property, arrival and rest, seasonality in East Texas,
  suites and grounds, quiet mornings
- restaurant: dishes, sourcing, the table, what's on this week, gathering

Generate exactly ${count} distinct posts. Vary the angle across the mix —
do not write ${count} versions of the same idea.

Platform shape:
- instagram: 80-150 words, hashtags in the separate field, 8-12 tags
- facebook: 100-200 words, fuller story, few or no hashtags
- tiktok: under 100 characters, hook in the first four words

Return ONLY valid JSON. No preamble, no markdown fences.`;

  return {
    prompt: `${CAPTION_SYSTEM}\n\n${user}`,
    response_json_schema: {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              pillar: { type: 'string' },
              content: { type: 'string' },
              hashtags: { type: 'string' },
              imageHint: { type: 'string' },
              angle: { type: 'string' },
            },
          },
        },
      },
    },
  };
}

/**
 * Build the smart-scheduling prompt.
 * @param {object} args
 * @param {Array}  args.posts     posts to schedule (category, platform, pillar)
 * @param {string} args.startDate YYYY-MM-DD
 * @param {string} args.endDate   YYYY-MM-DD
 */
export function buildSchedulePrompt({ posts, startDate, endDate }) {
  const postList = (posts || [])
    .map((p, i) => `${i}: category=${p.category}, platform=${p.platform}, pillar=${p.pillar}`)
    .join('\n');

  // ---- SCHEDULE PROMPT — user portion (verbatim, with values injected) ----
  const user = `Schedule ${(posts || []).length} posts between ${startDate} and ${endDate}.

Post list:
${postList}

Constraints:
- Timezone is America/Chicago. Return LOCAL wall-clock times.
- No more than one post per platform per day.
- Spread evenly across the range; do not cluster.
- Avoid 00:00-06:00 entirely.

Guidance by category:
- restaurant: late morning and early evening, ahead of meal decisions
- spa: evenings and Sunday, when people are thinking about rest
- hotel: Thursday through Saturday, when travel planning happens

Return ONLY valid JSON, no fences:
[{"post_index":0,"scheduled_for":"YYYY-MM-DDTHH:mm:00","reasoning":"..."}]`;

  return {
    prompt: `${SCHEDULE_SYSTEM}\n\n${user}`,
  };
}

/**
 * Build the image-matching prompt.
 * @param {object} args
 * @param {Array} args.captions   caption strings, index-aligned
 * @param {Array} args.candidates [{ id, filename, tags }]
 */
export function buildImageMatchPrompt({ captions, candidates }) {
  const captionList = (captions || [])
    .map((c, i) => `${i}: ${c}`)
    .join('\n');
  const candidateList = (candidates || [])
    .map((c) => `- id=${c.id}, filename=${c.filename}, tags=${(c.tags || []).join(', ')}`)
    .join('\n');

  // ---- IMAGE MATCH PROMPT (verbatim, with data appended) ----
  const prompt = `Given a list of captions and a list of candidate images (each with id,
filename, and tags), return the best image id for each caption, or null
if none fits. Return ONLY valid JSON, no fences:
[{"caption_index":0,"image_id":"..."}]

Captions:
${captionList}

Candidate images:
${candidateList}`;

  return { prompt };
}
