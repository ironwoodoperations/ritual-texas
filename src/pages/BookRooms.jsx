import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Leaf, Phone, Mail, ArrowRight, BedDouble, Sparkles, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

const rooms = [
  {
    name: 'Suite 1',
    description: 'King bed, private bath, serene views. A sanctuary of calm.',
    image: 'https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG',
    price: 'From $150/night',
  },
  {
    name: 'Suite 7 — The Carriage House',
    description: 'Private entrance, king bed, spacious retreat for two.',
    image: 'https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/9b89c6de-d91a-4333-ae22-99e134ff6756/Sauna.jpg',
    price: 'From $195/night',
  },
];

const CLOUDBEDS_URL = 'https://hotels.cloudbeds.com/en/reservation/aqlut4?currency=usd';

export default function BookRooms() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const direct = urlParams.get('direct');
    if (direct === '1') {
      window.open(CLOUDBEDS_URL, '_blank');
    }
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(248,246,242)' }}>

      {/* Hero */}
      <section className="relative h-[55vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(https://images.squarespace-cdn.com/content/v1/5f28ea4d05e06334e017a510/44fbd548-a918-43db-af0d-b4d60e8f9bcb/S1+bed.JPG)' }}
        >
          <div className="absolute inset-0 bg-[rgb(107,85,64)]/50" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          className="relative z-10 text-center px-6"
        >
          <p className="text-white/80 tracking-widest text-xs uppercase mb-4">Hotel RITUAL · Jacksonville, Texas</p>
          <h1 className="text-4xl md:text-6xl font-extralight text-white tracking-wide mb-6">Reserve Your Sanctuary</h1>
          <p className="text-white/90 font-light text-lg mb-10 max-w-xl mx-auto">
            Boutique suites designed for deep rest, restoration, and return.
          </p>
          <a
            href={CLOUDBEDS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
          >
            <CalendarDays className="w-4 h-4" />
            CHECK AVAILABILITY & BOOK
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

      {/* Room Cards */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-extralight text-center text-[rgb(107,85,64)] mb-12"
          >
            Our Suites
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8">
            {rooms.map((room, i) => (
              <motion.div
                key={room.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-white border border-[rgb(235,225,213)] overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={room.image} alt={room.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-2">{room.name}</h3>
                  <p className="text-sm text-[rgb(45,45,45)] font-light mb-4 leading-relaxed">{room.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[rgb(150,170,155)] font-medium">{room.price}</span>
                    <a
                      href={CLOUDBEDS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
                    >
                      Book Now <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* All Rooms Link */}
          <div className="text-center mt-10">
            <Link
              to={createPageUrl('Rooms')}
              className="inline-flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors text-sm tracking-widest"
            >
              VIEW ALL ROOMS & SUITES <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Book CTA Banner */}
      <section className="py-20 px-6 bg-[rgb(107,85,64)]">
        <div className="max-w-2xl mx-auto text-center">
          <Leaf className="w-8 h-8 text-[rgb(198,182,165)] mx-auto mb-6" />
          <h2 className="text-3xl font-extralight text-white mb-4">Ready to Begin?</h2>
          <p className="text-white/80 font-light mb-10">
            Check availability and reserve your suite directly through our secure booking portal.
          </p>
          <a
            href={CLOUDBEDS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[rgb(107,85,64)] tracking-widest text-sm hover:bg-[rgb(235,225,213)] transition-all"
          >
            <BedDouble className="w-4 h-4" />
            BOOK YOUR STAY
            <ArrowRight className="w-4 h-4" />
          </a>
          <div className="flex items-center justify-center gap-8 mt-10">
            <a href="tel:9038106695" className="flex items-center gap-1.5 text-white/70 text-sm hover:text-white transition-colors">
              <Phone className="w-4 h-4" /> (903) 810-6695
            </a>
            <a href="mailto:hotel.ritual.texas@gmail.com" className="flex items-center gap-1.5 text-white/70 text-sm hover:text-white transition-colors">
              <Mail className="w-4 h-4" /> hotel.ritual.texas@gmail.com
            </a>
          </div>
        </div>
      </section>

      {/* Spa Upsell */}
      <section className="py-16 px-6 bg-[rgb(235,225,213)]">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles className="w-6 h-6 text-[rgb(150,170,155)] mx-auto mb-4" />
          <h3 className="text-2xl font-extralight text-[rgb(107,85,64)] mb-3">Add Spa & Wellness</h3>
          <p className="text-sm text-[rgb(45,45,45)] font-light mb-6 leading-relaxed">
            Complete your stay with curated treatments — massage, facials, body rituals, and more.
          </p>
          <Link
            to={createPageUrl('Treatments')}
            className="inline-flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors text-sm tracking-widest"
          >
            EXPLORE TREATMENTS <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </div>
  );
}