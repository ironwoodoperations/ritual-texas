import React from 'react';
import { Star } from 'lucide-react';

export default function TestimonialCard({ testimonial }) {
  return (
    <div className="bg-white p-6 border border-[rgb(235,225,213)]">
      {testimonial.rating && (
        <div className="flex gap-1 mb-3">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-[rgb(150,170,155)] text-[rgb(150,170,155)]" />
          ))}
        </div>
      )}
      <p className="text-[rgb(45,45,45)] italic mb-4 leading-relaxed">
        "{testimonial.quote}"
      </p>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[rgb(107,85,64)]">— {testimonial.author}</span>
        {testimonial.source_name && (
          <span className="text-xs text-[rgb(150,170,155)]">{testimonial.source_name}</span>
        )}
      </div>
    </div>
  );
}