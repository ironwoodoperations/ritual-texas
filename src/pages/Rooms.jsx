import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Check, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function Rooms() {
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['suites'],
    queryFn: () => base44.entities.Suite.filter({ is_available: true }, 'sort_order'),
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
            Our Suites
          </h1>
          <p className="text-[rgb(45,45,45)] font-light max-w-2xl mx-auto">
            Seven unique spaces designed for deep rest and restoration
          </p>
        </motion.div>

        {/* Rooms Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] w-full" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ) : rooms?.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[rgb(107,85,64)] text-lg">Suites coming soon...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-10">
            {rooms?.map((room, idx) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group"
              >
                <div className="relative aspect-[4/3] overflow-hidden mb-6">
                  <img 
                    src={room.images?.[0] || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80'}
                    alt={room.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-light text-[rgb(107,85,64)] mb-1">{room.name}</h3>
                    {room.headline && (
                      <p className="text-sm text-[rgb(150,170,155)] italic">{room.headline}</p>
                    )}
                    <div className="flex items-center gap-3 text-sm text-[rgb(45,45,45)] mt-2">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Up to {room.max_occupancy}
                      </span>
                      {room.level && (
                        <span className="px-2 py-0.5 bg-[rgb(235,225,213)] text-xs">{room.level}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-light text-[rgb(107,85,64)]">${room.price_per_night}</p>
                    <p className="text-sm text-[rgb(45,45,45)]">per night</p>
                  </div>
                </div>

                <p className="text-[rgb(45,45,45)] font-light mb-4 leading-relaxed">
                  {room.description}
                </p>

                {room.features && room.features.length > 0 && (
                  <div className="space-y-1.5 mb-6">
                    {room.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-[rgb(45,45,45)]">
                        <Check className="w-4 h-4 text-[rgb(150,170,155)] flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                <Link 
                  to={createPageUrl('BookingFlow') + `?room=${room.id}`}
                  className="inline-flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
                >
                  <span className="tracking-widest text-sm">SELECT THIS SUITE</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Note */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center p-8 bg-[rgb(235,225,213)]"
        >
          <p className="text-[rgb(107,85,64)] font-light">
            Every suite includes gourmet breakfast, luxury linens & robes, and full access to sauna, pool, and hot tub
          </p>
        </motion.div>
      </div>
    </div>
  );
}