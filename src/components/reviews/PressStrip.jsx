import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function PressStrip({ limit = 4, compact = false }) {
  const { data: pressItems, isLoading } = useQuery({
    queryKey: ['press-strip', limit],
    queryFn: () => base44.entities.PressItem.filter({ is_active: true }, 'sort_order', limit),
  });

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-20 flex-1" />
        ))}
      </div>
    );
  }

  if (!pressItems || pressItems.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-8 py-6">
        {pressItems.map((item, idx) => (
          <motion.a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            className="text-sm text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors flex items-center gap-2"
          >
            <span className="font-medium">{item.publisher}</span>
            <ExternalLink className="w-3 h-3 opacity-50" />
          </motion.a>
        ))}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {pressItems.map((item, idx) => (
        <motion.a
          key={item.id}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white border border-[rgb(235,225,213)] p-4 rounded-sm hover:shadow-md transition-all group"
        >
          <div className="text-xs uppercase tracking-widest text-[rgb(150,170,155)] mb-2">
            {item.publisher}
          </div>
          <div className="text-sm text-[rgb(107,85,64)] mb-3 font-light line-clamp-2 group-hover:text-[rgb(150,170,155)] transition-colors">
            {item.title}
          </div>
          {item.pull_quote && (
            <p className="text-xs text-[rgb(45,45,45)] italic line-clamp-2 leading-relaxed">
              "{item.pull_quote}"
            </p>
          )}
        </motion.a>
      ))}
    </div>
  );
}