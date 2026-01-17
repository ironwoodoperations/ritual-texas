import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TestimonialCard from '@/components/TestimonialCard';
import PressSection from '@/components/PressSection';

export default function Packages() {
  const [selectedPackage, setSelectedPackage] = useState(null);

  const { data: packagesRaw, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.filter({ is_active: true }),
  });

  // Sort packages by price (low to high)
  const packages = React.useMemo(() => {
    if (!packagesRaw) return [];
    return [...packagesRaw].sort((a, b) => {
      const priceA = a.price_from_usd || 0;
      const priceB = b.price_from_usd || 0;
      return priceA - priceB;
    });
  }, [packagesRaw]);

  const { data: testimonials } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => base44.entities.Testimonial.filter({ is_active: true }, 'sort_order'),
  });



  return (
    <div className="min-h-screen py-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-extralight text-[rgb(107,85,64)] mb-4">
            Experience Packages
          </h1>
          <p className="text-[rgb(45,45,45)] font-light max-w-2xl mx-auto">
            Curated stays designed for rest, renewal, and transformation
          </p>
        </motion.div>

        {/* Packages Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : packages?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[rgb(107,85,64)] text-lg">Packages coming soon...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {packages?.map((pkg, idx) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white border border-[rgb(235,225,213)] flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img 
                    src={pkg.image_url || 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80'}
                    alt={pkg.name}
                    className="w-full h-full object-cover"
                  />
                  {pkg.savings > 0 && (
                    <div className="absolute top-4 right-4 bg-[rgb(150,170,155)] text-white px-3 py-1 text-sm flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      Save ${pkg.savings}
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-3">
                    {pkg.name}
                  </h3>

                  <p className="text-sm text-[rgb(45,45,45)] font-light mb-6 leading-relaxed line-clamp-4">
                    {pkg.description}
                  </p>

                  <div className="mt-auto pt-4 border-t border-[rgb(235,225,213)]">
                    <div className="flex items-baseline gap-2 mb-4">
                      {pkg.price_from_usd ? (
                        <>
                          <span className="text-xs text-[rgb(45,45,45)]">from</span>
                          <span className="text-2xl font-light text-[rgb(107,85,64)]">${pkg.price_from_usd}</span>
                          <span className="text-xs text-[rgb(45,45,45)]">{pkg.price_unit}</span>
                        </>
                      ) : (
                        <span className="text-lg text-[rgb(107,85,64)]">Custom Pricing</span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedPackage(pkg)}
                      className="w-full py-3 border border-[rgb(107,85,64)] text-[rgb(107,85,64)] text-sm tracking-widest hover:bg-[rgb(107,85,64)] hover:text-white transition-all"
                    >
                      VIEW DETAILS
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Package Detail Modal */}
        <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgb(248,246,242)]">
            {selectedPackage && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-light text-[rgb(107,85,64)]">
                    {selectedPackage.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  <img 
                    src={selectedPackage.image_url || 'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800&q=80'}
                    alt={selectedPackage.name}
                    className="w-full aspect-video object-cover"
                  />

                  <p className="text-[rgb(45,45,45)] font-light leading-relaxed">
                    {selectedPackage.description}
                  </p>

                  <div className="bg-[rgb(235,225,213)] p-4 my-4 rounded-sm">
                    <p className="text-sm text-[rgb(45,45,45)] font-light">
                      <strong>Add a Guest:</strong> Additional person can enjoy all amenities for $100 per night
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2 py-4 border-y border-[rgb(235,225,213)]">
                    {selectedPackage.price_from_usd ? (
                      <>
                        <span className="text-sm text-[rgb(45,45,45)]">from</span>
                        <span className="text-3xl font-light text-[rgb(107,85,64)]">${selectedPackage.price_from_usd}</span>
                        <span className="text-sm text-[rgb(45,45,45)]">{selectedPackage.price_unit}</span>
                      </>
                    ) : (
                      <span className="text-xl text-[rgb(107,85,64)]">Custom Pricing</span>
                    )}
                  </div>

                  <Link 
                    to={createPageUrl('BookingFlow') + `?package=${selectedPackage.id}`}
                    className="flex items-center justify-center gap-2 w-full py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
                  >
                    BOOK THIS PACKAGE
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Testimonials */}
        {testimonials && testimonials.length > 0 && (
          <section className="mt-20">
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial, idx) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <TestimonialCard testimonial={testimonial} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center p-8 bg-[rgb(235,225,213)]"
        >
          <p className="text-[rgb(107,85,64)] font-light">
            Custom packages available — contact us to design your perfect retreat
          </p>
        </motion.div>
      </div>

      {/* Press Section */}
      <PressSection />
    </div>
  );
}