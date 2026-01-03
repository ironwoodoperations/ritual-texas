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

  const { data: treatments, isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: () => base44.entities.Treatment.filter({ is_available: true }),
  });

  const { data: testimonials } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => base44.entities.Testimonial.filter({ is_active: true }, 'sort_order', 1),
  });

  const categories = ['all', ...Object.keys(categoryLabels)];
  
  const filteredTreatments = activeCategory === 'all' 
    ? treatments 
    : treatments?.filter(t => t.category === activeCategory);

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
                  className="bg-white border border-[rgb(235,225,213)] group"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <img 
                      src={treatment.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80'}
                      alt={treatment.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 text-sm text-[rgb(107,85,64)]">
                      ${treatment.price}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs tracking-widest text-[rgb(150,170,155)] uppercase">
                        {categoryLabels[treatment.category]}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-[rgb(45,45,45)]">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{treatment.duration_minutes} min</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-3">
                      {treatment.name}
                    </h3>

                    <p className="text-sm text-[rgb(45,45,45)] font-light mb-4 line-clamp-2">
                      {treatment.what_it_is}
                    </p>

                    <button 
                      onClick={() => setSelectedTreatment(treatment)}
                      className="flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors text-sm"
                    >
                      <Info className="w-4 h-4" />
                      <span>Learn more about this treatment</span>
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
                  <img 
                    src={selectedTreatment.image_url || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'}
                    alt={selectedTreatment.name}
                    className="w-full aspect-video object-cover"
                  />

                  <div className="flex items-center justify-between py-4 border-y border-[rgb(235,225,213)]">
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
                    to={createPageUrl('BookingFlow') + `?treatment=${selectedTreatment.id}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
                  >
                    ADD TO YOUR STAY
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
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