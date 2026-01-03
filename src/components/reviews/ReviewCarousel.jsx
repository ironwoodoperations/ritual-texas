import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Star, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReviewCarousel({ limit = 3, variant = 'default' }) {
  const { data: testimonials, isLoading } = useQuery({
    queryKey: ['testimonials-carousel', limit],
    queryFn: () => base44.entities.Testimonial.filter({ is_active: true }, 'sort_order', limit),
  });

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!testimonials || testimonials.length === 0) return null;

  return (
    <div className={`grid ${limit === 1 ? 'grid-cols-1' : 'md:grid-cols-3'} gap-4`}>
      {testimonials.map((review, idx) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white border border-[rgb(235,225,213)] p-5 rounded-sm"
        >
          {review.rating && (
            <div className="flex gap-1 mb-3">
              {[...Array(review.rating)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[rgb(150,170,155)] text-[rgb(150,170,155)]" />
              ))}
            </div>
          )}
          
          <p className="text-sm text-[rgb(45,45,45)] italic leading-relaxed mb-4 line-clamp-4">
            "{review.quote}"
          </p>
          
          <div className="flex items-center justify-between text-xs">
            <div>
              <div className="text-[rgb(107,85,64)] font-medium">— {review.author}</div>
              {review.source_name && (
                <div className="text-[rgb(150,170,155)] mt-1">{review.source_name}</div>
              )}
            </div>
            {review.source_url && (
              <a 
                href={review.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[rgb(150,170,155)] hover:text-[rgb(107,85,64)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}