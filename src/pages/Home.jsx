import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowRight, Leaf, Wind, Droplets, Sun } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=1920&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-[rgb(107,85,64)]/40" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10 text-center px-6 max-w-3xl"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extralight text-white tracking-wide mb-6">
            Rest. Restore. Return.
          </h1>
          <p className="text-lg md:text-xl text-white/90 font-light mb-10 leading-relaxed">
            A boutique sanctuary where time slows and intention guides every moment
          </p>
          <Link 
            to={createPageUrl('BookingFlow')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[rgb(150,170,155)] text-white tracking-widest text-sm hover:bg-[rgb(130,150,135)] transition-all"
          >
            BEGIN YOUR JOURNEY
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-white/50" />
        </motion.div>
      </section>

      {/* Philosophy Section */}
      <section className="py-24 px-6 bg-[rgb(248,246,242)]">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <Leaf className="w-8 h-8 mx-auto mb-8 text-[rgb(150,170,155)]" />
            <h2 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-8">
              The RITUAL Philosophy
            </h2>
            <p className="text-lg text-[rgb(45,45,45)] leading-relaxed font-light">
              We believe wellness isn't something you do — it's something you remember. 
              Hotel RITUAL is designed to remove the noise, strip away decisions, and 
              return you to yourself. Every detail has been considered so you don't have to consider anything at all.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-[rgb(235,225,213)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Wind,
                title: "Effortless Arrival",
                description: "Self-guided check-in. Your itinerary waiting. No lines, no paperwork, no friction."
              },
              {
                icon: Droplets,
                title: "Curated Wellness",
                description: "Treatments scheduled around your rhythm. Packages that make sense. Clarity at every step."
              },
              {
                icon: Sun,
                title: "Intentional Days",
                description: "A daily schedule delivered to you. Know exactly what awaits. Surrender to the flow."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                className="text-center p-8"
              >
                <feature.icon className="w-10 h-10 mx-auto mb-6 text-[rgb(150,170,155)]" />
                <h3 className="text-xl font-light text-[rgb(107,85,64)] mb-4">{feature.title}</h3>
                <p className="text-[rgb(45,45,45)] font-light leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms Preview */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-extralight text-[rgb(107,85,64)] mb-4">
              Your Sanctuary Awaits
            </h2>
            <p className="text-[rgb(45,45,45)] font-light">Each room designed for restoration</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] overflow-hidden group"
            >
              <img 
                src="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80" 
                alt="Suite"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(107,85,64)]/60 to-transparent" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-2xl font-light mb-2">Suites & Rooms</h3>
                <p className="text-white/80 font-light">From $245/night</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] overflow-hidden group"
            >
              <img 
                src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80" 
                alt="Spa"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgb(107,85,64)]/60 to-transparent" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-2xl font-light mb-2">Spa & Wellness</h3>
                <p className="text-white/80 font-light">Treatments from $95</p>
              </div>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <Link 
              to={createPageUrl('Rooms')}
              className="inline-flex items-center gap-2 text-[rgb(107,85,64)] hover:text-[rgb(150,170,155)] transition-colors"
            >
              <span className="tracking-widest text-sm">VIEW ALL ROOMS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-[rgb(107,85,64)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extralight text-white mb-6">
            Ready to Slow Down?
          </h2>
          <p className="text-white/80 font-light mb-10 leading-relaxed">
            Book your stay and receive a personalized itinerary. 
            Everything planned. Nothing to think about.
          </p>
          <Link 
            to={createPageUrl('BookingFlow')}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-[rgb(107,85,64)] tracking-widest text-sm hover:bg-[rgb(235,225,213)] transition-all"
          >
            RESERVE YOUR ESCAPE
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Temporary Admin Link */}
      <div className="text-center py-4">
        <Link 
          to={createPageUrl('AdminSeedData')}
          className="text-xs text-[rgb(198,182,165)] hover:text-[rgb(150,170,155)]"
        >
          Seed Data (Admin)
        </Link>
      </div>
      </div>
      );
      }