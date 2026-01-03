import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

export default function Rooms() {
  const [selectedSuite, setSelectedSuite] = useState(null);
  
  const { data: suites, isLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: () => base44.entities.Suite.filter({ is_available: true }, 'sort_order'),
  });

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
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">Suites</p>
                <h1 className="text-4xl md:text-5xl font-extralight text-[rgb(107,85,64)] mb-4">
                  Choose your suite. Arrive. Exhale.
                </h1>
                <p className="text-[rgb(45,45,45)] font-light max-w-2xl leading-relaxed">
                  Night stays include amenities + gourmet breakfast. For 3+ guests, we recommend connecting suites or the Carriage House.
                </p>
              </div>
              <Link 
                to={createPageUrl('BookingFlow')}
                className="px-6 py-3 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all whitespace-nowrap"
              >
                CHECK AVAILABILITY
              </Link>
            </div>
          </motion.div>

          {/* Rates Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid md:grid-cols-4 gap-4 mb-12 bg-white border border-[rgb(235,225,213)] p-6 rounded-sm"
          >
            <div>
              <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">Mon–Thu</div>
              <div className="text-2xl font-light text-[rgb(107,85,64)]">$150</div>
              <div className="text-sm text-[rgb(45,45,45)]">per night, up to 2 guests</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">Fri–Sat</div>
              <div className="text-2xl font-light text-[rgb(107,85,64)]">$198</div>
              <div className="text-sm text-[rgb(45,45,45)]">per night, up to 2 guests</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">Extra Guest</div>
              <div className="text-2xl font-light text-[rgb(107,85,64)]">+$100</div>
              <div className="text-sm text-[rgb(45,45,45)]">adjoining suite opened</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">Includes</div>
              <div className="text-sm text-[rgb(107,85,64)] leading-relaxed">Amenities + gourmet breakfast</div>
            </div>
          </motion.div>

          {/* Connecting Suites Callout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[rgb(235,225,213)] border border-[rgb(198,182,165)] p-6 mb-12 rounded-sm"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-light text-[rgb(107,85,64)] mb-2">Best for Groups</h2>
                <p className="text-[rgb(45,45,45)] font-light">Book connecting suites for more space while staying close together.</p>
              </div>
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
              {[1, 2, 3].map(i => (
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
                <motion.div
                  key={suite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedSuite(suite)}
                  className="bg-white border border-[rgb(235,225,213)] overflow-hidden group hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={suite.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'}
                      alt={suite.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-light text-[rgb(107,85,64)]">{suite.name}</h3>
                      <div className="flex gap-1">
                        {suite.max_occupancy && (
                          <span className="px-2 py-1 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-xs flex items-center gap-1">
                            <Users className="w-3 h-3" /> {suite.max_occupancy}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {suite.headline && (
                      <p className="text-sm text-[rgb(45,45,45)] font-light mb-3">
                        {suite.headline}
                      </p>
                    )}

                    {suite.features && suite.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {suite.features.slice(0, 4).map((feature, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-xs"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-[rgb(235,225,213)]">
                      <span className="text-sm text-[rgb(45,45,45)]">Tap for details</span>
                      <ArrowRight className="w-4 h-4 text-[rgb(150,170,155)]" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Suite Detail Modal */}
      <AnimatePresence>
        {selectedSuite && (
          <Dialog open={!!selectedSuite} onOpenChange={() => setSelectedSuite(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
              <DialogHeader>
                <button
                  onClick={() => setSelectedSuite(null)}
                  className="absolute right-4 top-4 p-2 rounded-sm hover:bg-[rgb(235,225,213)] transition-colors z-50"
                >
                  <X className="w-5 h-5 text-[rgb(107,85,64)]" />
                </button>
              </DialogHeader>

              <div className="space-y-6 pt-8">
                {/* Image */}
                <div className="aspect-video overflow-hidden rounded-sm border border-[rgb(235,225,213)]">
                  <img 
                    src={selectedSuite.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'}
                    alt={selectedSuite.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Title & Tags */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-3xl font-extralight text-[rgb(107,85,64)]">{selectedSuite.name}</h2>
                    {selectedSuite.max_occupancy && (
                      <span className="px-3 py-1 bg-[rgb(235,225,213)] text-[rgb(107,85,64)] text-sm flex items-center gap-1">
                        <Users className="w-4 h-4" /> Sleeps {selectedSuite.max_occupancy}
                      </span>
                    )}
                  </div>
                  {selectedSuite.headline && (
                    <p className="text-lg text-[rgb(45,45,45)] font-light mb-4">{selectedSuite.headline}</p>
                  )}
                  {selectedSuite.description && (
                    <p className="text-[rgb(45,45,45)] font-light leading-relaxed">{selectedSuite.description}</p>
                  )}
                </div>

                {/* Features */}
                {selectedSuite.features && selectedSuite.features.length > 0 && (
                  <div>
                    <h3 className="text-sm uppercase tracking-widest text-[rgb(150,170,155)] mb-3">Features</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSuite.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-[rgb(45,45,45)]">
                          <span className="w-1 h-1 bg-[rgb(150,170,155)] rounded-full" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Level */}
                {selectedSuite.level && (
                  <div className="text-sm text-[rgb(45,45,45)]">
                    <span className="text-[rgb(150,170,155)]">Location:</span> {selectedSuite.level}
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

                <p className="text-xs text-[rgb(45,45,45)] text-center">
                  Weekday/weekend rates shown at top of page. All stays include amenities + breakfast.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}