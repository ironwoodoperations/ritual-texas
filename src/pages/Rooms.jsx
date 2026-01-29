import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, ArrowRight, X, Plus, Minus, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, differenceInDays } from 'date-fns';
import PressStrip from '@/components/reviews/PressStrip';

const PRICING = {
  weekdayLabel: "Mon–Thu",
  weekdayNight: 148,
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
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  
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

  const nights = checkInDate && checkOutDate 
    ? differenceInDays(new Date(checkOutDate), new Date(checkInDate))
    : 0;

  const buildBookingUrl = (suite) => {
    const params = new URLSearchParams();
    if (suite) params.append('room', suite.slug || suite.name);
    if (checkInDate) params.append('checkin', format(new Date(checkInDate), 'yyyy-MM-dd'));
    if (checkOutDate) params.append('checkout', format(new Date(checkOutDate), 'yyyy-MM-dd'));
    if (guests) params.append('guests', guests.toString());
    return createPageUrl('BookRooms') + (params.toString() ? '?' + params.toString() : '');
  };

  const connectingPairs = [
    { suites: ['Suite 3', 'Suite 4'], note: 'Shared bathroom — perfect for groups' },
    { suites: ['Suite 5', 'Suite 6'], note: 'Shared bathroom — sleeps up to 5 guests' }
  ];

  return (
    <div className="min-h-screen bg-[rgb(248,246,242)]">
      {/* Hero Section with Image */}
      <section className="relative h-[50vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG)',
          }}
        >
          <div className="absolute inset-0 bg-[rgb(107,85,64)]/40" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-6 max-w-3xl"
        >
          <p className="text-xs uppercase tracking-widest text-white/90 mb-3">Hotel RITUAL</p>
          <h1 className="text-4xl md:text-6xl font-extralight text-white mb-4">
            Your Sanctuary Awaits
          </h1>
          <p className="text-lg text-white/90 font-light leading-relaxed">
            Seven unique suites. Each a refuge. Choose your space for rest and restoration.
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Quick Pricing Info + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-[rgb(235,225,213)] p-6 mb-8 rounded-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-light text-[rgb(107,85,64)] mb-3">Plan Your Stay</h2>
                <div className="flex flex-wrap items-center gap-4 text-sm text-[rgb(45,45,45)]">
                  <div>
                    <span className="font-medium">{PRICING.weekdayLabel}:</span> ${pricingPreview.weekday}/night
                  </div>
                  <div>
                    <span className="font-medium">{PRICING.weekendLabel}:</span> ${pricingPreview.weekend}/night
                  </div>
                </div>
                <p className="text-xs text-[rgb(45,45,45)] mt-3 opacity-70">
                  Pricing includes all amenities + gourmet breakfast. +${PRICING.extraGuestNight}/night per extra guest after {PRICING.baseGuestsIncluded}.
                </p>
              </div>
              <Link 
                to={buildBookingUrl(null)}
                className="px-8 py-3 bg-[rgb(150,170,155)] text-white text-sm tracking-widest hover:bg-[rgb(130,150,135)] transition-colors whitespace-nowrap"
              >
                BOOK NOW
              </Link>
            </div>
          </motion.div>

          {/* Social Proof Strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8"
          >
            <PressStrip limit={4} compact />
          </motion.div>

          {/* Connecting Suites Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[rgb(235,225,213)] border border-[rgb(198,182,165)] p-6 mb-10 rounded-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-2">Traveling with a Group?</h3>
                <p className="text-sm text-[rgb(45,45,45)] font-light">Book connecting suites for shared space and privacy.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {connectingPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white border border-[rgb(198,182,165)] rounded-sm">
                    <span className="text-xs font-medium text-[rgb(107,85,64)]">{pair.suites[0]} + {pair.suites[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <h2 className="text-2xl font-light text-[rgb(107,85,64)] mb-6">Our Suites</h2>

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
                <div className="pt-4 border-t border-[rgb(235,225,213)]">
                  <Link
                    to={buildBookingUrl(selectedSuite)}
                    className="block w-full text-center px-6 py-3 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-colors"
                  >
                    BOOK THIS SUITE
                  </Link>
                </div>
                {(checkInDate || checkOutDate || guests > 2) && (
                  <p className="text-xs text-[rgb(45,45,45)] text-center mt-3 opacity-80">
                    Your dates and guest count will be pre-filled
                  </p>
                )}

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