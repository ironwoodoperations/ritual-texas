import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Leaf, Wind, Waves, Sun, Coffee, Sparkles, ChevronRight } from 'lucide-react';

const amenities = [
  { icon: Waves, label: 'Rainshower & Sauna', description: 'Private outdoor rainshower and cedar sauna available to all guests around the clock.' },
  { icon: Coffee, label: 'Morning Breakfast', description: 'Complimentary farm-inspired breakfast served daily from 8–10 AM.' },
  { icon: Sparkles, label: 'Spa & Wellness', description: 'On-site treatments from restorative massage to luxury facials, tailored to your needs.' },
  { icon: Sun, label: 'Sunlit Grounds', description: 'Lush gardens, quiet nooks, and open air spaces designed for stillness and presence.' },
  { icon: Wind, label: 'Digital Detox Friendly', description: 'A sanctuary intentionally designed to slow you down and restore your rhythm.' },
  { icon: Leaf, label: 'Thoughtful Touches', description: 'Curated amenities, quality linens, and an atmosphere that feels like coming home.' },
];

export default function Hotel() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(248,246,242)' }}>

      {/* Hero */}
      <div className="relative h-[70vh] min-h-[500px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1600&q=80"
          alt="Hotel RITUAL"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[rgb(45,35,25)]/50" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="text-xs tracking-[0.3em] text-[rgb(235,225,213)] mb-4 uppercase">Jacksonville, Texas</p>
            <h1 className="text-5xl md:text-7xl font-light text-white mb-6" style={{ letterSpacing: '0.04em' }}>
              A Place to Return To
            </h1>
            <p className="text-lg md:text-xl text-[rgb(235,225,213)] font-light max-w-xl mx-auto">
              Hotel RITUAL is a boutique sanctuary where slowness is the point and restoration is the practice.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Intro section */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
          <p className="text-xs tracking-[0.3em] text-[rgb(150,170,155)] mb-6 uppercase">The Experience</p>
          <h2 className="text-3xl md:text-4xl font-light text-[rgb(107,85,64)] mb-8 leading-snug">
            Serenity isn't a luxury. It's the whole point.
          </h2>
          <p className="text-[rgb(45,45,45)] leading-relaxed text-lg mb-6">
            Tucked away in the heart of East Texas, Hotel RITUAL was built for those who need more than a place to sleep. Our eight carefully curated suites, sprawling grounds, and intentional design invite you to exhale — fully.
          </p>
          <p className="text-[rgb(45,45,45)] leading-relaxed text-lg">
            Whether you come alone for solitude, with a partner for reconnection, or with friends for a shared retreat, RITUAL holds space for whatever restoration looks like for you. The sauna is always warm. The coffee is always on. The pace here is yours to set.
          </p>
        </motion.div>
      </section>

      {/* Amenities grid */}
      <section className="bg-[rgb(235,225,213)] py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] text-[rgb(150,170,155)] mb-4 uppercase">What's Included</p>
            <h2 className="text-3xl md:text-4xl font-light text-[rgb(107,85,64)]">Everything you need. Nothing you don't.</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {amenities.map((a, i) => (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-white p-6 rounded-xl border border-[rgb(198,182,165)]"
              >
                <a.icon className="w-6 h-6 text-[rgb(150,170,155)] mb-4" />
                <h3 className="text-lg font-light text-[rgb(107,85,64)] mb-2">{a.label}</h3>
                <p className="text-sm text-[rgb(45,45,45)] leading-relaxed">{a.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms CTA */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-8">

          {/* Rooms */}
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="relative h-64 overflow-hidden rounded-xl mb-6">
              <img
                src="https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=900&q=80"
                alt="Rooms"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[rgb(45,35,25)]/30" />
            </div>
            <p className="text-xs tracking-[0.3em] text-[rgb(150,170,155)] mb-2 uppercase">Rooms & Suites</p>
            <h3 className="text-2xl font-light text-[rgb(107,85,64)] mb-3">Eight unique spaces</h3>
            <p className="text-[rgb(45,45,45)] text-sm leading-relaxed mb-5">
              From our intimate first-floor suites to the secluded Carriage House, each room is designed with intention — distinct character, deep comfort, and everything you need to settle in.
            </p>
            <Link
              to={createPageUrl('Rooms')}
              className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
            >
              View All Rooms <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Packages */}
          <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="relative h-64 overflow-hidden rounded-xl mb-6">
              <img
                src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80"
                alt="Packages"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-[rgb(45,35,25)]/30" />
            </div>
            <p className="text-xs tracking-[0.3em] text-[rgb(150,170,155)] mb-2 uppercase">Curated Packages</p>
            <h3 className="text-2xl font-light text-[rgb(107,85,64)] mb-3">Tailored for your retreat</h3>
            <p className="text-[rgb(45,45,45)] text-sm leading-relaxed mb-5">
              Let us do the thinking. Our packages combine accommodation, spa treatments, and thoughtful add-ons into a seamless stay — perfect for couples, solo retreats, or a reset with friends.
            </p>
            <Link
              to={createPageUrl('Packages')}
              className="inline-flex items-center gap-2 text-sm font-medium text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
            >
              Explore Packages <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>

        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 text-center" style={{ backgroundColor: 'rgb(107,85,64)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <p className="text-xs tracking-[0.3em] text-[rgb(198,182,165)] mb-4 uppercase">Ready to restore?</p>
          <h2 className="text-3xl md:text-4xl font-light text-white mb-8">Your stay at RITUAL awaits.</h2>
          <Link
            to={createPageUrl('BookRooms')}
            className="inline-block px-10 py-4 bg-[rgb(150,170,155)] text-white text-sm tracking-widest hover:bg-[rgb(130,150,135)] transition-colors"
          >
            BOOK YOUR STAY
          </Link>
        </motion.div>
      </section>

    </div>
  );
}