import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Packages() {
  const [selectedPackage, setSelectedPackage] = useState(null);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => base44.entities.Package.filter({ is_active: true }, 'sort_order'),
  });

  const getTreatmentName = (id) => {
    return treatments?.find(t => t.id === id)?.name || 'Treatment';
  };

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
            Curated Packages
          </h1>
          <p className="text-[rgb(45,45,45)] font-light max-w-2xl mx-auto">
            We've designed these packages to take the guesswork out of your stay. 
            Each one flows naturally across your days with us.
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

                  <p className="text-sm text-[rgb(45,45,45)] font-light mb-4 leading-relaxed">
                    {pkg.description}
                  </p>

                  {pkg.included_treatments?.length > 0 && (
                    <div className="space-y-2 mb-4">
                      <p className="text-xs tracking-widest text-[rgb(150,170,155)]">INCLUDES</p>
                      {pkg.included_treatments.slice(0, 3).map((tId, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-[rgb(45,45,45)]">
                          <Check className="w-4 h-4 text-[rgb(150,170,155)]" />
                          <span>{getTreatmentName(tId)}</span>
                        </div>
                      ))}
                      {pkg.included_treatments.length > 3 && (
                        <p className="text-sm text-[rgb(107,85,64)] pl-6">
                          + {pkg.included_treatments.length - 3} more treatments
                        </p>
                      )}
                    </div>
                  )}

                  {pkg.schedule_notes && (
                    <p className="text-xs text-[rgb(196,155,145)] italic mb-4">
                      {pkg.schedule_notes}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-[rgb(235,225,213)]">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-light text-[rgb(107,85,64)]">${pkg.total_price}</span>
                      <span className="text-sm text-[rgb(45,45,45)]">package total</span>
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
                    {selectedPackage.detailed_description || selectedPackage.description}
                  </p>

                  <div className="bg-[rgb(235,225,213)] p-6">
                    <h4 className="text-sm tracking-widest text-[rgb(107,85,64)] mb-4">WHAT'S INCLUDED</h4>
                    <div className="space-y-3">
                      {selectedPackage.included_treatments?.map((tId, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-[rgb(150,170,155)]" />
                          <span className="text-[rgb(45,45,45)]">{getTreatmentName(tId)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedPackage.schedule_notes && (
                    <div className="p-4 border border-[rgb(198,182,165)]">
                      <h4 className="text-sm tracking-widest text-[rgb(150,170,155)] mb-2">HOW IT'S SCHEDULED</h4>
                      <p className="text-[rgb(45,45,45)] font-light">
                        {selectedPackage.schedule_notes}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-4 border-y border-[rgb(235,225,213)]">
                    <div>
                      <p className="text-3xl font-light text-[rgb(107,85,64)]">${selectedPackage.total_price}</p>
                      {selectedPackage.savings > 0 && (
                        <p className="text-sm text-[rgb(150,170,155)]">You save ${selectedPackage.savings}</p>
                      )}
                    </div>
                  </div>

                  <Link 
                    to={createPageUrl('BookingFlow') + `?package=${selectedPackage.id}`}
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

        {/* Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center p-8 bg-[rgb(235,225,213)]"
        >
          <p className="text-[rgb(107,85,64)] font-light">
            Packages are automatically scheduled across your stay for optimal flow and rest
          </p>
        </motion.div>
      </div>
    </div>
  );
}