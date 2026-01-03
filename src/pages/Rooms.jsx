import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, ArrowRight, X, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import PressStrip from '@/components/reviews/PressStrip';

const PRICING = {
  weekdayLabel: "Mon–Thu",
  weekdayNight: 150,
  weekendLabel: "Fri–Sat",
  weekendNight: 198,
  baseGuestsIncluded: 2,
  extraGuestNight: 100,
  includesLine: "Night stays include all amenities + gourmet breakfast.",
  groupRecLine: "For parties with 3+ guests we recommend: Suites 3+4, Suites 5+6, or the Carriage House.",
};

export default function Rooms() {
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [guests, setGuests] = useState(2);
  
  const { data: suites, isLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: () => base44.entities.Suite.filter({ is_available: true }, 'sort_order'),
  });

  const calcNightly = (guestCount, baseRate) => {
    const extra = Math.max(0, guestCount - PRICING.baseGuestsIncluded);
    return baseRate + (extra * PRICING.extraGuestNight);
  };

  const pricingPreview = useMemo(() => {
    return {
      weekday: calcNightly(guests, PRICING.weekdayNight),
      weekend: calcNightly(guests, PRICING.weekendNight)
    };
  }, [guests]);

  const connectingPairs = [
    { suites: ['Suite 3', 'Suite 4'], note: 'Shared bathroom — perfect for groups' },
    { suites: ['Suite 5', 'Suite 6'], note: 'Shared bathroom — sleeps up to 5 guests' }
  ];

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">Hotel RITUAL</p>
                <h1 className="text-4xl md:text-5xl font-extralight text-[rgb(107,85,64)] mb-4">
                  Suites
                </h1>
                <p className="text-[rgb(45,45,45)] font-light max-w-2xl leading-relaxed">
                  Choose your sanctuary. Tap a suite to see details, features, and photos.
                </p>
              </div>

              {/* Pricing Calculator Box */}
              <div className="lg:w-96 bg-white border border-[rgb(235,225,213)] p-6 rounded-sm shadow-sm">
                <div className="text-sm text-[rgb(45,45,45)] mb-4 opacity-80">
                  Nightly pricing (auto-calculates with guests)
                </div>

                <label className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] block mb-3">
                  Number of Guests
                </label>
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="w-9 h-9 flex items-center justify-center border border-[rgb(198,182,165)] rounded-sm hover:bg-[rgb(235,225,213)] transition-colors"
                    aria-label="Decrease guests"
                  >
                    <Minus className="w-4 h-4 text-[rgb(107,85,64)]" />
                  </button>
                  <div className="flex-1 text-center text-2xl font-light text-[rgb(107,85,64)]">{guests}</div>
                  <button
                    onClick={() => setGuests(Math.min(10, guests + 1))}
                    className="w-9 h-9 flex items-center justify-center border border-[rgb(198,182,165)] rounded-sm hover:bg-[rgb(235,225,213)] transition-colors"
                    aria-label="Increase guests"
                  >
                    <Plus className="w-4 h-4 text-[rgb(107,85,64)]" />
                  </button>
                </div>
                <div className="text-xs text-[rgb(45,45,45)] opacity-70 mb-4">
                  +${PRICING.extraGuestNight}/night each extra guest after {PRICING.baseGuestsIncluded}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[rgb(235,225,213)] p-3 rounded-sm">
                    <div className="text-xs text-[rgb(107,85,64)] opacity-75 mb-1">{PRICING.weekdayLabel}</div>
                    <div className="text-xl font-light text-[rgb(107,85,64)]">${pricingPreview.weekday}</div>
                  </div>
                  <div className="bg-[rgb(235,225,213)] p-3 rounded-sm">
                    <div className="text-xs text-[rgb(107,85,64)] opacity-75 mb-1">{PRICING.weekendLabel}</div>
                    <div className="text-xl font-light text-[rgb(107,85,64)]">${pricingPreview.weekend}</div>
                  </div>
                </div>

                <div className="text-xs text-[rgb(45,45,45)] leading-relaxed mb-4 opacity-80">
                  <div className="mb-2">{PRICING.includesLine}</div>
                  <div>{PRICING.groupRecLine}</div>
                </div>

                <div className="flex flex-col gap-2">
                  <Link 
                    to={createPageUrl('BookingFlow')}
                    className="w-full text-center px-4 py-3 bg-[rgb(150,170,155)] text-white text-sm tracking-widest hover:bg-[rgb(130,150,135)] transition-colors"
                  >
                    BOOK YOUR STAY
                  </Link>
                  <Link 
                    to={createPageUrl('Treatments')}
                    className="w-full text-center px-4 py-3 border border-[rgb(198,182,165)] text-[rgb(107,85,64)] text-sm tracking-widest hover:bg-[rgb(235,225,213)] transition-colors"
                  >
                    VIEW TREATMENTS
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Social Proof Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-8"
          >
            <PressStrip limit={4} compact />
          </motion.div>

          {/* Connecting Suites Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[rgb(235,225,213)] border border-[rgb(198,182,165)] p-6 mb-12 rounded-sm"
          >
            <div className="mb-4">
              <h2 className="text-xl font-light text-[rgb(107,85,64)] mb-2">Best for Groups</h2>
              <p className="text-[rgb(45,45,45)] font-light">Book connecting suites for more space while staying close together.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {connectingPairs.map((pair, idx) => (
                <div key={idx} className="bg-white/80 border border-[rgb(198,182,165)] p-4 rounded-sm">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-3 py-1 bg-[rgb(150,170,155)] text-white text-xs tracking-wide">{pair.suites[0]}</span>
                    <span className="text-[rgb(198,182,165)]">⇄</span>
                    <span className="px-3 py-1 bg-[rgb(150,170,155)] text-white text-xs tracking-wide">{pair.suites[1]}</span>
                  </div>
                  <p className="text-sm text-[rgb(45,45,45)] font-light">{pair.note}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Suites Grid */}
          {isLoading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} className="space-y-4">
                  <Skeleton className="w-full aspect-[4/3]" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && suites?.length === 0 && (
            <div className="text-center py-16 bg-white border border-[rgb(235,225,213)]">
              <p className="text-[rgb(45,45,45)] font-light">Suites coming soon. Check back shortly.</p>
            </div>
          )}

          {!isLoading && suites && suites.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suites.map((suite, idx) => (
                <motion.button
                  key={suite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedSuite(suite)}
                  className="bg-white border border-[rgb(235,225,213)] overflow-hidden group hover:shadow-lg transition-all cursor-pointer text-left"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[rgb(235,225,213)]">
                    <img 
                      src={suite.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'}
                      alt={suite.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">
                      {suite.level || 'Suite'}
                    </div>
                    <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-2">{suite.name}</h3>
                    <p className="text-sm text-[rgb(45,45,45)] font-light mb-4 leading-relaxed line-clamp-2">
                      {suite.headline || suite.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {suite.max_occupancy && (
                        <span className="px-2 py-1 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-xs flex items-center gap-1">
                          <Users className="w-3 h-3" /> Sleeps {suite.max_occupancy}
                        </span>
                      )}
                      {suite.features?.slice(0, 2).map((feature, i) => (
                        <span 
                          key={i}
                          className="px-2 py-1 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[rgb(235,225,213)]">
                      <span className="text-sm text-[rgb(45,45,45)]">View details</span>
                      <ArrowRight className="w-4 h-4 text-[rgb(150,170,155)]" />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Suite Detail Modal */}
      <AnimatePresence>
        {selectedSuite && (
          <Dialog open={!!selectedSuite} onOpenChange={() => setSelectedSuite(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
              <button
                onClick={() => setSelectedSuite(null)}
                className="absolute right-4 top-4 p-2 rounded-sm hover:bg-[rgb(235,225,213)] transition-colors z-50"
              >
                <X className="w-5 h-5 text-[rgb(107,85,64)]" />
              </button>

              <div className="space-y-6 pt-8">
                {/* Header */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">
                    {selectedSuite.level || 'Suite'}
                  </div>
                  <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-3">{selectedSuite.name}</h2>
                  {selectedSuite.headline && (
                    <p className="text-lg text-[rgb(45,45,45)] font-light mb-4">{selectedSuite.headline}</p>
                  )}
                  {selectedSuite.description && (
                    <p className="text-[rgb(45,45,45)] font-light leading-relaxed">{selectedSuite.description}</p>
                  )}
                </div>

                {/* Pricing for this suite */}
                <div className="flex flex-wrap gap-3">
                  {selectedSuite.max_occupancy && (
                    <span className="px-3 py-1.5 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm flex items-center gap-1">
                      <Users className="w-4 h-4" /> Sleeps {selectedSuite.max_occupancy}
                    </span>
                  )}
                  <span className="px-3 py-1.5 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm">
                    {PRICING.weekdayLabel}: ${calcNightly(guests, PRICING.weekdayNight)}/night
                  </span>
                  <span className="px-3 py-1.5 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm">
                    {PRICING.weekendLabel}: ${calcNightly(guests, PRICING.weekendNight)}/night
                  </span>
                </div>

                {/* Images */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedSuite.images?.slice(0, 4).map((imgUrl, idx) => (
                    <div key={idx} className="aspect-video overflow-hidden rounded-sm border border-[rgb(235,225,213)]">
                      <img 
                        src={imgUrl}
                        alt={`${selectedSuite.name} view ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>

                {/* Features */}
                {selectedSuite.features && selectedSuite.features.length > 0 && (
                  <div>
                    <h3 className="text-sm uppercase tracking-widest text-[rgb(150,170,155)] mb-3">Highlights</h3>
                    <ul className="space-y-2">
                      {selectedSuite.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-[rgb(45,45,45)]">
                          <span className="w-1.5 h-1.5 bg-[rgb(150,170,155)] rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[rgb(235,225,213)]">
                  <Link
                    to={createPageUrl('BookingFlow') + `?room=${selectedSuite.id}`}
                    className="flex-1 text-center px-6 py-3 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-colors"
                  >
                    BOOK THIS SUITE
                  </Link>
                  <Link
                    to={createPageUrl('Treatments')}
                    className="flex-1 text-center px-6 py-3 border border-[rgb(198,182,165)] text-[rgb(107,85,64)] tracking-widest text-sm hover:bg-[rgb(235,225,213)] transition-colors"
                  >
                    ADD TREATMENTS
                  </Link>
                </div>

                <p className="text-xs text-[rgb(45,45,45)] text-center leading-relaxed opacity-80">
                  {PRICING.includesLine} Extra guests: ${PRICING.extraGuestNight}/night each after {PRICING.baseGuestsIncluded}.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}