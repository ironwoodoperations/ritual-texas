import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Clock, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TestimonialCard from '@/components/TestimonialCard';
import ReviewCarousel from '@/components/reviews/ReviewCarousel';

const categoryLabels = {
  massage: 'Massage',
  facial: 'Facial',
  body: 'Body Work',
  ritual: 'Rituals',
  wellness: 'Wellness'
};

export default function Treatments() {
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  // Load Square booking widget
  React.useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://square.site/appointments/buyer/widget/d61ecc5d-b6c7-4b87-adfc-5c3dea9b43ef/9Y1N836Q82W1V.js';
    script.async = true;
    const container = document.getElementById('square-appointments-embed');
    if (container && !container.querySelector('script')) {
      container.appendChild(script);
    }
    return () => {
      if (container && script.parentNode === container) {
        container.removeChild(script);
      }
    };
  }, []);

  const { data: treatments, isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.filter({ is_available: true }, 'sort_order'),
  });

  const { data: testimonials } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => base44.entities.Testimonial.filter({ is_active: true }, 'sort_order', 1),
  });

  const categories = ['all', ...Object.keys(categoryLabels)];
  
  // Group treatments by name and maintain sort_order
  const processedTreatments = React.useMemo(() => {
    if (!treatments) return [];
    
    // Group treatments with the same name
    const grouped = treatments.reduce((acc, treatment) => {
      const key = treatment.name;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(treatment);
      return acc;
    }, {});
    
    // Convert to array with options for multiple variants
    const processed = Object.entries(grouped).map(([name, variants]) => {
      if (variants.length === 1) {
        return variants[0];
      }
      // Multiple variants - sort by price for display options
      const sortedVariants = [...variants].sort((a, b) => a.price - b.price);
      // Use the variant with the lowest sort_order as the base
      const baseVariant = [...variants].sort((a, b) => a.sort_order - b.sort_order)[0];
      return {
        ...baseVariant,
        hasOptions: true,
        options: sortedVariants.map(v => ({
          id: v.id,
          duration_minutes: v.duration_minutes,
          price: v.price,
          label: `${v.duration_minutes} min - $${v.price}`
        }))
      };
    });
    
    // Sort by sort_order to maintain the exact order from the database
    return processed.sort((a, b) => a.sort_order - b.sort_order);
  }, [treatments]);
  
  const filteredTreatments = activeCategory === 'all' 
    ? processedTreatments 
    : processedTreatments?.filter(t => t.category === activeCategory);

  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-extralight text-[rgb(107,85,64)] mb-4">
            Spa & Wellness
          </h1>
          <p className="text-[rgb(45,45,45)] font-light max-w-2xl mx-auto mb-8">
            Each treatment is an invitation to return to yourself. 
            Read carefully — we want you to choose what truly calls to you.
          </p>
          {testimonials && testimonials.length > 0 && (
            <div className="max-w-2xl mx-auto mt-8">
              <TestimonialCard testimonial={testimonials[0]} />
            </div>
          )}
        </motion.div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 text-sm tracking-wide transition-all ${
                activeCategory === cat 
                  ? 'bg-[rgb(107,85,64)] text-white' 
                  : 'bg-[rgb(235,225,213)] text-[rgb(45,45,45)] hover:bg-[rgb(198,182,165)]'
              }`}
            >
              {cat === 'all' ? 'All Treatments' : categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Treatments Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[3/2] w-full" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : filteredTreatments?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[rgb(107,85,64)] text-lg">Treatments coming soon...</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {filteredTreatments?.map((treatment) => (
                <motion.div
                  key={treatment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white border border-[rgb(235,225,213)] p-6"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs tracking-widest text-[rgb(150,170,155)] uppercase">
                        {categoryLabels[treatment.category]}
                      </span>
                      <div className="flex items-center gap-3">
                        {!treatment.hasOptions ? (
                          <div className="flex items-center gap-1 text-sm text-[rgb(45,45,45)]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{treatment.duration_minutes} min</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[rgb(45,45,45)]">Multiple options</span>
                        )}
                        <div className="text-lg font-medium text-[rgb(107,85,64)]">
                          ${treatment.price}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-3">
                      {treatment.name}
                    </h3>

                    {treatment.hasOptions && (
                      <div className="mb-3 space-y-1">
                        {treatment.options.map((opt, idx) => (
                          <div key={idx} className="text-xs text-[rgb(45,45,45)] flex items-center gap-2">
                            <span className="w-1 h-1 bg-[rgb(150,170,155)] rounded-full" />
                            <span>{opt.label}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-[rgb(45,45,45)] font-light mb-4 line-clamp-2">
                      {treatment.what_it_is}
                    </p>

                    <button 
                      onClick={() => setSelectedTreatment(treatment)}
                      className="flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors text-sm"
                    >
                      <Info className="w-4 h-4" />
                      <span>View Details</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Treatment Detail Modal */}
        <Dialog open={!!selectedTreatment} onOpenChange={() => setSelectedTreatment(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
            {selectedTreatment && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
                    {selectedTreatment.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  <div className="flex items-center justify-between py-4 border-b border-[rgb(235,225,213)]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[rgb(150,170,155)]" />
                      <span>{selectedTreatment.duration_minutes} minutes</span>
                    </div>
                    <span className="text-xl text-[rgb(107,85,64)]">${selectedTreatment.price}</span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-2">WHAT IT IS</h4>
                      <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                        {selectedTreatment.what_it_is}
                      </p>
                    </div>

                    {selectedTreatment.how_it_feels && (
                      <div>
                        <h4 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-2">HOW IT FEELS</h4>
                        <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                          {selectedTreatment.how_it_feels}
                        </p>
                      </div>
                    )}

                    {selectedTreatment.why_choose && (
                      <div>
                        <h4 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-2">WHY CHOOSE THIS</h4>
                        <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                          {selectedTreatment.why_choose}
                        </p>
                      </div>
                    )}

                    {selectedTreatment.what_to_expect_after && (
                      <div>
                        <h4 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-2">WHAT TO EXPECT AFTER</h4>
                        <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                          {selectedTreatment.what_to_expect_after}
                        </p>
                      </div>
                    )}

                    {selectedTreatment.not_for && (
                      <div className="bg-[rgb(235,225,213)] p-4">
                        <h4 className="text-sm tracking-widest text-[rgb(196,155,145)] mb-2">NOT RECOMMENDED FOR</h4>
                        <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                          {selectedTreatment.not_for}
                        </p>
                      </div>
                    )}
                  </div>

                  <Link 
                    to={createPageUrl('TreatmentCheckout') + `?treatment=${selectedTreatment.id}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
                  >
                    BOOK THIS TREATMENT
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Square Booking Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-24"
        >
          <header className="mb-6">
            <h2 className="text-3xl md:text-4xl font-light text-[rgb(59,72,49)] mb-4" style={{ fontFamily: 'serif', letterSpacing: '0.2px' }}>
              Book a Treatment
            </h2>
            <p className="text-[rgb(27,27,27)] leading-relaxed max-w-3xl">
              Choose your ritual, pick a time, and confirm securely. Treatments are booked through our secure Square system.
            </p>

            <div className="mt-6 bg-[rgb(252,249,244)] rounded-2xl p-6 border border-[rgb(59,72,49)]/10 shadow-lg">
              <strong className="text-[rgb(59,72,49)]">Before you book:</strong>
              <div className="mt-2 text-[rgb(27,27,27)] leading-relaxed">
                Sauna + rainshower are available pre or post treatment for maximum results. Rehydrate + refresh with mineral water,
                organic teas, and snacks in the butler's pantry before returning to the real world.
              </div>
            </div>
          </header>

          {/* Booking widget wrapper */}
          <div className="bg-[rgb(252,249,244)] rounded-2xl overflow-hidden border border-[rgb(59,72,49)]/10 shadow-lg">
            <div className="p-4 pt-4 pb-0">
              <div className="flex flex-wrap gap-3 items-center justify-between p-3 rounded-2xl bg-[rgb(240,232,221)]/65 border border-[rgb(59,72,49)]/8">
                <div className="flex flex-col gap-0.5">
                  <div className="font-bold text-[rgb(27,27,27)]">Secure booking + payment</div>
                  <div className="text-sm text-[rgb(59,72,49)]">You'll select your service, time, and complete payment in one flow.</div>
                </div>
                <Link 
                  to={createPageUrl('Treatments')}
                  className="bg-[rgb(197,124,93)] text-[rgb(252,249,244)] px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap hover:bg-[rgb(177,104,73)] transition-colors"
                >
                  Back to Treatments
                </Link>
              </div>
            </div>

            <div className="px-3 pb-4" id="square-appointments-embed">
              {/* Square widget loads here via useEffect */}
            </div>
          </div>

          <div className="mt-6 p-6 rounded-2xl bg-[rgb(196,165,92)]/18 border border-[rgb(59,72,49)]/10">
            <strong className="text-[rgb(59,72,49)]">Need help choosing?</strong>
            <div className="mt-2 text-[rgb(27,27,27)] leading-relaxed">
              Tap "Ask Concierge" on the site and tell us your goal (sleep, stress relief, detox, glow, emotional reset). We'll recommend the best ritual.
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-20 text-center"
        >
          <p className="text-[rgb(45,45,45)] font-light mb-6">
            Not sure which treatment is right for you?
          </p>
          <Link 
            to={createPageUrl('AskRitual')}
            className="inline-flex items-center gap-2 px-8 py-4 border border-[rgb(107,85,64)] text-[rgb(107,85,64)] hover:bg-[rgb(107,85,64)] hover:text-white transition-all tracking-widest text-sm"
          >
            ASK RITUAL FOR GUIDANCE
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
        </div>
        </div>
        );
        }