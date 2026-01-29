import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ExternalLink, ChevronDown } from 'lucide-react';

export default function Press() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ background: 'rgb(248,246,242)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extralight text-[rgb(107,85,64)] mb-4">
            Press + Reviews
          </h1>
          <p className="text-[rgb(45,45,45)] font-light max-w-3xl leading-relaxed">
            Hotel RITUAL is a boutique wellness retreat in Jacksonville, Texas—designed for deep rest, bodywork, and a full "reset."
            Here's what the press and guests are saying.
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <div className="flex flex-wrap gap-3 mb-12">
          <a
            href="https://hotels.cloudbeds.com/"
            target="_blank"
            rel="noopener"
            className="px-6 py-3 bg-[rgb(107,85,64)] text-white rounded-full hover:bg-[rgb(130,150,135)] transition-all text-sm font-medium flex items-center gap-2"
          >
            Book Your Stay
            <ExternalLink className="w-4 h-4" />
          </a>
          <Link
            to={createPageUrl('Treatments')}
            className="px-6 py-3 bg-white border border-[rgb(235,225,213)] text-[rgb(45,45,45)] rounded-full hover:border-[rgb(198,182,165)] transition-all text-sm font-medium"
          >
            View Treatments
          </Link>
        </div>

        {/* As Seen In Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 p-6 border border-[rgb(235,225,213)] rounded-2xl bg-white/65 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs tracking-widest text-[rgb(150,170,155)] uppercase font-semibold">
              As Seen In
            </h3>
            <span className="text-xs text-[rgb(45,45,45)]">Tap to read</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { name: 'Texas Highways', url: 'https://texashighways.com/travel/lodging/east-texas-ritual-jefferson-hotel/' },
              { name: 'PaperCity', url: 'https://www.papercitymag.com/culture/travel/best-wellness-resorts-texas-hill-country/' },
              { name: 'The East Texas Weekend', url: 'https://www.theeasttexasweekend.com/2024/11/01/restore-your-peace-this-east-texas-hotel/' },
              { name: 'Texas Monthly', url: 'https://www.texasmonthly.com/' },
              { name: 'Wildsam', url: 'https://www.ritualtexas.com/press' },
              { name: 'ETX View', url: 'https://www.etxview.com/travel/jacksonville-getaway-offers-mental-physical-refresh-through-luxurious-amenities/article_6a719e42-cd7f-11ef-b68b-6f21eb3ef751.html' }
            ].map((outlet) => (
              <a
                key={outlet.name}
                href={outlet.url}
                target="_blank"
                rel="noopener"
                className="p-4 border border-[rgb(235,225,213)] rounded-xl bg-white text-center text-sm font-bold text-[rgb(45,45,45)] hover:outline hover:outline-2 hover:outline-[rgb(150,170,155)] transition-all flex items-center justify-center min-h-[60px]"
              >
                {outlet.name}
              </a>
            ))}
          </div>
        </motion.div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6">
          {/* Featured Stories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-8"
          >
            <h3 className="text-xs tracking-widest text-[rgb(150,170,155)] uppercase font-semibold mb-6">
              Featured Stories
            </h3>

            <div className="space-y-4">
              {[
                {
                  title: '"Hotel RITUAL isn\'t just a getaway spot — it\'s a sanctuary for the soul."',
                  outlet: 'ETX View / Tyler Morning Telegraph',
                  url: 'https://www.etxview.com/travel/jacksonville-getaway-offers-mental-physical-refresh-through-luxurious-amenities/article_6a719e42-cd7f-11ef-b68b-6f21eb3ef751.html'
                },
                {
                  title: 'Where to Stay in 2024 (East Texas): Hotel RITUAL',
                  outlet: 'Texas Highways',
                  url: 'https://texashighways.com/travel/lodging/east-texas-ritual-jefferson-hotel/'
                },
                {
                  title: 'Restore your peace at this East Texas Hotel',
                  outlet: 'The East Texas Weekend',
                  url: 'https://www.theeasttexasweekend.com/2024/11/01/restore-your-peace-this-east-texas-hotel/'
                },
                {
                  title: '9 Luxury Texas Wellness Retreats to Relax, Reset, and Explore Somewhere New',
                  outlet: 'PaperCity',
                  url: 'https://www.papercitymag.com/culture/travel/best-wellness-resorts-texas-hill-country/'
                },
                {
                  title: '"...a pristinely preserved 1932 mansion..." (Wildsam quote)',
                  outlet: 'Wildsam (via Ritual Texas Press)',
                  url: 'https://www.ritualtexas.com/press',
                  quote: 'A press quote highlighting the property details and "attention to detail and mystique."'
                },
                {
                  title: 'Texas Monthly (May 2022): "New Age Meets Days of Yore…" (mention)',
                  outlet: 'Texas Monthly',
                  url: 'https://www.texasmonthly.com/',
                  quote: 'Tip: if you have the exact Texas Monthly article URL, replace this link so visitors land on the story directly.'
                }
              ].map((story, idx) => (
                <div key={idx} className="border border-[rgb(235,225,213)] rounded-xl p-5 bg-white hover:border-[rgb(198,182,165)] transition-all">
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener"
                    className="text-[rgb(45,45,45)] font-bold hover:text-[rgb(107,85,64)] transition-colors leading-snug"
                  >
                    {story.title}
                  </a>
                  <div className="text-xs text-[rgb(150,170,155)] mt-2">{story.outlet}</div>
                  {story.quote && (
                    <div className="mt-3 text-sm text-[rgb(45,45,45)] border-l-3 border-[rgb(150,170,155)] pl-3 italic">
                      {story.quote}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* FAQ */}
            <div className="mt-8 pt-8 border-t border-[rgb(235,225,213)]">
              <details className="border border-[rgb(235,225,213)] rounded-xl p-4 bg-white mb-3">
                <summary className="cursor-pointer font-bold text-[rgb(45,45,45)] flex items-center justify-between">
                  What makes Hotel RITUAL different?
                  <ChevronDown className="w-4 h-4" />
                </summary>
                <p className="mt-3 text-sm text-[rgb(45,45,45)] leading-relaxed">
                  A boutique stay designed around wellness: treatments, sauna/pool/jacuzzi access, quiet private spaces, and an intentional "reset" environment that combines luxury with ritual-based restoration.
                </p>
              </details>
              <details className="border border-[rgb(235,225,213)] rounded-xl p-4 bg-white">
                <summary className="cursor-pointer font-bold text-[rgb(45,45,45)] flex items-center justify-between">
                  Can I plan a small group retreat?
                  <ChevronDown className="w-4 h-4" />
                </summary>
                <p className="mt-3 text-sm text-[rgb(45,45,45)] leading-relaxed">
                  Yes—use the Press / Group Inquiries button above. We'll help build an itinerary around your goals (rest, detox, celebration, reconnection, transformation).
                </p>
              </details>
            </div>
          </motion.div>

          {/* Guest Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white border border-[rgb(235,225,213)] rounded-2xl p-8"
          >
            <h3 className="text-xs tracking-widest text-[rgb(150,170,155)] uppercase font-semibold mb-6">
              Guest Highlights
            </h3>

            <div className="space-y-4">
              {[
                {
                  stars: 5,
                  quote: '"My stay at Hotel Ritual was transformative… the service offerings are unmatched… Do not hesitate to book."',
                  name: 'Cassie',
                  location: 'Liberty Hill, TX • 2024'
                },
                {
                  stars: 5,
                  quote: '"Hotel Ritual is a HIDDEN GEM… We did the Girls Getaway… left revived and refreshed."',
                  name: 'Starla',
                  location: '2024'
                },
                {
                  stars: 5,
                  quote: '"Was it all a dream?! … do yourself a favor and entrust Whitney and Team to bring you back to yourself."',
                  name: 'Amber',
                  location: 'Broken Bow, OK • 2024'
                },
                {
                  stars: 5,
                  quote: '"A stay at Hotel Ritual is the ultimate reset… access to sauna, rain shower, pool and jacuzzi… treasure that should not be missed."',
                  name: 'Lisa',
                  location: 'Henderson, TX • 2024'
                }
              ].map((review, idx) => (
                <div key={idx} className="border border-[rgb(235,225,213)] rounded-xl p-4 bg-white">
                  <div className="flex gap-0.5 mb-2" aria-label={`${review.stars} stars`}>
                    {[...Array(review.stars)].map((_, i) => (
                      <span key={i} className="text-[rgb(150,170,155)]">★</span>
                    ))}
                  </div>
                  <p className="text-sm text-[rgb(45,45,45)] leading-relaxed mb-3">
                    {review.quote}
                  </p>
                  <div className="text-sm font-bold text-[rgb(45,45,45)]">
                    {review.name} <span className="font-normal text-[rgb(150,170,155)]">• {review.location}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-[rgb(235,225,213)]/30 border border-[rgb(235,225,213)]">
              <p className="text-xs text-[rgb(45,45,45)] leading-relaxed">
                <strong className="font-semibold">Quick credibility tip:</strong> Put a short "As Seen In" strip like this on your Home page too,
                linking back to this Press page. It boosts trust fast and reduces "Is this real?" friction.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Structured Data (AEO/SEO) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": "Hotel RITUAL Press Mentions",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "item": {
                "@type": "CreativeWork",
                "name": "Where to Stay in 2024 (East Texas): Hotel Ritual",
                "publisher": { "@type": "Organization", "name": "Texas Highways" },
                "url": "https://texashighways.com/travel/lodging/east-texas-ritual-jefferson-hotel/"
              }
            },
            {
              "@type": "ListItem",
              "position": 2,
              "item": {
                "@type": "CreativeWork",
                "name": "Restore your peace at this East Texas Hotel",
                "publisher": { "@type": "Organization", "name": "The East Texas Weekend" },
                "url": "https://www.theeasttexasweekend.com/2024/11/01/restore-your-peace-this-east-texas-hotel/"
              }
            },
            {
              "@type": "ListItem",
              "position": 3,
              "item": {
                "@type": "CreativeWork",
                "name": "9 Luxury Texas Wellness Retreats to Relax, Reset, and Explore Somewhere New",
                "publisher": { "@type": "Organization", "name": "PaperCity Magazine" },
                "url": "https://www.papercitymag.com/culture/travel/best-wellness-resorts-texas-hill-country/"
              }
            },
            {
              "@type": "ListItem",
              "position": 4,
              "item": {
                "@type": "CreativeWork",
                "name": "ETX View: Jacksonville getaway offers mental & physical refresh through luxurious amenities",
                "publisher": { "@type": "Organization", "name": "ETX View / Tyler Morning Telegraph" },
                "url": "https://www.etxview.com/travel/jacksonville-getaway-offers-mental-physical-refresh-through-luxurious-amenities/article_6a719e42-cd7f-11ef-b68b-6f21eb3ef751.html"
              }
            },
            {
              "@type": "ListItem",
              "position": 5,
              "item": {
                "@type": "CreativeWork",
                "name": "Wildsam mention / quote (via Ritual Texas Press)",
                "publisher": { "@type": "Organization", "name": "Wildsam" },
                "url": "https://www.ritualtexas.com/press"
              }
            }
          ]
        })
      }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Review",
          "itemReviewed": {
            "@type": "Hotel",
            "name": "Hotel RITUAL",
            "url": "https://www.hotelritualtexas.com/"
          },
          "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
          "author": { "@type": "Person", "name": "Cassie" },
          "datePublished": "2024-01-01",
          "reviewBody": "My stay at Hotel Ritual was transformative… the service offerings are unmatched… Do not hesitate to book."
        })
      }} />
    </div>
  );
}