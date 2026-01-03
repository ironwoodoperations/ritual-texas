import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PressSection() {
  const { data: pressItems } = useQuery({
    queryKey: ['press'],
    queryFn: () => base44.entities.PressItem.filter({ is_active: true }, 'sort_order', 6),
  });

  if (!pressItems || pressItems.length === 0) return null;

  return (
    <section className="py-20 px-6 bg-[rgb(235,225,213)]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-extralight text-[rgb(107,85,64)] mb-4">
            As Featured In
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="bg-white p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs tracking-widest text-[rgb(150,170,155)]">
                  {item.publisher}
                </span>
                <ExternalLink className="w-4 h-4 text-[rgb(198,182,165)] group-hover:text-[rgb(150,170,155)] transition-colors" />
              </div>
              <h3 className="text-[rgb(107,85,64)] font-light leading-snug mb-2">
                {item.title}
              </h3>
              {item.pull_quote && (
                <p className="text-sm text-[rgb(45,45,45)] italic line-clamp-3">
                  "{item.pull_quote}"
                </p>
              )}
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}