// Base44 Backend Function: seedHotelRitualContent
// Creates/updates Suites + Treatments/Services + Press/Reviews + ReviewPlacements + Packages.
// Safe to run multiple times (idempotent via slug lookups).

import { createClientFromRequest } from "npm:@base44/sdk";

type AnyRecord = Record<string, any>;

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertBySlug(
  entities: any,
  entityName: string,
  slug: string,
  data: AnyRecord
) {
  const handler = entities[entityName];
  if (!handler) {
    throw new Error(
      `Entity "${entityName}" not found. Create it in Dashboard → Data, or change ENTITY_NAMES in the function.`
    );
  }

  const existing = await handler.filter({ slug });

  if (Array.isArray(existing) && existing.length > 0) {
    const id = existing[0].id;
    await handler.update(id, { ...data, slug });
    return { action: "updated", entity: entityName, slug, id };
  }

  const created = await handler.create({ ...data, slug });
  return { action: "created", entity: entityName, slug, id: created?.id };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Check if user is authenticated and is admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Use admin-level permissions
    const entities = base44.asServiceRole.entities;

  const ENTITY_NAMES = {
    suites: "Suite",
    treatments: "Treatment",
    press: "PressItem",
    testimonials: "Testimonial",
    placements: "ReviewPlacement",
    packages: "Package",
  };

  // ----------------------------
  // SUITES
  // ----------------------------
  const suites = [
    {
      name: "Suite 1",
      headline: "Light-filled first level suite",
      description:
        "A light-filled, first level suite features a Hollywood regency soaking tub.",
      level: "First level",
      features: ["Hollywood regency soaking tub"],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 245,
      max_occupancy: 2,
      sort_order: 1,
      is_available: true,
    },
    {
      name: "Suite 2",
      headline: "First level suite with private terrace",
      description:
        "First level suite features Hollywood regency soaking tub and private terrace.",
      level: "First level",
      features: ["Hollywood regency soaking tub", "Private terrace"],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 265,
      max_occupancy: 2,
      sort_order: 2,
      is_available: true,
    },
    {
      name: "Suite 3",
      headline: "Second level suite with private terrace",
      description:
        "Second level suite features a private terrace, Hollywood soaking tub, separate shower and double vanity. Bathroom shared with suite 4.",
      level: "Second level",
      features: [
        "Private terrace",
        "Hollywood soaking tub",
        "Separate shower",
        "Double vanity",
        "Bathroom shared with Suite 4",
      ],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 275,
      max_occupancy: 2,
      sort_order: 3,
      is_available: true,
    },
    {
      name: "Suite 4",
      headline: "Second level suite",
      description:
        "Second level suite features a Hollywood soaking tub, separate shower and double vanity. Bathroom shared with suite 3.",
      level: "Second level",
      features: [
        "Hollywood soaking tub",
        "Separate shower",
        "Double vanity",
        "Bathroom shared with Suite 3",
      ],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 255,
      max_occupancy: 2,
      sort_order: 4,
      is_available: true,
    },
    {
      name: "Suite 5",
      headline: "Second level suite with grand terrace",
      description:
        "Second level suite features a large grand terrace, with twin bed in alcove, and shared hollywood soaking tub/shower with suite 6.",
      level: "Second level",
      features: [
        "Large grand terrace",
        "Twin bed in alcove",
        "Shared soaking tub/shower with Suite 6",
      ],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 285,
      max_occupancy: 3,
      sort_order: 5,
      is_available: true,
    },
    {
      name: "Suite 6",
      headline: "Second level suite with walk-in closet",
      description:
        "Second level suite features walk in closet and shares Hollywood regency soaking tub/shower with suite 5.",
      level: "Second level",
      features: [
        "Walk-in closet",
        "Shared soaking tub/shower with Suite 5",
      ],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 265,
      max_occupancy: 2,
      sort_order: 6,
      is_available: true,
    },
    {
      name: "Suite 7 — The Carriage House",
      headline: "Private suite behind the main mansion",
      description:
        "The Carriage House—a private suite behind the main mansion with two queen beds, living and dining spaces, kitchenette, shower, and terrace over-looking the pool.",
      level: "Carriage House",
      features: [
        "Two queen beds",
        "Living + dining spaces",
        "Kitchenette",
        "Shower",
        "Terrace overlooking the pool",
      ],
      images: ["https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80"],
      price_per_night: 325,
      max_occupancy: 4,
      sort_order: 7,
      is_available: true,
    },
  ];

  // ----------------------------
  // TREATMENTS / SERVICES MENU
  // ----------------------------
  const treatments = [
    {
      name: "The Royal Treatment Facial",
      duration_minutes: 60,
      price: 198,
      category: "facial",
      what_it_is:
        "Instantly radiant, red-carpet skin. This is Cleopatra's facial—our lactic acid formula—reveals a youthful glow with no redness, peeling, or downtime. Expect to look and feel 10 years younger + instantly.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 1,
      is_available: true,
    },
    {
      name: "Aura Glow",
      duration_minutes: 120,
      price: 250,
      category: "ritual",
      what_it_is:
        "A resurrection of the mind + body + soul. An awakening of the senses. Includes the royal treatment facial, Parisian scalp + hair treatment, aura cleansing, sound healing, crystal chakra tuning + varma energy point activation for the face, hands, arms, and feet. High vibes only. Trauma released. Soul revived.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 2,
      is_available: true,
    },
    {
      name: "Swedish Massage (60 min)",
      duration_minutes: 60,
      price: 198,
      category: "massage",
      what_it_is:
        "Melt away the stress + tension. Flowing strokes, restore balance + relaxation. Pressure points activated, energy renewed, temple restored.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 3,
      is_available: true,
    },
    {
      name: "Swedish Massage (90 min)",
      duration_minutes: 90,
      price: 250,
      category: "massage",
      what_it_is:
        "Melt away the stress + tension. Flowing strokes, restore balance + relaxation. Pressure points activated, energy renewed, temple restored.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 4,
      is_available: true,
    },
    {
      name: "Lymphatic Massage",
      duration_minutes: 90,
      price: 298,
      category: "massage",
      what_it_is:
        "Gentle, rhythmic movements, flush toxins, ease tension, and restore balance—leaving you refreshed and radiant. Your lymphatic system's natural detox pathways are awakened for total renewal. Prepare for liftoff.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 5,
      is_available: true,
    },
    {
      name: "Shirodhara",
      duration_minutes: 60,
      price: 150,
      category: "wellness",
      what_it_is:
        "A 13,000+ year old treatment from India designed to reset the mind-body connection. The continuous motion of warm oil over the forehead and scalp is divinely relaxing and a reset for the nervous system. The sensation and result is a rebooting of the mind, body, and soul.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 6,
      is_available: true,
    },
    {
      name: "Shiro-Glow",
      duration_minutes: 120,
      price: 250,
      category: "ritual",
      what_it_is:
        "This is next-level shirodhara. Get your aura glowing while you regain mental clarity. Ancient vibrational healing therapies reawaken the senses, cleanse the aura, tune the chakras, and release tension with sound medicine, plus varma energy point massage for face, hands, and feet. Resurrection complete.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 7,
      is_available: true,
    },
    {
      name: "Reiki Forgiveness Burning Bowl",
      duration_minutes: 60,
      price: 75,
      category: "wellness",
      what_it_is:
        "Ready to let go of past memories and events holding you back from achieving your highest vibration? In this celebratory burning ceremony, our Reiki master guides you to let go of vibrational imprints, thoughts, and feelings that no longer serve your highest potential.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 8,
      is_available: true,
    },
    {
      name: "Reiki (Holy Fire Reiki)",
      duration_minutes: 60,
      price: 150,
      category: "wellness",
      what_it_is:
        'Holy Fire Reiki is a form of "hands-on-healing" in which your therapist works with universal life force energy to restore your energy centers (chakras) to their most natural state of flow. This treatment helps to restore and strengthen the mind, body, and spirit.',
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 9,
      is_available: true,
    },
    {
      name: "Sound Bath (Private — up to 3 guests)",
      duration_minutes: 60,
      price: 150,
      category: "wellness",
      what_it_is:
        "Deeply relaxing, a full body reset. Sound baths transfer the vibrational energy of the instruments to the vibrational energy of your body and mind, aiding in relaxation and healing—similar to how a piano is tuned. Helpful for sleep, focus, or emotional release.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 10,
      is_available: true,
    },
    {
      name: "Sound Bath (Group Class — Fridays 5:30–6:30)",
      duration_minutes: 60,
      price: 20,
      category: "wellness",
      what_it_is: "Group sound bath class. Helpful for sleep, focus, or emotional release.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 11,
      is_available: true,
    },
    {
      name: "Yoga (Private Class)",
      duration_minutes: 60,
      price: 60,
      category: "wellness",
      what_it_is:
        "Yoga is a mix of gentle movements and breathing that helps you feel grounded, relaxed, and flexible while deeply detoxifying the lymphatic system and quieting the mind. Curated for you based on experience level and needs.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 12,
      is_available: true,
    },
    {
      name: "Yoga (Group Class — min 5 ppl)",
      duration_minutes: 60,
      price: 20,
      category: "wellness",
      what_it_is: "Group yoga class. Curated based on experience level and needs.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 13,
      is_available: true,
    },
    {
      name: "Dr. Parkinstine Musical Treatments (By Donation)",
      duration_minutes: 30,
      price: 0,
      category: "wellness",
      what_it_is:
        "Tunes brought to you by Dr. Parkinstine in the living room of Hotel RITUAL or the RITUAL Soda Fountain providing you with the frequency of joy (432hz). 15 or 30 minute sessions — by donation.",
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80",
      sort_order: 14,
      is_available: true,
    },
  ];

  // ----------------------------
  // PACKAGES
  // ----------------------------
  const packages = [
    {
      name: "No Plans Getaway",
      price_from_usd: 150,
      price_unit: "per night",
      description:
        "Enjoy a relaxing stay for 2 at our boutique hotel and spa. Each room and suite come with breakfast, luxury linens and robes, and access to our 3 on-site water features: sauna, pool, and hot tub. Explore Jacksonville, Texas nature, shopping and dining at a leisurely pace to reset and rest.",
      image_url: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
      sort_order: 1,
      is_active: true,
    },
    {
      name: "Couple's Retreat",
      price_from_usd: 849,
      price_unit: "all inclusive",
      description:
        "2 night stay package including breakfast, luxury linens and robes, access to sauna/pool/hot tub, a 60 minute couple's massage, and a private sound bath experience. Plus explore local shopping, dining, and night life to round out your stay.",
      image_url: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
      sort_order: 2,
      is_active: true,
    },
    {
      name: "Day Spa Detox",
      price_from_usd: 250,
      price_unit: "per person",
      description:
        "4 hour body and soul detox. Lunch delivered from Ritual Luncheonette, access to on-site water features, 1 healing spa treatment of your choice, ritual sweat sauna circuit, DIY Abhyanga self-massage, DIY Reiki forgiveness burning bowl. Additional treatments available at booking.",
      image_url: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
      sort_order: 3,
      is_active: true,
    },
    {
      name: "Soul Revival",
      price_from_usd: 898,
      price_unit: "for 1 guest",
      description:
        "2 night stay. Includes Shirodhara (60min), Swedish massage (60min), AURA GLOW (120min), sauna circuit, self-guided Reiki forgiveness burning bowl, high vibe prescription, tasting at RITUAL Soda Fountain of Youth, and more.",
      image_url: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
      sort_order: 4,
      is_active: true,
    },
    {
      name: "Girls Trip Retreat",
      price_from_usd: null,
      price_unit: "custom",
      description:
        "Customized girls trip or bachelorette weekend. Breakfast each morning, access to amenities/water features. Spa treatments and special events available at booking (massage, facials, sound baths, private yoga, tastings, and more).",
      image_url: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
      sort_order: 5,
      is_active: true,
    },
    {
      name: "SuperHuman Transformation",
      price_from_usd: 1695,
      price_unit: "for 1 guest",
      description:
        "2 night stay with gourmet breakfast. Includes Shirodhara (60min), Swedish massage (60min), AURA GLOW (120min), sauna circuit, Reiki + sound bath (60min), forgiveness burning bowl, high vibe prescription, tasting at RITUAL Soda Fountain of Youth, and more.",
      image_url: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80",
      sort_order: 6,
      is_active: true,
    },
  ];

  // ----------------------------
  // TESTIMONIALS
  // ----------------------------
  const testimonials = [
    {
      author: "Carol",
      quote:
        "I absolutely LOVE this place! ... way more than just a spa but an immersive experience specially designed for you.",
      rating: 5,
      sort_order: 1,
      source_name: "HotelRitualTexas.com",
      source_url: "https://www.hotelritualtexas.com/",
      is_active: true,
    },
    {
      author: "Samantha",
      quote:
        "I arrived ... feeling burnt out... My time at Hotel Ritual was so much more restorative than I could have imagined... This really is such a special place.",
      rating: 5,
      sort_order: 2,
      source_name: "HotelRitualTexas.com",
      source_url: "https://www.hotelritualtexas.com/",
      is_active: true,
    },
    {
      author: "Khadejah",
      quote:
        "Wow just finishing up the most refreshing weekend... The Cleopatra facial accompaniment was magnificent leaving my skin with a radiant glow.",
      rating: 5,
      sort_order: 3,
      source_name: "HotelRitualTexas.com",
      source_url: "https://www.hotelritualtexas.com/",
      is_active: true,
    },
  ];

  // ----------------------------
  // PRESS + REVIEWS
  // ----------------------------
  const pressItems = [
    {
      title: "Meet Whitney W. Graham of Ritual in Jacksonville",
      publisher: "VoyageDallas",
      url: "https://voyagedallas.com/interview/meet-ritual-jacksonville-texas/",
      pull_quote:
        "HOTEL RITUAL + Wellness Center... four water amenities—sauna, jacuzzi, heated and cooled pool, rain shower—plus secluded suites and a separate carriage house.",
      sort_order: 1,
      is_active: true,
    },
    {
      title: "Meet Whitney Graham of Hotel RITUAL",
      publisher: "VoyageDallas",
      url: "https://voyagedallas.com/interview/meet-whitney-graham-of-hotel-ritual/",
      pull_quote:
        "Hotel RITUAL—a healing sanctuary offering our version of Ayurvedic detox (Panchakarma) and holistic experiences rooted in vibration, nutrition, breath, and nature.",
      sort_order: 2,
      is_active: true,
    },
    {
      title: "9 Wellness Resorts Around Texas for an Escape",
      publisher: "Dallasites101",
      url: "https://www.dallasites101.com/blog/post/wellness-resorts-around-texas-for-an-escape/",
      pull_quote:
        "All-inclusive... access to dozens of amenities like high-vibrational foods, a sauna, chakra showers, sage ceremonies, and even private yoga, meditation, and sound baths.",
      sort_order: 3,
      is_active: true,
    },
    {
      title: "Life & Work with Whitney Graham of Jacksonville, Texas",
      publisher: "VoyageJacksonville",
      url: "https://voyagejacksonville.com/interview/life-work-with-whitney-graham-of-jacksonville-texas/",
      pull_quote: null,
      sort_order: 4,
      is_active: true,
    },
    {
      title: "Texas Monthly: New Age Meets Yore at East Texas Hotel RITUAL + Spa",
      publisher: "Texas Monthly",
      url: "https://www.texasmonthly.com/travel/new-age-meets-yore-east-texas-hotel-ritual-spa/",
      pull_quote: null,
      sort_order: 5,
      is_active: true,
    },
    {
      title: "Texas Monthly: Where to Stay, Eat, Retreat in East Texas",
      publisher: "Texas Monthly",
      url: "https://www.texasmonthly.com/travel/where-to-stay-eat-retreat-east-texas/",
      pull_quote: null,
      sort_order: 6,
      is_active: true,
    },
    {
      title: "Texas Monthly: Relax Already — Texas Spas",
      publisher: "Texas Monthly",
      url: "https://www.texasmonthly.com/travel/relax-already-texas-spas/",
      pull_quote: null,
      sort_order: 7,
      is_active: true,
    },
    {
      title: "Best Wellness Resorts in Texas Hill Country",
      publisher: "PaperCity",
      url: "https://www.papercitymag.com/culture/travel/best-wellness-resorts-texas-hill-country/",
      pull_quote: null,
      sort_order: 8,
      is_active: true,
    },
    {
      title: "ETX View (Jan–Feb 2025 edition)",
      publisher: "Issuu",
      url: "https://issuu.com/mrobertsdigital/docs/etx_view_jan-feb_25_eedition",
      pull_quote: null,
      sort_order: 9,
      is_active: true,
    },
    {
      title: "Charm East Texas: Creating a New RITUAL",
      publisher: "Charm East Texas",
      url: "https://www.charmeasttexas.com/features/creating-a-new-ritual/article_25d5907e-a6e4-11eb-b3a5-a3f2319e4b20.html",
      pull_quote: null,
      sort_order: 10,
      is_active: true,
    },
  ];

  // ----------------------------
  // REVIEW PLACEMENTS
  // ----------------------------
  const placements = [
    {
      key: "home.hero",
      title: "Hero proof",
      testimonial_slug: slugify("Samantha"),
      sort_order: 1,
      is_active: true,
    },
    {
      key: "home.packages",
      title: "Packages proof",
      testimonial_slug: slugify("Khadejah"),
      sort_order: 2,
      is_active: true,
    },
    {
      key: "treatments.header",
      title: "Treatments proof",
      testimonial_slug: slugify("Carol"),
      sort_order: 3,
      is_active: true,
    },
  ];

  // ----------------------------
  // EXECUTE UPSERTS
  // ----------------------------
  const results: any[] = [];

  // Suites
  for (const s of suites) {
    const slug = slugify(s.name);
    results.push(
      await upsertBySlug(entities, ENTITY_NAMES.suites, slug, {
        ...s,
        slug,
      })
    );
  }

  // Treatments
  for (const t of treatments) {
    const slug = slugify(t.name);
    results.push(
      await upsertBySlug(entities, ENTITY_NAMES.treatments, slug, {
        ...t,
        slug,
      })
    );
  }

  // Packages
  for (const p of packages) {
    const slug = slugify(p.name);
    results.push(
      await upsertBySlug(entities, ENTITY_NAMES.packages, slug, {
        ...p,
        slug,
      })
    );
  }

  // Testimonials
  for (const tm of testimonials) {
    const slug = slugify(tm.author);
    results.push(
      await upsertBySlug(entities, ENTITY_NAMES.testimonials, slug, {
        ...tm,
        slug,
      })
    );
  }

  // Press items
  for (const pr of pressItems) {
    const slug = slugify(`${pr.publisher}-${pr.title}`);
    results.push(
      await upsertBySlug(entities, ENTITY_NAMES.press, slug, {
        ...pr,
        slug,
      })
    );
  }

  // Placements
  for (const pl of placements) {
    const slug = slugify(pl.key);
    results.push(
      await upsertBySlug(entities, ENTITY_NAMES.placements, slug, {
        ...pl,
        slug,
      })
    );
  }

    return new Response(JSON.stringify({ ok: true, results }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown error',
        stack: error.stack 
      }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});